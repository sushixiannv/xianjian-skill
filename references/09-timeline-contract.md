# 时间轴数据合同与脚本

读取时机：写storyboard/props/声音账本或运行校验。不是额外渲染后端。

## lock

`lock --video SOURCE --srt SRT --out LOCK` 调用ffprobe，记录视频/SRT哈希、相对文件名、时长/fps/尺寸与cue。可加 `--fps 30` 固定目标帧率。`FFPROBE_BIN` 可配置执行文件，默认PATH查找；Node仅标准库。

输出必须是新文件；已存在不覆盖。主片由调用者明确提供，不扫描用户Home。脚本拒绝错误时间戳、重复cueId、空文字、倒序、重叠cue和明显超出视频的cue。遇到合法但复杂的重叠SRT，先另提整理方案，而不是自动删字幕。

## plan最低数据形态

```json
{
  "schemaVersion": 1,
  "sourceHash": "来自timeline-lock的video.sha256",
  "srtHash": "来自timeline-lock的srt.sha256",
  "fps": 30,
  "captionMode": "whole-cue",
  "musicEnabled": false,
  "allowMusic": false,
  "scenes": [
    {"id": "scene-01", "startSec": 0, "endSec": 6, "mode": "presenter-close"},
    {"id": "scene-02", "startSec": 6, "endSec": 10, "mode": "presenter-split"}
  ],
  "events": [
    {
      "id": "event-01",
      "cueId": "1",
      "kind": "visual",
      "keyword": "当前口播词",
      "anchorSec": 0,
      "verification": "audio-checked",
      "evidence": "word-anchors.json#word-01",
      "startFrame": 0,
      "endFrame": 45,
      "meaningful": true,
      "description": "主题入场"
    }
  ],
  "cadenceExceptions": [
    {"startSec": 4, "endSec": 10, "reason": "真实结果阅读停留，用户已批准"}
  ]
}
```

这是合同形态说明，必须用实际锁/原话/全部场景填完整，不作为可直接渲染的现成方案。生产方案还需要素材清单、bounds、层级、语义结构、进出场参数/审批等人读字段；本脚本不替代这些检查。

场景模式支持：

- `presenter`：真人中景主讲；
- `presenter-close`：真人近景/语义推近；
- `presenter-side`：人物侧置、信息在对侧；
- `presenter-split`：人物与解释上下分屏；
- `evidence-pip`：证据主屏＋顶层圆窗；
- `graphic`：动态图解主屏；
- `comparison`：同源前后或并列比较。

真人家族是前四类，证据/图解家族是后三类。约2:1只生成复核提醒，不作为硬阻断。详细镜头还应按 [10-directing-and-shot-design.md](10-directing-and-shot-design.md) 保存 `viewerTask/source/crop/scale/x/y/faceBounds/entry/hold/exit/transition/audioEventId` 等字段。

## validate

`validate --lock LOCK --video SOURCE --srt SRT --plan PLAN`

检查：两个源哈希、SRTcue内容、fps、captionMode、默认无BGM、场景时长无缝覆盖、事件ID唯一、cue与关键词对应、锚点范围、核对方式和证据字段、startFrame恰为ceil锚点、合法endFrame。非cue起点触发必须是audio-checked/word-timestamp，禁止估算方式；SFX用visualEventId引用现有visual落点且startFrame一致。

事件verification/evidence是**核验记录**而不是自动证明；机器不能知道操作者是否真的回听。缺真实核对不能仅填“audio-checked”骗过脚本。句内锚点文件应保存sourceHash、时间与核对方式。

scene模式及家族见上表。报告真人家族与证据/图解家族的时长比例；2:1偏差仅提示，不阻断合理的长答案阅读。每个有意义视觉变化间隔超过5秒时给warn，例外有明确覆盖与理由可提示exception；脚本也不能自动判断meaningful字段是否真的让画面丰富。

SRT显示窗口由cue的整行入出点驱动；不要再为字幕逐字建立visual事件。source录屏的sourceIn/out/playbackRate是另一个媒体时间域，必须在完整分镜另记映射。

## compare

`compare --before BASE --after CANDIDATE` 输出是否字节相同、时间/ID是否相同、只改文本的cue列表。它不写新SRT、不自动批准候选；时间码改变返回非零，文本改动返回比较结果供人工确认。

## 报告边界

输出 `machine-plan-checks-only`，不得改成“音画同步/视觉/听感已验收”。所有生成文件按项目审批和宿主权限写入，不含用户绝对路径的可分发包不会携带运行中的私有输入。
