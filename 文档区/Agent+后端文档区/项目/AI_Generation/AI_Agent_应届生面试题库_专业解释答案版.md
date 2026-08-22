# AI Agent / AI 应用开发校招面试题库（专业解释答案版）

更新日期：2026-08-18

本版本对应《AI Agent / AI 应用开发校招面试题库（按简历逐题映射）》中的 Q1–Q104。每题保留：

- 优先级、题型以及简历来源标签；
- 可以直接在面试中表达的参考答案；
- 关键原理、工程取舍与失败边界；
- 如何落回你的 Multi-Agent Coding Platform；
- 常见误区或面试官继续追问的方向。

参考答案不是逐字背诵稿。建议先用一句话给结论，再用“机制—取舍—项目证据—边界”展开；没有真实实现或生产验证的部分，应明确说“我理解的设计方案是……”，不要包装为已落地事实。

## 阅读标签

- `B0`：Agent / LLM / AI 应用通用基础。
- `R1`：TypeScript、Node.js、React、Electron、PostgreSQL/pgvector、Redis、Zod、OpenTelemetry、Vitest、Playwright。
- `R2`：桌面 Multi-Agent Coding Platform 及完整交付闭环。
- `R3`：Electron Agent Host、Main/Preload/Renderer、IPC、Git/Shell/MCP。
- `R4`：多 Agent Runtime、任务合同、取消、恢复、Operation ID。
- `R5`：代码 RAG、pgvector、全文检索、Codemap、RRF/Rerank、Commit/引用。
- `R6`：Redis Cache/Lease/幂等、Zod、审批和 Build/Test/Scope Gate。
- `R7`：OpenTelemetry、Vitest、Playwright、故障注入和评测。
- `R8`：Recall@5、无关文件修改率、成功率、人工接管和成本指标。

## 专业回答的统一结构

1. **结论**：先直接回答，不从背景故事开始。
2. **机制**：讲清数据流、状态和责任边界。
3. **取舍**：说明替代方案、适用条件、成本与风险。
4. **项目落点**：对应具体 Agent、表、缓存键、Span、Gate 或测试。
5. **证据与边界**：给原始计数、Trace、失败案例；说明没有验证的部分。

---

## A. LLM、Agent 与 Harness 基础

### 1. **P0｜基础｜[B0]** Agent、Chatbot、Workflow 三者有什么区别？从路径是否预定义、状态、工具、副作用和自主决策五个维度比较。

- **直接回答：** Chatbot 主要生成对话回复；Workflow 按预定义节点流转；Agent 会围绕目标感知状态、动态选择步骤和工具，并根据结果继续、结束或转人工。
- **关键原理/取舍：** 自主性越高，越能处理开放任务，但成本、时延、不可预测性和副作用风险也越高；确定性步骤应优先使用代码或 Workflow。
- **结合本项目：** 可以将 Planner、Locator 的语义判断视为 Agent 部分，将 Build、Test、Scope Gate 和审批视为确定性 Workflow，整体采用混合架构。
- **常见误区：** 把一次 LLM 调用、工具调用或多个角色 Prompt 直接称为 Agent，忽略持久状态、反馈闭环和停止条件。

### 2. **P0｜基础｜[B0][R4]** 一个完整 Agent Loop 包含哪些阶段？如何定义完成、失败、阻塞、转人工和最大步数？

- **直接回答：** 通常是装配 Context、规划/选动作、调用工具、观察结果、更新状态、验证，再决定继续或进入终态。
- **关键原理/取舍：** 完成必须有外部证据；失败是不可恢复错误或预算耗尽；阻塞是缺权限/输入等外部条件；高风险或连续无进展转人工，并设置步数、时间和费用上限。
- **结合本项目：** 可以由 Verifier 汇总 Build/Test/Scope Gate 证据，错误签名识别重复失败，再由 Task Contract 的预算和 AbortSignal 控制退出。
- **常见误区：** 让模型自己宣告“已完成”，或只设置最大轮数而没有成功标准、无进展检测和人工接管状态。

### 3. **P0｜追问｜[B0][R2]** 哪些任务不该使用 Agent，而应该使用普通代码、单次 LLM 调用或确定性 Workflow？你的交付闭环中哪些步骤其实是 Workflow？

- **直接回答：** 规则明确、路径稳定、强一致、低容错的任务应使用普通代码或 Workflow；仅需一次分类、抽取或改写时可用单次 LLM。
- **关键原理/取舍：** Agent 适合步骤未知、需要探索和语义判断的任务，但会增加调用轮数、状态管理和失败恢复成本。
- **结合本项目：** 需求澄清、代码定位和修改策略适合 Agent；Git 状态检查、构建、测试、审批、PR 参数校验和 Scope Gate 应由确定性流程控制。
- **常见误区：** 为体现“智能”把所有节点都交给模型，导致本可重复的交付步骤变得不可预测。

### 4. **P0｜基础｜[B0][R4]** ReAct、Plan-and-Execute、Reflection/Evaluator-Optimizer 分别适合什么任务？它们的成本和失败模式是什么？

- **直接回答：** ReAct 适合短而动态的工具任务；Plan-and-Execute 适合依赖较清晰的长任务；Evaluator-Optimizer 适合有明确评价标准、可迭代改进的产物。
- **关键原理/取舍：** ReAct 灵活但易循环；预先计划可观察却会计划漂移；反思能修正结果，却增加调用成本并可能自我强化错误。
- **结合本项目：** 项目可描述为 Planner 拆解、Executor 执行、Reviewer 反馈，再由 Verifier 和确定性 Gate 验收；是否局部重规划应以实际实现为准。
- **常见误区：** 把 Reflection 当作必然提升正确率，或生成一份计划后无视工具反馈一直执行到底。

### 5. **P1｜基础｜[B0]** Decoder-only Transformer 如何生成下一个 Token？Self-Attention 中 Q、K、V 的直觉和计算复杂度是什么？

- **直接回答：** 模型对已有 Token 做因果自注意力，经多层变换得到最后位置的 logits，softmax 后采样下一个 Token，再自回归重复。
- **关键原理/取舍：** Q 表示当前位置要查询什么，K 表示各位置可被如何匹配，V 是被聚合的信息；核心为 `softmax(QKᵀ/√d)V`，标准注意力对序列长度是 O(n²)。
- **结合本项目：** 面对大型仓库，可以通过检索、按角色裁剪和必要时的 Compaction 控制 Context，而不是把全部代码交给模型。
- **常见误区：** 把 Attention 权重等同于可解释因果关系，或认为模型一次就生成整段答案。

### 6. **P1｜基础｜[B0][R5]** Tokenizer、Embedding、位置编码、KV Cache 分别解决什么问题？代码 Embedding 与普通文本 Embedding 的要求有何不同？

- **直接回答：** Tokenizer 将文本离散化；Embedding 映射为向量；位置编码表达顺序；KV Cache 复用历史 Token 的注意力键值以加速自回归解码。
- **关键原理/取舍：** 代码检索既要理解语义，又要保留标识符、语言、作用域和结构；仅用自然语言相似度容易漏掉函数名、错误码与调用关系。
- **结合本项目：** 用代码向量召回自然语言需求，同时以全文检索补精确 Token，以 Codemap 补符号和依赖结构。
- **常见误区：** 混淆生成模型的 Token Embedding 与检索 Embedding，或认为 KV Cache 能跨任意 Prompt 直接复用。

### 7. **P1｜追问｜[B0][R4]** Temperature、top-p、seed 和模型非确定性会怎样影响规划、工具参数及评测复现？哪些环节应尽量确定性？

- **直接回答：** Temperature/top-p 改变采样分布，seed 只能在特定实现和版本下提高复现性，服务并发、模型升级和浮点差异仍可能造成不同输出。
- **关键原理/取舍：** 探索性规划可保留少量随机性；工具参数、路由、Schema 输出和评测应低温，并由代码校验，最终 Gate 必须确定性。
- **结合本项目：** 评测时可以固定模型、Prompt 和工具版本并记录采样参数；定位任务应多次运行并报告方差，Build/Test/Scope 结果由确定性程序给出。
- **常见误区：** 认为设置 seed 就能跨时间、跨模型完全复现，或用高温生成高风险工具参数。

### 8. **P1｜基础｜[B0][R2][R4]** Model、Agent、Agent Harness、Framework、Runtime 是什么关系？可靠性应由模型承担，还是由 Harness/Runtime 的状态、工具、验证和恢复机制承担？

- **直接回答：** Model 提供推理生成；Agent 是围绕目标运行的决策实体；Harness 提供上下文、工具、状态、验证和护栏；Runtime 执行调度与恢复；Framework 是实现这些能力的开发抽象。
- **关键原理/取舍：** 模型能力影响上限，但生产可靠性不能依赖模型“自觉”，应由 Runtime 的确定性约束兜底，同时避免框架层过度复杂。
- **结合本项目：** 五类 Agent 使用模型做语义判断，Task Contract、Zod、Operation ID、审批、Gate 和 OTel 组成 Harness/Runtime。
- **常见误区：** 把 LangGraph 等 Framework 当成 Agent 本身，或认为更强模型可以替代权限、幂等和验证机制。

## B. Context Engineering

### 9. **P0｜基础｜[B0][R5]** Prompt Engineering 与 Context Engineering 有什么区别？Prompt 在 Context 中处于什么位置？

- **直接回答：** Prompt Engineering 优化指令如何表达；Context Engineering 决定一次推理让模型看到哪些指令、状态、证据、工具和历史，以及它们的排序、压缩与隔离。
- **关键原理/取舍：** Prompt 只是 Context 的一部分；Context 质量取决于相关性、可信度、时效性和 Token 成本，而非单纯长度。
- **结合本项目：** 可以在系统 Prompt 之外动态装配任务合同、当前计划、Commit 对齐的代码证据、工具 Schema/结果和必要历史摘要。
- **常见误区：** 把 Context 等同于聊天记录，或把“写更长、更强的系统提示词”当作完整的 Context Engineering。

### 10. **P0｜基础｜[B0][R4][R5]** 一次 Coding Agent 推理的 Context 应由哪些部分组成：系统约束、任务合同、计划、代码证据、工具 Schema、工具结果、历史摘要？优先级如何排？

- **直接回答：** 应包含不可变安全约束、当前 Task Contract、当前步骤和状态、与步骤相关的代码证据、可用工具 Schema、必要工具结果及压缩历史。
- **关键原理/取舍：** 优先保留安全/权限和验收条件，再保留当前决策所需的新鲜证据；按相关性、来源权威性、Commit 和 Token 预算裁剪，而非机械固定顺序。
- **结合本项目：** 设计上可让 Locator 产出带引用和 Commit 的候选，让 Executor 只接收批准范围、修改计划及必要代码，而非全部检索轨迹。
- **常见误区：** 将完整仓库、全部工具列表和原始对话同时塞入，导致噪声、注入面和成本上升。

### 11. **P0｜追问｜[B0][R5]** 什么是 Lost in the Middle、Context Rot 和注意力稀释？上下文窗口足够大时为何仍不能把整个仓库塞进去？

- **直接回答：** Lost in the Middle 是模型较难利用上下文中部信息；Context Rot 是上下文增长后信息检索和使用能力逐渐下降；注意力稀释是噪声、重复或冲突内容削弱关键信号。
- **关键原理/取舍：** 大窗口只解决容量，不保证检索和推理质量，还会增加预填充时延、费用、位置偏差及 Prompt Injection 暴露面。
- **结合本项目：** 已有 Hybrid Retrieval、Rerank、Codemap 和 Commit 校验可用于筛选证据；再按角色裁剪 Context，可进一步减少无关代码。
- **常见误区：** 认为窗口装得下就应该全放，或仅靠把重要内容重复多遍解决注意力问题。

### 12. **P0｜追问｜[B0][R5]** 预先 RAG、Just-in-time 工具检索和 Agent 自主浏览代码各有什么优缺点？你的 Locator 应如何混合使用？

- **直接回答：** 预先 RAG 延迟低、可控但可能提前选错；JIT 检索按当前问题取证，更新鲜但增加轮次；自主浏览灵活，却成本高且容易路径漂移。
- **关键原理/取舍：** 应先用便宜高召回检索建立候选，再让 Agent 针对不确定点调用 grep、AST 或文件读取，并限制步数和目录范围。
- **结合本项目：** Locator 已可融合 pgvector、全文和 Codemap 并做 RRF/Rerank；设计上可对高不确定候选再做 live grep/AST 核验，并校验当前 Commit。
- **常见误区：** 只依赖一次向量 Top-K，或允许 Agent 无预算地遍历整个仓库。

### 13. **P1｜场景｜[B0][R4][R5]** 给 Planner、Locator、Executor、Reviewer 分配 Context Token 预算时，你会保留和删除什么？为什么不同角色不应看到完全相同的上下文？

- **直接回答：** Planner 保留目标、约束和架构摘要；Locator 保留查询及索引线索；Executor 保留批准计划与目标代码；Reviewer 保留 diff、需求和风险；Verifier 保留验收证据。
- **关键原理/取舍：** 按最小必要信息隔离可降低成本、偏见和污染，但需用结构化合同传递跨角色事实，避免过度裁剪造成信息断层。
- **结合本项目：** 可以为各 Agent 配置不同 Tool 权限和预算，并通过带来源、版本和 Schema 的产物交接，避免共享完整自由文本轨迹。
- **常见误区：** 所有角色共用同一超长消息，或 Reviewer 被 Executor 的自我解释锚定而不看实际 diff。

### 14. **P0｜场景｜[B0][R4][R7]** 长任务即将超过窗口，如何做 Compaction？摘要必须保留哪些结构化状态，如何避免丢掉否定约束、Operation ID、未决问题和验证证据？

- **直接回答：** 先持久化原始事件和 Checkpoint，再生成结构化摘要，保留目标/非目标、决策、当前状态、已改文件、失败尝试、未决项、Operation ID、预算和证据引用。
- **关键原理/取舍：** 摘要用于下一轮推理，原始 Trace 用于审计恢复；关键字段应由程序抽取和 Schema 校验，否定约束单列并支持版本比较。
- **结合本项目：** 设计上可把 Checkpoint 和操作台账落到 PostgreSQL；OTel 负责关联链路而非充当状态真源，恢复时先核对 Git/外部副作用，再装配压缩 Context。
- **常见误区：** 只让模型写一段叙述性总结，随后重复创建 PR 或遗忘“不得修改”的范围。

### 15. **P0｜安全｜[B0][R3][R5][R6]** README、Issue、网页或工具结果里包含 Prompt Injection 时，如何区分“数据”与“指令”？Context 的来源和信任等级怎样表示？

- **直接回答：** 系统/用户授权指令与仓库、网页、工具结果必须在数据模型中分层；外部内容默认不可信，只作为证据，不能提升权限或改写系统规则。
- **关键原理/取舍：** 为 Context 片段记录 source、trust level、tenant、commit、时间和内容类型；结构化解析、最小工具权限、敏感动作审批与输出审计共同防御。
- **结合本项目：** Renderer 不直接执行指令，Main 对 MCP/Shell/文件请求重新做 Zod、权限和 Scope 校验，即使文本声称“已获授权”也无效。
- **常见误区：** 仅在 Prompt 中写“忽略恶意内容”，却给模型开放读取密钥和任意网络上传工具。

