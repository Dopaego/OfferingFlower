# AI Agent / AI 应用开发校招面试题库（按简历逐题映射）

更新日期：2026-08-18

适用岗位：AI Agent 开发、LLM 应用开发、AI Coding、全栈 AI 应用、Agent 平台工程。

说明：分析以你在对话中粘贴的简历正文为准；两个 `file+` 本地资源链接没有作为网络资料引用。网络面经用于归纳近期题型，不代表公司官方题库；技术定义以官方规范和文档为准。

## 一、标签说明

### 1. 题型与优先级

- `P0`：必须会，与你的简历强相关或属于 Agent 岗高频基础。
- `P1`：高频追问，决定回答是否有工程深度。
- `P2`：进阶加分项，应届生能讲清会明显加分。
- `基础`：定义、原理、基本机制。
- `追问`：权衡、失败模式、边界条件。
- `场景`：给出事故或需求，要求现场设计。
- `手写`：代码、SQL、伪代码或数据结构题。

### 2. 简历来源代码

| 代码 | 对应简历内容 |
|---|---|
| `B0` | 单纯的 LLM / Agent / AI 应用开发通用基础，并非由某一句简历直接触发 |
| `R1` | 技术栈：TypeScript、Node.js、React、Electron、PostgreSQL/pgvector、Redis、Zod、OpenTelemetry、Vitest、Playwright |
| `R2` | 桌面端 Multi-Agent Coding Platform；大型前端仓库；“需求—修改—构建—测试—PR—Stage”交付闭环；计划、轨迹、审批、证据 UI |
| `R3` | Electron Main / Preload / Renderer；Agent Host；类型安全 IPC；模型、文件系统、Git、Shell、MCP 能力收敛到 Main |
| `R4` | Planner–Locator–Executor–Reviewer–Verifier；结构化任务合同；工具权限与预算；AbortSignal、错误签名、Operation ID、失败恢复 |
| `R5` | PostgreSQL/pgvector、全文检索、Codemap、RAG、RRF/Rerank、Commit 校验、来源引用 |
| `R6` | Redis 检索缓存、Lease 任务、事件协调、幂等去重；Zod、分级审批、Build/Test/Scope Gate |
| `R7` | OpenTelemetry 的 model/retrieval/agent/tool/build Span；Vitest、Playwright、故障注入和 Agent 评测 |
| `R8` | 80 条 Query；Recall@5 72.5%→90.0%；无关文件修改率 17.6%→4.9%；成功率、人工接管、每成功任务成本 |

同一题可以有多个来源。例如 `[R4][R6]` 表示它同时由 Runtime 和 Redis/安全 Gate 两条简历触发。

## 二、104 道分角度题库

## A. LLM、Agent 与 Harness 基础

1. **P0｜基础｜[B0]** Agent、Chatbot、Workflow 三者有什么区别？从路径是否预定义、状态、工具、副作用和自主决策五个维度比较。
2. **P0｜基础｜[B0][R4]** 一个完整 Agent Loop 包含哪些阶段？如何定义完成、失败、阻塞、转人工和最大步数？
3. **P0｜追问｜[B0][R2]** 哪些任务不该使用 Agent，而应该使用普通代码、单次 LLM 调用或确定性 Workflow？你的交付闭环中哪些步骤其实是 Workflow？
4. **P0｜基础｜[B0][R4]** ReAct、Plan-and-Execute、Reflection/Evaluator-Optimizer 分别适合什么任务？它们的成本和失败模式是什么？
5. **P1｜基础｜[B0]** Decoder-only Transformer 如何生成下一个 Token？Self-Attention 中 Q、K、V 的直觉和计算复杂度是什么？
6. **P1｜基础｜[B0][R5]** Tokenizer、Embedding、位置编码、KV Cache 分别解决什么问题？代码 Embedding 与普通文本 Embedding 的要求有何不同？
7. **P1｜追问｜[B0][R4]** Temperature、top-p、seed 和模型非确定性会怎样影响规划、工具参数及评测复现？哪些环节应尽量确定性？
8. **P1｜基础｜[B0][R2][R4]** Model、Agent、Agent Harness、Framework、Runtime 是什么关系？可靠性应由模型承担，还是由 Harness/Runtime 的状态、工具、验证和恢复机制承担？

