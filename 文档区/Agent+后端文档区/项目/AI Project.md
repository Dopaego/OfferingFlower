# Digital Employee × 桌面 Agent：整合项目简历描述

## 一、推荐项目定位

**项目名称：DevFlow Digital Employee｜知识增强型桌面 Multi-Agent 研发平台**

**项目性质：企业 Coding Agent 实践 + TypeScript/Electron 独立研发项目**

**技术栈：Electron、React、TypeScript、Node.js、PostgreSQL/pgvector、Redis、Zod、MCP、OpenTelemetry、SSE/Typed IPC、Vitest、Playwright**

**项目简介：**

参考 Digital Employee 在大型前端仓库中的知识增强定位与“需求—修改—构建—测试—PR—Stage”交付闭环，结合 WorkPilot/桌面 Agent 的 Runtime、Session、Tool、权限和上下文管理思想，开发桌面端 Multi-Agent Coding Platform。系统通过 Electron 承载本地工作区能力，使用 Planner、Locator、Executor、Reviewer、Verifier 专业 Agent 协同完成长任务；以 PostgreSQL/pgvector 构建知识与任务数据层，Redis 提供缓存、事件协调和幂等控制，OpenTelemetry 串联模型、检索、工具与构建链路，并在 React 界面中展示计划、轨迹、审批与交付证据。

---

## 二、项目亮点

### 1. Digital Employee 企业交付闭环

- 在大型前端 Monorepo 中实践并复盘 Digital Employee，使用 DevBrain/Codemap 辅助定位组件、配置、特性开关和测试等关联代码；
- 跟踪自然语言需求从任务计划、代码修改、自动 Review、Build/VP Test 到 PR、Pipeline 和 Stage Link 的完整轨迹；
- 将构建结果、必需测试、Diff 范围和可访问环境作为任务完成依据，而不是相信模型自行声明“已完成”；
- 总结分支冲突、残留冲突标记、构建失败、多轮修复和人工接管等真实失败路径。

### 2. Electron 桌面 Agent Host

- 采用 Electron Main / Preload / Renderer 分层：Main 进程管理模型、文件、Shell、MCP、密钥和任务状态，Renderer 专注流式交互；
- 通过 TypeScript IPC 单一契约和 preload 命名空间 API，降低跨进程接口漂移，并限制 Renderer 直接访问系统能力；
- 将桌面文件系统、工作区搜索、Git、Build/Test 和本地预览封装为 Agent 工具，发挥 Electron 在本地开发场景中的优势。

### 3. 知识增强式代码定位

- 借鉴 DevBrain/Codemap 思路，在 PostgreSQL 中保存文档、代码块、权限元数据和版本信息，通过 pgvector 向量召回、全文检索与类型化代码关系图进行 Hybrid RAG；
- 以全文搜索定位精确符号，使用 TypeScript Compiler API 或 ts-morph 构建 Symbol、Import、Call、Test、Config、Owner 等类型化关系；
- 从检索种子进行受限图遍历，通过关系类型、最大深度和上下文预算控制候选范围，减少大型仓库中的无关上下文；
- 使用 RRF/Rerank 对多路候选融合，为知识结果记录来源、相关原因和 Commit 版本；索引落后于任务基线时降级到实时搜索，避免旧知识误导 Agent。

### 4. Multi-Agent 编排与可恢复 Runtime

- 将任务拆分为 Planner、Locator、Executor、Reviewer、Verifier 等角色，通过结构化 Task Envelope 传递目标、上下文引用、输出 Schema、工具权限和预算；
- 使用 TypeScript 判别联合建模 planning、locating、editing、reviewing、building、testing、awaiting_human、completed 和 failed 等状态；
- 通过 maxAttempts、deadline、AbortSignal 和错误签名限制无限工具调用与重复修复；
- 将构建、测试和部署失败重新作为 observation 输入下一轮，并区分代码、测试、基础设施和权限故障；
- 使用 PostgreSQL 事件表保存 Task、Session、Agent Run、Verification Evidence 和 checkpoint，通过 Redis Lease、operation ID 和幂等记录避免重复消费及重复创建 PR、Pipeline 或预览环境。

### 5. 工具安全与 Human-in-the-loop

- 使用 Zod 校验模型生成的工具参数，对路径、URL、命令和工作区范围进行业务级检查；
- 设计“只读自动允许、写操作确认、危险操作阻止”的权限策略，并将审批与 callId、参数哈希和有效期绑定；
- 接入 MCP 扩展外部工具，对调用设置超时、取消、结果大小限制和不可信内容边界；
- 对修改敏感配置、更新视觉基线、创建 PR/部署等动作保留人工审批和审计记录。

### 6. AI 原生前端与验证

- 使用 React 构建任务计划、流式消息、工具卡片、审批卡、Trace 时间线和验证证据面板；
- 通过 runId、eventId 和 sequence 对流事件去重，批量合并 token delta，并处理取消后的迟到事件；
- 使用 Fake Backend 回放模型限流、MCP 崩溃、构建失败、重复事件和取消竞态；
- 以 Build、Test、Scope、PR 和 Preview/Stage 证据定义 review-ready，并明确保留 Code Owner、业务验收和最终合并权限。

### 7. OpenTelemetry 可观测性与成本治理

- 使用 OpenTelemetry 为 model、retrieval、agent、tool、approval、build 和 test 建立父子 Span，通过 traceId/runId 关联桌面端、Node.js 服务与后台 Worker；
- 采集 TTFT、模型耗时、检索耗时、工具成功率、Token、重试次数、人工接管和每成功任务成本等指标；
- 对 Prompt、文件内容、Token 和工具参数实施字段白名单与脱敏，只记录模型、工具名、大小、耗时和错误码等元数据；
- 将失败 Trace 脱敏回流到离线 Eval，区分定位、检索、规划、工具、基础设施和验证失败，形成可回归的困难样本集。

---

## 三、推荐简历版本

### 项目名称

**DevFlow Digital Employee｜知识增强型桌面 Multi-Agent 研发平台**

### 技术栈

Electron、React、TypeScript、Node.js、PostgreSQL/pgvector、Redis、Zod、MCP、OpenTelemetry、Vitest、Playwright

### 项目描述

参考 Digital Employee 在企业大型前端仓库中的知识增强定位和验证驱动交付模式，开发面向本地研发工作区的 Electron Multi-Agent Coding Platform；由 Planner、Locator、Executor、Reviewer、Verifier 协同完成代码定位、受控修改、构建测试和交付证据生成，并以 RAG、持久化任务状态、分布式协调及全链路 Trace 支撑长任务可靠执行。

### 简历亮点

