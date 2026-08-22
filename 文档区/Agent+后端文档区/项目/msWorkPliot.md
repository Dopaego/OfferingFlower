# workPliot项目消化

## 简历描述

技术栈: TypeScript、Node.js、React、Electron、PostgreSQL/pgvector、Redis、Zod、OpenTelemetry、Vitest、Playwright [R1]

参与开发面向本地研发工作区的桌面端 Multi-Agent Coding Platform，实现在大型前端仓库中的知识增强定位与“需求—修改—构建—测试—PR—Stage”交付闭环,[R2]
*以 PostgreSQL/pgvector 构建知识与任务数据层，Redis 提供缓存、事件协调和幂等控制，OpenTelemetry 串联模型、检索、工具与构建链路，并在 React 界面中展示计划、轨迹、审批与交付证据。*
[项目描述](..\项目\detailDescription\R1R2sum.md)


- 基于 Electron Main / Preload / Renderer 分层构建桌面 **Agent Host**，通过类型安全 IPC 将模型、文件系统、Git、Shell 与 MCP 能力收敛至 Main 进程[R3]；React 端实现任务计划、流式轨迹、工具审批及交付证据可视化。 [整体架构文档](../项目/detailDescription/R3overallArchitecture.md)
- **Multi-Agent Runtime**使用 TypeScript/Node.js 实现 Planner–Locator–Executor–Reviewer–Verifier 多Agent协同编排，通过结构化任务合同约束目标、上下文、输出 Schema、工具权限和预算；结合 AbortSignal、错误签名与 Operation ID 处理取消、失败恢复和非幂等副作用。[R4] [Multi-Agent](../项目/detailDescription/R4MultiAgent.md) 
- 基于 **PostgreSQL/pgvector** 全文检索与 Codemap 构建 RAG，通过 RRF/Rerank、Commit 版本校验和来源引用控制上下文；[R5] [RAG](../项目/detailDescription/R5RAG.md)
- 使用 **Redis 实现检索缓存**、Lease任务与幂等去重，并以 Zod、分级审批和 Build/Test/Scope Gate 约束高风险操作和无关代码修改；[R6] [Redis](../项目/detailDescription/R6Redis.md)
- 使用 **OpenTelemetry** 串联 model/retrieval/agent/tool/build Span，结合 **Vitest、Playwright** 与故障注入评测定位率、端到端成功率、人工接管以及每成功任务成本.[R7]  [OpenTelemetry](../项目/detailDescription/R7OpenTelemetry.md) 80 条代码定位 Query 上，通过 PostgreSQL/pgvector、全文检索与 Codemap 融合将 Recall@5 由 72.5% 提升至 90.0%，无关文件修改率由 17.6% 降至 4.9%；[R8]  [Data](../项目/detailDescription/R8Data.md)