本组答题底线：不能把“调用 LLM + 多写几个角色 Prompt”直接等同于 Agent；必须能说明何时不需要 Agent。

## B. Context Engineering

9. **P0｜基础｜[B0][R5]** Prompt Engineering 与 Context Engineering 有什么区别？Prompt 在 Context 中处于什么位置？
10. **P0｜基础｜[B0][R4][R5]** 一次 Coding Agent 推理的 Context 应由哪些部分组成：系统约束、任务合同、计划、代码证据、工具 Schema、工具结果、历史摘要？优先级如何排？
11. **P0｜追问｜[B0][R5]** 什么是 Lost in the Middle、Context Rot 和注意力稀释？上下文窗口足够大时为何仍不能把整个仓库塞进去？
12. **P0｜追问｜[B0][R5]** 预先 RAG、Just-in-time 工具检索和 Agent 自主浏览代码各有什么优缺点？你的 Locator 应如何混合使用？
13. **P1｜场景｜[B0][R4][R5]** 给 Planner、Locator、Executor、Reviewer 分配 Context Token 预算时，你会保留和删除什么？为什么不同角色不应看到完全相同的上下文？
14. **P0｜场景｜[B0][R4][R7]** 长任务即将超过窗口，如何做 Compaction？摘要必须保留哪些结构化状态，如何避免丢掉否定约束、Operation ID、未决问题和验证证据？
15. **P0｜安全｜[B0][R3][R5][R6]** README、Issue、网页或工具结果里包含 Prompt Injection 时，如何区分“数据”与“指令”？Context 的来源和信任等级怎样表示？
16. **P1｜追问｜[B0][R4][R5]** Context Cache 的键、失效和版本应怎样设计？子 Agent 的 Context 隔离如何减少污染，又会引入哪些信息损失？

本组答题底线：Context 是“某次推理真正让模型看到的有限 Token 视图”，不是聊天记录或数据库的同义词。

## C. Memory

17. **P0｜基础｜[B0]** Memory、Context、RAG 和数据库/向量库分别解决什么问题？为什么“把历史存进 pgvector”不等于已经实现 Agent Memory？
18. **P0｜基础｜[B0][R4]** Working、Episodic、Semantic、Procedural Memory 分别是什么？Coding Agent 的计划、历史事故、仓库事实和 Skill 各属于哪类？
19. **P0｜设计｜[B0][R4][R6]** 哪些信息应该写入长期 Memory？谁负责写入，写入前如何做事实校验、去重、作用域和敏感信息过滤？
20. **P0｜设计｜[B0][R4][R5]** Memory 召回应结合相似度、时间、重要度、任务阶段、用户/仓库作用域和来源权威性中的哪些信号？
21. **P0｜场景｜[B0][R5]** Memory 记录“项目使用 React 18”，当前仓库已升级 React 20；如何检测过期、处理冲突并保留审计历史？
22. **P1｜安全｜[B0][R3][R6]** 用户偏好、源码片段、密钥和模型推断结果的保存策略应有何不同？如何支持查询、修正、过期和彻底删除？
23. **P1｜评测｜[B0][R7]** 如何评估 Memory，而不只是评向量召回？请设计写入准确率、召回精确率、过期召回率、有害记忆率、下游增益和 Token 成本指标。
24. **P0｜场景｜[B0][R2][R4]** Coding 任务跨越多个进程重启和 Context 重置，怎样用 Checkpoint、结构化笔记和 Memory 恢复，而不重复已产生的副作用？

一句话区分：数据库解决“存在哪里”；RAG 解决“怎样找外部证据”；Memory 解决“什么值得记、何时召回和遗忘”；Context Engineering 解决“本轮让模型看到什么”。

## D. Skill 生态