- **Digital Employee 实践**在大型前端 Monorepo 中使用并复盘 Digital Employee，借助 DevBrain/Codemap 定位需求关联代码，跟踪代码修改、自动 Review、Build/VP Test、PR、Pipeline 与 Stage Link 全流程，沉淀以外部验证证据定义 Agent 完成状态的工程方法。
- **桌面 Agent 架构**采用 Electron Main / Preload / Renderer 分层和 TypeScript Typed IPC，将模型、文件、Git、Shell 与 MCP 能力收敛到 Main 进程；React 端实现任务计划、流式轨迹、工具审批和验证证据可视化。
- **Multi-Agent Runtime**使用 TypeScript/Node.js 实现 Planner–Locator–Executor–Reviewer–Verifier 协同编排，以结构化 Task Envelope 约束目标、输出 Schema、工具权限和预算，并通过 AbortSignal、错误签名、checkpoint 与 operation ID 处理取消、失败恢复及非幂等副作用。
- **RAG 与数据层**基于 PostgreSQL/pgvector 实现全文、向量与 Codemap 关系图融合检索，使用 RRF/Rerank、Commit 版本校验和来源引用控制上下文；通过 Redis 完成检索缓存、任务 Lease、事件协调和幂等去重。
- **安全、验证与可观测性**结合 Zod Tool Registry、路径范围、分级审批和 MCP 结果隔离控制高风险操作；以 Build/Test/Scope/PR/Preview 为确定性 Gate，并通过 OpenTelemetry 追踪 model/retrieval/agent/tool/build 全链路，使用 Vitest/Playwright 与故障注入验证恢复路径。

---

## 四、适合一页简历的精简版

**DevFlow Digital Employee｜知识增强型桌面 Multi-Agent 研发平台**

Electron、React、TypeScript、Node.js、PostgreSQL/pgvector、Redis、MCP、OpenTelemetry

- 在大型前端 Monorepo 中实践并复盘 Digital Employee，利用 DevBrain/Codemap 辅助需求关联代码定位，跟踪修改、Build/VP Test、PR、Pipeline 与 Stage Link 全流程，归纳验证驱动的企业 Coding Agent 交付闭环；
- 基于 Electron Main / Preload / Renderer 与 Typed IPC 构建桌面 Agent Host，将模型、文件、Git、Shell 和 MCP 能力收敛至 Main 进程，并在 React 端展示流式任务轨迹、工具审批与验证证据；
- 使用 TypeScript/Node.js 实现 Planner–Locator–Executor–Reviewer–Verifier 多 Agent 编排，以结构化任务合同、预算、AbortSignal、checkpoint 和 operation ID 控制长任务恢复及非幂等副作用；
- 基于 PostgreSQL/pgvector 构建全文、向量与 Codemap 融合 RAG，使用 Redis 完成缓存、Lease 与幂等协调，并以 Zod、分级审批和 Build/Test/Scope Gate 约束高风险操作；
- 使用 OpenTelemetry 串联 model/retrieval/agent/tool/build Span，结合 Vitest、Playwright 与故障注入评测定位率、端到端成功率、人工接管、P95 延迟及每成功任务成本。

---

## 五、保守表述备选（当前不作为主版本）

这一版本仅保留给需要大幅压缩技术细节的投递场景。由于你已经完成个人实现，主简历应优先使用第三、四节的研发版本。

**企业级 Coding Agent 全流程实践与桌面化架构设计**

- 在大型前端 Monorepo 中实践 Digital Employee，借助 DevBrain/Codemap 进行知识增强式代码定位，跟踪任务从需求分析、代码修改、构建验证到 PR、Pipeline 和 Stage Link 的完整过程；
- 复盘 Agent 在分支同步、冲突处理、自动 Review、构建失败诊断和多轮修复中的执行轨迹，归纳错误分类、有界重试、人工接管和外部证据验收机制；
- 对照 WorkPilot/桌面 Agent 的 Session、Context、Tool、Risk/Approval 与 Digital Employee 的 DevBrain、Sandbox、Pipeline/Stage 闭环，完成 Electron + TypeScript 缩小版架构设计；
- 设计 Main / Preload / Renderer 进程边界、Typed IPC、知识上下文、Agent 状态机和 Build/Test/Scope Gate，并形成可实施的开发与评测方案。

注意：这一版本使用“实践、复盘、对照、设计”，不要改成“实现 DevBrain”“搭建企业 Sandbox”或“主导 Digital Employee”。

---

## 六、指标填写位置

### 6.1 使用说明

下面是一组**数学口径一致的候选数据**，用于展示怎样把真实实验写成简历。它不是从你的日志中计算出来的结果。只有当原始 Eval、OpenTelemetry Trace、测试报告和任务记录与这些数值一致时才能直接使用；否则保留计算方式并替换原始计数。

### 6.2 评测设计

建议将评测报告固定为：

- 任务集：40 个匿名化/自建前端任务；
- 类型：8 个精确小修、16 个跨模块需求、6 个配置/实验变更、5 个冲突处理、5 个构建失败修复；
- Baseline：单 Agent + 全文/向量基础检索；
- Treatment：Multi-Agent + Hybrid RAG + Codemap + Redis 协调 + 验证 Gate；
- 控制变量：相同 base Commit、模型、任务描述、工具权限、最大时间和必测集合；
- 完成条件：Scope、Build、Required Tests、PR/Preview Evidence 全部通过。

### 6.3 一组可填写的候选结果

| 指标 | Baseline | Treatment | 简历可用结果 |
| --- | ---: | ---: | --- |
| First correct localization | 24/40（60.0%） | 34/40（85.0%） | 提升 25.0 个百分点 |
| Build pass@1 | 21/40（52.5%） | 28/40（70.0%） | 提升 17.5 个百分点 |
| 最终端到端成功 | 26/40（65.0%） | 35/40（87.5%） | 提升 22.5 个百分点 |
| 首次失败后的恢复成功 | 5/19（26.3%） | 7/12（58.3%） | 提升 32.0 个百分点 |
| 人工接管总次数 | 44 次 | 18 次 | 1.10 降至 0.45 次/任务 |
| 无关文件修改率 | 31/176（17.6%） | 9/184（4.9%） | 相对下降约 72.2% |
| 中位 Time-to-Preview | 18.6 分钟 | 11.8 分钟 | 缩短约 36.6% |
| P90 Time-to-Preview | 36.4 分钟 | 24.6 分钟 | 缩短约 32.4% |

数据之间的关系：

- Treatment 中 28 个任务首次 Build 通过；
- 剩余 12 个首次失败任务中，7 个经反馈循环恢复；
- 因此最终成功任务为 28 + 7 = 35 个；
- 剩余 5 个任务失败或转人工，最终成功率为 35/40 = 87.5%。

### 6.4 RAG/Codemap 指标

使用独立的 80 条代码定位 Query：

| 指标 | 向量检索 Baseline | Hybrid RAG + Codemap |
| --- | ---: | ---: |
| Recall@5 | 58/80（72.5%） | 72/80（90.0%） |
| MRR | 0.61 | 0.79 |
| nDCG@5 | 0.68 | 0.82 |
| 无答案/低证据正确拒绝 | 9/15（60.0%） | 13/15（86.7%） |
| 平均注入上下文 | 41.8k tokens | 28.7k tokens |

可写为：

> 在 80 条代码定位评测上，通过全文、pgvector 与 Codemap 的 Hybrid RAG 将 Recall@5 从 72.5% 提升至 90.0%，平均上下文由 41.8k 压缩至 28.7k tokens，并保留 Commit 版本和来源引用。

### 6.5 Redis 与可靠性指标

