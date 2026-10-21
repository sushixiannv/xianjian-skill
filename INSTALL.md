# 仙剪安装与更新

## 首次安装

1. 安装 Claude Code 或 Codex、Node.js 20+ 和 FFmpeg。
2. 克隆本仓库到 Skill 目录：
   - Claude Code：`~/.claude/skills/xianjian-portrait-editor/`
   - Codex：`$CODEX_HOME/skills/xianjian-portrait-editor/`（默认 `~/.codex/skills/`）
3. 重新打开一个会话。
4. 把一份干净的真人视频、已确认的 `approved.srt` 和素材目录交给仙剪。
5. 先审核分镜和关键帧，再允许渲染动态样片。

## 更新

```bash
git pull --ff-only
```

更新后重新打开会话。视频项目、私有角色资产和缓存应留在独立目录，不要复制进 Skill 仓库。

## ChatCut / HyperFrames

两者均为可选外部工具。接入前必须分别完成官方授权，并明确是否会上传素材或消耗额度；仙剪不会把它们的账号凭据写入仓库。