25. **P0｜基础｜[B0]** Skill、Prompt、Tool、MCP Server、Workflow 和 RAG 的边界分别是什么？为什么 Skill 更接近可复用的“程序性知识包”？
26. **P0｜基础｜[B0]** Skill 的 Progressive Disclosure 是什么？解释 Discovery、Activation、Execution 三阶段及其对 Context 成本的影响。
27. **P1｜设计｜[B0][R4]** 一个高质量 Skill 应包含哪些内容：适用/不适用条件、输入输出合同、步骤、权限、脚本、References、Assets、错误回退、版本和测试？
28. **P0｜追问｜[B0][R7]** Skill 路由怎样评测？触发 Precision/Recall、漏触发、误触发、任务成功率分别怎么构造数据集？
29. **P1｜场景｜[B0][R4]** 两个 Skill 同时匹配、指令冲突或依赖不同工具版本时，由谁决定优先级？如何组合、锁版本和降级？
30. **P0｜安全｜[B0][R3][R6]** 第三方 Skill 可携带脚本和资源，如何处理签名、来源、依赖供应链、沙箱、网络权限、文件范围和恶意指令？
31. **P0｜评测｜[B0][R7]** 如何做“有 Skill / 无 Skill / 旧版本 Skill”对照实验？除了 Pass Rate，为什么还要比较 Token、延迟和安全违规？
32. **P2｜系统设计｜[B0][R3][R4]** 设计一个企业内部 Skill Registry：发现、语义路由、权限、版本、灰度、审计、撤回和跨 Agent 复用分别怎样实现？

本组答题底线：Skill 生态定义尚不完全统一，回答时要先声明语境；不要把 Skill 说成 Tool 或 MCP 的别名。

## E. Tool Calling、MCP 与结构化输出

33. **P0｜基础｜[B0][R3][R4]** Function/Tool Calling 的完整执行链路是什么？模型、Host 和真实工具分别负责哪一步？
34. **P0｜追问｜[R1][R3][R4][R6]** TypeScript 已有静态类型，为什么 IPC、模型输出和 MCP 参数仍要 Zod 运行时校验？Schema 合法为何仍不代表语义安全？
35. **P0｜设计｜[B0][R3]** 什么是适合模型使用的好 Tool Schema？为什么万能的 `execute(action, params: any)` 是坏设计？
36. **P0｜基础｜[B0][R3]** MCP Host、Client、Server 分别是什么？Tools、Resources、Prompts 三类原语各解决什么问题？
37. **P1｜基础｜[B0][R3]** MCP 的 stdio 与 Streamable HTTP 适用场景有何不同？能力发现、协议版本、通知、长任务和取消应该怎样处理？
38. **P0｜对比｜[B0][R3]** MCP 与 Function Calling 有什么区别和连接关系？为什么 MCP 既不是 Agent，也不会自动完成规划和授权？
39. **P0｜场景｜[B0][R4][R6]** 工具出现超时、429、畸形 JSON、部分成功、连接中断或返回互相冲突的结果时，Runtime 如何分类错误和决定重试、回退、核对或转人工？
40. **P0｜场景｜[R3][R4][R6]** 一个创建 PR 的工具调用超时，结果未知；能否直接重试？请给出 Operation ID、外部幂等键、操作台账和 Reconcile 流程。

本组答题底线：模型只产生调用意图；Host 才负责校验、授权、审批、执行和审计。

## F. Planning、Multi-Agent Runtime 与恢复

41. **P0｜基础｜[R4]** Planner、Locator、Executor、Reviewer、Verifier 各自的输入、输出、工具权限和成功标准是什么？Reviewer 与 Verifier 有何本质区别？
42. **P0｜追问｜[B0][R4][R8]** 为什么一定要 Multi-Agent？与一个更强的单 Agent 相比，如何用消融实验证明角色拆分带来净收益，而不是只增加 Token 和延迟？
43. **P0｜设计｜[R4]** 你的编排更接近状态机、DAG、Actor、Supervisor-Workers 还是自由对话？哪些步骤可并行，哪些必须串行？
44. **P0｜基础｜[R4][R6]** 结构化 Task Contract 至少包含哪些字段：Goal、Non-goal、Commit、Context、Output Schema、工具权限、预算、验收证据、Operation ID 和版本？
45. **P0｜追问｜[R4][R6]** 哪些判断可以交给模型，哪些必须由确定性代码控制？为什么预算、权限、状态转移、幂等和最终 Gate 不应只写在 Prompt 里？
46. **P0｜场景｜[R4][R6]** 用户点击取消时，AbortSignal 如何从根任务传播到模型流、子 Agent、数据库查询和 Shell 子进程？取消为什么不等于回滚？
47. **P0｜场景｜[R4][R7]** Planner—Reviewer 反复产生同一种错误，如何用错误签名、无进展检测、最大轮数、预算和人工接管阻止无限循环？
48. **P1｜场景｜[R4][R6]** 多 Agent 并发写共享状态时怎样处理版本冲突、级联幻觉、重复任务和旧 Worker 写入？比较单写者、CAS/版本号、Reducer、Lease 和 Fencing Token。