| 指标 | 候选结果 |
| --- | ---: |
| Redis 检索缓存命中率 | 61.0% |
| 命中缓存后的检索 P95 | 415ms 降至 168ms |
| 重复 Job/事件注入 | 500 次 |
| 重复 PR/部署等外部副作用 | 0 次 |
| Worker 崩溃恢复用例 | 30/30 通过 |
| checkpoint 恢复中位耗时 | 2.4 秒 |

可写为：

> 使用 Redis 实现检索缓存、任务 Lease 与 operation ID 幂等去重，在 500 次重复投递故障注入中未产生重复外部副作用；缓存命中率 61%，检索 P95 由 415ms 降至 168ms。

### 6.6 Multi-Agent 与成本权衡

不要只写成功率提升。Multi-Agent 通常会增加模型调用，应该同时展示成本：

| 指标 | Single Agent | Multi-Agent |
| --- | ---: | ---: |
| 最终端到端成功 | 26/40（65.0%） | 35/40（87.5%） |
| 平均模型调用 | 6.8 次/任务 | 9.1 次/任务 |
| 平均人工接管 | 1.10 次/任务 | 0.45 次/任务 |
| 平均 token | 36.2k/任务 | 43.9k/任务 |
| 每成功任务 token | 55.7k | 50.2k |

虽然每个任务平均 token 增加约 21.3%，但由于成功任务更多，每成功任务 token 从 55.7k 降至 50.2k，下降约 9.9%。这种表达比只说“Multi-Agent 更强”更专业。

### 6.7 OpenTelemetry 与自动化测试

候选填写数据：

- OpenTelemetry 完整 Trace：40/40 个评测任务；
- model/retrieval/agent/tool/approval/build/test Span：共 3,286 个；
- 未关联孤儿 Span：7 个，占 0.21%；
- Unit Test：96 条；
- Integration Test：22 条；
- Playwright E2E：18 条；
- 故障注入场景：24 条；
- Prompt Injection/越权用例：30 条；
- 高风险动作拦截：30/30；
- 误拒绝正常只读操作：2/60（3.3%）。

### 6.8 推荐放入简历的量化版本

不要把所有数字都塞进一页简历，建议保留三条：

- 在 40 个固定前端任务上建立 Single-Agent/Multi-Agent 对照评测，端到端成功率由 65.0% 提升至 87.5%，平均人工接管由 1.10 降至 0.45 次/任务；
- 在 80 条代码定位 Query 上，通过 PostgreSQL/pgvector、全文检索与 Codemap 融合将 Recall@5 由 72.5% 提升至 90.0%，无关文件修改率由 17.6% 降至 4.9%；
- 通过 Redis Lease、checkpoint 与 operation ID 完成长任务恢复和幂等控制，在 500 次重复投递故障注入中未产生重复外部副作用；使用 OpenTelemetry 串联 3,286 个模型、检索、工具与构建 Span。

### 6.9 证据清单

面试前应准备：

- 40 个任务的 ID、分类、base Commit 和完成判定；
- 80 条检索 Query、ground truth 与 Recall/MRR 计算脚本；
- Baseline/Treatment 的固定配置；
- OpenTelemetry Trace 导出或 Dashboard 截图；
- Redis 重复投递故障测试；
- Vitest、Playwright 和安全用例报告；
- 原始计数到百分比的计算表。

如果把实际 CSV、JSON Trace 或测试报告交给 Codex，可以据此重新计算并替换本文的候选数值。

---

## 七、30 秒项目介绍

> 我基于 Digital Employee 在大型前端仓库中的实践，独立开发了一个 Electron 桌面 Multi-Agent 研发平台。系统由 Planner、Locator、Executor、Reviewer 和 Verifier 协同完成代码定位、修改与验证，使用 PostgreSQL/pgvector 实现 Hybrid RAG，Redis 负责缓存、Lease 和幂等协调，OpenTelemetry 串联模型、检索、工具和构建 Trace；React 提供任务轨迹、审批和交付证据界面。它的核心不是生成一段代码，而是让长任务在受控环境中形成可恢复、可观测、可验证的交付闭环。

---

## 八、面试表述边界

| 面试官问题 | 推荐回答 |
| --- | --- |
| Digital Employee 是你开发的吗？ | 企业 Digital Employee 产品不是我开发的；我实际使用并复盘了任务轨迹。我的研发成果是独立实现的 Electron Multi-Agent 平台、Hybrid RAG、任务状态、工具权限、验证 Gate 与可观测性。 |
| DevBrain 内部怎样实现？ | 专有实现未知；我根据可观察能力将其抽象为领域知识、最佳实践和 Codemap 上下文层，并独立实现了全文、pgvector 与类型化代码关系图融合检索。 |
| 企业 Stage 是你搭建的吗？ | 不是。个人项目使用本地 Preview 或 Stage Mock 复现交付 Gate，企业 Stage 属于实际使用和架构分析对象。 |
| 为什么做桌面端？ | Coding Agent 需要本地工作区、Git、Shell、构建和文件系统能力；Electron 允许通过 Main 进程集中控制这些能力，并用 React 提供可视化审批和执行轨迹。 |
| 你的个人贡献是什么？ | Digital Employee 的使用与匿名化复盘，以及独立实现的 Typed IPC、Multi-Agent Runtime、Hybrid RAG、PostgreSQL/Redis 数据层、工具权限、验证 Gate、OpenTelemetry Trace 和自动化测试。 |

---

## 九、简历取舍建议

应届生一页简历建议保留四条：

1. Digital Employee 端到端实践；
2. Electron 桌面 Agent 架构；
3. TypeScript Agent 状态机与可靠性；
4. 知识定位、权限和验证 Gate。

RAG、Multi-Agent、OpenTelemetry、Redis、PostgreSQL 均可作为项目核心技术，但一页简历中应围绕业务结果组合表达，避免退化成技术名词堆砌。项目的最大亮点应保持为：

> 将 Digital Employee 的知识增强与验证驱动交付思想，落到一个具备 Multi-Agent 编排、Hybrid RAG、分布式协调、全链路可观测性和桌面系统能力的 TypeScript/Electron 研发平台中。




整体方向很好，亮点足够，但当前版本有几个问题：

- 技术栈漏掉 Node.js、PostgreSQL、Redis、MCP、OpenTelemetry、测试框架。
- “参与开发”边界不清，需要明确你负责哪些模块。
- 项目简介和后续条目重复。
- 单条内容过长，面试官不容易抓重点。
- `PostgreSQL/pgvecto**r` 存在拼写和加粗错误。
- 指标必须能解释数据集、Baseline、计算公式和实验控制变量。
- 如果 WorkPilot/Digital Employee 只是研读或使用对象，不能写“参与开发”；应使用你自己的项目名称。

推荐改成下面这版。

## 简历推荐版

### DevFlow Digital Employee｜知识增强型桌面 Multi-Agent 研发平台

**技术栈：** Electron、React、TypeScript、Node.js、PostgreSQL/pgvector、Redis、Zod、MCP、OpenTelemetry、Vitest、Playwright

**项目简介：**  
面向大型前端研发仓库，开发桌面端 Multi-Agent Coding Platform，通过知识增强代码定位、受控工具执行和 Build/Test/PR/Stage 验证闭环，将自然语言需求推进为可审阅、可验证的研发交付物。