### 16. **P1｜追问｜[B0][R4][R5]** Context Cache 的键、失效和版本应怎样设计？子 Agent 的 Context 隔离如何减少污染，又会引入哪些信息损失？

- **直接回答：** 先区分检索/装配缓存与模型 Prefix Cache。前者应绑定租户/ACL、repo、commit、查询和索引版本；后者依赖稳定前缀及厂商规则。代码或权限变化应主动失效，TTL 只是兜底。
- **关键原理/取舍：** 子 Agent 只看最小必要 Context 可减少噪声和交叉注入，但会丢失隐含约束，需通过 Task Contract、共享事实表和带来源摘要补偿。
- **结合本项目：** 检索缓存可以绑定 Commit 和 Rerank 版本，Agent 间可传递 Zod Schema 产物；发现 commit mismatch 时应丢弃旧结果并重新定位。
- **常见误区：** 仅用 query 文本作键，或为隔离直接截断历史而没有可靠的跨 Agent 状态交接。

## C. Memory

### 17. **P0｜基础｜[B0]** Memory、Context、RAG 和数据库/向量库分别解决什么问题？为什么“把历史存进 pgvector”不等于已经实现 Agent Memory？

- **直接回答：** 数据库解决持久化，RAG 解决外部证据检索，Memory 决定什么值得写入、如何演化与何时召回，Context Engineering 决定本轮实际注入哪些有限 Token。
- **关键原理/取舍：** Memory 是包含写入、校验、作用域、召回、冲突、遗忘和治理的策略系统；向量库只是其中一种存储与候选召回手段。
- **结合本项目：** 简历只证明 pgvector 已用于知识与任务数据层；若扩展长期 Memory，还需补充写入准入、作用域、权威性、过期、审计和召回策略。
- **常见误区：** 将聊天记录全部向量化后按相似度 Top-K，就宣称已有长期记忆。

### 18. **P0｜基础｜[B0][R4]** Working、Episodic、Semantic、Procedural Memory 分别是什么？Coding Agent 的计划、历史事故、仓库事实和 Skill 各属于哪类？

- **直接回答：** Working Memory 是当前任务状态；Episodic 是发生过的任务/事故；Semantic 是稳定事实；Procedural 是可复用的做事方法。
- **关键原理/取舍：** 四类可落在同一存储，但写入规则、生命周期和召回信号不同；程序性记忆是认知分类，Skill 只是其一种可版本化载体，二者不能直接画等号。
- **结合本项目：** 若按 Memory 视角分类，当前计划可视为 Working，历史失败事件为 Episodic，仓库事实为 Semantic；若引入构建/发布 Skill，可承载部分 Procedural 知识。
- **常见误区：** 把短期/长期等同于内存/磁盘，忽略内容语义和使用方式。

### 19. **P0｜设计｜[B0][R4][R6]** 哪些信息应该写入长期 Memory？谁负责写入，写入前如何做事实校验、去重、作用域和敏感信息过滤？

- **直接回答：** 适合写入显式用户偏好、稳定仓库事实、已验证决策和可复用经验；瞬时工具输出、密钥及未经验证的模型猜测不应自动持久化。
- **关键原理/取舍：** 由 Memory Manager 按策略提取候选，经来源/测试验证、指纹去重、tenant/repo/user 作用域标注、PII/secret 过滤后写入；高影响记忆需人工确认。
- **结合本项目：** 若增加长期 Memory，可以只写入经 Build/Test 或权威配置验证的事实，并在 PostgreSQL 中记录 commit、来源、置信度、TTL 和 supersedes 关系。
- **常见误区：** 让任一 Agent 直接把自身推断写成全局事实，造成长期污染。

### 20. **P0｜设计｜[B0][R4][R5]** Memory 召回应结合相似度、时间、重要度、任务阶段、用户/仓库作用域和来源权威性中的哪些信号？

- **直接回答：** 先用用户/租户/repo/commit 和权限做硬过滤，再用语义相似度、关键词、时间衰减、重要度、任务阶段与来源权威性综合排序。
- **关键原理/取舍：** 相似度只衡量“像不像”，不能保证当前、可信或适用；权重应按记忆类型和任务阶段配置，并控制注入数量与多样性。
- **结合本项目：** 若实现 Memory 召回，应优先当前 Commit 的仓库事实和已验证经验；用户偏好仅在对应用户范围生效，召回结果保留引用。
- **常见误区：** 单纯按 cosine 排序，导致旧版本事实或其他仓库信息进入 Context。

### 21. **P0｜场景｜[B0][R5]** Memory 记录“项目使用 React 18”，当前仓库已升级 React 20；如何检测过期、处理冲突并保留审计历史？

- **直接回答：** 在召回时用当前 package manifest/lockfile 与记忆的 repo、commit、valid_from/to 校验；发现冲突后将旧记录标为 superseded，而不是覆盖删除。
- **关键原理/取舍：** 当前代码和权威配置优先于模型摘要；新事实需记录来源、时间和替代关系，旧记录保留审计但不再默认注入。
- **结合本项目：** 可复用已有 Commit 校验：失配时 live 读取权威配置并更新索引/记忆版本；旧事实标为 superseded，仅在历史版本查询中可见。
- **常见误区：** 让“最近写入”无条件获胜，或直接物理删除旧事实导致无法解释历史任务。

### 22. **P1｜安全｜[B0][R3][R6]** 用户偏好、源码片段、密钥和模型推断结果的保存策略应有何不同？如何支持查询、修正、过期和彻底删除？

- **直接回答：** 用户偏好需显式同意和用户作用域；源码按仓库 ACL/Commit 管理；密钥不进入 Memory，仅存专用 Secret Store 引用；模型推断默认短期且标注未验证。
- **关键原理/取舍：** 使用分类、加密、最小保留期、访问审计和可追踪来源；删除需覆盖主库、向量索引、缓存和派生副本，并保留不含内容的合规审计事件。
- **结合本项目：** 若落地 Memory，可由 Main 控制读取权限，Redis 仅缓存派生结果，PostgreSQL 保存可修正版本，并用删除事件驱动索引和缓存失效。
- **常见误区：** 只删数据库一行，却遗留 embedding、日志、备份或 Trace 中的敏感内容。

### 23. **P1｜评测｜[B0][R7]** 如何评估 Memory，而不只是评向量召回？请设计写入准确率、召回精确率、过期召回率、有害记忆率、下游增益和 Token 成本指标。

- **直接回答：** 分别评写入端、召回端和任务端：候选是否值得记、召回是否相关且当前、注入后是否提升验证成功率，同时统计安全和成本。
- **关键原理/取舍：** 构造带时间、冲突、租户和“不应写/不应召回”标签的数据集；比较有/无 Memory，并重复运行报告置信区间和切片结果。
- **结合本项目：** 可沿用现有 OTel 和评测框架，新增 write precision、recall precision、stale/harmful recall、任务成功增量、额外 tokens、p95 和每成功任务成本。
- **常见误区：** 只报向量 Recall@K，或把召回越多视为越好而忽略污染。

### 24. **P0｜场景｜[B0][R2][R4]** Coding 任务跨越多个进程重启和 Context 重置，怎样用 Checkpoint、结构化笔记和 Memory 恢复，而不重复已产生的副作用？

- **直接回答：** Checkpoint 保存状态机位置和版本；结构化 Notes 保存目标、决策、已改文件、未决项与证据；长期 Memory 只提供跨任务知识。恢复先核对真实世界，再决定继续。
- **关键原理/取舍：** 每个副作用绑定 Operation ID 和台账状态；对结果未知的 Git/PR 操作先 Reconcile，不从旧步骤盲目重放。
- **结合本项目：** 恢复方案可把 PostgreSQL 作为任务真源，以 Git 工作区和外部 PR 为副作用事实，Redis 负责协调；恢复后重建 Context 并重新检查 Build/Test/Scope。
- **常见误区：** 把聊天摘要当唯一 Checkpoint，进程重启后从头执行导致重复提交或重复 PR。

## D. Skill 生态

### 25. **P0｜基础｜[B0]** Skill、Prompt、Tool、MCP Server、Workflow 和 RAG 的边界分别是什么？为什么 Skill 更接近可复用的“程序性知识包”？

- **直接回答：** Prompt 是指令表达，Tool 是动作接口，MCP Server 暴露协议化能力，Workflow 固化控制流，RAG 检索证据；Skill 封装完成某类任务的方法、资源、脚本和约束。
- **关键原理/取舍：** Skill 可组合 Prompt、Tools 和 References，但本身不等于执行协议；不同生态定义未完全统一，回答前应声明所采用的 Skill 规范。
- **结合本项目：** “安全生成并验证 PR”可作为 Skill，内部调用 Git/MCP 工具，并遵循审批、测试、回退和证据模板。
- **常见误区：** 把每个 Tool 都称为 Skill，或认为安装 Skill 后模型天然拥有新的底层权限。

### 26. **P0｜基础｜[B0]** Skill 的 Progressive Disclosure 是什么？解释 Discovery、Activation、Execution 三阶段及其对 Context 成本的影响。

- **直接回答：** Discovery 只暴露名称、描述和少量元数据；Activation 在任务匹配后加载完整说明；Execution 再按需读取脚本、References 和 Assets。
- **关键原理/取舍：** 分阶段加载减少常驻 Token、干扰和注入面，但元数据必须足够区分适用条件，并支持未命中时的回退。
- **结合本项目：** 若引入 Skill，可让 Planner 先按任务类型和权限筛选，到测试或 PR 阶段才加载对应流程和模板，避免所有 Agent 常驻全部内容。
- **常见误区：** 应用启动时把全部 `SKILL.md` 与资源塞进系统 Context，反而降低路由准确率。

### 27. **P1｜设计｜[B0][R4]** 一个高质量 Skill 应包含哪些内容：适用/不适用条件、输入输出合同、步骤、权限、脚本、References、Assets、错误回退、版本和测试？

- **直接回答：** 应包含清晰名称/描述、触发与排除条件、前置依赖、输入输出 Schema、步骤和完成标准、所需权限、资源、失败分类、回退、版本及测试。
- **关键原理/取舍：** 说明应短而可执行，稳定细节放 References，确定性操作优先脚本；权限声明与工具实际授权必须分离。
- **结合本项目：** 若封装 PR Skill，应明确 base commit、允许目录、Operation ID、审批点、Build/Test/Scope 证据和结果 Schema。
- **常见误区：** 只写一篇长教程，没有边界、失败处理、机器可检验输出和负向示例。

### 28. **P0｜追问｜[B0][R7]** Skill 路由怎样评测？触发 Precision/Recall、漏触发、误触发、任务成功率分别怎么构造数据集？

- **直接回答：** 建立正例、近邻负例、多 Skill 冲突、无需 Skill 和恶意输入数据集；先评路由是否正确，再评激活后任务是否完成。
- **关键原理/取舍：** Precision 反映误触发，Recall 反映漏触发；还要按任务类型切片，并测选择正确但执行失败的情况，避免把两层问题混为一谈。
- **结合本项目：** 可以从脱敏历史任务与人工构造样本中标注期望 Skill，比较路由、Build/Test Pass、Token、p95、人工接管及安全违规。
- **常见误区：** 只统计被调用次数或最终成功率，无法区分路由、Skill 内容和底层工具故障。

### 29. **P1｜场景｜[B0][R4]** 两个 Skill 同时匹配、指令冲突或依赖不同工具版本时，由谁决定优先级？如何组合、锁版本和降级？

- **直接回答：** 由 Host/编排层依据显式优先级、适用范围、权限和兼容性选择，不能让 Skill 自己提升优先级；组合前构建依赖 DAG 并检测互斥规则。
- **关键原理/取舍：** 锁定 Skill、工具 Schema 和依赖版本；公共安全规则优先于 Skill 指令，冲突无法消解时选择单一 Skill、降级 Workflow 或转人工。
- **结合本项目：** 若落地 Skill 组合，可让 Task Contract 固定所选 Skill 版本，由 Runtime 校验 MCP 工具兼容性和权限，并禁止执行中静默换版。
- **常见误区：** 将两个 Skill 文本简单拼接，让模型自行猜测冲突指令的优先级。

### 30. **P0｜安全｜[B0][R3][R6]** 第三方 Skill 可携带脚本和资源，如何处理签名、来源、依赖供应链、沙箱、网络权限、文件范围和恶意指令？

- **直接回答：** 第三方 Skill 应来自可信 Registry，校验签名和内容哈希、锁定依赖、静态/人工审查，并在最小权限沙箱中运行。
- **关键原理/取舍：** 签名只证明来源和完整性，不证明安全；网络域名、文件根目录、可执行程序、CPU/时间和密钥访问仍需能力清单限制，Skill 不能覆盖 Host 策略。
- **结合本项目：** 设计上应由 Main 做来源、版本、参数和审批校验；第三方脚本放入隔离进程/沙箱而非直接在高权限 Main 执行，并记录 Tool/网络审计链。
- **常见误区：** 因 Skill 主要是 Markdown 就忽视其脚本、下载内容和间接工具调用的供应链风险。

### 31. **P0｜评测｜[B0][R7]** 如何做“有 Skill / 无 Skill / 旧版本 Skill”对照实验？除了 Pass Rate，为什么还要比较 Token、延迟和安全违规？

- **直接回答：** 在同一冻结任务集、模型、工具和环境下随机/配对运行三组，多次重复，按任务类型报告均值、方差和置信区间。
- **关键原理/取舍：** Pass Rate 只反映结果；Skill 可能以更多轮次、Token、时延或更高权限换成功，因此还需比较首次成功、人工接管、工具错误与安全违规。
- **结合本项目：** 可复用 Build/Test/Scope Gate 作为确定性成功标准，用 OTel 统计调用链和每成功任务成本，并分析新版相对旧版的回归切片。
- **常见误区：** 每组使用不同 Prompt 或任务，或只挑成功案例展示，无法归因于 Skill。

### 32. **P2｜系统设计｜[B0][R3][R4]** 设计一个企业内部 Skill Registry：发现、语义路由、权限、版本、灰度、审计、撤回和跨 Agent 复用分别怎样实现？

- **直接回答：** Registry 保存不可变 Skill 包、metadata、版本、签名、兼容矩阵和权限声明；通过关键词/语义召回加确定性策略路由，Host 负责最终授权与加载。
- **关键原理/取舍：** 支持 semver/内容哈希锁定、租户 ACL、灰度 cohort、审批发布、使用 Trace、紧急吊销和本地缓存失效；跨 Agent 复用统一合同而非共享全部 Context。
- **结合本项目：** 若设计该 Registry，可由 Planner 发现候选、Runtime 按角色权限激活，Task Contract 固定版本，OTel 记录 skill/version；撤回后禁止新任务并处置受影响运行。
- **常见误区：** Registry 只做文件下载站，没有信任根、兼容性、撤回传播和运行时强制权限。

## E. Tool Calling、MCP 与结构化输出

### 33. **P0｜基础｜[B0][R3][R4]** Function/Tool Calling 的完整执行链路是什么？模型、Host 和真实工具分别负责哪一步？