本组答题底线：多 Agent 不是“角色越多越好”；必须讲清上下文/权限隔离、并行收益、额外通信成本和停止条件。

## G. RAG、代码检索与 pgvector

49. **P0｜基础｜[B0][R5]** 完整 RAG 链路是什么？从解析、切块、Embedding、索引、查询改写、召回、融合、重排、Context 装配、引用到评测依次说明。
50. **P0｜设计｜[R5]** 大型前端仓库应按固定 Token、文件、函数、类还是 AST Symbol 切块？Chunk 应保存哪些路径、Symbol、语言、Commit、行号、内容 Hash 元数据？
51. **P0｜追问｜[R5]** 为什么代码检索要融合语义向量、全文/精确标识符检索和 Codemap？错误码、函数名、自然语言需求分别更依赖哪一路？
52. **P0｜基础｜[R5]** RRF 与 Rerank 有何区别？写出 `Σ wᵢ/(k+rankᵢ)`，说明为何不能直接相加不同检索器的原始分数。
53. **P1｜追问｜[R5]** Codemap 可包含 import、export、call、test、route、owner 等哪些边？动态 import、别名、代码生成、高度节点和错误图边如何处理？
54. **P0｜基础｜[R1][R5]** pgvector 的精确检索、HNSW、IVFFlat 如何权衡召回、延迟、建索引时间、内存和更新？过滤发生在 ANN 扫描后会造成什么问题？
55. **P0｜场景｜[R5][R6]** 索引对应 Commit A，但用户已切到 Commit B；怎样用 repo/commit/blob hash 校验、增量更新和 live grep/AST 降级避免陈旧上下文？
56. **P0｜评测｜[R5][R7][R8]** 检索层应怎样组合 Recall@K、Hit@K、MRR、nDCG、延迟和下游任务成功率？Rerank 提升排序时为什么也可能伤害 Recall 或多文件覆盖？

本组答题底线：RAG 不等于向量查询；“相关”还必须满足版本正确、来源可证、权限允许和 Token 可控。

## H. Redis、Lease、幂等与数据一致性

57. **P0｜设计｜[R1][R5][R6]** 检索缓存 Key 应包含哪些维度？至少讨论租户/ACL、repo、commit、query、过滤条件、Embedding/索引/Rerank 版本和参数。
58. **P1｜追问｜[R6]** Cache-aside 怎样处理主动失效、TTL、缓存穿透、击穿、雪崩和热点 Key？缓存失效时如何避免所有任务同时重算？
59. **P0｜对比｜[R1][R6]** Redis Pub/Sub、Streams、List/Queue 和普通缓存分别适合什么？为什么 Pub/Sub 不能作为唯一任务事实和恢复依据？
60. **P0｜基础｜[R4][R6]** 正确的 Lease 至少需要哪些机制？解释唯一 Holder Token、TTL、续租、compare-and-delete/renew、时钟/暂停和失去 Lease 后的行为。
61. **P0｜场景｜[R4][R6]** Worker A 因 GC Pause 导致 Lease 过期，Worker B 接管；A 恢复后仍提交结果，怎样用单调 Fencing Token 或版本条件拒绝旧写？
62. **P0｜对比｜[R4][R6]** Request ID、Operation ID、Idempotency Key、Redis 去重记录和错误签名分别解决什么问题？为什么不能互相替代？
63. **P0｜场景｜[R4][R6]** 为什么不能仅凭 Redis 锁声称 Exactly Once？说明 At-least-once + 幂等效果、唯一约束、操作台账、Outbox/Inbox 和补偿的组合。
64. **P1｜架构｜[R1][R4][R6]** PostgreSQL 与 Redis 各自应保存哪些状态？任务真源、事件、缓存和 Lease 如何协作，Redis 故障时哪些操作可降级，哪些必须停止？

