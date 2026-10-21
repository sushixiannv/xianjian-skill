# 仙剪｜xianjian-portrait-editor

仙剪是一个 9:16 竖屏真人口播视频的「导演」Skill。它以冻结的本地 SRT 为唯一时序基线，把已初剪的口播视频变成有分镜、证据画面、动态图解和音效的成片方案：

`真实视频 + approved.srt → 语义分镜 → 素材匹配 → Remotion/其他合成器 → 关键帧审核 → 动态样片 → QA`

当前版本：`0.2.1`（早期版本，视觉效果仍在持续迭代）。本仓库只包含通用规则、校验脚本和代理配置，不包含任何用户视频、SRT、角色母版、客户素材、渲染缓存或 API Key。

## 安装

### Claude Code

```bash
git clone https://github.com/sushixiannv/xianjian-skill.git ~/.claude/skills/xianjian-portrait-editor
```

### Codex

```bash
git clone https://github.com/sushixiannv/xianjian-skill.git "${CODEX_HOME:-$HOME/.codex}/skills/xianjian-portrait-editor"
```

安装后重新开一个会话，让 Skill 列表刷新。然后对 Agent 说：「用仙剪处理我已初剪的口播视频」，并提供视频路径和已确认的 SRT。

## 更新

```bash
cd ~/.claude/skills/xianjian-portrait-editor && git pull --ff-only
```

（Codex 用户把路径换成你的 Codex Skill 目录。）

## 运行前依赖

- Claude Code 或 Codex
- Node.js 20+
- FFmpeg（媒体探测、抽帧、封装）
- Remotion 4.x（需要动态合成时）
- 可选：HyperFrames、ChatCut；它们不属于本 Skill 的强制依赖

仙剪不会自动上传视频、自动发布或替用户登录第三方服务。素材路径、授权和付费都由调用方明确提供。

## 工作流门禁

1. 锁定源视频、approved SRT、哈希和词级锚点。
2. 先提交导演分镜和素材缺口，等待确认。
3. 从实际合成工程导出关键帧，检查护脸、字号、证据和图层关系。
4. 关键帧通过后再渲染局部动态样片或全片。
5. 对真实 MP4 做解码、时长、音轨偏移、SRT 和转场 QA。

默认基线是 V5.6：原口播＋克制音效、无背景音乐；真人不被 AI 重绘，截图和录屏必须来自真实素材。

## 校验

```bash
node scripts/test-timeline.mjs
node scripts/timeline-contract.mjs lock --video SOURCE.mp4 --srt approved.srt --fps 30 --out timeline-lock.json
```

## 许可证

[MIT](LICENSE)。`references/upstream-nana-license.txt` 是已纳入的上游 Nana AI MIT 许可证文本，使用相关上游内容时须保留其版权与许可声明，见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