- **直接回答：** Host 把工具名称、描述和参数 Schema 放入模型上下文；模型只生成“调用哪个工具及参数”的意图。Host 收到后做解析、Schema 校验、授权和必要审批，再调用真实工具，将结构化结果写回上下文供模型继续判断。
- **原理/取舍：** 决策与执行必须分离：模型擅长语义选择，但输出不可信；Host 才拥有凭据、状态和副作用控制权。工具负责实际 I/O，并返回可区分成功、失败和结果未知的结果。
- **项目落地说法：** 我把 Git、Shell、文件和 MCP 调用统一收敛到 Electron Main，由 Runtime 记录 toolCallId、Operation ID、参数摘要、审批和结果，再把可展示事件流式发送给 Renderer。
- **误区：** 不应说“模型直接执行工具”，也不能把工具返回文本未经隔离地当成高优先级指令。

### 34. **P0｜追问｜[R1][R3][R4][R6]** TypeScript 已有静态类型，为什么 IPC、模型输出和 MCP 参数仍要 Zod 运行时校验？Schema 合法为何仍不代表语义安全？

- **直接回答：** TypeScript 类型编译后会消失，而 IPC、模型和 MCP 都是运行时不可信边界；Zod 用来验证真实数据的类型、枚举、长度和联合分支，输入与输出都应校验。
- **原理/取舍：** Schema 只能证明“形状符合合同”，不能证明调用被授权、目标存在或副作用安全。例如合法字符串仍可能是工作区外路径，合法命令仍可能删除文件。
- **项目落地说法：** 我会在 Main 再做 sender、权限、realpath、Commit、预算和审批校验；Zod Schema 由共享合同生成类型，但安全策略由服务端权威执行。
- **误区：** 不把 parse 成功等同于正确，更不能只在 Renderer 校验一次。

### 35. **P0｜设计｜[B0][R3]** 什么是适合模型使用的好 Tool Schema？为什么万能的 `execute(action, params: any)` 是坏设计？

- **直接回答：** 好 Schema 应单一职责、名称和描述明确，参数少而强约束，使用枚举、必填项、单位、默认值及稳定的结果/错误结构；读操作与写操作、高低风险操作尽量拆开。
- **原理/取舍：** 约束越明确，模型越容易选对工具，Host 也越容易做最小权限、审批和审计。过度细碎会增加路由成本，因此应按业务能力而不是每个底层 API 拆分。
- **项目落地说法：** 我会设计 readFile、applyPatch、runTest、createPR 等能力，并限制 workspace、超时和输出大小，而不是把任意 action 和 any 参数交给模型。
- **误区：** “万能工具更灵活”会隐藏语义和风险，使参数校验、权限分级及离线评测都失去抓手。

### 36. **P0｜基础｜[B0][R3]** MCP Host、Client、Server 分别是什么？Tools、Resources、Prompts 三类原语各解决什么问题？

- **直接回答：** Host 是承载用户任务、安全策略和模型交互的应用；Host 内的 Client 与某个 Server 建立协议连接；Server 暴露能力。Tools 是可调用动作，Resources 是按 URI 获取的上下文数据，Prompts 是可发现、可参数化的提示模板。
- **原理/取舍：** MCP 标准化能力发现、调用与传输，但信任、授权和 UI 仍属于 Host。一个 Host 可管理多个 Client/Server，并把获准工具转换成模型可见 Schema。
- **项目落地说法：** Electron Main 作为 Host，为本地或远端 MCP Server 建立 Client，只向当前任务暴露经权限过滤的能力，结果再进入统一 Tool Runtime。
- **误区：** MCP Server 不是模型，也不是 Agent；Resource 更不应被默认视为可信指令。

### 37. **P1｜基础｜[B0][R3]** MCP 的 stdio 与 Streamable HTTP 适用场景有何不同？能力发现、协议版本、通知、长任务和取消应该怎样处理？

- **直接回答：** stdio 适合 Host 拉起的本地、通常单 Client 子进程，协议走 stdin/stdout；Streamable HTTP 以 POST 加可选 SSE 支持远端和多 Client，并需 TLS、认证、限流及断线恢复。
- **原理/取舍：** 按 2026-07-28 协议，MCP 数据层无状态：每个请求的 _meta 都携带协议版本和本次 Client capabilities，通常还带 Client identity。Server 必须实现 server/discover，但 Client 可先调用并缓存结果，也可直接发业务请求后处理版本错误；initialize 属于旧版/兼容 Server 的握手，不能说当前一律必需。
- **项目落地说法：** 本地 Server 的 stdout 只传协议、日志走 stderr；通知通过 subscriptions/listen 显式订阅且按 best-effort 处理。长任务在双方声明能力后使用可选 Tasks 扩展保存 durable taskId；普通取消在 stdio 发 cancelled 通知、HTTP 关闭对应响应流，均是协作式取消。
- **误区：** 不能把连接当会话状态真源，也不能认为取消或断线证明远端副作用未发生；写操作恢复前仍要按 Operation ID 核对。

### 38. **P0｜对比｜[B0][R3]** MCP 与 Function Calling 有什么区别和连接关系？为什么 MCP 既不是 Agent，也不会自动完成规划和授权？

- **直接回答：** Function Calling 是模型与应用之间表达结构化调用意图的机制；MCP 是 Host 与外部能力提供者之间的协议，覆盖发现、调用、资源、提示和传输。Host 常把 MCP Tool 映射为模型的 Function/Tool Schema。
- **原理/取舍：** 前者解决“模型怎样提出调用”，后者解决“应用怎样标准接入能力”。规划、循环、状态管理、授权和审批都由 Agent Harness/Host 补齐。
- **项目落地说法：** 我的 Runtime 对原生工具和 MCP 工具使用相同调度、Zod、审批、Operation ID 与 Trace，MCP 只替换能力接入层。
- **误区：** 接入 MCP 不等于自动拥有 Agent，也不能把 Server 声明的权限当作本地授权结论。

### 39. **P0｜场景｜[B0][R4][R6]** 工具出现超时、429、畸形 JSON、部分成功、连接中断或返回互相冲突的结果时，Runtime 如何分类错误和决定重试、回退、核对或转人工？

- **直接回答：** 先按可重试瞬态错误、永久输入/权限错误、部分成功、结果未知和证据冲突分类。429/短暂网络错误可遵守 Retry-After 并指数退避；Schema 错误只允许有限修复；部分成功或断线后先 Reconcile，不能盲重试。
- **原理/取舍：** 重试条件不仅看错误码，还要看操作是否幂等、预算、已执行阶段和外部状态。冲突结果应保留来源与版本，降低置信度或交给确定性检查/人工裁决。
- **项目落地说法：** Runtime 用规范化错误签名、重试策略表和操作台账驱动状态转移，并在 OTel Span 中记录 attempt、退避和核对结果。
- **误区：** “超时就是失败”不成立；超时经常意味着结果未知。

### 40. **P0｜场景｜[R3][R4][R6]** 一个创建 PR 的工具调用超时，结果未知；能否直接重试？请给出 Operation ID、外部幂等键、操作台账和 Reconcile 流程。

- **直接回答：** 不能直接重试。创建前为逻辑操作生成稳定 Operation ID，并尽量把它作为外部幂等键或写入分支/PR 标记；台账先记 running，超时后记 unknown，而不是 failed。
- **原理/取舍：** 新 Worker 先按外部幂等键、repo、head branch 和 commit 查询 PR：存在则补记 succeeded；确认不存在才以同一键重试；无法确认则保留 unknown 并转人工。
- **项目落地说法：** PostgreSQL 保存 Operation、attempt 和外部 PR ID，Redis 只做短期协调；恢复流程由 Reconciler 查询 Git Provider，确保重复请求返回同一业务结果。
- **误区：** Redis 去重键或 Lease 不能覆盖“副作用成功、成功记录未落库”的崩溃窗口，也不应轻易宣称 exactly-once。

## F. Planning、Multi-Agent Runtime 与恢复

### 41. **P0｜基础｜[R4]** Planner、Locator、Executor、Reviewer、Verifier 各自的输入、输出、工具权限和成功标准是什么？Reviewer 与 Verifier 有何本质区别？

- **直接回答：** Planner 将合同拆成带依赖和验收条件的步骤；Locator 只读检索并输出带版本引用的候选；Executor 根据证据生成受限 Patch；Reviewer 审查语义、范围和风险；Verifier 运行构建、测试及确定性 Gate，产出可复查证据。
- **原理/取舍：** 各角色只获得完成职责所需的上下文和工具，减少污染与权限面。Reviewer 是可能出错的模型判断，Verifier 依赖命令退出码、Diff 和规则，二者不能互相替代。
- **项目落地说法：** 每阶段以 Task Contract/Artifact 交接，成功标准分别是可执行计划、可引用定位、受控修改、审查结论和 Gate 证据。
- **误区：** Reviewer 说“没问题”不等于验证通过，相同模型还可能产生相关性错误。

### 42. **P0｜追问｜[B0][R4][R8]** 为什么一定要 Multi-Agent？与一个更强的单 Agent 相比，如何用消融实验证明角色拆分带来净收益，而不是只增加 Token 和延迟？

- **直接回答：** 不应预设一定需要 Multi-Agent；它适合可分解、可并行且权限不同的复杂任务，简单修改应路由到单 Agent 或确定性 Workflow。
- **原理/取舍：** 在同一模型、工具、数据集和近似预算下，对比单 Agent、仅 Planner+Executor、完整五角色，统计端到端成功、无关修改、人工接管、Token、P50/P95 延迟和每成功成本，并按任务难度分层。
- **项目落地说法：** 还要做角色消融和失败归因，证明收益来自定位/验证隔离，而非给多 Agent 更多调用预算；若净收益只在复杂任务出现，就采用分层路由。
- **误区：** 角色数量不是能力指标，不能只报成功率而隐去成本与样本选择。

### 43. **P0｜设计｜[R4]** 你的编排更接近状态机、DAG、Actor、Supervisor-Workers 还是自由对话？哪些步骤可并行，哪些必须串行？

- **直接回答：** 我会描述为“持久化状态机承载生命周期，DAG 表达步骤依赖，Supervisor 调度专职 Worker”，而不是自由对话。状态机便于恢复和审计，DAG 支持有界并行。
- **原理/取舍：** 独立检索、静态分析可并行；Executor 必须等待定位与计划；Review 和部分测试可在 Patch 后并行；最终 Gate、PR 与 Stage 按依赖串行。共享状态采用单写者或版本化提交。
- **项目落地说法：** PostgreSQL 保存任务节点、attempt 和 Artifact，Worker 只提交事件，Supervisor 决定转移；失败只重跑受影响子图。
- **误区：** 让 Agent 彼此自由聊天会使停止条件、权限、恢复点和成本难以控制。

### 44. **P0｜基础｜[R4][R6]** 结构化 Task Contract 至少包含哪些字段：Goal、Non-goal、Commit、Context、Output Schema、工具权限、预算、验收证据、Operation ID 和版本？

- **直接回答：** 合同至少包括 goal/non-goal、repo/branch/commit、输入与可信上下文引用、允许修改范围、输出 Schema、工具与网络权限、Token/时间/调用次数预算、验收 Gate 和证据、Operation ID、重试/取消策略及 contractVersion。
- **原理/取舍：** 它把意图转为可执行边界，让各 Agent 能独立校验前置条件和产物；Schema 解决格式，Commit/权限/预算和 Gate 解决一致性与治理。
- **项目落地说法：** 我会用 Zod 定义判别联合并持久化合同快照，子任务只能收窄权限；每个 Artifact 记录合同版本和来源。
- **误区：** Task Contract 不是一段更长的 Prompt，也不能只保存在模型上下文中。

### 45. **P0｜追问｜[R4][R6]** 哪些判断可以交给模型，哪些必须由确定性代码控制？为什么预算、权限、状态转移、幂等和最终 Gate 不应只写在 Prompt 里？

- **直接回答：** 模型可提出计划、相关性判断、Patch 和语义审查建议；Runtime 必须控制身份权限、工具参数边界、预算计数、状态机、Operation 台账、Lease/Fencing、取消及最终 Build/Test/Scope Gate。
- **原理/取舍：** 模型输出概率化且会受注入和上下文遗漏影响，Prompt 是行为提示而非强制机制；确定性代码可重放、审计并在模型失常时拒绝副作用。
- **项目落地说法：** Agent 只能输出 proposal，Tool Dispatcher 在 Main 依据合同重新验证和审批，Gate 直接读取真实 Diff、退出码与版本。
- **误区：** “System Prompt 已禁止危险操作”不能替代授权、沙箱和执行前校验。

### 46. **P0｜场景｜[R4][R6]** 用户点击取消时，AbortSignal 如何从根任务传播到模型流、子 Agent、数据库查询和 Shell 子进程？取消为什么不等于回滚？

- **直接回答：** 根任务持有 AbortController，派生 Signal 传入所有 Agent、模型流、检索适配器和工具；适配器监听 abort，停止新调度，调用驱动取消能力，并对 Shell 先温和终止、超时后清理进程树。
- **原理/取舍：** 取消是协作式停止未来工作，不能撤销已写文件、已 push 或已提交事务。Runtime 要区分 cancelled 与 failed，在 finally 释放监听器、Lease 和临时资源。
- **项目落地说法：** 对已开始的非幂等操作记录 unknown/partial，随后 Reconcile 或补偿；UI 只有收到持久化取消状态和清理证据才显示结束。
- **误区：** 触发 abort 不代表所有库自动支持取消，更不代表业务副作用自动回滚。

### 47. **P0｜场景｜[R4][R7]** Planner—Reviewer 反复产生同一种错误，如何用错误签名、无进展检测、最大轮数、预算和人工接管阻止无限循环？

- **直接回答：** 将阶段、工具、错误码/退出码、规范化 stderr、合同/代码版本形成错误签名，去掉时间戳和临时路径；连续出现同签名，且计划、Patch、证据覆盖没有实质变化，就判定无进展。
- **原理/取舍：** 每类错误设置最大 attempt、总轮数、Token/时间预算和退避策略；达到阈值后停止自动循环，输出已尝试方案、当前证据和最小人工问题。
- **项目落地说法：** OTel 记录 signature、attempt 和 progressDelta，Checkpoint 保存最后可用 Artifact，人工处理后从该节点恢复。
- **误区：** 仅修改 Prompt 措辞或随机 seed 不算实质进展，也不能对永久错误无限重试。

### 48. **P1｜场景｜[R4][R6]** 多 Agent 并发写共享状态时怎样处理版本冲突、级联幻觉、重复任务和旧 Worker 写入？比较单写者、CAS/版本号、Reducer、Lease 和 Fencing Token。

- **直接回答：** 优先让 Agent 产出不可变事件/Artifact，由 Supervisor 或 Reducer 单写权威状态；必须并发更新时使用版本号/CAS 和 Operation ID，冲突后基于最新状态重算，不能静默覆盖。
- **原理/取舍：** Lease 只减少同时处理，过期后旧 Worker 仍可能写；Fencing Token 由权威资源拒绝旧 epoch。单写者简单但可能成为瓶颈，CAS 吞吐高但需显式合并冲突。
- **项目落地说法：** 每个 Worker 使用隔离 workspace，事件带 taskVersion、source、commit 和证据；Reducer 校验依赖版本，重复事件按 ID 去重，级联结论在执行前重新验证原始来源。
- **误区：** Redis 锁既不能证明结果正确，也不能单独提供 exactly-once 或阻止过期持有者写外部系统。