本组答题底线：`SET NX PX` 只是起点；必须能解释锁过期后的旧持有者、结果未知和外部副作用。

## I. Electron、Node.js、IPC 与交互界面

65. **P0｜基础｜[R3]** 为什么把模型、文件系统、Git、Shell、MCP 收敛到 Main？Main、Preload、Renderer 的职责和信任边界分别是什么？
66. **P0｜安全｜[R1][R3]** `contextIsolation`、`nodeIntegration`、Renderer Sandbox、CSP 分别防什么？Renderer 被 XSS 攻破后风险如何被限制？
67. **P0｜安全｜[R3][R6]** 为什么不能通过 `contextBridge` 暴露整个 `ipcRenderer`？Main 如何校验 channel、sender/frame、权限和每次请求的 Schema？
68. **P0｜场景｜[R3][R6]** 模型传入 `../`、符号链接或大小写变化以访问工作区外文件；Shell 参数含命令拼接。如何做 realpath 包含校验、固定 executable + argv 和最小权限？
69. **P0｜设计｜[R1][R3][R4]** Agent 流式轨迹如何跨 Main→Renderer 传输？如何处理序号、重复、乱序、背压、取消、Renderer 刷新和监听器泄漏？
70. **P0｜基础｜[R1][R4]** Node.js Event Loop 如何影响 Agent Runtime？模型/网络是 I/O，但 AST、超大 JSON、Rerank 或压缩为何可能阻塞？何时用 Worker Thread 或 Child Process？
71. **P1｜前端｜[R1][R2]** React 端如何区分“模型计划”“已执行事实”“验证证据”和“推测性解释”？任务断线重连后 UI 状态从哪里恢复？
72. **P1｜场景｜[R2][R3][R6]** 用户批准的是 `git push feature-x`，执行前参数或 Commit 被替换；审批怎样绑定规范化 Action Hash、Commit、目标和有效期，防止 TOCTOU？

本组答题底线：TypeScript 类型会在运行时消失；Renderer/UI 不是权限边界，Main 必须重新校验和授权。

## J. OpenTelemetry、Agent Eval 与测试

73. **P0｜设计｜[R7]** 为一次任务设计 Trace：`task → agent → model/retrieval/tool → build/test/gate`。Span 的父子关系、Link 和关键属性如何定义？
74. **P1｜追问｜[R1][R3][R7]** Trace Context 如何跨 Electron IPC、AsyncLocalStorage、队列、Worker Thread 和子进程传播？上下文丢失会在 Trace 中表现为什么？
75. **P0｜安全｜[R7]** Span 名称和 Metric Label 为什么要低基数？Prompt、源码、密钥和用户数据能否直接记录？Head/Tail Sampling 如何选择？
76. **P0｜场景｜[R6][R7]** 端到端 P95 从 90 秒升到 150 秒，但模型延迟不变；如何沿关键路径排查队列、Lease 等待、检索、Rerank、工具重试和 Build/Test？
77. **P0｜评测｜[B0][R7][R8]** 检索评测、单步工具评测、Agent 轨迹评测和端到端交付评测为何必须分层？线上 Badcase 如何回流又不污染独立测试集？
78. **P1｜评测｜[B0][R7]** LLM-as-a-Judge 有哪些位置、长度、自偏好和标准漂移偏差？何时用确定性验证器、盲评、成对比较和人工抽检？
79. **P0｜测试｜[R1][R3][R7]** 设计测试金字塔：纯函数/Zod 单测、Tool/IPC 合同测试、Postgres/Redis 集成、模型 Stub 流程、Electron Playwright E2E、真实模型小样评测各测什么？
80. **P0｜场景｜[R4][R6][R7]** 注入模型 429、流中断、Lease 丢失、重复事件、陈旧索引、Shell 卡死、Git push 后崩溃和 Renderer 刷新；每种故障应验证哪些系统不变量？

本组答题底线：不要只看“最后 UI 显示成功”；要验证状态、证据、清理、恢复、未重复副作用和可追踪性。

## K. 指标真实性、项目所有权与简历压力测试

