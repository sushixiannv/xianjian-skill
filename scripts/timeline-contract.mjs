import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const fail=message=>{throw new Error(message);};
const requireValue=(ok,message)=>{if(!ok)fail(message);};
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const normalize=s=>s.normalize('NFKC').replace(/[\p{P}\p{Z}\s]/gu,'').toLowerCase();
export async function fileHash(file){
  const h=crypto.createHash('sha256');
  for await(const chunk of fs.createReadStream(file))h.update(chunk);
  return h.digest('hex');
}
export function parseSrt(text){
  const clean=text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim();
  requireValue(clean.length>0,'SRT is empty');
  const clock=s=>{
    const m=/^(\d{2,}):(\d{2}):(\d{2}),([0-9]{3})$/.exec(s);
    requireValue(m&&Number(m[2])<60&&Number(m[3])<60,'Invalid SRT timestamp: '+s);
    return Number(m[1])*3600+Number(m[2])*60+Number(m[3])+Number(m[4])/1000;
  };
  const ids=new Set();let lastEnd=-1;
  return clean.split(/\n[ \t]*\n/).map(block=>{
    const lines=block.split('\n');
    requireValue(/^\d+$/.test(lines[0]),'Invalid cue id');
    const id=lines[0];requireValue(!ids.has(id),'Duplicate cue id: '+id);ids.add(id);
    const m=/^([^ ]+)\s+-->\s+([^ ]+)\s*$/.exec(lines[1]||'');
    requireValue(m,'Invalid time range in cue '+id);
    const start=clock(m[1]),end=clock(m[2]),text=lines.slice(2).join('\n').trim();
    requireValue(end>start&&start>=0,'Reversed/empty time range in cue '+id);
    requireValue(start>=lastEnd-1e-7,'Overlapping or unordered cue '+id);
    requireValue(text.length>0,'Empty text in cue '+id);lastEnd=end;
    return {id,start,end,text};
  });
}
function probe(file){
  const r=spawnSync(process.env.FFPROBE_BIN||'ffprobe',['-v','error','-show_entries','format=duration:stream=codec_type,width,height,r_frame_rate,avg_frame_rate,start_time,duration,sample_rate,channels','-of','json',file],{encoding:'utf8',maxBuffer:2*1024*1024});
  if(r.error)fail('ffprobe unavailable: '+r.error.message);
  requireValue(r.status===0,'ffprobe failed: '+r.stderr.trim());
  const p=JSON.parse(r.stdout),v=p.streams?.find(s=>s.codec_type==='video');
  requireValue(v,'No video stream');
  const rate=s=>{const [a,b]=String(s).split('/').map(Number);return b?a/b:NaN;};
  const duration=Number(p.format?.duration),fps=rate(v.avg_frame_rate)||rate(v.r_frame_rate);
  requireValue(finite(duration)&&duration>0&&finite(fps)&&fps>0,'Invalid media duration/fps');
  return {duration,fps,width:v.width,height:v.height,videoStart:Number(v.start_time||0),streams:p.streams};
}
export async function createLock(video,srt,targetFps){
  const media=probe(video),fps=targetFps===undefined?media.fps:Number(targetFps);
  requireValue(finite(fps)&&fps>0&&fps<=240,'Invalid target fps');
  const cues=parseSrt(fs.readFileSync(srt,'utf8'));
  requireValue(cues.at(-1).end<=media.duration+1/fps+.002,'SRT extends past video');
  return {schemaVersion:1,video:{file:path.basename(video),sha256:await fileHash(video),...media},srt:{file:path.basename(srt),sha256:await fileHash(srt)},fps,duration:media.duration,renderFrames:Math.ceil(media.duration*fps-1e-7),cues};
}
export function compareSrt(before,after){
  const a=parseSrt(before),b=parseSrt(after);
  const timeEqual=a.length===b.length&&a.every((c,i)=>c.id===b[i].id&&c.start===b[i].start&&c.end===b[i].end);
  const textChanges=a.flatMap((c,i)=>b[i]&&c.id===b[i].id&&c.text!==b[i].text?[{id:c.id,before:c.text,after:b[i].text}]:[]);
  return {bytesEqual:before===after,timestampsEqual:timeEqual,textChanges,beforeCount:a.length,afterCount:b.length};
}
export function validatePlan(lock,plan){
  requireValue(lock.schemaVersion===1&&Array.isArray(lock.cues),'Invalid lock');
  requireValue(finite(lock.fps)&&lock.fps>0&&Number.isInteger(lock.renderFrames)&&lock.renderFrames>0,'Invalid lock timing');
  requireValue(plan.schemaVersion===1,'Invalid plan schemaVersion');
  requireValue(plan.sourceHash===lock.video.sha256&&plan.srtHash===lock.srt.sha256,'Plan points to a different source/SRT');
  requireValue(plan.fps===lock.fps,'Plan fps differs from lock');
  requireValue(['whole-cue','burned-in','none'].includes(plan.captionMode),'Caption mode must not be typewriter');
  requireValue(typeof plan.musicEnabled==='boolean','musicEnabled must be explicit');
  requireValue(!plan.musicEnabled||plan.allowMusic===true,'Background music not approved');
  const tolerance=1/lock.fps+.002,end=lock.renderFrames/lock.fps;
  const scenes=plan.scenes;
  requireValue(Array.isArray(scenes)&&scenes.length>0,'Missing scenes');
  const ids=new Set(),modeSeconds={presenter:0,'presenter-close':0,'presenter-side':0,'presenter-split':0,'evidence-pip':0,graphic:0,comparison:0};let last=0;
  for(const s of scenes){
    requireValue(typeof s.id==='string'&&s.id.length>0&&!ids.has(s.id),'Invalid/duplicate scene id');ids.add(s.id);
    requireValue(Object.hasOwn(modeSeconds,s.mode),'Invalid scene mode');
    requireValue(finite(s.startSec)&&finite(s.endSec)&&s.startSec>=0&&s.endSec>s.startSec,'Invalid scene range');
    requireValue(Math.abs(s.startSec-last)<.002,'Scenes have a gap/overlap at '+s.id);
    requireValue(s.endSec<=end+tolerance,'Scene exceeds media');
    modeSeconds[s.mode]+=s.endSec-s.startSec;last=s.endSec;
  }
  requireValue(Math.abs(last-end)<=tolerance,'Scenes do not cover whole media');
  const events=plan.events;
  requireValue(Array.isArray(events),'Missing event list');
  const eventMap=new Map(),cues=new Map(lock.cues.map(c=>[c.id,c]));
  for(const e of events){
    requireValue(typeof e.id==='string'&&e.id.length>0&&!eventMap.has(e.id),'Invalid/duplicate event id');eventMap.set(e.id,e);
    requireValue(['visual','sfx'].includes(e.kind),'Invalid event kind');
    requireValue(Number.isInteger(e.startFrame)&&Number.isInteger(e.endFrame)&&e.startFrame>=0&&e.endFrame>e.startFrame&&e.endFrame<=lock.renderFrames,'Invalid event frame range: '+e.id);
    requireValue(typeof e.description==='string'&&e.description.trim().length>0,'Event lacks description: '+e.id);
    if(e.kind==='sfx')continue;
    const cue=cues.get(String(e.cueId));requireValue(cue,'Unknown cue: '+e.id);
    requireValue(typeof e.keyword==='string'&&normalize(e.keyword).length>0&&normalize(cue.text).includes(normalize(e.keyword)),'Keyword not in referenced cue: '+e.id);
    requireValue(finite(e.anchorSec)&&e.anchorSec>=cue.start-1e-7&&e.anchorSec<cue.end,'Anchor outside cue: '+e.id);
    requireValue(['cue-start','word-timestamp','audio-checked'].includes(e.verification),'Estimated/unverified anchor: '+e.id);
    requireValue(e.verification!=='cue-start'||Math.abs(e.anchorSec-cue.start)<1e-7,'cue-start cannot be used as a sentence-internal anchor: '+e.id);
    requireValue(typeof e.evidence==='string'&&e.evidence.trim().length>0,'Missing anchor evidence: '+e.id);
    requireValue(e.startFrame===Math.ceil(e.anchorSec*lock.fps),'Early/late reveal frame: '+e.id);
    requireValue(typeof e.meaningful==='boolean','meaningful must be explicit: '+e.id);
  }
  for(const e of events.filter(e=>e.kind==='sfx')){
    const visual=eventMap.get(e.visualEventId);
    requireValue(visual?.kind==='visual'&&visual.startFrame===e.startFrame,'SFX does not reference the same visual onset: '+e.id);
  }
  const exceptions=plan.cadenceExceptions||[];
  requireValue(Array.isArray(exceptions),'Invalid cadenceExceptions');
  for(const e of exceptions)requireValue(finite(e.startSec)&&finite(e.endSec)&&e.startSec>=0&&e.endSec>e.startSec&&e.endSec<=end+tolerance&&typeof e.reason==='string'&&e.reason.trim().length>0,'Invalid cadence exception');
  const points=[...new Set([0,...events.filter(e=>e.kind==='visual'&&e.meaningful).map(e=>e.startFrame/lock.fps),end])].sort((a,b)=>a-b);
  const gaps=[];
  for(let i=1;i<points.length;i++)if(points[i]-points[i-1]>5+.002){
    const exception=exceptions.find(e=>e.startSec<=points[i-1]+.002&&e.endSec>=points[i]-.002);
    gaps.push({start:points[i-1],end:points[i],status:exception?'documented-exception':'warning',reason:exception?.reason||'No declared meaningful visual change for over 5 seconds'});
  }
  const presenterFamilySeconds=modeSeconds.presenter+modeSeconds['presenter-close']+modeSeconds['presenter-side']+modeSeconds['presenter-split'];
  const evidenceGraphicSeconds=modeSeconds['evidence-pip']+modeSeconds.graphic+modeSeconds.comparison;
  const ratio=evidenceGraphicSeconds?presenterFamilySeconds/evidenceGraphicSeconds:null;
  return {status:'machine-plan-checks-only',cueCount:lock.cues.length,eventCount:events.length,modeSeconds,presenterFamilySeconds,evidenceGraphicSeconds,presenterToGraphicsRatio:ratio,cadenceGaps:gaps,warnings:ratio===null||ratio<1.5||ratio>2.5?['Review duration ratio; target roughly 2:1, exceptions require judgement']:[],humanChecksRequired:['audio alignment','face/UI safety','shot scale/position/transition continuity','evidence authenticity/readability','visible motion richness','subjective listening']};
}
function args(values){
  const options={};for(let i=0;i<values.length;i+=2){requireValue(values[i]?.startsWith('--')&&values[i+1]&&!values[i+1].startsWith('--'),'Expected --name value');requireValue(!Object.hasOwn(options,values[i].slice(2)),'Duplicate argument');options[values[i].slice(2)]=values[i+1];}return options;
}
const needed=(o,key)=>{requireValue(typeof o[key]==='string'&&o[key].length>0,'Missing --'+key);return o[key];};
async function main(){
  const [command,...rest]=process.argv.slice(2),o=args(rest);let result;
  if(command==='lock'){
    const out=needed(o,'out');requireValue(!fs.existsSync(out),'Refusing to overwrite lock');
    result=await createLock(needed(o,'video'),needed(o,'srt'),o.fps);
    fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify({status:'source-and-srt-locked',cueCount:result.cues.length,fps:result.fps,duration:result.duration,videoHash:result.video.sha256,srtHash:result.srt.sha256}));return;
  }else if(command==='validate'){
    const lock=JSON.parse(fs.readFileSync(needed(o,'lock'),'utf8'));
    requireValue(await fileHash(needed(o,'video'))===lock.video.sha256,'Source video changed');
    requireValue(await fileHash(needed(o,'srt'))===lock.srt.sha256,'Frozen SRT changed');
    requireValue(JSON.stringify(parseSrt(fs.readFileSync(o.srt,'utf8')))===JSON.stringify(lock.cues),'Lock cue data does not match SRT');
    result=validatePlan(lock,JSON.parse(fs.readFileSync(needed(o,'plan'),'utf8')));
  }else if(command==='compare'){
    result=compareSrt(fs.readFileSync(needed(o,'before'),'utf8'),fs.readFileSync(needed(o,'after'),'utf8'));
    if(!result.timestampsEqual)process.exitCode=2;
  }else fail('Commands: lock, validate, compare; see references/09-timeline-contract.md');
  console.log(JSON.stringify(result,null,2));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(e=>{console.error(e.message);process.exitCode=1;});