## G. RAG、代码检索与 pgvector

### 49. **P0｜基础｜[B0][R5]** 完整 RAG 链路是什么？从解析、切块、Embedding、索引、查询改写、召回、融合、重排、Context 装配、引用到评测依次说明。

- **直接回答：** 离线侧解析仓库、按代码结构切块、补元数据、生成 Embedding，并建立向量、全文和 Codemap 索引；在线侧做查询理解/改写，多路召回，经 RRF 融合、去重和 Rerank，再按 Token 预算装配带引用的 Context。
- **原理/取舍：** 每个阶段都可能损失信息，因此既评检索 Recall/排序，也评最终任务成功、延迟和成本；相关性之外还要校验权限、repo、commit 和来源可信度。
- **项目落地说法：** 我们将路径、symbol、行号、commit/blob hash 随 Chunk 保存，Context 中只使用版本匹配且可回溯的证据。
- **误区：** RAG 不是一次 pgvector 查询，向量相似也不等于代码事实正确。

### 50. **P0｜设计｜[R5]** 大型前端仓库应按固定 Token、文件、函数、类还是 AST Symbol 切块？Chunk 应保存哪些路径、Symbol、语言、Commit、行号、内容 Hash 元数据？

- **直接回答：** 以函数、类、组件、Hook 等 AST Symbol 为主，保留签名、注释和必要父级上下文；超大 Symbol 再按语句/Token 分裂，过小相邻块可合并。配置和文档无法可靠解析时再使用固定窗口兜底。
- **原理/取舍：** 固定块简单但容易切断语义，整文件上下文完整却噪声和 Token 高；结构化切块召回更准，但需维护多语言解析器和增量索引。
- **项目落地说法：** Chunk 保存 tenant/repo、规范化路径、symbol、语言、start/end line、commit、blob/content hash、依赖边、索引版本及 ACL。
- **误区：** Chunk 越小不一定越准；缺少版本和路径元数据的高相似结果不可安全引用。

### 51. **P0｜追问｜[R5]** 为什么代码检索要融合语义向量、全文/精确标识符检索和 Codemap？错误码、函数名、自然语言需求分别更依赖哪一路？

- **直接回答：** 向量检索擅长“表达不同但语义相近”的自然语言需求；全文/BM25 擅长错误码、函数名、路径和罕见标识符；Codemap 根据 import、call、test 等关系补回跨文件依赖和影响范围。
- **原理/取舍：** 三路信号互补，通常先各自召回，再用 RRF 融合并限制图扩展深度，最后 Rerank。精确错误文本优先全文，需求描述偏向向量，定位实现后的依赖扩展依靠 Codemap。
- **项目落地说法：** 查询分类只用于调权而不硬切单一路，结果保留各路 rank 和来源供调试、引用及消融。
- **误区：** Codemap 图边可能陈旧或不完整，不能当作运行时调用真相。

### 52. **P0｜基础｜[R5]** RRF 与 Rerank 有何区别？写出 `Σ wᵢ/(k+rankᵢ)`，说明为何不能直接相加不同检索器的原始分数。

- **直接回答：** RRF 是基于名次的轻量融合：score(d)=Σ wᵢ/(k+rankᵢ(d))；Rerank 则让交叉编码器或 LLM 读取 query 与候选内容，对有限 Top-N 做更细相关性排序。
- **原理/取舍：** BM25、余弦相似度和图分数的尺度、分布及方向不同，未校准时直接相加没有稳定含义；RRF 绕开分数标定，但会丢失名次间距信息。Rerank 更准但增加延迟和成本。
- **项目落地说法：** 我们先多路召回和加权 RRF，再对去重候选 Rerank，并通过 k、权重、候选 N 和每文件上限做离线调参。
- **误区：** Rerank 不能找回未进入候选集的文档，也不保证 Recall 必然提升。

### 53. **P1｜追问｜[R5]** Codemap 可包含 import、export、call、test、route、owner 等哪些边？动态 import、别名、代码生成、高度节点和错误图边如何处理？

- **直接回答：** 节点可表示文件、Symbol、测试、路由和包；边包含 import/export、定义/引用、call、test-covers、route-register、owner 等，并携带边类型、commit、解析器版本和置信度。
- **原理/取舍：** 别名需结合 tsconfig/bundler 解析；动态 import 和反射无法静态确认时标为 unresolved/低置信；生成代码单独标记或排除。对公共工具等高度节点设置按边类型权重、度数上限和扩展深度。
- **项目落地说法：** 图扩展只生成候选，进入 Context 前再用当前 commit 的 AST/live grep 验证；增量更新按变更文件和反向依赖重建。
- **误区：** 静态 Codemap 不等于完整调用图，错误边若无置信度和版本会放大噪声。

### 54. **P0｜基础｜[R1][R5]** pgvector 的精确检索、HNSW、IVFFlat 如何权衡召回、延迟、建索引时间、内存和更新？过滤发生在 ANN 扫描后会造成什么问题？

- **直接回答：** 精确扫描提供基准级 Recall，但数据大时延迟高；HNSW 查询速度/召回通常更好且无需训练，代价是建索引慢、内存大；IVFFlat 构建和内存成本较低，但需合适 lists/probes，数据分布或增量变化会影响召回。
- **原理/取舍：** ANN 候选若先按近邻截断、再应用 commit/tenant 等过滤，可能剩不足 K 条，即使库中存在合格结果。可用分区/部分索引、提高 ef_search 或 probes、迭代扫描，并以精确检索抽样校准。
- **项目落地说法：** 我会按仓库规模压测 Recall-P95 曲线，固定过滤条件和索引参数随实验记录。
- **误区：** 建了 ANN 索引不代表 PostgreSQL 一定使用，也不能只看延迟不测召回。

### 55. **P0｜场景｜[R5][R6]** 索引对应 Commit A，但用户已切到 Commit B；怎样用 repo/commit/blob hash 校验、增量更新和 live grep/AST 降级避免陈旧上下文？

- **直接回答：** 任务创建时固定 repo 与 expectedCommit，检索和缓存 Key 必须包含该版本；候选携带 commit/blob hash，装配 Context 及执行前都与当前 HEAD/文件哈希复核，不匹配就禁止直接使用。
- **原理/取舍：** 对 A→B 的变更文件删除/替换旧 Chunk，并在一个可见的索引版本中原子发布；未完成时可用 B 上的 live grep/AST 检索补充，引用明确标记为现场证据。高风险修改可等待索引一致后再执行。
- **项目落地说法：** Commit 变化触发缓存命名空间失效和 Locator 重跑，Patch 也以 expectedCommit 做乐观校验。
- **误区：** TTL 不能解决版本正确性；旧内容“看起来相似”也不能继续引用。

### 56. **P0｜评测｜[R5][R7][R8]** 检索层应怎样组合 Recall@K、Hit@K、MRR、nDCG、延迟和下游任务成功率？Rerank 提升排序时为什么也可能伤害 Recall 或多文件覆盖？

- **直接回答：** 多 Gold 场景用 Recall@K 看覆盖率，Hit@K 看是否命中至少一个，MRR 看首个相关结果位置，nDCG 支持分级相关和整体排序；同时报告 P50/P95 延迟、候选/Context Token、每文件覆盖及最终定位/交付成功率。
- **原理/取舍：** Reranker 只能重排候选，可能把同一文件的相似 Chunk 集中到前 K，挤掉跨文件依赖；截断候选还会让相关项永久丢失。排序分提高不代表下游证据更完整。
- **项目落地说法：** 我会使用同一冻结 Query 集做配对评测，并按查询类型报告 Recall-延迟-成本曲线和消融。
- **误区：** 单报 Recall@5 无法说明首位质量、版本正确或 Agent 最终能否完成修改。

## H. Redis、Lease、幂等与数据一致性

### 57. **P0｜设计｜[R1][R5][R6]** 检索缓存 Key 应包含哪些维度？至少讨论租户/ACL、repo、commit、query、过滤条件、Embedding/索引/Rerank 版本和参数。

- **直接回答：** Key 应由 tenant/用户可见范围或 ACL 版本、repo、commit/index snapshot、规范化 query、语言/路径等过滤条件、Embedding 模型及维度、FTS/RRF/Rerank 版本和权重、topK/候选 N 等规范化序列化后哈希生成。
- **原理/取舍：** 任何会改变结果或可见性的因素都应进入 Key；否则会跨租户泄漏、命中旧 Commit 或复用不同排序配置。Key 太细命中率会下降，可将稳定候选召回和昂贵 Rerank 分层缓存。
- **项目落地说法：** Value 保存结果 ID、来源版本和生成时间，读取时仍校验 ACL 与 commit；用 namespace/version 做批量失效。
- **误区：** 只用 query 文本做 Key，或依赖 TTL 修复权限与版本错误，都是不安全的。

### 58. **P1｜追问｜[R6]** Cache-aside 怎样处理主动失效、TTL、缓存穿透、击穿、雪崩和热点 Key？缓存失效时如何避免所有任务同时重算？

- **直接回答：** 读取先查缓存，Miss 后查真源并回填；Commit/索引发布时切换版本 namespace 主动失效，同时设置带随机抖动 TTL。无效查询可短 TTL 负缓存并严格限流，避免穿透。
- **原理/取舍：** 热点 Key 失效时用进程内 singleflight 或短期重算 Lease 合并请求，可配 stale-while-revalidate；失败时保留短暂旧值仅用于允许陈旧的读场景。TTL 分散和分批预热可降低雪崩。
- **项目落地说法：** 重算锁与任务 Lease 分开，等待者有超时和数据库/live 检索降级，不能永久阻塞。
- **误区：** 互斥锁不能替代版本校验；对代码修改任务不可静默返回旧 Commit 缓存。

### 59. **P0｜对比｜[R1][R6]** Redis Pub/Sub、Streams、List/Queue 和普通缓存分别适合什么？为什么 Pub/Sub 不能作为唯一任务事实和恢复依据？

- **直接回答：** Pub/Sub 适合在线 UI 通知，订阅者离线即丢消息且无 ack/replay；Streams 是可保留的事件日志，支持 Consumer Group、Pending 和重放；List 适合较简单的阻塞队列，但确认、重试和观测需自行补充；缓存只存可重建派生数据。
- **原理/取舍：** Streams 比 Pub/Sub 可恢复但仍受 trimming、运维和幂等消费影响。关键任务状态应以 PostgreSQL 为真源，Redis 负责低延迟分发和协调。
- **项目落地说法：** 状态事务写库并写 Outbox，Relay 发布 Redis；UI 断线后先从数据库快照恢复，再消费增量事件。
- **误区：** 收到 Pub/Sub “成功”事件不代表成功状态已持久化。

### 60. **P0｜基础｜[R4][R6]** 正确的 Lease 至少需要哪些机制？解释唯一 Holder Token、TTL、续租、compare-and-delete/renew、时钟/暂停和失去 Lease 后的行为。

- **直接回答：** 获取时用唯一随机 Holder Token 和 TTL 原子创建；续租、释放必须通过 Lua/事务比较 Token 后操作，禁止旧 Worker 删除新持有者 Lease。Worker 定期心跳，并让 TTL 覆盖正常抖动但保持有限失效时间。
- **原理/取舍：** GC Pause、网络分区和调度延迟会使本地仍运行但 Lease 已过期，因此失去续租后必须停止领取新工作、取消可取消操作，并在副作用前再次检查。关键写还需 Fencing Token。
- **项目落地说法：** Lease 仅表示一段时间内的处理资格，完成状态仍由 PostgreSQL 操作台账确认。
- **误区：** SET NX PX 只是起点；Lease 不保证任务只执行一次，更不保证外部副作用 exactly-once。

### 61. **P0｜场景｜[R4][R6]** Worker A 因 GC Pause 导致 Lease 过期，Worker B 接管；A 恢复后仍提交结果，怎样用单调 Fencing Token 或版本条件拒绝旧写？

- **直接回答：** 每次接管获得单调递增 epoch；B 接管时把权威任务行的 currentFence 更新为 2。所有提交都携带 epoch，并执行类似 UPDATE … WHERE current_fence = :epoch AND task_version = :expected 的条件写，A 的 epoch=1 因而影响 0 行。
- **原理/取舍：** Fencing 必须由真正承载资源的数据库/服务验证，仅在 Redis 生成但下游不检查没有作用。外部 API 若不支持 fence，应结合 Operation ID、外部幂等键和 Reconcile，必要时停止自动提交。
- **项目落地说法：** Worker 还使用独立 worktree，Lease 丢失即触发 AbortSignal；旧 Patch 只能作为候选 Artifact，不能覆盖 B 的状态。
- **误区：** 心跳或“提交前再看一次锁”仍有 TOCTOU 窗口，不能替代条件写。

### 62. **P0｜对比｜[R4][R6]** Request ID、Operation ID、Idempotency Key、Redis 去重记录和错误签名分别解决什么问题？为什么不能互相替代？

- **直接回答：** Request ID 标识一次传输尝试，便于 Trace；Operation ID 标识跨重试的同一业务操作；Idempotency Key 是执行端识别重复请求并复用业务结果的协议键；Redis 去重记录是有 TTL 的快速协调；错误签名用于聚合同类失败和阻止无效循环。
- **原理/取舍：** 一次 Operation 可有多个 Request ID，却应复用同一幂等键。Redis 记录可能过期或丢失，不能替代数据库唯一约束和操作台账；错误相似也不代表两个业务操作相同。
- **项目落地说法：** 我会在 Span 记录 request/operation/attempt，在 PostgreSQL 对 operationId 建唯一约束，Redis 只做热点去重。
- **误区：** 每次重试生成新 Operation ID 会绕过幂等保护。

### 63. **P0｜场景｜[R4][R6]** 为什么不能仅凭 Redis 锁声称 Exactly Once？说明 At-least-once + 幂等效果、唯一约束、操作台账、Outbox/Inbox 和补偿的组合。

- **直接回答：** 锁会过期、进程会暂停，且可能在外部副作用成功后、成功记录落库前崩溃；Redis 与 PostgreSQL、Git Provider 又不共享原子事务，所以锁只能降低并发，不能证明端到端恰好执行一次。
- **原理/取舍：** 工程上通常接受 At-least-once 投递：Operation ID 唯一约束和操作台账保存状态；Inbox 去重消费，事务 Outbox 保证状态与待发事件同事务提交；外部服务使用幂等键，结果未知先 Reconcile；可逆副作用再设计补偿。
- **项目落地说法：** 对 createPR 可表述为“在明确边界内实现 effectively-once 的业务效果”，而不是宣称普适 exactly-once。
- **误区：** 补偿不是回滚，可能失败；不可逆操作必须审批并保留人工处理路径。