81. **P0｜追问｜[R8]** 80 条 Query 从哪里来？真实 Issue、人工生成还是日志？数据集是否在调参前冻结，是否有训练/开发/独立测试划分？
82. **P0｜计算｜[R5][R8]** 你的 Recall@5 究竟是 Recall、Hit@5 还是 Success@5？若每题只有一个 Gold 文件，72.5% 和 90.0% 分别对应多少条命中？
83. **P0｜追问｜[R5][R8]** Baseline 是什么？向量、全文、RRF、Rerank、Codemap 各贡献多少？请给消融表，而不是只报最终两个百分比。
84. **P1｜统计｜[R7][R8]** 80 条样本能否支持泛化结论？如何看配对转移、Bootstrap 置信区间或 McNemar 检验，并同时报告 P95 延迟和成本变化？
85. **P0｜追问｜[R6][R8]** “无关文件修改率”的分母是任务、文件、Hunk 还是 LOC？格式化、快照、Lockfile、生成文件如何计入？
86. **P0｜追问｜[R7][R8]** 端到端成功、人工接管和每成功任务成本分别怎样定义？失败重试、Embedding/Rerank、人工修复和环境故障是否计入？
87. **P0｜行为｜[R2][R8]** 简历写“参与开发”：团队几人、你独立负责哪些模块、提出哪些设计、写了哪些核心代码、哪个指标由你亲自计算？
88. **P0｜行为｜[R2][R4][R7]** 讲一个最严重 Badcase：触发条件、Trace/日志证据、根因、修复、回归用例、指标变化和仍未解决的边界。`Stage` 在项目中具体指什么？

数字核验：若每个 Query 只有一个 Gold 且使用二值命中，`72.5%=58/80`，`90.0%=72/80`，净增加 14 条命中；这是提升 **17.5 个百分点**，相对提升约 **24.1%**。若每题有多个 Gold，则必须说明 Macro/Micro Recall，不能套用这一换算。

## L. 实际应用与系统设计场景

89. **P0｜场景｜[R2][R4]** 用户只说“给这个大型仓库加一个导出功能”，需求含糊。设计从澄清、计划、定位、修改、验证、审批到 PR/Stage 的完整闭环和停止条件。
90. **P0｜场景｜[R3][R5][R6]** 仓库 README 注入指令，要求读取 SSH Key 并通过 MCP 上传。请从 Context、Tool、IPC、权限、审批、网络和审计七层防御。
91. **P0｜场景｜[R4][R5]** Locator 在 Commit A 找到文件，Executor 执行前工作区变成 Commit B；系统怎样检测、重定位、失效缓存并避免引用漂移？
92. **P0｜场景｜[R4][R6]** Git push/创建 PR 已成功，但进程在写 PostgreSQL 成功状态前崩溃。新 Worker 接管后如何核对外部真实状态并避免第二个 PR？
93. **P0｜场景｜[R4][R6]** Worker A Lease 过期、B 接管、A 又恢复；A 已在本地改文件，B 已生成另一套修改。如何处理旧写、工作区隔离和结果仲裁？
94. **P0｜场景｜[B0][R4][R5]** 任务执行一半 Context 即将耗尽。设计 Compaction、Checkpoint、结构化 Notes、子 Agent 清洁上下文和恢复验证。
95. **P0｜场景｜[R2][R6]** Build/Test 全部通过，但 Scope Gate 发现改了 40 个无关文件。系统应拒绝、隔离机械变更、重新审批还是回滚？给出决策条件。
96. **P1｜场景｜[R4][R7][R8]** Multi-Agent 成功率提升 3 个百分点，但 Token 翻倍、P95 增加 80%、人工接管不变。你是否上线？设计分层路由和 A/B 判定标准。

## M. 现场手写与后端基本功