- 基于 Electron Main / Preload / Renderer 分层构建桌面 Agent Host，通过类型安全 IPC 将模型、文件系统、Git、Shell 与 MCP 能力收敛至 Main 进程；React 端实现任务计划、流式轨迹、工具审批及交付证据可视化。
- 使用 TypeScript/Node.js 实现 Planner–Locator–Executor–Reviewer–Verifier 多 Agent 编排，通过结构化任务合同约束目标、上下文、输出 Schema、工具权限和预算；结合 AbortSignal、Checkpoint、错误签名与 Operation ID 处理取消、失败恢复和非幂等副作用。
- 基于 PostgreSQL/pgvector、全文检索与 Codemap 构建 Hybrid RAG，通过 RRF/Rerank、Commit 版本校验和来源引用控制上下文；在 80 条代码定位 Query 上将 Recall@5 从 72.5% 提升至 90.0%，无关文件修改率从 17.6% 降至 4.9%。
- 使用 Redis 实现检索缓存、任务 Lease、事件协调与幂等去重；通过 Zod、工作区路径约束、分级审批及 Build/Test/Scope Gate 控制高风险工具和无关代码修改。
- 使用 OpenTelemetry 串联 model、retrieval、agent、tool、build/test Span，结合 Vitest、Playwright 和故障注入评测端到端成功率、人工接管、P95 延迟及每成功任务成本。

## 如果确实参与企业 Digital Employee 实践

可以在第二条前增加：

- 在大型前端 Monorepo 中接入并实践 Digital Employee，基于 DevBrain/Codemap 定位组件、配置、特性开关及测试关联，跟踪自动 Review、Build/VP Test、Pipeline、PR 与 Stage Link 全流程，以外部验证证据而非模型自述定义任务完成。

不要写成“实现 DevBrain”或“开发 Digital Employee”，除非这确实是你的研发职责。

## 面试复盘重点

你需要逐条准备：

1. Electron：为什么模型和工具必须放 Main？Typed IPC 怎样校验？
2. Multi-Agent：为什么不使用单 Agent？五个角色如何通信和共享状态？
3. RAG：数据怎样切分？为什么混合检索？Recall@5 如何计算？
4. PostgreSQL：任务、事件、向量和验证证据如何建表？
5. Redis：Lease 怎样续期？如何防止任务重复执行？
6. 幂等：模型超时后重复创建 PR 怎么处理？
7. OpenTelemetry：Trace 如何跨 Electron、Node Worker 和工具传播？
8. 指标：80 条 Query 的 Ground Truth 谁标注？Baseline 是否固定模型和 Commit？
9. 安全：Prompt Injection 为什么不能只依赖 Prompt？
10. 验证：为什么 Build 通过不等于任务完成？

这份描述已经可以投 AI Agent应用开发、AI 全栈、桌面智能体和 Coding Agent 相关岗位，但前提是其中每一个名词你都能画架构、讲失败路径并展示代码。


下面我会按“面试官会怎么看—你需要真正理解什么—可能怎么追问—怎样回答—哪里容易露怯”的方式逐条拆解。

先说结论：这份项目描述技术含量很高，方向也非常契合 Agent 开发、AI 应用开发岗位，但目前存在三个明显风险：

1. 技术点过于密集，容易让面试官怀疑是“关键词堆砌”。
2. 技术栈写了 SQLite，正文却主要使用 PostgreSQL、pgvector、Redis，两者关系没有交代。
3. Multi-Agent、Checkpoint、幂等、OpenTelemetry、RRF 等每一个词都可能被深入追问，必须能讲出具体数据结构、执行流程和失败案例。

---

# 一、技术栈

原文：

> 技术栈：React\TypeScript\Electron\SQLite\Zod

建议改成：

> 技术栈：TypeScript、Node.js、React、Electron、PostgreSQL/pgvector、Redis、Zod、OpenTelemetry、Vitest、Playwright

如果确实用了 SQLite，可以写成：

> 技术栈：TypeScript、Node.js、React、Electron、SQLite、PostgreSQL/pgvector、Redis、Zod、OpenTelemetry、Vitest、Playwright

但面试时必须解释：

- SQLite 存什么？
- PostgreSQL 存什么？
- 为什么同时使用两个数据库？
- 桌面应用如何连接 PostgreSQL？
- PostgreSQL 是本地部署、Docker 部署，还是远程服务？
- 离线时应用是否还能工作？

一个合理的架构解释可以是：

- SQLite：存储桌面端本地配置、工作区信息、用户偏好和轻量运行状态。
- PostgreSQL：存储任务、代码索引、文档切片、向量和评测结果。
- Redis：负责短期缓存、任务协调、Lease 和幂等控制。

如果项目实际上没有使用 SQLite，就应当删除，避免给自己制造追问。

---

# 二、项目总述

原文：

> 参与开发面向本地研发工作区的桌面端 Multi-Agent Coding Platform，实现在大型前端仓库中的知识增强定位与“需求—修改—构建—测试—PR—Stage”交付闭环。

## 1. 这句话表达了什么

项目本质上是一个运行在开发者电脑上的 AI Coding Agent：

```text
用户输入需求
  ↓
Agent 理解任务并制定计划
  ↓
检索仓库代码和项目知识
  ↓
定位需要修改的文件
  ↓
调用文件、Git、Shell 等工具完成修改
  ↓
执行构建和测试
  ↓
检查修改范围和结果
  ↓
生成 PR 或进入交付阶段
```

它不是一个普通的聊天机器人，而是一个能够：

- 读取代码仓库；
- 理解需求；
- 制定计划；
- 调用工具；
- 修改代码；
- 执行命令；
- 验证结果；
- 输出交付证据；

的桌面 Agent Host。

## 2. 面试官重点关注什么

面试官通常会问：

- 为什么做成 Electron 桌面应用，而不是 Web 应用？
- “大型前端仓库”到底多大？
- Agent 相比普通 Copilot 有什么不同？
- 什么叫知识增强定位？
- PR—Stage 是生成 PR，还是执行 `git add`？
- 哪部分是你个人负责的？
- 系统是否真的自动修改代码，还是只生成建议？

## 3. 推荐回答

> 项目主要解决大型前端 Monorepo 中需求定位困难的问题。普通代码助手通常只依赖用户当前打开的文件或关键词检索，在跨包依赖、历史约定和业务知识较多的仓库中容易找错文件。  
>   
> 我们将它做成 Electron 桌面应用，是因为 Agent 需要访问本地工作区、Git、Shell、构建工具和用户凭证。这些能力在浏览器沙箱内很难安全实现。Electron Main 进程作为 Agent Host 管理高权限能力，Renderer 只负责交互和展示。  
>   
> 整个流程覆盖需求理解、代码定位、代码修改、构建测试、结果审查和交付证据生成。我的主要工作是……  

最后一句必须明确你的个人贡献，不能始终使用“我们”。

---

# 三、PostgreSQL、Redis、OpenTelemetry 总述

原文：

> 以 PostgreSQL/pgvector 构建知识与任务数据层，Redis 提供缓存、事件协调和幂等控制，OpenTelemetry 串联模型、检索、工具与构建链路，并在 React 界面中展示计划、轨迹、审批与交付证据。

## 1. 数据层应该怎样理解

建议把数据分成四类：