### 64. **P1｜架构｜[R1][R4][R6]** PostgreSQL 与 Redis 各自应保存哪些状态？任务真源、事件、缓存和 Lease 如何协作，Redis 故障时哪些操作可降级，哪些必须停止？

- **直接回答：** PostgreSQL 保存耐久真源：Task Contract、状态版本、Agent Artifact、Operation 台账、审批、证据、Fencing epoch 和 Outbox；Redis 保存可重建或短期状态：检索缓存、在线通知/Streams、限流、调度 Lease 和热点去重。
- **原理/取舍：** 任务状态与 Outbox 在同一数据库事务提交，Relay 再发布 Redis，消费者按 event/operation ID 幂等；恢复时先读 PostgreSQL 快照，不能从 Redis 推断最终真相。
- **项目落地说法：** Redis 故障时缓存可旁路、UI 通知可延迟；若没有等价的 PostgreSQL 锁/队列降级方案，就暂停新任务接管和可能重复的高风险副作用，已有只读工作可继续。
- **误区：** Redis 高可用不等于持久真源；盲目 fail-open 会把可用性问题变成重复写和安全事故。

## I. Electron、Node.js、IPC 与交互界面

### 65. **P0｜基础｜[R3]** 为什么把模型、文件系统、Git、Shell、MCP 收敛到 Main？Main、Preload、Renderer 的职责和信任边界分别是什么？

- **直接回答：** Main 是唯一特权 Agent Host，持有 Node、密钥和系统能力；Preload 只桥接窄而稳定的类型化 API；Renderer 只负责展示与意图提交，按不可信页面处理。
- **原理/取舍：** 权限集中便于统一鉴权、审计和取消，代价是 Main 需避免阻塞。
- **项目落地说法：** 所有工具在 Main 重新做 Zod、工作区和审批校验。
- **误区：** TypeScript 类型与 UI 按钮都不是运行时安全边界。

### 66. **P0｜安全｜[R1][R3]** `contextIsolation`、`nodeIntegration`、Renderer Sandbox、CSP 分别防什么？Renderer 被 XSS 攻破后风险如何被限制？

- **直接回答：** `contextIsolation` 隔开页面与 Preload 世界；关闭 `nodeIntegration` 阻断 `require/process`；Sandbox 限制 Renderer 的系统权限；CSP 减少脚本注入和外连。
- **原理/取舍：** 四者是纵深防御，CSP 不能“修复”XSS。
- **项目落地说法：** 即使 Renderer 失陷，也只能调用窄桥接，Main 仍校验 Schema、能力、路径和审批，且不把密钥下发。
- **误区：** 不能把任一开关说成单独足够。

### 67. **P0｜安全｜[R3][R6]** 为什么不能通过 `contextBridge` 暴露整个 `ipcRenderer`？Main 如何校验 channel、sender/frame、权限和每次请求的 Schema？

- **直接回答：** 暴露整个 `ipcRenderer` 等于让被注入页面任意发消息、订阅敏感事件并扩大攻击面；应为每个用例暴露固定方法。
- **原理/取舍：** Main 只注册白名单 channel，并核验 `event.senderFrame` 是否为预期顶层 frame、其安全自定义协议/origin、对应 webContents/窗口与任务 capability；输入、输出都做运行时 Schema 校验，不能只信 URL 字符串。
- **项目落地说法：** `contextBridge` 只暴露按业务命名的方法；订阅 API 按 taskId 隔离并返回 disposer，回调只传业务 payload，不把原始 Electron event 暴露给页面。
- **误区：** 只在 Preload 做类型检查不够，Main 必须不信任调用方。

### 68. **P0｜场景｜[R3][R6]** 模型传入 `../`、符号链接或大小写变化以访问工作区外文件；Shell 参数含命令拼接。如何做 realpath 包含校验、固定 executable + argv 和最小权限？

- **直接回答：** 仅收相对路径；对工作区和目标或其最近存在祖先做 `realpath`，用 `path.relative` 做带分隔符的包含判断，Windows 还要按平台语义处理大小写，符号链接解析后再判定。
- **原理/取舍：** 字符串前缀会被 `..`、同名前缀和链接绕过，检查后使用前仍有 TOCTOU。
- **项目落地说法：** Shell 采用可执行文件和子命令白名单、结构化 `argv`、`shell:false`、受限 cwd/env、超时与输出上限；文件参数在支持时用 `--` 与选项分隔，并单独限制危险 flag。
- **误区：** `argv` 只避免 Shell 展开，不能阻止目标程序解释危险选项；创建/打开前仍要重检或使用安全句柄来缩小 TOCTOU。

### 69. **P0｜设计｜[R1][R3][R4]** Agent 流式轨迹如何跨 Main→Renderer 传输？如何处理序号、重复、乱序、背压、取消、Renderer 刷新和监听器泄漏？

- **直接回答：** 事件信封包含 `taskId、sequence、eventId、type、payload`；需要可靠回放时由 Runtime 先持久化再推送，Renderer 按 eventId 去重、按 sequence 缓冲重排并确认连续消费位置。
- **原理/取舍：** 至少一次传输配合幂等消费，比幻想“恰好一次”可靠。
- **项目落地说法：** 若项目实际实现了持久事件日志/ACK，可说明缺口从 lastAck 回放、刷新先取快照再续流，并用批量发送和窗口确认做背压；若只有实时推送，应如实说刷新靠任务快照恢复，不能声称完整回放。
- **误区：** 每次订阅必须显式解绑，结束态也要落库。

### 70. **P0｜基础｜[R1][R4]** Node.js Event Loop 如何影响 Agent Runtime？模型/网络是 I/O，但 AST、超大 JSON、Rerank 或压缩为何可能阻塞？何时用 Worker Thread 或 Child Process？

- **直接回答：** 网络等待由事件循环高效复用，但回调、Promise continuation 和 JavaScript 计算仍在同一主线程；AST、超大 JSON、JS Rerank/压缩会长时间占用它，拖慢 IPC、心跳和取消。
- **原理/取舍：** 小计算可分块，大 CPU 任务用 Worker Thread；构建、Shell、需崩溃/资源隔离的工具用 Child Process。
- **项目落地说法：** 用 event-loop lag 与 Span 定位后迁移。
- **误区：** “异步函数”不等于 CPU 计算不阻塞。

### 71. **P1｜前端｜[R1][R2]** React 端如何区分“模型计划”“已执行事实”“验证证据”和“推测性解释”？任务断线重连后 UI 状态从哪里恢复？

- **直接回答：** 计划是可变的意图并带版本；执行事实只能由 Tool/Operation 结果产生；验证证据是带哈希、Commit、退出码的 Build/Test/Gate 产物；模型解释明确标成未验证 claim。
- **原理/取舍：** UI 是投影而非事实源，避免把自然语言“已完成”当成功。
- **项目落地说法：** 重连以 PostgreSQL 的任务快照为真源；若轨迹事件确已持久化，再从 lastSequence 补流，否则只恢复快照和后续实时事件，并明确历史轨迹可能不完整。
- **误区：** 不能依赖 React 内存或聊天文本恢复关键状态。

### 72. **P1｜场景｜[R2][R3][R6]** 用户批准的是 `git push feature-x`，执行前参数或 Commit 被替换；审批怎样绑定规范化 Action Hash、Commit、目标和有效期，防止 TOCTOU？

- **直接回答：** 将动作规范化为 `{verb, argv, repoRealpath, remote, ref, sourceSHA}`，连同审批人、scope、nonce、expiry 计算 Action Hash。
- **原理/取舍：** 执行前重读 HEAD、remote 和参数并重算；任一变化都使审批失效。
- **项目落地说法：** 默认只允许非强推并推送审批绑定的具体 SHA；若确需 force，必须单独审批，并把预期 remote OID/lease 一并绑定。审批记录与 Operation ID 关联。
- **误区：** 只绑定命令文本或分支名无法防 TOCTOU。

## J. OpenTelemetry、Agent Eval 与测试

### 73. **P0｜设计｜[R7]** 为一次任务设计 Trace：`task → agent → model/retrieval/tool → build/test/gate`。Span 的父子关系、Link 和关键属性如何定义？

- **直接回答：** 根 Span 是 task；Agent step 为子 Span，模型、检索、工具再向下挂；Build/Test/Gate 按真实因果归入执行或验证阶段。
- **原理/取舍：** 直接因果工作即使异步也通常沿传播上下文建立父子关系；一次逻辑调用下的各 retry attempt 建子 Span。Link 适合批量消费、脱离原 Trace 的后台任务，或一个 Span 由多个上游上下文共同促成的 fan-in，而非所有队列/重试一律使用 Link。
- **项目落地说法：** 记录受控枚举的角色/工具/模型、token、retrieval k、indexCommit、exitCode、attempt 和 operation 状态，并对异常设置 Span status/event。
- **误区：** taskId 不做 Metric Label，也不记录密钥/源码。

### 74. **P1｜追问｜[R1][R3][R7]** Trace Context 如何跨 Electron IPC、AsyncLocalStorage、队列、Worker Thread 和子进程传播？上下文丢失会在 Trace 中表现为什么？

- **直接回答：** 在受信 IPC/队列信封中注入、提取 W3C `traceparent/tracestate`；进程内由 OTel Context Manager（Node 通常基于 AsyncLocalStorage）绑定回调；Worker message、child env/stdin 传 carrier，消费端按因果关系恢复 parent 或建立 Link。
- **原理/取舍：** Context 不会自动跨线程/进程继承；来自不可信 Renderer 或外部消息的 carrier 还要校验/重建，避免 Trace spoofing 或错误串链。
- **项目落地说法：** 可把注入/提取封装成 `withTraceCarrier` 并做合同测试；只有实际落地后再把该封装名写成项目事实。
- **误区：** 丢失会形成孤立 root、断裂瀑布和错误关键路径，不只是少日志。

### 75. **P0｜安全｜[R7]** Span 名称和 Metric Label 为什么要低基数？Prompt、源码、密钥和用户数据能否直接记录？Head/Tail Sampling 如何选择？

- **直接回答：** Span 名称用模板如 `tool.execute`，Label 只放有限枚举；把 taskId、路径或错误全文作为标签会造成时序爆炸和高成本。
- **原理/取舍：** Prompt、源码、密钥和用户数据默认不进遥测，仅记录长度、分类及受控哈希/脱敏引用。Head Sampling 在入口决定、成本低但可能漏异常；Tail Sampling 要先把候选 Trace 送到 Collector 缓冲，才能按错误或高延迟保留，资源成本更高。
- **项目落地说法：** 可选择可控比例的 head sampling，或让 Collector 接收足够样本后做 tail policy；不能先在 SDK 大量 head-drop，再声称 tail 能保证保留那些已丢弃的错误 Trace。
- **误区：** Trace attribute 也受隐私策略约束。

### 76. **P0｜场景｜[R6][R7]** 端到端 P95 从 90 秒升到 150 秒，但模型延迟不变；如何沿关键路径排查队列、Lease 等待、检索、Rerank、工具重试和 Build/Test？

- **直接回答：** 比较回归前后 P95 Trace 的 critical path，拆出 queue wait、Lease acquire、检索、Rerank CPU、工具各次 attempt、Build/Test。
- **原理/取舍：** 并行但不在关键路径的慢 Span 不应误判；重试看总预算。
- **项目落地说法：** 按版本、worker、仓库规模分组，结合 event-loop lag、队列深度和 CPU/IO 查相关性。
- **误区：** 模型不变不代表 Agent 层无回归，等待也必须建 Span。

### 77. **P0｜评测｜[B0][R7][R8]** 检索评测、单步工具评测、Agent 轨迹评测和端到端交付评测为何必须分层？线上 Badcase 如何回流又不污染独立测试集？

- **直接回答：** 检索看 Recall/MRR/nDCG；工具层看选型、参数 Schema、权限和幂等；轨迹层看步骤效率、循环与违规；端到端看可验收产物。
- **原理/取舍：** 分层才能归因，否则最终失败无法区分检索、决策或环境问题。
- **项目落地说法：** 线上 Badcase 脱敏、去重、人工定标后进入回归/开发集，不得补入当前冻结 holdout 后继续宣称同一口径的无偏结果；发布下一版数据集时重新版本化，并保留独立、未参与调参的测试切分。
- **误区：** 不能边调 Prompt 边反复查看测试集得分。

### 78. **P1｜评测｜[B0][R7]** LLM-as-a-Judge 有哪些位置、长度、自偏好和标准漂移偏差？何时用确定性验证器、盲评、成对比较和人工抽检？

- **直接回答：** Judge 可能偏爱前/后位置、长答案、与自身风格或模型同源的答案，且换版本后评分尺度漂移。
- **原理/取舍：** 能由编译、测试、Schema、引用存在性判定的先用确定性验证器；主观质量采用随机换序盲评和成对比较，并校准人工标注。
- **项目落地说法：** 固定 Judge 版本/Prompt，记录一致率，边界样本与高风险任务人工抽检。
- **误区：** 单次绝对分不是 ground truth，也不能让 Judge 看系统名称。

### 79. **P0｜测试｜[R1][R3][R7]** 设计测试金字塔：纯函数/Zod 单测、Tool/IPC 合同测试、Postgres/Redis 集成、模型 Stub 流程、Electron Playwright E2E、真实模型小样评测各测什么？

- **直接回答：** 单测覆盖 reducer、路径/RRF、Zod 边界；合同测试覆盖 Tool/IPC 的输入输出、错误码和鉴权；真实 Postgres/Redis 测事务、Lease、幂等与缓存；模型 Stub 穷举状态机分支。
- **原理/取舍：** Playwright 只保留审批、流式、刷新恢复等关键 UI 闭环；真实模型小样测语义退化、成本和延迟。
- **项目落地说法：** 越靠下越快且确定，越靠上样本越少。
- **误区：** 不用昂贵 E2E 代替可定位的底层测试。

### 80. **P0｜场景｜[R4][R6][R7]** 注入模型 429、流中断、Lease 丢失、重复事件、陈旧索引、Shell 卡死、Git push 后崩溃和 Renderer 刷新；每种故障应验证哪些系统不变量？

- **直接回答：** 429 应受预算/退避控制；断流和重复事件不得重复状态转移；Lease 丢失后旧 Worker 的 fencing 写必须失败；陈旧索引不得越过 Commit Gate；Shell 超时要杀进程树并清理。
- **原理/取舍：** 验证的是状态、外部副作用和证据，不是只看 UI；外部效果不可重复，取消/失败后也不能遗留幽灵进程、旧 Worker 写入或错误的成功证据。
- **项目落地说法：** push 后崩溃靠 Operation ID 与远端对账避免再推；Renderer 刷新由快照+回放恢复且无监听泄漏。
- **误区：** 每例都应留下关联 Trace，并收敛到成功、失败、取消或结果未知等明确状态；不能把 timeout 一律记为失败。

## K. 指标真实性、项目所有权与简历压力测试

### 81. **P0｜追问｜[R8]** 80 条 Query 从哪里来？真实 Issue、人工生成还是日志？数据集是否在调参前冻结，是否有训练/开发/独立测试划分？