97. **P0｜手写｜[R1][R4]** 用 TypeScript 实现“100 个异步任务、最大并发 3、支持 AbortSignal、保序收集结果、单任务超时且无监听器泄漏”的调度器。
98. **P1｜手写｜[R5]** 输入向量检索、全文检索和 Codemap 的三个排名列表，实现加权 RRF、去重和每文件候选上限。
99. **P1｜手写｜[R1][R6]** 实现带 TTL、容量上限和 LRU 淘汰的检索缓存；说明并发 Miss 和缓存击穿怎么处理。
100. **P1｜手写｜[R2][R3][R6]** UI 收到重复、乱序、丢失的流式事件；根据 `taskId + sequence + eventId` 实现去重、重排、缺口检测和重连补偿。
101. **P0｜手写｜[R1][R3][R6]** 写一个安全的 Workspace Path 校验函数，考虑 `..`、绝对路径、Windows 大小写、符号链接和不存在的目标文件。
102. **P1｜手写｜[R4]** 给定 Agent 任务 DAG，实现拓扑调度、有界并发、失败传播、取消和只重试受影响子图。
103. **P0｜手写｜[R4][R6]** 设计幂等写接口或中间件：同一 Operation ID 重试返回原结果，处理中、成功、失败和结果未知状态如何存储？
104. **P1｜手写｜[R4][R7]** 实现指数退避 + Jitter + 最大预算；哪些错误可重试，如何接入熔断器、错误签名和 Trace？

## 三、最优先准备的 20 题

若时间有限，按以下顺序准备：

`1 → 3 → 9 → 17 → 25 → 33 → 34 → 36 → 42 → 44 → 46 → 49 → 52 → 55 → 60 → 62 → 65 → 73 → 82 → 85`

其中最危险的简历压力题是：

1. 为什么需要 Multi-Agent，强单 Agent 基线是什么？
2. 取消为什么不等于回滚？
3. PR 已创建但本地崩溃，怎样避免重复副作用？
4. Redis Lease 过期后旧 Worker 为什么仍可能破坏数据？
5. TypeScript 类型为何不是 Electron IPC 安全边界？
6. Commit 变化后 RAG 证据如何保持一致？
7. 72.5%→90.0% 的分子、分母、Baseline、消融和成本分别是什么？

## 四、统一答题框架与判分标准

回答系统题时按六步组织：

1. **定义边界**：它是什么，不是什么。
2. **给最小链路**：输入、状态、决策、工具、输出、验证。
3. **解释选型**：为什么选它，替代方案是什么。
4. **主动讲失败模式**：超时、取消、重复、结果未知、陈旧版本、权限越界。
5. **给控制措施**：Schema、状态机、幂等、Lease/Fencing、Gate、审批、沙箱、追踪。
6. **回到项目证据**：一次真实 Badcase、Trace、测试、数据和剩余边界。

面试官常见四档判断：

- `0 分`：只会复述名词。
- `1 分`：能解释机制和项目使用位置。
- `2 分`：能讲取舍、失败模式和边界。
- `3 分`：能给代码、日志、Trace、实验原始计数或可复现测试证据。

## 五、一条很可能出现的连续追问链

1. 两分钟介绍项目和你的个人贡献。`[R2][R8]`
2. 这为什么是 Agent，不是普通 Workflow？`[B0][R2]`
3. 为什么是五个 Agent，而不是一个？`[R4]`
4. Locator 的三路检索分别解决什么问题？`[R5]`
5. RRF 和 Rerank 的顺序与公式是什么？`[R5]`
6. 80 条 Query 怎样标注，72.5% 对应多少条？`[R8]`
7. 提升来自哪个模块？有没有消融和延迟代价？`[R5][R8]`
8. 用户切换 Commit 后怎样防止使用旧索引？`[R5]`
9. Executor 被取消时，已经执行的 Git/Shell 怎么办？`[R4]`
10. Git push 成功后崩溃，怎样避免重复 PR？`[R4][R6]`
11. Redis Lease 到期后旧 Worker 继续写怎么办？`[R6]`
12. Renderer 被 XSS 后能否直接调用 Shell IPC？`[R3]`
13. Zod 校验通过为什么仍可能危险？`[R4][R6]`
14. Build/Test 通过但修改越界，能否交付？`[R6]`
15. 用 OTel 给出这次任务的证据链和成本。`[R7][R8]`

## 六、网络检索依据与可信度

### 1. 近期公开面经样本（用于归纳题型）