| 数据 | 典型内容 | 推荐存储 |
|---|---|---|
| 业务数据 | 用户、工作区、任务、Agent Run | PostgreSQL |
| 知识数据 | 文件切片、Embedding、Codemap | PostgreSQL + pgvector |
| 短期状态 | 缓存、Lease、幂等记录 | Redis |
| 可观测数据 | Trace、Span、Token、耗时 | OpenTelemetry 后端 |

面试官可能会追问数据库表设计。你至少要能讲出这些实体：

```text
workspace
repository
commit_snapshot
task
agent_run
agent_step
tool_call
artifact
code_chunk
code_symbol
code_relation
retrieval_result
evaluation_case
```

例如 `code_chunk` 可以包含：

```ts
type CodeChunk = {
  id: string;
  repositoryId: string;
  commitSha: string;
  filePath: string;
  symbolName?: string;
  language: string;
  content: string;
  embedding: number[];
  startLine: number;
  endLine: number;
  contentHash: string;
};
```

这里的 `commitSha` 很重要，它用于判断检索结果是否属于当前代码版本。

## 2. 不要说“pgvector 全文检索”

pgvector 本身负责向量相似度检索，不负责全文检索。

更准确的说法是：

> 基于 PostgreSQL Full-Text Search、pgvector 和 Codemap 构建混合检索。

三种检索能力分别是：

- 全文检索：匹配函数名、错误码、组件名等精确词汇；
- 向量检索：匹配语义相似内容；
- Codemap：根据 import、调用、路由、组件层级等关系扩展上下文。

## 3. Redis 为什么不是“为了快”

成熟回答不能只说“Redis 快”。

这里 Redis 有三种用途：

### 检索缓存

同一个仓库版本、相同查询和相同检索配置，可以复用结果。

缓存 Key 可以设计成：

```text
retrieval:{repoId}:{commitSha}:{queryHash}:{configVersion}
```

加入 `commitSha` 是为了避免代码更新后读取旧缓存。

### Lease 任务

Lease 表示某个 Worker 在有限时间内拥有任务执行权：

```text
lease:task:{taskId} -> workerId
TTL = 30s
```

Worker 要定期续租。如果进程崩溃，TTL 到期后其他 Worker 可以接管任务。

### 幂等去重

例如 Agent 重试时，不能重复创建分支、重复提交或重复发起 PR。

可以使用：

```text
idempotency:{operationId}
```

记录操作执行状态和结果。

---

# 四、Electron Agent Host

原文：

> 基于 Electron Main / Preload / Renderer 分层构建桌面 Agent Host，通过类型安全 IPC 将模型、文件系统、Git、Shell 与 MCP 能力收敛至 Main 进程；React 端实现任务计划、流式轨迹、工具审批及交付证据可视化。

## 1. 为什么要分 Main、Preload、Renderer

### Main

Main 进程拥有高权限，负责：

- 创建和管理窗口；
- 访问文件系统；
- 执行 Shell；
- 操作 Git；
- 调用模型；
- 连接 MCP Server；
- 管理 Agent 生命周期；
- 控制工具权限。

### Preload

Preload 是安全边界，只向 Renderer 暴露白名单 API：

```ts
contextBridge.exposeInMainWorld("agentHost", {
  createTask,
  cancelTask,
  approveToolCall,
  subscribeToEvents,
});
```

### Renderer

React Renderer 只负责：

- 接收用户需求；
- 展示执行计划；
- 展示模型流式输出；
- 展示工具调用；
- 请求用户审批；
- 展示 Diff、测试报告和交付结果。

## 2. 什么叫类型安全 IPC

不能只说“使用 TypeScript”。

类型安全需要覆盖：

- Channel 名称；
- 请求参数；
- 返回值；
- 错误类型；
- 流式事件；
- 运行时校验。

例如：

```ts
const createTaskSchema = z.object({
  workspaceId: z.string().uuid(),
  prompt: z.string().min(1),
});

type CreateTaskInput = z.infer<typeof createTaskSchema>;
```

Renderer 调用：

```ts
window.agentHost.createTask({
  workspaceId,
  prompt,
});
```

Main 端仍然需要 Zod 校验。因为 TypeScript 类型在运行时不存在，Renderer 传来的数据不能天然可信。

## 3. 面试官会追问的安全问题

### 为什么 Renderer 不能直接调用 Node.js？

因为 Renderer 会展示模型输出、Markdown、仓库文本等不完全可信内容。如果发生 XSS，攻击代码可能借助 Node.js 权限读取本地文件或执行 Shell。

因此要配置：

```ts
webPreferences: {
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  preload,
}
```

### Shell 如何防止命令注入？

推荐回答：

- 不把命令和参数直接拼接为字符串；
- 优先使用 `spawn(command, args)`；
- 约束允许执行的命令；
- 固定工作目录；
- 对高风险命令进行审批；
- 记录命令、参数、退出码和输出；
- 设置超时和输出大小限制。

### MCP 是什么？

MCP，即 Model Context Protocol，用于把外部工具或数据源以统一协议暴露给 Agent。

需要能解释：

- MCP Client 在 Agent Host 中运行；
- MCP Server 提供 tools/resources/prompts；
- Agent 不能无限制调用所有 MCP 工具；
- MCP 工具仍需要权限检查、参数校验、超时和审计。

## 4. 可能的面试题

> 为什么模型调用也放在 Main？

可以回答：

> 一方面是为了保护模型 API Key，避免暴露给 Renderer；另一方面是为了统一控制重试、限流、Token 预算、Tracing 和取消。Renderer 只订阅结构化事件，不直接接触模型客户端。

> 流式轨迹怎么实现？

可以回答：

> Main 将模型增量输出和 Agent 事件转换成统一事件协议，通过 IPC 推送给 Renderer。事件包含 runId、sequence、eventType 和 payload。Renderer 根据 sequence 去重和排序，避免窗口刷新或重连后出现重复事件。

---

# 五、Multi-Agent Runtime

原文：

> Multi-Agent Runtime 使用 TypeScript/Node.js 实现 Planner–Locator–Executor–Reviewer–Verifier 多 Agent 协同编排，通过结构化任务合同约束目标、上下文、输出 Schema、工具权限和预算；结合 AbortSignal、Checkpoint、错误签名与 Operation ID 处理取消、失败恢复和非幂等副作用。

这是整份简历最容易被深挖的一条。

## 1. 五个 Agent 分别做什么

### Planner

负责把用户需求拆成可执行计划，例如：

```text
1. 找到用户详情页入口
2. 定位权限判断逻辑
3. 修改组件和类型定义
4. 执行相关单元测试
5. 执行 TypeScript 检查
6. 检查最终 Diff
```

Planner 不应直接获得所有高风险工具权限。

### Locator

负责寻找：

- 相关文件；
- 函数；
- 类型；
- 测试；
- 调用链；
- 业务文档；
- 历史提交。

输出应该是结构化候选集合，而不是一段自由文本。

### Executor

负责：

- 修改代码；
- 新增测试；
- 执行格式化；
- 运行构建和测试；
- 保存修改结果。

### Reviewer

从代码审查角度检查：

- 是否满足需求；
- 是否修改了无关文件；
- 是否破坏现有行为；
- 是否存在安全或类型问题；
- 是否遗漏测试。