- **直接回答：** 必须按真实事实给出来源占比、抽样规则、Gold 标注人与分歧处理，不能只说“整理了 80 条”。
- **原理/取舍：** 调参前冻结 query、Gold、仓库 Commit 和评测脚本；按仓库/问题类型分层，开发集用于调参，独立测试集一次性验收。
- **项目落地说法：** 面试可携带脱敏清单、数据版本与运行命令；若当时未做 train/dev/test，就坦诚称为 pilot benchmark。
- **误区：** 人工生成题与真实 Issue 应分报，避免同源泄漏。

### 82. **P0｜计算｜[R5][R8]** 你的 Recall@5 究竟是 Recall、Hit@5 还是 Success@5？若每题只有一个 Gold 文件，72.5% 和 90.0% 分别对应多少条命中？

- **直接回答：** 若每题恰有一个 Gold 文件，指标实际是二值 Hit@5/Success@5，也等价于该设定下的 Recall@5；`0.725×80=58`，`0.90×80=72`，净增 14 条。
- **原理/取舍：** 提升是 17.5 个百分点，相对提升 `17.5/72.5≈24.1%`。
- **项目落地说法：** 报告原始分子分母和失败清单。
- **误区：** 多 Gold 时需定义 macro/micro recall，不能套用 58/72 的换算，也不能把百分点称为百分比。

### 83. **P0｜追问｜[R5][R8]** Baseline 是什么？向量、全文、RRF、Rerank、Codemap 各贡献多少？请给消融表，而不是只报最终两个百分比。

- **直接回答：** Baseline 必须按当时真实实验定义；若 72.5% 确实来自单路向量 Top-5，就在同一数据、Commit、切块和 Embedding 下比较“+全文、+RRF、+Rerank、+Codemap”。若不是，必须说清真实起点，不能为了好讲改写基线。
- **原理/取舍：** 表中至少给 `hits/80、Recall@5、P95、每 Query 成本`，否则无法判断收益来自哪个组件。
- **项目落地说法：** 从同一评测脚本导出累积消融和单组件移除表，并记录失败转移；没有保留实验时只能说明“尚不能归因”。
- **误区：** 没有实验记录就不能编造各组件贡献；参数变化不能混入组件消融。

### 84. **P1｜统计｜[R7][R8]** 80 条样本能否支持泛化结论？如何看配对转移、Bootstrap 置信区间或 McNemar 检验，并同时报告 P95 延迟和成本变化？

- **直接回答：** 80 条只能说明该冻结样本上的结果，泛化仍有限；先列 2×2 配对表：两者都中、仅新方案中、仅旧方案中、都不中。
- **原理/取舍：** 对 query 做配对 Bootstrap 得差值置信区间；McNemar 只使用两类不一致样本检验命中率变化。已知净增 14 条仍不足以算检验，因为回退数未知。
- **项目落地说法：** 同时报命中差值 CI、P95、token/检索成本和 cost-per-success。
- **误区：** 不把重复运行当独立样本。

### 85. **P0｜追问｜[R6][R8]** “无关文件修改率”的分母是任务、文件、Hunk 还是 LOC？格式化、快照、Lockfile、生成文件如何计入？

- **直接回答：** 主指标要明确定义，例如 micro 文件率=`被标注为无关的 changed files / 全部 changed files`；另报 task-level=`出现至少一个无关文件的任务 / 完成任务`，不能混称。
- **原理/取舍：** Hunk/LOC 会被格式化放大，因此可作辅助指标。
- **项目落地说法：** 在评测前冻结相关文件/允许生成物规则；格式化、快照、Lockfile、生成文件只在由需求必然触发且通过审核时算相关，否则照常计入。
- **误区：** 分母和排除项必须与 17.6%→4.9% 一起公开。

### 86. **P0｜追问｜[R7][R8]** 端到端成功、人工接管和每成功任务成本分别怎样定义？失败重试、Embedding/Rerank、人工修复和环境故障是否计入？

- **直接回答：** 端到端成功应同时满足目标验收、Build/Test/Scope Gate、产物可交付且无未批准副作用；人工接管率=`需要人修改计划/代码/恢复执行的任务数 / 总任务数`。
- **原理/取舍：** 每成功任务成本=`全部任务的模型、Embedding、Rerank、工具与失败重试成本 / 成功任务数`，不能只算成功轨迹。
- **项目落地说法：** 人工修复时长单列并可折算；环境故障同时给 all-in 与 controllable 两套口径。
- **误区：** “人工点批准”不等于接管。

### 87. **P0｜行为｜[R2][R8]** 简历写“参与开发”：团队几人、你独立负责哪些模块、提出哪些设计、写了哪些核心代码、哪个指标由你亲自计算？

- **直接回答：** 团队人数和分工必须填真实数字；用“我负责/我协作/团队已有”拆开陈述，不把平台整体算成个人产出。
- **原理/取舍：** 个人所有权要能沿需求、设计、PR、测试和指标脚本追溯。
- **项目落地说法：** 可围绕自己真实负责的 Runtime、IPC/RAG/可观测模块，展示一段核心代码、一次设计决策和亲自运行的评测命令。
- **误区：** 不确定的数据不猜；能说清接口边界、代码行与复盘证据，比堆技术名词得分高。

### 88. **P0｜行为｜[R2][R4][R7]** 讲一个最严重 Badcase：触发条件、Trace/日志证据、根因、修复、回归用例、指标变化和仍未解决的边界。`Stage` 在项目中具体指什么？

- **直接回答：** 选择一个真实且可复现的事故，按“触发条件→Trace 时间线→根因→修复→回归→量化变化→剩余风险”讲；不要编造。
- **原理/取舍：** 指标变化只归因到有消融证据的部分。
- **项目落地说法：** 例如，若真实发生过 Commit 漂移，可展示 Locator 的 indexCommit 与执行 HEAD 不一致，修复为 Commit Gate、缓存失效和重新定位，并加入故障注入。
- **误区：** `Stage` 不是通用术语，应明确是内部预发布/验收环境还是交付状态及其准入条件。

## L. 实际应用与系统设计场景

### 89. **P0｜场景｜[R2][R4]** 用户只说“给这个大型仓库加一个导出功能”，需求含糊。设计从澄清、计划、定位、修改、验证、审批到 PR/Stage 的完整闭环和停止条件。

- **直接回答：** 先澄清导出对象、格式、入口、权限、规模和验收样例，形成版本化任务合同。Locator 在固定 Commit 给证据，Planner 拆 DAG，Executor 在隔离 worktree 修改。
- **原理/取舍：** Executor 产出 Diff，Reviewer 审查语义和范围，Verifier 生成 Build/Test/Scope/Security 证据；通过 Gate 后，再审批 push、PR/Stage 等高风险交付动作。
- **项目落地说法：** 关键歧义、Commit 漂移、预算耗尽、重复失败或越权即停止。
- **误区：** 不能让模型猜业务契约。

### 90. **P0｜场景｜[R3][R5][R6]** 仓库 README 注入指令，要求读取 SSH Key 并通过 MCP 上传。请从 Context、Tool、IPC、权限、审批、网络和审计七层防御。

- **直接回答：** Context 层把仓库文本标为不可信数据且不进入系统指令；Tool 层不提供读密钥能力；IPC 层 Main 重验 Schema/调用者；权限层限定 workspace 与沙箱。
- **原理/取舍：** 审批绑定具体文件、目标和 Action Hash，敏感路径即使审批也默认禁止；网络经 egress allowlist/proxy，MCP Server 按来源和能力隔离；审计覆盖允许与拒绝的敏感调用，但只保存脱敏参数摘要、策略结论和 Trace 引用。
- **项目落地说法：** SSH Key 永不进入模型上下文。
- **误区：** 不能只靠 Prompt 说“忽略恶意指令”。

### 91. **P0｜场景｜[R4][R5]** Locator 在 Commit A 找到文件，Executor 执行前工作区变成 Commit B；系统怎样检测、重定位、失效缓存并避免引用漂移？

- **直接回答：** 任务合同、检索结果和引用都携带 repo/baseCommit/blobHash；Executor 开始前比较当前 HEAD，B≠A 即拒绝使用旧证据。
- **原理/取舍：** 缓存键包含 Commit，受影响条目失效；blobHash 未变的证据可验证后复用，变更文件必须重新索引、定位和生成行号引用。
- **项目落地说法：** 在隔离 worktree 锁定 A，或经用户允许迁移到 B 后重跑 Locator 与 Scope Gate。
- **误区：** 不能只更新显示的 Commit 字段而保留旧 chunk/line。

### 92. **P0｜场景｜[R4][R6]** Git push/创建 PR 已成功，但进程在写 PostgreSQL 成功状态前崩溃。新 Worker 接管后如何核对外部真实状态并避免第二个 PR？

- **直接回答：** 调用前持久化 `Operation ID、requestHash、branch、headSHA、PROCESSING`；若 Git Provider 支持原生 idempotency key 就复用同一键，否则在 branch/PR body 保存可查询的 Operation 标记。
- **原理/取舍：** 接管者遇到 PROCESSING/UNKNOWN，先按 repo、headSHA、base 和标记查询远端；存在则核对内容后补写成功。只有能确认未创建且仍持有当前处理权时才重试；无法排除并发或查询不可靠就保持 UNKNOWN/转人工，Fencing Token 本身不能约束不识别它的外部 Provider。
- **项目落地说法：** 可用数据库 intent/操作台账配合 Reconciliation 处理跨系统不原子的崩溃窗口；Outbox 只保证本地状态与待发事件，不单独保证 PR 不重复。若项目尚未实现 Outbox，应明确把它作为改进方案。
- **误区：** 超时或崩溃不是失败，不能直接重放。

### 93. **P0｜场景｜[R4][R6]** Worker A Lease 过期、B 接管、A 又恢复；A 已在本地改文件，B 已生成另一套修改。如何处理旧写、工作区隔离和结果仲裁？

- **直接回答：** 每次接管获得单调 Fencing Token；PostgreSQL 状态和受控制品发布用 `currentFence + version` 条件写，A 的旧 token 必须失败并触发 Abort。外部系统若不验证 token，则另用 Operation ID、幂等键和对账约束副作用。
- **原理/取舍：** A、B 使用独立 worktree/branch；Lease 只能撤销处理资格，不能撤销 A 已产生的本地 Diff 或外部效果。
- **项目落地说法：** 可将 A 的 Diff 放入隔离区，B 的结果也只是当前候选；Supervisor 根据 base Commit、测试和 Scope 证据选择，确需吸收 A 的修改时重新应用到干净基线并完整验证，而非直接合并两个工作区。
- **误区：** 不能“最后写入者胜”，也不能共享目录。

### 94. **P0｜场景｜[B0][R4][R5]** 任务执行一半 Context 即将耗尽。设计 Compaction、Checkpoint、结构化 Notes、子 Agent 清洁上下文和恢复验证。

- **直接回答：** 在阈值到达前 checkpoint 状态机：目标/约束、计划版本、已完成节点、Operation ID、Commit、patch、测试证据、待决策和预算；原始轨迹保存在外部日志。
- **原理/取舍：** Compaction 输出带来源 ID、事实/假设、置信度的结构化 Notes，而非无来源长摘要；子 Agent 只拿最小任务合同和必要证据。
- **项目落地说法：** 恢复时核验 Commit/文件哈希、外部副作用和最后 sequence，再回放尾部事件。
- **误区：** 压缩不能丢权限、未决失败和幂等状态。

### 95. **P0｜场景｜[R2][R6]** Build/Test 全部通过，但 Scope Gate 发现改了 40 个无关文件。系统应拒绝、隔离机械变更、重新审批还是回滚？给出决策条件。

- **直接回答：** 默认拒绝进入 PR/Stage，因为测试通过不证明修改范围正确。
- **原理/取舍：** 若是与需求无关的格式化，应从候选 Patch 中剔除；若生成物确由仓库规则或需求必然触发，则提供可复现生成证据，扩展任务合同/Scope 后重新审批并可隔离成独立 commit；无法解释或含语义风险时，丢弃候选 Patch、回到干净 worktree 重做。
- **项目落地说法：** 每次处理后重跑 Test 与 Scope Gate 并保留 diff 证据。
- **误区：** 不能静默扩大 scope，也不应粗暴回滚用户原有改动。

### 96. **P1｜场景｜[R4][R7][R8]** Multi-Agent 成功率提升 3 个百分点，但 Token 翻倍、P95 增加 80%、人工接管不变。你是否上线？设计分层路由和 A/B 判定标准。

- **直接回答：** 不做全量上线；先判断 3 个百分点的配对置信区间及业务价值是否覆盖 2 倍 token 和 80% P95 成本。
- **原理/取舍：** 用复杂度/风险分类器路由：简单任务走单 Agent，跨域、长链或高不确定任务才走 Multi-Agent，并设预算降级。
- **项目落地说法：** 分层随机 A/B，主指标为可验收成功与 cost-per-success，护栏含 P95、人工接管、安全违规和循环率。
- **误区：** 平均成功率不能掩盖用户分层；无显著净效用就不上线。

## M. 现场手写与后端基本功

### 97. **P0｜手写｜[R1][R4]** 用 TypeScript 实现“100 个异步任务、最大并发 3、支持 AbortSignal、保序收集结果、单任务超时且无监听器泄漏”的调度器。

- **直接回答：** 固定启动 3 个 worker，worker 在首次 `await` 前领取唯一索引，并按该索引写入 `PromiseSettledResult[]`，因此结果保序。
- **原理/取舍：** 父取消转发给每项的子 `AbortController`，timeout 也 abort 子信号；所有 timer 和 listener 在 `finally` 清理。父取消使整体拒绝，单项错误/超时则写入对应结果。
- **项目落地说法：** `run` 必须协作响应 Signal；若底层库不支持取消，`Promise.race` 只能让调用方超时，真实任务仍可能运行，强隔离任务应放进可终止的 Child Process。
- **误区：** 只 `setTimeout(reject)` 不取消底层任务，或 timeout 后立即补新任务却仍声称“真实并发始终为 3”。

```ts
type Runner<T, R> = (item: T, signal: AbortSignal) => Promise<R>;

function signalError(s: AbortSignal, fallback = "Aborted"): Error {
  if (s.reason instanceof Error) return s.reason;
  const e = new Error(fallback);
  e.name = "AbortError";
  return e;
}

async function mapLimit<T, R>(
  items: readonly T[],
  run: Runner<T, R>,
  parent: AbortSignal,
  timeoutMs: number,
  limit = 3,
): Promise<PromiseSettledResult<R>[]> {
  if (!Number.isInteger(limit) || limit < 1 || timeoutMs <= 0) {
    throw new RangeError("invalid limit/timeout");
  }

  const out = new Array<PromiseSettledResult<R>>(items.length);
  let next = 0;

  async function worker(): Promise<void> {
    for (;;) {
      if (parent.aborted) throw signalError(parent);
      const index = next++; // no await before increment: each worker gets a unique index
      if (index >= items.length) return;

      const child = new AbortController();
      const relayParent = () => child.abort(signalError(parent));
      parent.addEventListener("abort", relayParent, { once: true });
      if (parent.aborted) relayParent(); // closes check -> subscribe race

      const timeout = setTimeout(() => {
        const e = new Error(`task ${index} timed out`);
        e.name = "TimeoutError";
        child.abort(e);
      }, timeoutMs);

      let rejectOnAbort!: () => void;
      const aborted = new Promise<never>((_, reject) => {
        rejectOnAbort = () => reject(signalError(child.signal));
        child.signal.addEventListener("abort", rejectOnAbort, { once: true });
        if (child.signal.aborted) rejectOnAbort();
      });
      const task = Promise.resolve().then(() => run(items[index]!, child.signal));

      try {
        out[index] = { status: "fulfilled", value: await Promise.race([task, aborted]) };
      } catch (reason) {
        out[index] = { status: "rejected", reason };
      } finally {
        clearTimeout(timeout);
        parent.removeEventListener("abort", relayParent);
        child.signal.removeEventListener("abort", rejectOnAbort);
      }
    }
  }

  const workers = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return out;
}
```

