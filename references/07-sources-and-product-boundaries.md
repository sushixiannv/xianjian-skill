# 来源、许可与产品边界

## 首版的来源关系

本文不是把第三方Skill合并打包后改名。它是对话要求、V5.6保留结果与上游可借鉴方法的编排规范；第三方工具在使用阶段按需要调用，未把它们的代码、node_modules、作者品牌素材或音效包复制进本包。

- [娜娜开源视频包装Skill](https://github.com/zhouyuechuan2025-ui/ai-self-media-video-packaging-skill)：本地安装的SKILL与其gate/director/motion/evidence/quality参考已核对。迁移SRT锁定、语义布局、帧驱动、真实文件验收；不照搬横屏坐标、固定8帧及禁止透明混合的版式。其[MIT许可](https://github.com/zhouyuechuan2025-ui/ai-self-media-video-packaging-skill/blob/main/LICENSE)不等于视频/二维码/作者品牌/外部素材均可随意再分发。
- HyperFrames：读取本机安装的entrypoint与路由/领域划分；运行时依当前Skill加载core/animation/keyframes/audio/CLI/media。未随本包分发HF本身。版本、配额、API按执行时探测，不能在本包写永久有效的恢复时间或安装状态。
- [Remotion帧驱动基础](https://www.remotion.dev/docs/the-fundamentals)：适合作为确定性合成后端，本片已采用本地Remotion渲染。先发现项目实际版本，所有Remotion包兼容；本包不是Remotion软件的再发行。
- [Remotion许可与条款入口](https://www.remotion.dev/docs/license)：商业化、团队扩张和代客自动渲染前必须重新核对当时适用条款，不能仅凭“开源”宣传无限制免费商用。
- chengfeng字幕/视觉/导出、media-transcript-extractor、media-use：按能力路由，不假设全部机器都已安装，不复制其字体、模型或未核对许可的资产。
- ChatCut/OpenChatCut/ChatCat等易混名称：ChatCut 成片可在用户授权范围内作为视觉参考，但不能仅凭 MP4 推断其生成模型、代码框架或 AI 服务。2026-10-16 已验证可用本地 Remotion/FFmpeg 复刻一个 4 秒视觉片段，未调用其付费服务；这不等于已验证 ChatCut 时间线导入、剪映适配或云端能力。本包不分发参考成片和用户素材。

## 隐私与公开打包

1. 本包没有用户真实录屏、个人截图、带金额的真实案例、完整私人SRT、文件绝对路径、Token或模型缓存；案例证据链接只留在用户本地项目记录。
2. 源视频/录屏可包含私人消息、财务、身份信息；本地处理不自动公开。下载/分析不等于得到发布/剪入别人作品的权限。
3. 新Skill自身发布许可由用户决定，本轮不擅自替用户选开源或商业独占条款。不将第三方MIT声明误设成整个新产品的许可证。
4. 若以后实质复制MIT源代码或说明，保留对应版权与许可；本参考包也保留[上游许可原文](upstream-nana-license.txt)用于来源追溯，不代表已有代码被复制。
5. 公开仓库/tag/Release、付费发行、发布客户素材和自动上传均另获授权。不要把“想做商业产品”当本轮公开发布授权。
6. 首版尚未附通用渲染模板；可复用项目编排/已装渲染器按本规范实施。不得宣传成“无需依赖、一个脚本全自动剪完”的软件。

## 商业产品应准确描述

当前可承诺的交付：可安装的Agent指令包、完整9:16工作流、规则/门禁、时序校验工具及后续可迭代接口。

待验证：新视频是否减少返工、不同环境/引擎能否保持风格与同步、素材缺失时是否正确停止、音效能否持续自然、剪映可编辑项目导入、端到端自动执行稳定性。

发布前准备清单：匿名/自有授权示例、准确环境安装说明、依赖版本与成本范围、工具许可复核、脚本成功/失败测试、跨视频验收、源工程说明和商业授权方案。只完成规则总结不能证明市场付费价值。