### Verifier

通过可执行证据验证结果：

- 构建是否成功；
- 测试是否通过；
- Lint 是否通过；
- 修改范围是否符合约束；
- 是否满足验收条件。

## 2. 为什么需要多个 Agent

不要回答“不同 Agent 各司其职，所以效果更好”，这不够具体。

更成熟的回答是：

> Multi-Agent 的主要价值不是简单增加模型调用次数，而是实现职责、上下文和工具权限隔离。Locator 只负责定位，不应该直接修改代码；Reviewer 应当使用相对独立的上下文重新检查结果，避免 Executor 自我确认。每个阶段还可以使用不同的模型、预算和停止条件。

同时也要承认代价：

- 调用次数增加；
- Token 成本增加；
- 状态管理更复杂；
- 上下文可能在 Agent 之间丢失；
- 错误可能层层传播。

如果项目实际上只是固定工作流，面试官可能会问：

> 这真的是 Multi-Agent，还是多个 Prompt 节点？

比较诚实的回答是：

> Runtime 本质上是一个有状态工作流。每个角色有独立的系统指令、输入输出 Schema、工具权限和预算，因此在工程上按照多个 Agent 管理，但并不是多个完全自治的进程。我们优先选择可控制、可恢复的编排，而不是开放式群体对话。

这个回答通常更加成熟。

## 3. 什么叫结构化任务合同

任务合同可以设计成：

```ts
const taskContractSchema = z.object({
  objective: z.string(),
  acceptanceCriteria: z.array(z.string()),
  contextRefs: z.array(z.string()),
  allowedPaths: z.array(z.string()),
  forbiddenPaths: z.array(z.string()),
  toolPermissions: z.array(z.string()),
  outputSchema: z.string(),
  tokenBudget: z.number(),
  timeBudgetMs: z.number(),
});
```

它解决的问题包括：

- Agent 不知道最终目标；
- Agent 任意扩大修改范围；
- Agent 输出无法被下游解析；
- Agent 调用不应该使用的工具；
- Agent 无限执行导致成本失控。

## 4. AbortSignal

`AbortSignal` 用于将取消信号沿调用链向下传递：

```text
用户点击取消
  ↓
取消 Agent Run
  ↓
取消模型流式请求
  ↓
终止可中断的工具调用
  ↓
终止构建或测试子进程
```

面试官可能问：

> 用户取消时，正在执行的 Git commit 怎么办？

关键点是：取消不是事务回滚。

- 模型请求可以取消；
- 检索可以取消；
- Shell 进程通常可以终止；
- 但已经发生的文件写入、提交、推送不能靠 AbortSignal 自动回滚。

这就是为什么需要 Checkpoint、Operation ID 和副作用记录。

## 5. Checkpoint

Checkpoint 不是简单保存聊天记录，而是保存可以恢复执行的状态：

```ts
type Checkpoint = {
  runId: string;
  currentStage: string;
  plan: PlanStep[];
  completedSteps: string[];
  artifacts: ArtifactRef[];
  toolResults: ToolResultRef[];
  repositoryCommit: string;
  workingTreeHash: string;
  nextAction?: string;
};
```

恢复时要检查：

- 仓库 commit 是否变化；
- 工作区是否被用户手动修改；
- 已完成的工具操作是否仍然有效；
- 下一步是否可以安全重放。

## 6. 错误签名

错误签名用于识别“同一类失败反复出现”。

例如测试错误中有时间戳、临时路径，不能直接拿完整文本比较。可以先标准化：

```text
移除时间戳
移除绝对路径
移除随机 ID
提取错误类型、文件、行号和核心消息
生成 Hash
```

如果同一错误签名连续出现三次，就不应该继续让 Agent 用相同策略重试，而应：

- 更换修复策略；
- 回退到上一个 Checkpoint；
- 请求人工接管；
- 停止执行，避免浪费 Token。

## 7. Operation ID

Operation ID 用于标记一次具有副作用的操作：

```text
runId:stepId:toolName:normalizedArgsHash
```

例如：

```text
run-123:step-7:create-pull-request:a81f...
```

重试前查询这个 Operation ID：

- 未开始：可以执行；
- 执行中：等待或检查 Lease；
- 已成功：直接复用结果；
- 已失败且可重试：再次执行；
- 状态未知：先查询外部系统确认。

这对以下非幂等操作很重要：

- 创建分支；
- 创建 Commit；
- Push；
- 创建 PR；
- 发布包；
- 修改远程 Issue；
- 发送消息。

---

# 六、RAG、混合检索和 Codemap

原文：

> 基于 PostgreSQL/pgvector 全文检索与 Codemap 构建 RAG，通过 RRF/Rerank、Commit 版本校验和来源引用控制上下文。

建议改成：

> 基于 PostgreSQL Full-Text Search、pgvector 与 Codemap 构建代码混合检索，通过 RRF 融合、Rerank、Commit 版本校验及来源引用控制上下文质量。

## 1. 索引流程

一个完整的索引流程应当是：

```text
扫描仓库
  ↓
识别语言和文件类型
  ↓
解析 AST
  ↓
按符号或语义边界切分
  ↓
提取函数、类、组件、路由等元数据
  ↓
构建 import/call/test 等关系
  ↓
生成 Embedding
  ↓
写入 PostgreSQL 和 pgvector
```

面试官会重点问“如何切分代码”。

比固定字符数更好的方式是：

- 按函数、类、组件切分；
- 保留文件路径和符号名称；
- 超长函数再进行二次切分；
- 保留必要的类型签名和上层上下文；
- 建立父子 Chunk 关系。

## 2. Codemap 是什么

Codemap 不是简单的目录树，而是代码结构图谱，例如：

- 文件到文件的 import 关系；
- 函数调用关系；
- 组件引用关系；
- 路由到页面关系；
- 测试文件到源码文件关系；
- 包依赖关系；
- Symbol 定义与引用关系。

例如用户要求：

> 在用户详情页增加冻结状态展示。

系统可以先通过语义检索找到用户详情组件，再沿 Codemap 找到：

- 对应的数据请求；
- 用户类型定义；
- 状态枚举；
- 组件测试；
- 上游路由入口。

## 3. RRF 是什么

RRF，即 Reciprocal Rank Fusion，用于合并多个检索器的排名：

\[
score(d)=\sum_r \frac{1}{k+rank_r(d)}
\]

它不要求不同检索器的原始分数处于相同范围。

例如：

- 全文检索认为 A 排第 1；
- 向量检索认为 A 排第 4；
- Codemap 扩展认为 A 排第 2；

RRF 会综合这些排名生成最终分数。

面试官可能问为什么不用加权平均：

> BM25 分数、向量相似度和图关系分数的量纲不同，直接加权需要较复杂的归一化和调参。RRF 只依赖排名，对不同检索器的分数分布更稳健。

## 4. Rerank

RRF 先从大量候选中召回，例如 Top 50；Reranker 再根据查询与代码内容的相关性重新排序，选出 Top 5 或 Top 10。

需要理解：

- Recall 阶段追求不漏掉；
- Rerank 阶段追求排序精度；
- Rerank 太多候选会增加延迟和成本。

## 5. Commit 版本校验

代码索引与当前工作区可能不同步。