### 98. **P1｜手写｜[R5]** 输入向量检索、全文检索和 Codemap 的三个排名列表，实现加权 RRF、去重和每文件候选上限。

- **直接回答：** 加权 RRF 为 `score(d)=Σ w_l/(k+rank_l(d))`，rank 从 1 开始；先在每一路内去重，再跨路按文档主键融合。
- **原理/取舍：** RRF 只依赖名次，不直接比较不同检索器不可比的原始分数。每文件上限应在融合排序后应用，否则会提前丢失跨路互补信号。
- **项目落地说法：** 用 `commit + path + chunkId` 作候选键，用 `commit + path` 作文件键；保存命中来源、最佳名次，并用稳定字段处理同分。
- **误区：** 同一路重复候选被重复加分、rank 从 0 开始，或先对各路做 per-file cap 再融合。

```ts
type Hit = { commit: string; path: string; chunkId: string; text: string };
type RankedList = { source: string; weight: number; hits: readonly Hit[] };
type FusedHit = Hit & {
  id: string;
  fileKey: string;
  score: number;
  bestRank: number;
  sources: string[];
};

function weightedRrf(
  lists: readonly RankedList[],
  maxPerFile: number,
  k = 60,
): FusedHit[] {
  if (k <= 0 || maxPerFile < 1) throw new RangeError("invalid RRF options");
  const docs = new Map<string, FusedHit & { sourceSet: Set<string> }>();

  for (const { source, weight, hits } of lists) {
    const seenInList = new Set<string>();
    hits.forEach((hit, index) => {
      const id = `${hit.commit}\0${hit.path}\0${hit.chunkId}`;
      if (seenInList.has(id)) return;
      seenInList.add(id);

      const rank = index + 1;
      let fused = docs.get(id);
      if (!fused) {
        fused = {
          ...hit,
          id,
          fileKey: `${hit.commit}\0${hit.path}`,
          score: 0,
          bestRank: rank,
          sources: [],
          sourceSet: new Set<string>(),
        };
        docs.set(id, fused);
      }
      fused.score += weight / (k + rank);
      fused.bestRank = Math.min(fused.bestRank, rank);
      fused.sourceSet.add(source);
    });
  }

  const sorted = [...docs.values()].sort(
    (a, b) => b.score - a.score || a.bestRank - b.bestRank || a.id.localeCompare(b.id),
  );
  const fileCounts = new Map<string, number>();
  const result: FusedHit[] = [];
  for (const hit of sorted) {
    const count = fileCounts.get(hit.fileKey) ?? 0;
    if (count >= maxPerFile) continue;
    fileCounts.set(hit.fileKey, count + 1);
    const { sourceSet, ...publicHit } = hit;
    result.push({ ...publicHit, sources: [...sourceSet].sort() });
  }
  return result;
}
```

### 99. **P1｜手写｜[R1][R6]** 实现带 TTL、容量上限和 LRU 淘汰的检索缓存；说明并发 Miss 和缓存击穿怎么处理。

- **直接回答：** `Map` 保留插入顺序：命中后删除并重插实现 touch，过期立即删除，写入超容量时循环淘汰最旧 key。
- **原理/取舍：** 进程内 `inflight Map<K, Promise<V>>` 可让同一 key 的并发 Miss 复用一次加载；失败或成功后都必须只清除自己的 Promise。
- **项目落地说法：** 热点可增加 TTL Jitter、stale-while-revalidate；多进程场景还需 Redis 级协调，但分布式锁失效后仍要允许安全的重复计算。
- **误区：** 用 `if (value)` 判断命中导致缓存值为 `0/false` 时失效，或让 rejected Promise 永久留在 inflight。

```ts
type Entry<V> = { value: V; expiresAt: number };

class LruTtlCache<K, V> {
  private readonly data = new Map<K, Entry<V>>();
  private readonly inflight = new Map<K, Promise<V>>();

  constructor(
    private readonly capacity: number,
    private readonly defaultTtlMs: number,
  ) {
    if (!Number.isInteger(capacity) || capacity < 1 || defaultTtlMs <= 0) {
      throw new RangeError("invalid cache options");
    }
  }

  private lookup(key: K): Entry<V> | undefined {
    const entry = this.data.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.data.delete(key);
      return undefined;
    }
    this.data.delete(key);
    this.data.set(key, entry); // most recently used
    return entry;
  }

  get(key: K): V | undefined {
    return this.lookup(key)?.value;
  }

  set(key: K, value: V, ttlMs = this.defaultTtlMs): void {
    if (ttlMs <= 0) {
      this.data.delete(key);
      return;
    }
    this.data.delete(key);
    this.data.set(key, { value, expiresAt: Date.now() + ttlMs });
    while (this.data.size > this.capacity) {
      const oldest = this.data.keys().next();
      if (oldest.done) break;
      this.data.delete(oldest.value);
    }
  }

  async getOrLoad(key: K, load: () => Promise<V>): Promise<V> {
    const hit = this.lookup(key);
    if (hit) return hit.value;

    const shared = this.inflight.get(key);
    if (shared) return shared;

    // Promise.resolve().then(load) also converts a synchronous throw into rejection.
    const pending = Promise.resolve().then(load).then((value) => {
      this.set(key, value);
      return value;
    });
    this.inflight.set(key, pending);
    try {
      return await pending;
    } finally {
      if (this.inflight.get(key) === pending) this.inflight.delete(key);
    }
  }
}
```

### 100. **P1｜手写｜[R2][R3][R6]** UI 收到重复、乱序、丢失的流式事件；根据 `taskId + sequence + eventId` 实现去重、重排、缺口检测和重连补偿。

- **直接回答：** 每个 task 独立保存 `nextSeq`、`seenById` 和 `pendingBySeq`；只有从 `nextSeq` 开始连续的事件才能进入 reducer，ACK 也只能推进到该连续位置。
- **原理/取舍：** 相同 eventId 不同 sequence、或同 sequence 不同 eventId 都是协议冲突；gap 用单个 debounce timer 请求 `replay(from=nextSeq)`，pending 必须有容量上限。
- **项目落地说法：** 重连先取含 `lastSeq/version` 的快照，再回放其后事件；`seen` 只保留有限已应用窗口，快照替换时清空旧缓冲，避免内存永久增长。
- **误区：** 事件到达即渲染、每收到一个乱序事件都发一次 replay，或只按 eventId 去重而不验证 taskId/sequence。

```ts
type StreamEvent<T> = Readonly<{
  taskId: string;
  sequence: number;
  eventId: string;
  payload: T;
}>;

class OrderedStream<T, S> {
  private readonly pending = new Map<number, StreamEvent<T>>();
  private readonly seenById = new Map<string, number>();
  private readonly appliedBySeq = new Map<number, string>();
  private gapTimer?: ReturnType<typeof setTimeout>;
  private replayInFlight = false;

  constructor(
    readonly taskId: string,
    public nextSeq: number,
    public view: S,
    private readonly reduce: (state: S, event: StreamEvent<T>) => S,
    private readonly replay: (taskId: string, from: number) => void | Promise<void>,
    private readonly protocolError: (message: string) => void,
    private readonly gapMs = 300,
    private readonly maxPending = 1_000,
    private readonly historySize = 10_000,
  ) {}

  accept(event: StreamEvent<T>): void {
    if (
      event.taskId !== this.taskId ||
      !Number.isSafeInteger(event.sequence) ||
      event.sequence < 0
    ) {
      this.protocolError("invalid taskId/sequence");
      return;
    }

    const seenSeq = this.seenById.get(event.eventId);
    if (seenSeq !== undefined) {
      if (seenSeq !== event.sequence) this.protocolError("eventId reused at another sequence");
      return;
    }

    if (event.sequence < this.nextSeq) {
      const appliedId = this.appliedBySeq.get(event.sequence);
      if (appliedId !== undefined && appliedId !== event.eventId) {
        this.protocolError("old sequence has a different eventId");
      }
      return; // old duplicate outside the bounded history is harmless
    }

    const queued = this.pending.get(event.sequence);
    if (queued) {
      if (queued.eventId !== event.eventId) this.protocolError("sequence collision");
      return;
    }
    if (this.pending.size >= this.maxPending) {
      this.requestReplay(); // do not let an attacker grow pending without bound
      return;
    }

    this.seenById.set(event.eventId, event.sequence);
    this.pending.set(event.sequence, event);
    this.flushContiguous();
    this.updateGapTimer();
  }

  private flushContiguous(): void {
    for (;;) {
      const event = this.pending.get(this.nextSeq);
      if (!event) return;
      this.pending.delete(this.nextSeq);
      this.view = this.reduce(this.view, event);
      this.appliedBySeq.set(this.nextSeq, event.eventId);
      this.nextSeq++;

      while (this.appliedBySeq.size > this.historySize) {
        const oldest = this.appliedBySeq.keys().next();
        if (oldest.done) break;
        const oldId = this.appliedBySeq.get(oldest.value)!;
        this.appliedBySeq.delete(oldest.value);
        this.seenById.delete(oldId);
      }
    }
  }

  private updateGapTimer(): void {
    if (this.pending.size === 0) {
      if (this.gapTimer) clearTimeout(this.gapTimer);
      this.gapTimer = undefined;
      return;
    }
    if (!this.gapTimer) {
      this.gapTimer = setTimeout(() => {
        this.gapTimer = undefined;
        this.requestReplay();
      }, this.gapMs);
    }
  }

  private requestReplay(): void {
    if (this.replayInFlight) return;
    this.replayInFlight = true;
    void Promise.resolve()
      .then(() => this.replay(this.taskId, this.nextSeq))
      .catch((error) => this.protocolError(`replay failed: ${String(error)}`))
      .finally(() => { this.replayInFlight = false; });
  }

  replaceFromSnapshot(view: S, lastSeq: number): void {
    this.view = view;
    this.nextSeq = lastSeq + 1;
    this.pending.clear();
    this.seenById.clear();
    this.appliedBySeq.clear();
    if (this.gapTimer) clearTimeout(this.gapTimer);
    this.gapTimer = undefined;
  }

  dispose(): void {
    if (this.gapTimer) clearTimeout(this.gapTimer);
    this.gapTimer = undefined;
  }
}
```

### 101. **P0｜手写｜[R1][R3][R6]** 写一个安全的 Workspace Path 校验函数，考虑 `..`、绝对路径、Windows 大小写、符号链接和不存在的目标文件。

- **直接回答：** 只接受相对路径，拒绝 NUL、父目录段和 Windows drive-relative/ADS；先 `realpath` 工作区，再对目标或其最近存在祖先做 `realpath`，最后用 `path.relative` 判断包含关系。
- **原理/取舍：** 对不存在目标，必须解析最近存在祖先以发现中间 symlink 逃逸，再把剩余后缀拼到真实祖先；Windows 的平台 `path.relative` 处理盘符和大小写语义。
- **项目落地说法：** 该函数只做授权前解析，真正 open/create 前仍要重检；高风险写入应在受控 broker/沙箱内完成，并在平台支持时使用 no-follow 或句柄级校验。
- **误区：** 使用字符串 `startsWith(root)`、只检查 `..`，或声称一次路径预检可以消除 symlink TOCTOU。

```ts
import * as path from "node:path";
import { lstat, realpath, stat } from "node:fs/promises";

function isInside(rootReal: string, target: string): boolean {
  const relative = path.relative(rootReal, target);
  return relative === "" || (
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

async function nearestExisting(target: string): Promise<string> {
  let current = target;
  for (;;) {
    try {
      await lstat(current); // includes symlinks; dangling symlink will later fail realpath
      return current;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT" && code !== "ENOTDIR") throw error;
      const parent = path.dirname(current);
      if (parent === current) throw new Error("no existing ancestor");
      current = parent;
    }
  }
}

async function resolveWorkspacePath(
  workspace: string,
  userPath: string,
): Promise<{ rootReal: string; targetReal: string }> {
  if (!userPath || userPath.includes("\0") || path.isAbsolute(userPath)) {
    throw new Error("path must be a non-empty relative path");
  }

  const segments = userPath.split(process.platform === "win32" ? /[\\/]+/ : /\/+/);
  if (segments.includes("..")) throw new Error("parent traversal is forbidden");
  if (process.platform === "win32") {
    if (/^[a-zA-Z]:/.test(userPath) || userPath.startsWith("\\\\")) {
      throw new Error("drive-relative/UNC path is forbidden");
    }
    if (segments.some((segment) => segment.includes(":"))) {
      throw new Error("NTFS alternate data streams are forbidden");
    }
  }

  const rootReal = await realpath(workspace);
  const lexicalTarget = path.resolve(rootReal, userPath);
  if (!isInside(rootReal, lexicalTarget)) throw new Error("outside workspace");

  const ancestor = await nearestExisting(lexicalTarget);
  const ancestorReal = await realpath(ancestor); // rejects a dangling symlink
  if (!isInside(rootReal, ancestorReal)) throw new Error("symlink escapes workspace");

  const suffix = path.relative(ancestor, lexicalTarget);
  if (suffix && !(await stat(ancestorReal)).isDirectory()) {
    throw new Error("a parent component is not a directory");
  }
  const targetReal = path.resolve(ancestorReal, suffix);
  if (!isInside(rootReal, targetReal)) throw new Error("outside workspace");
  return { rootReal, targetReal };
}
```

### 102. **P1｜手写｜[R4]** 给定 Agent 任务 DAG，实现拓扑调度、有界并发、失败传播、取消和只重试受影响子图。

- **直接回答：** 先用 Kahn 算法验证无环并建立入度/ready queue；只有节点成功才释放子节点，running 数量不超过 limit。
- **原理/取舍：** 暂态失败只重试当前节点；最终失败只阻塞其传递后代，独立分支继续。父 Abort 停止领取并传播到 running，随后等待其清理。
- **项目落地说法：** Checkpoint 保存节点状态、attempt、input/output hash。若成功节点输入变化，只把该节点及 descendants 置为待执行，已成功 ancestors 和无关 siblings 保留。
- **误区：** 不预检环、任一失败就取消整图，或取消后不等待正在运行节点释放资源。节点若不响应 Signal，应改用可终止的隔离进程。