- [小红书 Agent 开发一面，2026-08-12](https://www.nowcoder.com/feed/main/detail/f1ed02bfdae04730837753b62e0d58b9)：项目指标、Harness、多 Agent 并发、Memory、ReAct、Context、Redis、开放场景。
- [快手 Agent 开发实习一面，2026-08-13](https://www.nowcoder.com/feed/main/detail/ce1b038c57c44cc08464561a8cfa0434)：Memory 准入、窗口压缩、Workflow/Agent、工具失败、Redis、并发限制手写题。
- [TikTok AI Agent 秋招一面，2026-08-13](https://www.nowcoder.com/feed/main/detail/7b1b40fda3244715a82bcb4a821ca887)：RAG Chunk、Tokenizer、QKV、Lost in the Middle、多 Agent 和算法题。
- [大疆 AI Agent 开发面经，2026-08-13](https://www.nowcoder.com/feed/main/detail/bbd8f778c65e4401a53de3d7417e6f77)：Memory、Tool 超时恢复、幻觉、Token 暴涨、压缩、Skill 设计与评测、Harness。
- [百度秋招 Agent 三面，2026-08-18](https://www.nowcoder.com/feed/main/detail/3b91f20a24c34faf84eb0a2b8e517ccf)：项目深挖、Tools 准确性、Coding 工作流、Agent Loop 延迟。
- [游戏公司 AI Agent 应用开发一面，2026-03-03](https://www.nowcoder.com/feed/main/detail/416c3118a9c84fe0a43dc00f9eb9bec2)：MCP、Context/Memory、ReAct、自动化系统设计、反馈迭代和 MVP 裁剪。
- [代码随想录 2026 大模型面经汇总，更新于 2026-05-19](https://programmercarl.com/qita/0022.llminterview.html)：Agent、RAG、Transformer、微调、AI Coding 和真实项目深挖的社区汇总。
- [LLM 应用岗社区面经，2025-07-26](https://juejin.cn/post/7531039727782068274)：RAG/Agent/LLM 基础、项目量化、系统设计与算法题。

这些帖子是候选人的公开复盘或社区整理，只能说明“这些题在公开样本中出现”，无法独立证明公司身份、轮次或逐字原题。本题库据此做定性归纳，不声称统计意义上的全网频率。

### 2. 官方/一手技术资料（用于校准定义）

- [Anthropic：Building effective agents](https://www.anthropic.com/research/building-effective-agents)：Workflow/Agent 边界、Prompt Chaining、Routing、Parallelization、Orchestrator-Workers、Evaluator-Optimizer。
- [Anthropic：Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)：Context 是有限注意力资源；Just-in-time、Compaction、结构化笔记和子 Agent 隔离。
- [MCP 官方架构（2026-07-28 版本）](https://modelcontextprotocol.io/docs/learn/architecture)：Host/Client/Server、Tools/Resources/Prompts、数据层与传输层。
- [Agent Skills 官方 Overview](https://agentskills.io/home) 与 [Skill 评测指南](https://agentskills.io/skill-creation/evaluating-skills)：Progressive Disclosure，以及 with/without Skill 的质量、Token、延迟对照。
- [Electron 官方安全清单](https://www.electronjs.org/docs/latest/tutorial/security)：Context Isolation、Sandbox、IPC Sender 校验、最小暴露 API 等。
- [pgvector 官方文档](https://github.com/pgvector/pgvector)：精确/近似检索、HNSW/IVFFlat、Recall/Speed 和过滤权衡。
- [Redis 官方分布式锁说明](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/)：锁 Token、TTL、安全释放以及 Safety/Liveness 边界。
- [OpenTelemetry GenAI Semantic Conventions](https://github.com/open-telemetry/semantic-conventions-genai)：GenAI Client、Agent、MCP 的 Span、Metric 和 Event 语义约定。

## 七、最后的准备建议

不要把 104 题背成定义。对每个 `R` 标签至少准备：

- 一张架构图；
- 一条真实任务 Trace；
- 一个失败与恢复案例；
- 一个可以说清分子、分母、Baseline 和成本的实验；
- 一段你能现场写出的核心代码。

你的简历技术密度高，优势是工程闭环完整；风险也很明显：面试官会默认每个名词都能追到状态机、故障窗口、代码和原始数据。如果暂时没有生产验证，要明确说“原型/离线评测/内部测试”，不要把它包装成线上结论。
