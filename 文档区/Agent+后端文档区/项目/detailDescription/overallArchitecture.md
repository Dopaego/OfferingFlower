# 整体架构详解

> 基于 Electron Main / Preload / Renderer 分层构建桌面 **Agent Host**，通过类型安全 IPC 将模型、文件系统、Git、Shell 与 MCP 能力收敛至 Main 进程；React 端实现任务计划、流式轨迹、工具审批及交付证据可视化。

