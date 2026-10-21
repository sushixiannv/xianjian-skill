import assert from 'node:assert/strict';
import {parseSrt,compareSrt,validatePlan} from './timeline-contract.mjs';

const raw='1\n00:00:00,000 --> 00:00:03,000\n把资料接入工具\n\n2\n00:00:03,000 --> 00:00:06,000\n再比较真实问题\n\n3\n00:00:06,000 --> 00:00:09,000\n最后核对结果\n';
const lock={schemaVersion:1,video:{sha256:'video-hash'},srt:{sha256:'srt-hash'},fps:30,duration:9,renderFrames:270,cues:parseSrt(raw)};
const plan={schemaVersion:1,sourceHash:'video-hash',srtHash:'srt-hash',fps:30,captionMode:'whole-cue',musicEnabled:false,scenes:[{id:'s1',startSec:0,endSec:3,mode:'presenter-close'},{id:'s2',startSec:3,endSec:6,mode:'presenter-split'},{id:'s3',startSec:6,endSec:9,mode:'evidence-pip'}],events:[
  {id:'v1',cueId:'1',kind:'visual',keyword:'资料',anchorSec:1,verification:'audio-checked',evidence:'test-audio-marker',startFrame:30,endFrame:180,meaningful:true,description:'资料落位'},
  {id:'v2',cueId:'2',kind:'visual',keyword:'真实问题',anchorSec:3.6,verification:'word-timestamp',evidence:'test-word-marker',startFrame:108,endFrame:200,meaningful:true,description:'真实问题聚焦'},
  {id:'v3',cueId:'3',kind:'visual',keyword:'最后',anchorSec:6,verification:'cue-start',evidence:'test-cue-start',startFrame:180,endFrame:270,meaningful:true,description:'核对结果'},
  {id:'a1',kind:'sfx',visualEventId:'v1',startFrame:30,endFrame:38,description:'资料落位提示'}
]};
let count=0;
function check(name,fn){fn();count++;console.log('PASS '+name);}
function rejects(name,mutate,pattern){check(name,()=>{const p=structuredClone(plan);mutate(p);assert.throws(()=>validatePlan(lock,p),pattern);});}
check('director modes validate and presenter family measures 2:1',()=>{const r=validatePlan(lock,plan);assert.equal(r.presenterToGraphicsRatio,2);assert.equal(r.presenterFamilySeconds,6);assert.equal(r.cadenceGaps.length,0);});
check('BOM CRLF and multiline text preserved',()=>assert.equal(parseSrt('\uFEFF'+raw.replace(/\n/g,'\r\n'))[1].text,'再比较真实问题'));
check('text correction preserves time contract',()=>{const r=compareSrt(raw,raw.replace('工具','Codex'));assert.equal(r.timestampsEqual,true);assert.equal(r.textChanges.length,1);});
check('time mutation detected',()=>assert.equal(compareSrt(raw,raw.replace('00:00:03,000 -->','00:00:03,100 -->')).timestampsEqual,false));
check('invalid SRT rejected',()=>assert.throws(()=>parseSrt(raw.replace('00:00:06,000 -->','00:00:02,000 -->')),/Overlapping/));
check('duplicate cue rejected',()=>assert.throws(()=>parseSrt(raw.replace('\n\n2\n','\n\n1\n')),/Duplicate/));
rejects('changed SRT hash blocked',p=>{p.srtHash='new';},/different source/);
rejects('early reveal blocked',p=>{p.events[0].startFrame=29;},/Early\/late/);
rejects('unverified interpolated word blocked',p=>{p.events[0].verification='interpolated';},/unverified/);
rejects('cue-start cannot label internal word',p=>{p.events[0].verification='cue-start';},/sentence-internal/);
rejects('missing anchor evidence blocked',p=>{p.events[0].evidence='';},/Missing/);
rejects('wrong cue keyword blocked',p=>{p.events[0].keyword='收入';},/Keyword/);
rejects('music cannot silently return',p=>{p.musicEnabled=true;},/music/);
rejects('typewriter subtitles blocked',p=>{p.captionMode='typewriter';},/typewriter/);
rejects('SFX timing change blocked',p=>{p.events[3].startFrame=31;},/SFX/);
rejects('mode gap blocked',p=>{p.scenes[1].startSec=3.5;},/gap/);
rejects('future source tail blocked',p=>{p.events[2].endFrame=271;},/frame range/);
check('long reading gap is reported not disguised',()=>{const p=structuredClone(plan);p.events=[];const r=validatePlan(lock,p);assert.equal(r.cadenceGaps[0].status,'warning');});
check('long reading exception is visible',()=>{const p=structuredClone(plan);p.events=[];p.cadenceExceptions=[{startSec:0,endSec:9,reason:'approved reading'}];assert.equal(validatePlan(lock,p).cadenceGaps[0].status,'documented-exception');});
console.log(JSON.stringify({passed:count,scope:'deterministic helper unit tests; not full video behaviour validation'}));