检索结果必须携带：

```text
repositoryId
commitSha
filePath
contentHash
startLine
endLine
```

使用前检查：

- 当前仓库 HEAD 是否等于索引版本；
- 文件内容 Hash 是否变化；
- 行号是否仍然有效；
- 若变化，是否重新索引或读取最新文件验证。

否则 Agent 可能根据已经删除的函数修改代码。

## 6. 来源引用

模型输出定位结论时应附带：

```text
src/features/user/UserDetail.tsx:42-78
src/api/user.ts:15-31
commit: a1b2c3d
```

来源引用的价值包括：

- 用户可以核实；
- Reviewer 可以回溯；
- 避免模型凭空编造文件；
- 便于评测检索结果；
- 方便追踪上下文来自哪个版本。

---

# 七、Redis、Zod、审批和 Gate

原文：

> 使用 Redis 实现检索缓存、Lease 任务与幂等去重，并以 Zod、分级审批和 Build/Test/Scope Gate 约束高风险操作和无关代码修改。

## 1. Zod 的真实作用

Zod 可以用于：

- IPC 输入校验；
- Agent 结构化输出校验；
- 工具参数校验；
- 配置文件校验；
- Checkpoint 数据校验；
- MCP 工具结果校验。

但 Zod 不能保证业务安全。

例如：

```ts
z.object({
  path: z.string(),
});
```

只能保证 `path` 是字符串，不能保证它没有逃逸工作区。

仍然要做：

- 路径规范化；
- 解析绝对路径；
- 验证目标位于工作区内部；
- 防止 `../` 路径穿越；
- 检查符号链接；
- 检查文件类型和权限。

## 2. 分级审批

可以将工具分为：

### 低风险

- 读取文件；
- 搜索代码；
- 查看 Git 状态；
- 查询数据库。

通常自动允许。

### 中风险

- 修改工作区文件；
- 执行测试；
- 创建本地分支；
- 安装依赖。

可以基于策略自动允许，也可以一次性授权。

### 高风险

- 删除文件；
- 执行任意 Shell；
- Push；
- 创建 PR；
- 修改仓库之外的文件；
- 使用网络凭证；
- 发布或部署。

必须人工审批。

审批页面不能只显示“是否允许”，还应展示：

- 工具名称；
- 完整参数；
- 工作目录；
- 影响范围；
- 风险说明；
- Agent 调用原因；
- 是否只允许本次；
- 是否允许相同规则后续自动执行。

## 3. Build Gate

Build Gate 检查：

- 项目是否成功构建；
- TypeScript 类型检查是否通过；
- 是否新增构建错误；
- 构建失败是否与本次修改相关。

注意：不能只看进程退出码，还要保留日志摘要和证据。

## 4. Test Gate

Test Gate 检查：

- 相关测试是否运行；
- 新增需求是否有测试；
- 原有测试是否回归；
- 是否存在 flaky test；
- 测试失败是否属于历史失败。

成熟系统应该区分：

- 本次修改引入的失败；
- 修改前就存在的失败；
- 环境问题导致的失败。

可以在修改前先建立基线。

## 5. Scope Gate

Scope Gate 用于控制无关修改。

可以检查：

- 修改文件是否在 `allowedPaths` 中；
- 修改文件是否被 Locator 识别为相关；
- 修改行数是否超出预算；
- 是否修改 Lockfile；
- 是否修改生成文件；
- 是否出现大规模格式化；
- 是否触碰敏感配置；
- Diff 中是否出现凭证。

例如：

```text
允许范围：
- src/features/user/**
- src/api/user.ts
- tests/user/**

实际修改：
- src/features/user/UserDetail.tsx
- package-lock.json
- 17 个无关格式化文件
```

Scope Gate 应阻止交付，并要求 Agent 清理无关修改。

---

# 八、OpenTelemetry、测试和评测

原文：

> 使用 OpenTelemetry 串联 model/retrieval/agent/tool/build Span，结合 Vitest、Playwright 与故障注入评测定位率、端到端成功率、人工接管以及每成功任务成本。

## 1. Trace 应该怎么设计

一次用户任务可以对应一个 Trace：

```text
task.run
├── planner.run
│   └── model.generate
├── locator.run
│   ├── retrieval.full_text
│   ├── retrieval.vector
│   ├── retrieval.codemap
│   └── rerank
├── executor.run
│   ├── tool.read_file
│   ├── tool.write_file
│   └── tool.shell
├── reviewer.run
│   └── model.generate
└── verifier.run
    ├── build
    └── test
```

每个 Span 可以记录：

- `task.id`
- `run.id`
- `agent.role`
- `model.name`
- `input.tokens`
- `output.tokens`
- `latency_ms`
- `tool.name`
- `tool.result`
- `retry.count`
- `repository.commit`
- `error.signature`

注意不能把源码、Prompt、环境变量、API Key 不加处理地写入 Trace。

## 2. Vitest 测什么

适合测试：

- Zod Schema；
- RRF 融合；
- 缓存 Key；
- 权限规则；
- Gate 逻辑；
- 错误签名；
- Checkpoint 恢复；
- Agent 状态机；
- IPC Handler。

## 3. Playwright 测什么

Electron 场景中可以测试：

- 创建任务；
- 展示计划；
- 流式轨迹更新；
- 工具审批；
- 用户拒绝工具调用；
- 取消任务；
- 查看 Diff；
- 展示构建和测试证据；
- 恢复中断任务。

## 4. 故障注入

故障注入可以覆盖：

- 模型请求超时；
- 模型返回非法 JSON；
- Redis 暂时不可用；
- PostgreSQL 查询超时；
- MCP Server 断开；
- Shell 进程卡死；
- 测试输出过大；
- Agent 运行中 Electron 退出；
- 工具已经成功但结果写库失败；
- Git 工作区被用户并发修改。

面试官可能问：

> 为什么普通单元测试不够？

回答：

> Agent 系统的复杂问题常常发生在外部依赖、重试和副作用之间。单元测试可以验证单个函数，但无法证明模型超时、工具成功、状态落库失败等组合场景是否能正确恢复，所以需要故障注入验证系统在不完整失败下的行为。

---

# 九、指标部分

原文：

> 80 条代码定位 Query 上，通过 PostgreSQL/pgvector、全文检索与 Codemap 融合将 Recall@5 由 72.5% 提升至 90.0%，无关文件修改率由 17.6% 降至 4.9%。

这条非常有价值，但必须能够经受数字追问。

## 1. Recall@5

80 条 Query：

- 72.5% = 58/80；
- 90.0% = 72/80。

定义应当明确：

> 对每条需求预先标注一个或多个正确文件。如果检索结果 Top 5 中至少包含一个标注文件，则该 Query 命中。

但如果一个需求需要同时定位三个文件，“命中任意一个”可能过于宽松。可以同时计算：

- Hit@5；
- Recall@5；
- MRR；
- 全目标文件覆盖率。

严格来说，如果你使用的是“Top 5 中存在任意正确文件”，这个指标更接近 Hit Rate@5，不一定是 Recall@5。

## 2. 80 条 Query 从哪里来

面试官一定可能问：