```ts
type DagNode<R> = {
  id: string;
  deps: readonly string[];
  run: (signal: AbortSignal) => Promise<R>;
};
type NodeState = "pending" | "running" | "succeeded" | "failed" | "blocked";
type Completion<R> =
  | { id: string; ok: true; value: R }
  | { id: string; ok: false; error: unknown };

async function runDag<R>(
  definitions: readonly DagNode<R>[],
  limit: number,
  parent: AbortSignal,
  retryable: (error: unknown) => boolean,
  maxAttempts = 2,
) {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError("invalid limit");
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new RangeError("invalid maxAttempts");
  }
  const abortReason = () => {
    if (parent.reason instanceof Error) return parent.reason;
    const error = new Error("DAG cancelled");
    error.name = "AbortError";
    return error;
  };
  const nodes = new Map(definitions.map((node) => [node.id, node] as const));
  if (nodes.size !== definitions.length) throw new Error("duplicate node id");

  const children = new Map<string, string[]>(
    definitions.map((node) => [node.id, [] as string[]] as const),
  );
  const indegree = new Map<string, number>();
  for (const node of definitions) {
    indegree.set(node.id, node.deps.length);
    for (const dep of node.deps) {
      if (!nodes.has(dep)) throw new Error(`missing dependency: ${dep}`);
      children.get(dep)!.push(node.id);
    }
  }

  // Validate acyclicity without mutating the runtime indegree table.
  const checkDegree = new Map(indegree);
  const checkQueue = [...checkDegree].filter(([, d]) => d === 0).map(([id]) => id);
  let visited = 0;
  while (checkQueue.length) {
    const id = checkQueue.shift()!;
    visited++;
    for (const child of children.get(id)!) {
      const d = checkDegree.get(child)! - 1;
      checkDegree.set(child, d);
      if (d === 0) checkQueue.push(child);
    }
  }
  if (visited !== nodes.size) throw new Error("DAG contains a cycle");

  const ready = [...indegree].filter(([, d]) => d === 0).map(([id]) => id);
  const state = new Map<string, NodeState>(
    definitions.map((node) => [node.id, "pending" as NodeState] as const),
  );
  const attempts = new Map<string, number>();
  const results = new Map<string, R>();
  const running = new Map<string, Promise<Completion<R>>>();
  const controllers = new Map<string, AbortController>();

  const blockDescendants = (root: string) => {
    const stack = [...children.get(root)!];
    while (stack.length) {
      const id = stack.pop()!;
      if (state.get(id) !== "pending") continue;
      state.set(id, "blocked");
      stack.push(...children.get(id)!);
    }
  };

  const launch = (id: string) => {
    const controller = new AbortController();
    const relay = () => controller.abort(abortReason());
    parent.addEventListener("abort", relay, { once: true });
    if (parent.aborted) relay();
    controllers.set(id, controller);
    state.set(id, "running");
    attempts.set(id, (attempts.get(id) ?? 0) + 1);

    const completion: Promise<Completion<R>> = Promise.resolve()
      .then(() => nodes.get(id)!.run(controller.signal))
      .then(
        (value) => ({ id, ok: true, value } as const),
        (error) => ({ id, ok: false, error } as const),
      )
      .finally(() => {
        parent.removeEventListener("abort", relay);
        controllers.delete(id);
      });
    running.set(id, completion);
  };

  for (;;) {
    if (parent.aborted) {
      for (const controller of controllers.values()) controller.abort(abortReason());
      await Promise.allSettled([...running.values()]);
      throw abortReason();
    }

    while (running.size < limit && ready.length) {
      const id = ready.shift()!;
      if (state.get(id) === "pending") launch(id);
    }
    if (running.size === 0) break;

    const completion = await Promise.race(running.values());
    running.delete(completion.id);
    if (parent.aborted) continue;

    if (completion.ok) {
      state.set(completion.id, "succeeded");
      results.set(completion.id, completion.value);
      for (const child of children.get(completion.id)!) {
        const remaining = indegree.get(child)! - 1;
        indegree.set(child, remaining);
        if (remaining === 0 && state.get(child) === "pending") ready.push(child);
      }
    } else if (
      retryable(completion.error) &&
      (attempts.get(completion.id) ?? 0) < maxAttempts
    ) {
      state.set(completion.id, "pending");
      ready.push(completion.id);
    } else {
      state.set(completion.id, "failed");
      blockDescendants(completion.id);
    }
  }

  return { state, attempts, results };
}
```

### 103. **P0｜手写｜[R4][R6]** 设计幂等写接口或中间件：同一 Operation ID 重试返回原结果，处理中、成功、失败和结果未知状态如何存储？

- **直接回答：** `Operation ID` 是业务意图主键，同 ID 必须绑定同一 `request_hash`；成功返回已保存结果，处理中返回 202，明确失败按 retryable 决定是否重新 claim，结果未知必须先对账。
- **原理/取舍：** 本地 DB 写可与 `SUCCEEDED` 同事务；外部副作用无法和本地事务原子提交，需远端幂等键、outbox/操作台账及 reconciliation。过期 PROCESSING 不能直接当失败。
- **项目落地说法：** Operation ID 应贯穿审批、Tool、Trace 和外部请求；owner token/lease 防止旧 Worker 提交状态，但不能替代外部幂等。
- **误区：** 每次重试生成新 Operation ID、忽略 request hash 冲突，或在超时后把 UNKNOWN 标成 FAILED 并盲目重放。

```sql
CREATE TABLE operations (
  operation_id  uuid PRIMARY KEY,
  request_hash  text NOT NULL,
  status        text NOT NULL CHECK (status IN
                  ('PROCESSING','SUCCEEDED','FAILED','UNKNOWN')),
  owner_token   uuid,
  lease_until   timestamptz,
  retryable     boolean,
  response      jsonb,
  error         jsonb,
  external_ref  text,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 外部副作用路径的 claim：在短事务中执行
INSERT INTO operations(operation_id, request_hash, status, owner_token, lease_until)
VALUES ($1, $2, 'PROCESSING', $3, now() + interval '30 seconds')
ON CONFLICT DO NOTHING;
SELECT * FROM operations WHERE operation_id = $1 FOR UPDATE;

-- 1. request_hash 不同：409，绝不复用该 Operation ID
-- 2. SUCCEEDED：返回持久化的 response
-- 3. PROCESSING 且 lease 未过期：返回 202 + Retry-After/查询地址
-- 4. PROCESSING 过期或调用已发出但响应丢失：CAS 转 UNKNOWN，先按
--    operation_id/external_ref 查询远端，再转 SUCCEEDED 或可重试 FAILED
-- 5. 仅“确定未产生副作用”的 retryable FAILED 可用新 owner_token CAS 重领
-- 6. 纯本地 DB 写可将 claim、业务写、SUCCEEDED/response 放在同一事务；
--    外部调用则先短事务登记，再由 outbox 投递，并把 operation_id 作为
--    远端 Idempotency-Key；任何完成更新都须校验 owner_token/status
```

### 104. **P1｜手写｜[R4][R7]** 实现指数退避 + Jitter + 最大预算；哪些错误可重试，如何接入熔断器、错误签名和 Trace？

- **直接回答：** Full Jitter 为 `U(0, min(cap, base·2^attempt))`；同时限制总 attempts、单次 timeout 和端到端 deadline，并把服务端 `Retry-After` 作为最小等待值。
- **原理/取舍：** 仅重试网络瞬断、408/429 和可恢复 5xx；Schema/鉴权/确定性业务 4xx、非幂等未知结果及丢 Lease 不自动重试。连续相同错误签名应提前停止。
- **项目落地说法：** 熔断器按“依赖 + 错误类别”统计，open 快速失败、half-open 限量探测；每次 attempt 建子 Span，记录 delay、signature、剩余预算和最终状态。
- **误区：** 只限制重试次数却不限制每次调用时间，忽略 `Retry-After`，或在 Abort 后仍 sleep/重试。熔断器不应把参数校验错误计为依赖故障。

```ts
type RetryDecision = {
  retryable: boolean;
  retryAfterMs?: number;
  countsForBreaker: boolean;
};
type Breaker = {
  allow(): boolean;
  success(): void;
  failure(): void;
};
type Span = {
  setAttribute(name: string, value: string | number | boolean): void;
  recordException(error: unknown): void;
  end(): void;
};

function retrySignalError(signal: AbortSignal, fallback = "Aborted"): Error {
  if (signal.reason instanceof Error) return signal.reason;
  const error = new Error(fallback);
  error.name = "AbortError";
  return error;
}

function abortableDelay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      fn();
    };
    const timer = setTimeout(() => finish(resolve), ms);
    const onAbort = () => finish(() => reject(retrySignalError(signal)));
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
  });
}

async function withRetry<T>(options: {
  operation: (signal: AbortSignal) => Promise<T>;
  signal: AbortSignal;
  maxAttempts: number;
  attemptTimeoutMs: number;
  budgetMs: number;
  baseMs: number;
  capMs: number;
  sameErrorLimit: number;
  classify: (error: unknown) => RetryDecision;
  signature: (error: unknown) => string;
  breaker: Breaker;
  startAttemptSpan: (attempt: number) => Span;
}): Promise<T> {
  if (
    !Number.isInteger(options.maxAttempts) || options.maxAttempts < 1 ||
    options.attemptTimeoutMs <= 0 || options.budgetMs <= 0 ||
    options.baseMs < 0 || options.capMs < 0 || options.sameErrorLimit < 1
  ) throw new RangeError("invalid retry options");

  const deadline = Date.now() + options.budgetMs;
  let previousSignature: string | undefined;
  let sameErrorCount = 0;

  for (let attempt = 0; attempt < options.maxAttempts; attempt++) {
    if (options.signal.aborted) throw retrySignalError(options.signal);
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error("retry budget exhausted");
    if (!options.breaker.allow()) throw new Error("circuit is open");

    const child = new AbortController();
    const relay = () => child.abort(retrySignalError(options.signal));
    options.signal.addEventListener("abort", relay, { once: true });
    if (options.signal.aborted) relay();

    const attemptTimeout = Math.min(options.attemptTimeoutMs, remaining);
    const timeout = setTimeout(() => {
      const e = new Error("attempt timed out");
      e.name = "TimeoutError";
      child.abort(e);
    }, attemptTimeout);
    let rejectOnAbort!: () => void;
    const aborted = new Promise<never>((_, reject) => {
      rejectOnAbort = () => reject(retrySignalError(child.signal));
      child.signal.addEventListener("abort", rejectOnAbort, { once: true });
      if (child.signal.aborted) rejectOnAbort();
    });

    const span = options.startAttemptSpan(attempt);
    let waitMs: number | undefined;
    try {
      const value = await Promise.race([options.operation(child.signal), aborted]);
      options.breaker.success();
      span.setAttribute("retry.attempt", attempt);
      span.setAttribute("retry.success", true);
      return value;
    } catch (error) {
      span.recordException(error);
      if (options.signal.aborted) throw retrySignalError(options.signal);

      const decision = options.classify(error);
      if (decision.countsForBreaker) options.breaker.failure();
      const signature = options.signature(error);
      sameErrorCount = signature === previousSignature ? sameErrorCount + 1 : 1;
      previousSignature = signature;
      span.setAttribute("retry.error_signature", signature);
      span.setAttribute("retry.same_error_count", sameErrorCount);

      if (
        !decision.retryable ||
        attempt + 1 >= options.maxAttempts ||
        sameErrorCount >= options.sameErrorLimit
      ) throw error;

      const jitter = Math.random() * Math.min(
        options.capMs,
        options.baseMs * 2 ** attempt,
      );
      const retryAfter = Number.isFinite(decision.retryAfterMs)
        ? Math.max(0, decision.retryAfterMs!)
        : 0;
      waitMs = Math.max(jitter, retryAfter);
      if (Date.now() + waitMs >= deadline) {
        throw new Error("retry budget exhausted", { cause: error });
      }
      span.setAttribute("retry.delay_ms", waitMs);
      span.setAttribute("retry.remaining_budget_ms", deadline - Date.now());
    } finally {
      clearTimeout(timeout);
      options.signal.removeEventListener("abort", relay);
      child.signal.removeEventListener("abort", rejectOnAbort);
      span.end();
    }

    await abortableDelay(waitMs!, options.signal);
  }
  throw new Error("unreachable");
}
```

---

## 附录 A：回答这些题时必须守住的技术边界

1. **Agent 不必然优于 Workflow。** 步骤可预定义、错误成本高且要求强审计的任务，应优先确定性流程。
2. **Multi-Agent 不必然优于单 Agent。** 必须与强单 Agent 基线比较成功率、P95、成本和人工接管，并做角色消融。
3. **Schema 正确不等于语义正确或安全。** Zod 只能覆盖形状和显式约束，权限、真实路径、副作用和业务不变量仍需 Runtime 校验。
4. **Abort 不等于回滚。** AbortSignal 只能传播取消意图；已发生的 Git、文件或网络副作用必须核对或补偿。
5. **Redis 锁不等于 Exactly Once。** 更现实的设计是 At-least-once 投递配合幂等效果、唯一约束、操作台账、Reconcile 和 Fencing Token。
6. **Memory 不等于向量库。** 向量库是存储/索引；Memory 还包含选择性写入、冲突、遗忘、召回和生命周期策略。
7. **MCP 不等于 Agent 或 Function Calling。** MCP 解决 Host、Client、Server 之间的能力发现和上下文/动作交换；模型工具调用仍需 Host 授权执行。
8. **长 Context 不等于高质量 Context。** Context 越大，成本、干扰和注入面也越大；相关性、来源和版本通常比“全塞进去”重要。
9. **测试通过不等于可交付。** Build/Test 证明有限的功能性质，Scope、权限、变更意图和外部副作用需要独立 Gate。
10. **模型自评不等于真实正确率。** 确定性检查优先，LLM Judge 必须用 Rubric、盲评/成对比较和人工校准。

## 附录 B：简历数字的正确表达

若每条 Query 只有一个 Gold 文件且以 Top-5 是否命中做二值统计：

- Baseline：`58/80 = 72.5%`；
- 新方案：`72/80 = 90.0%`；
- 净增加：14 条命中；
- 绝对提升：17.5 个百分点；
- 相对提升：`17.5 / 72.5 ≈ 24.1%`。

若每条 Query 有多个 Gold，则上述整数换算不成立，应明确 Macro/Micro Recall、标签集合和聚合方式。无论哪种定义，都要同时给：样本来源、标注规则、冻结 Commit、Baseline、消融、配对变化、P95 延迟、Token/成本以及是否提升端到端成功率。

“无关文件修改率”必须先说分母：任务、文件、Hunk 或 LOC；同时报告绝对数量、敏感文件权重、格式化/生成文件规则，以及是否以漏改必要文件为代价。

## 附录 C：主要校准资料

- [Building effective agents](https://www.anthropic.com/research/building-effective-agents)
- [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [MCP 官方架构](https://modelcontextprotocol.io/docs/learn/architecture)
- [Agent Skills Overview](https://agentskills.io/home)
- [Agent Skills 评测](https://agentskills.io/skill-creation/evaluating-skills)
- [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security)
- [pgvector](https://github.com/pgvector/pgvector)
- [Redis Distributed Locks](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/)
- [OpenTelemetry GenAI Semantic Conventions](https://github.com/open-telemetry/semantic-conventions-genai)

公开面经只用于归纳题型，不能视作公司官方题库或逐字原题。