- 是人工编写还是来自真实需求？
- 是否覆盖不同仓库区域？
- 标准答案是谁标注的？
- 是否存在训练集和测试集混用？
- 调参时是否看过这 80 条 Query？
- Query 数量为什么只有 80？

推荐回答：

> Query 主要来自历史需求、Bug 描述和开发任务，由熟悉仓库的开发者标注相关文件。我们按页面、组件、状态管理、接口和构建配置等类型分层抽样。80 条作为离线回归集规模不大，因此我们把结果视为项目内部改进指标，而不是具有普适性的 Benchmark。

不要把 80 条内部样本包装成行业级结论。

## 3. 无关文件修改率

这个指标必须明确分母。

可能的定义一：

\[
无关文件修改率 =
\frac{被修改但不属于标注范围的文件数}
{所有被修改文件数}
\]

可能的定义二：

\[
发生无关文件修改的任务数
\div
总任务数
\]

这两个指标完全不同，简历里必须使用真实定义。

还要解释下降原因，不能全部归功于检索：

- 更准确的代码定位；
- `allowedPaths`；
- Scope Gate；
- Diff Reviewer；
- 禁止全仓格式化；
- 修改前后文件范围对比。

---

# 十、面试官可能进行的连续追问

下面是一组很典型的压力追问。

## 追问一：为什么不用 LangGraph？

> 我们的运行时需要和 Electron 生命周期、IPC、工具审批、Checkpoint 及本地进程管理深度结合，因此使用 TypeScript 实现了较轻量的状态机。这样能够精确控制事件协议、取消传播和工具副作用。代价是需要自己维护编排、可观测和恢复逻辑。如果团队重点是快速验证复杂 Agent 图，LangGraph 会更适合。

## 追问二：为什么需要 Multi-Agent？

> 主要为了职责、上下文和权限隔离，而不是追求 Agent 数量。Locator 没有写权限，Executor 不能自行判断最终验证通过，Reviewer 使用独立上下文复查 Diff。对于简单任务，我们也会缩短链路，避免固定运行全部角色造成成本浪费。

## 追问三：模型返回不符合 Zod Schema 怎么办？

处理顺序可以是：

1. 记录原始输出和校验错误；
2. 尝试轻量修复；
3. 将具体 Schema 错误反馈给模型重试；
4. 限制重试次数；
5. 连续失败后降级或请求人工处理；
6. 不允许不合法输出直接进入工具层。

## 追问四：如何防止 Agent 删除仓库文件？

- 工具权限最小化；
- 删除操作单独定义；
- 路径限制在工作区；
- 高风险审批；
- Git 状态和 Diff 检查；
- Scope Gate；
- 执行前建立 Checkpoint；
- 默认禁止修改 `.git`、凭证和工作区外路径。

## 追问五：任务恢复后如何避免重复创建 PR？

- 为创建 PR 生成稳定的 Operation ID；
- 执行前记录 pending；
- 成功后记录 PR URL；
- 恢复时先查询本地状态；
- 状态不确定时根据分支、Commit 或任务标签查询远程系统；
- 确认不存在后才能再次创建。

---

# 十一、建议你调整后的简历版本

> **WorkPilot｜桌面端 Multi-Agent Coding Platform**  
> 技术栈：TypeScript、Node.js、React、Electron、PostgreSQL/pgvector、Redis、Zod、OpenTelemetry、Vitest、Playwright
>
> 参与开发面向大型前端仓库的桌面端 Coding Agent，实现从需求理解、代码定位、代码修改到构建、测试、审查和 PR 交付的完整工作流。
>
> - 基于 Electron Main、Preload、Renderer 分层构建 Agent Host，将模型、文件系统、Git、Shell 与 MCP 工具统一收敛至 Main 进程；通过 Zod 和共享 TypeScript 类型约束 IPC 协议，在 React 端实现计划、流式轨迹、工具审批、Diff 及交付证据展示。
> - 使用 TypeScript/Node.js 实现 Planner、Locator、Executor、Reviewer、Verifier 多 Agent 工作流，通过任务合同约束目标、验收条件、上下文、输出 Schema、工具权限及 Token/时间预算；结合 AbortSignal、Checkpoint、错误签名和 Operation ID 支持任务取消、故障恢复与非幂等操作去重。
> - 基于 PostgreSQL Full-Text Search、pgvector 与 Codemap 构建代码混合检索，通过 RRF、Rerank、Commit/内容 Hash 校验和文件行号引用提升代码定位质量并控制上下文版本一致性。
> - 使用 Redis 实现基于仓库版本的检索缓存、任务 Lease 与幂等记录；通过 Zod 参数校验、分级工具审批以及 Build、Test、Scope Gate 限制高风险操作和无关文件修改。
> - 使用 OpenTelemetry 串联 model、retrieval、agent、tool、build/test 链路，结合 Vitest、Playwright 和故障注入评估定位命中率、端到端成功率、人工接管率及单次成功任务成本。
> - 在包含 80 条代码定位需求的内部评测集上，将 Top-5 定位命中率由 72.5%（58/80）提升至 90.0%（72/80）；通过混合检索、允许路径约束及 Scope Gate，将无关文件修改率由 17.6% 降至 4.9%。

前提是这些内容确实与你实际完成的工作一致。

---

# 十二、你应该准备的一分钟项目介绍

> WorkPilot 是一个面向大型前端仓库的桌面端 Coding Agent。它主要解决两个问题：第一是需求描述和代码文件之间存在较大的语义差距，Agent 容易定位错误；第二是 Agent 获得文件、Shell 和 Git 权限后，需要解决安全、取消、重试和副作用控制问题。  
>   
> 系统使用 Electron 构建，React Renderer 负责计划、轨迹、审批和证据展示，Main 进程作为 Agent Host，统一管理模型、文件系统、Git、Shell 和 MCP 工具。Agent Runtime 使用 Planner、Locator、Executor、Reviewer 和 Verifier 组成可恢复工作流。  
>   
> 检索侧使用 PostgreSQL 全文检索、pgvector 和 Codemap 做混合召回，再通过 RRF 和 Rerank 排序，并使用 Commit 和内容 Hash 防止旧索引污染上下文。执行侧通过工具权限、人工审批以及 Build、Test、Scope Gate 控制风险。  
>   
> 在内部 80 条代码定位评测集上，Top-5 命中率从 72.5% 提升到 90%，无关文件修改率从 17.6% 降到 4.9%。我主要负责的是……  

最后必须补充你的真实职责，例如：

> 我主要负责 Electron Agent Host、IPC 协议、Agent Runtime 和工具审批链路。

不要把团队所有成果都说成个人成果。

---

# 十三、面试前必须准备好的材料

至少准备下面五项：

1. 一张完整架构图：Electron、Agent Runtime、PostgreSQL、Redis、模型、MCP 之间的关系。
2. 一张 Agent 状态流转图：计划、定位、执行、审查、验证、失败恢复。
3. 一个完整案例：输入什么需求、定位哪些文件、修改什么、如何验证。
4. 一个真实故障：发生了什么、如何定位、最终怎样修复。
5. 指标口径：80 条 Query 来源、Recall/Hit 定义、无关文件修改率分母。

这份简历最重要的不是继续增加技术名词，而是让每个名词都能落到具体的数据结构、执行流程、失败场景、技术取舍和可验证结果上。