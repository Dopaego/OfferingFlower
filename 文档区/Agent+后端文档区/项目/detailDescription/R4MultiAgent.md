# MultiAgent Agent编排相关

> **Multi-Agent Runtime**使用 TypeScript/Node.js 实现 Planner–Locator–Executor–Reviewer–Verifier 多Agent协同编排，通过结构化任务合同约束目标、上下文、输出 Schema、工具权限和预算；结合 AbortSignal、错误签名与 Operation ID 处理取消、失败恢复和非幂等副作用。[R4] [Multi-Agent]

## 面试常见问题

### 1. 一个完整 Agent Loop 包含哪些阶段？如何定义完成、失败、阻塞、转人工和最大步数？[T2]

完整的Agent Loop包含: 装配context, 规划plan, 抉择动作, 调用工具, 观察结果, 更新状态, 验证, 再决定继续或者进入终态

- 完成: 必须有外部证据, 因为只依赖 LLM回复 而判断一个任务是否完成, 会因为LLM 可能产生 幻觉而拿到不准确的结果, 因此 需要有系统返回结果来证明任务真的完成, 比如说, 我们的项目中提交一个PR的完成标志不是 LLM回复结果"已创建PR",而是明确拿到 Github PR的返回结果, 要包括PRid, Url的信息. 而且在我们的项目中, 对于完成的定义还包含了, 由专门的 Verified Agent 验收agent, 去汇总 Build / Test / Scoped的证据, 确认都完成后 才算完成.
- 失败: 我们设置了失败后的最大重复次数, 而我们会收集这些错误签名,去判断 当前错误的根因是什么, 而非无限制地执行错误重试. 同时会有Task Contract 的预算控制退出, Task Contract指的就是我们在每次调用的时候, 与Agent规定的执行预算, 通常有 Token Budget, Time Budget, Cost Budget三种, 无论重试次数还是 Budget达到上限都会退出任务返回失败, 但失败时也会携带相应的 fail error. 除了这些常规退出, 还有通过AbortSignal, 作为紧急停止的信号,在前端发送请求中, 存在 abortController, 它可以结束一个发送的请求, 在Agent开发中类似, 也要存在这样的AbortSignal, 有了它就可以退出当前的执行
- 无进展检测: 不仅要检测失败,还要检测当前的任务是否有实际的进展, 如果执行多轮Loop, 拿到的结果又都是同样的, 就会被判定为No progress, 可以结束本次执行
- 转人工: Agent能处理的任务有限,所以遇到某些特殊任务,还是需要人工审批,或者提供更具体的信息才能继续执行, 比如说: 权限问题, 或者执行命令行中涉及了写数据的操作

### 2. ReAct、Plan-and-Execute、Reflection/Evaluator-Optimizer 分别适合什么任务？它们的成本和失败模式是什么？

三种Agent推理范式

- ReAct(Reason + Act): 推理后执行对应action, 拿到action的执行结果后进行下一次的reason, 直到到达结束边界. 她适合于动态环境, 比如Agent排查问题时,可能并不知道下一步会碰到什么情况, 这个时候使用ReAct模式最合适. 它的成本比较低, 底层逻辑是 1次LLM的调用 + 我们开发好的Tool, 它可以到达局部最优, 但是缺少全局规划,  会出现计划漂移的情况, 因此我们出现了 Plan and Execute的模式
- PlanAndExecute:  先整体规划再执行, 而不是边走边想. 适合于执行长任务, 防止ReAct模式那样出现 计划漂移的情况, 但成本较高, 因为是一次Planner规划调用LLM, 而N次Executor执行, 需要N + 1次的调用. 但是她最大的优点其实是可以调试, 中间的执行过程都是可见的, 所以 我们会根据中间的执行结果决定是否需要Replan, 如果需要,就会根据新的plan去继续执行
- Reflection / Evaluator-Optimizer: Reflection 指的是在反思之前执行的结果, optimizer 再补充新的内容, 让它执行的结果质量提高. 这个推理范式适用于有明确质量评判标准的任务, 这样评判执行结果给出建议是有依据的, 最符合结果的. 它的成本最高, 因为我们在生成结束后需要评估一次,评估后还可能要去再修改.至少要耗费2~3倍的Token
但是Relection 不一定可以提升正确率, 是否正确还是要从每一次的plan来决定的,即便用了relection, 可能最后获得的还是一个质量高的但是错误的Result.
所以现在流行的是 Reflection + ExternalEvidence + Verifier 去证实执行的结果符合要求.

在我们的项目中采用了混合了多种模式的执行架构:
在完整闭环中, planner去负责拆解任务, Executor在执行每一个task的时候用到ReAct模式, 改代码, 跑Build,修Error等, Reviewer 去审查代码质量,  有没有HardCode的部分, 是否有完成需求, 最后的Verifier去执行 BUildGate, Test Gate, Scoped Gate等

### 3. 一次 Coding Agent 推理的 Context 应由哪些部分组成：系统约束、任务合同、计划、代码证据、工具 Schema、工具结果、历史摘要？优先级如何排？

通常一次Context的内容应该包含 TaskContract, 当前的步骤和状态, 不可变的安全约束, 与步骤相关的证据, 可用工具Schema, 必要的工具结果和压缩历史.
而在我们的项目中, 不同的Agent会有不同的ContextEngineering去维护相应的上下文, 比如说 
- Excutor即Coder中还会包含Coding的硬性要求, 完成本轮task需要的内容,即Locator定位到的文件 还有 Planner这轮派发的coding内容, 同时只接受批准范围,并非全部检索轨迹
- Locator会包含文件目录和对应部分???
- Planner会携带PRD转换好的Markdown文件

同时 必须优先保留 安全/权限和验收条件, 再保留关于当前决策所需的新鲜证据, 根据TOken预算和相关性, 来源权威性来裁剪,并非固定的输出顺序.

### 4. 你项目中的Locator的职责是什么, 怎么完成的, 又做了哪些优化呢

> 在我们的项目中,Locator 先用便宜、稳定、高召回的方法缩小范围，再用更昂贵、更灵活的工具验证不确定点

整个的顺序是:

1. pgvector / 全文 / Codemap 粗召回
2. RRF + Rerank
3. 有限代码片段读取
4. JIT grep /AST / LSP校验
5. 有预算的自主浏览

最后得到带证据的LocatorResult

#### 4.1 Locator的工作流程:

1. 规范化任务: 将用户的的需求转换成结构化定位合同[Howtodo?需要LLM参与吗].定义好LocatorTask中包括goal, preferredFileTypes, excludedDirectoies等属性.
    例如: 
    ```JSON
    {
    "goal": "定位登录过期后重试失效的实现",
    "exactTerms": ["SessionExpiredError", "retry"],
    "semanticConcepts": ["登录过期", "重新请求", "会话刷新"],
    "preferredFileTypes": [".ts", ".tsx"],
    "excludedDirectories": ["node_modules", "dist", "coverage"]
    }
    ```

2. 并行高召回: 分别解决不同类型的问题
    - pgvector: 自然语言需求与代码语义不一致
    - 全文检索: 函数名\错误码\路径\字符串
    - Codemap: 符号定义\引用\import\调用关系[codemap到底是啥?]
    - 路径规则: 根据目录和文件名快速过滤

3. RRF 融合: 不同检索器的分数不能直接比较, 主要是依据排名融合来进行选取, 如果在向量\全文\Codemap都排名靠前,融合分数就会上升

4. Rerank: 用更精确但更昂贵的方法处理较小的候选集

5. 将前四步的结果和其他相关信息一起给到LLM. 在思考过程中, 可能会判断调用JIT工具去校验, 比如从以下几方面
    - 多路检索是否一致, 若从各个角度都检索到同一文件, 那么可信度较高, 可以不用校验
    - Top 候选差距是否明显, 如果分数相近, 那么需要进行JIT搜索

6. (optional) JIT工具校验, 常见的几种JIT工具校验的几种方式
    - grep/全文搜索: 适合于精确的函数名, 错误码, API路径
    - AST搜索(howtodo?) 找函数定义, 找特定语法结构, 找特定类型的函数调用
    - LSP?/Codemap: Go to Definition, Import 关系, 类型定义, Find Reference,
    - 文件读取: 适合获取最终的证据, 但应该限制文件数量, 行数, 单次字节数

7. (optional) Agent自主校验,而Agent自主校验需要做到的:
    - 为Locator设置明确的续算: maxToolcalls, maxFilesRead, maxDurationMs
    - 还需要循环检测防止执行重复操作.

而Locator的停止条件也比较明确:
    - 已形成满足任务要求的完整证据链
    - 继续搜索没有产生新证据
    - 达到工具、时间或 Token 预算
    - 需要 Executor 或人工提供额外信息

最后Locator返回的不是单纯的文件名， 而是定义好的结构化数据:

    ```ts
    type LocatorResult = {
    snapshot: WorkspaceSnapshot;
    candidates: Array<{
        path: string;
        symbol?: string;
        startLine: number;
        endLine: number;
        reason: string;
        evidence: string;
        retrievalSources: Array<
        "vector" | "fulltext" | "codemap" | "grep" | "ast"
        >;
        contentHash: string;
        confidence: number;
    }>;
    unresolvedQuestions: string[];
    };
    ```

#### 4.2 如何评测这套混合策略: 
对80条定位Query跑test, 分别用以下情况的步骤进行测试:
A：仅向量 Top-K
B：向量 + 全文
C：向量 + 全文 + Codemap
D：C + RRF/Rerank
E：D + JIT 核验
F：E + 有预算自主浏览

除了记录Reacall@5, 还应该记录 正确文件排行, 每任务Tool调用次数, 平均读取文件数, JIT触发率, 每成功定位Token成本.
理想结果是 , 用尽可能少的检索和工具调用, 获得足够支撑后续修改的证据

### 5. 给 Planner、Locator、Executor、Reviewer 分配 Context Token 预算时，你会保留和删除什么？为什么不同角色不应看到完全相同的上下文？

不管是哪个Agent, 在调用Agent的时候应该按照这个步骤来调用, 保证各自拥有各自的context:
1. PostgreSQL 保存完整任务真相和轨迹
2. Context Builder 按角色、步骤、版本、预算筛选
3. 每个 Agent 只看到完成当前决策所需的信息

所有角色应该共享一份最小的核心信息: 原始用户目标, 验收标准,p0级别的约束, 任务id, workspaceSnapshot,剩余预算,任务ID, 允许修改的Scope, 已经批准的重要决策

#### 5.1 各角色的Context管理的特点

| 角色 | Context 核心 | 应保留 | 应优先删除 |
|---|---|---|---|
| Planner | 目标与约束 | 需求、验收标准、架构摘要、预算 | 完整源文件、检索噪声、构建日志 |
| Locator | 定位线索 | 查询、Codemap、候选文件、符号关系 | 无关计划细节、旧代码、低分候选 |
| Executor | 当前修改 | 批准计划、目标代码、依赖、测试 | 原始检索列表、失败搜索轨迹、旧版本文件 |
| Reviewer | 独立审查 | 原始需求、Diff、当前代码、测试证据 | Executor 自我辩护、完整执行轨迹 |
| Verifier | 验收证据 | 最终 Snapshot、验收条件、Build/Test | 规划讨论、检索过程、修改理由 |


1. planner: 决定任务应该被拆成哪些步骤，以及每一步需要什么能力、风险和验收条件。
    - 保留: 原始用户需求,验收标准, 仓库架构摘要, 可用能力, 预算和风险限制
    - 删除: 大段完整源文件, 全部向量检索结果, 无关历史对话, 无关用户Memory, ToolResult
    - 输出: 结构化计划, 计划的结构也应该定义好[id, objective, requiredEvidence等]
2. locator: 将自然语言需求映射到正确的文件、符号、调用关系和测试入口。
    - 保留:  原始需求中的定位语义,当前定位步骤, Repository Snapshot, 已经执行过的搜索摘要
    - 删除: Planner 的长篇推理过程, 与当前定位无关的计划步骤, 旧 Commit 的代码片段
    - 输出: 给到executor的应该是, path, reason, 和对应的step的goal
3. Executor: 在批准的范围内，基于当前版本代码完成最小必要修改。[通常需要最多的代码Token]
- 保留: 原始目标和验收条件, 已批准的计划步骤, 目标文件的当前内容
- 删除: Locator 的全部 Top-50 候选, 其他 Agent 的自由文本推理
- 输出: 文件如何变动的结构, 包括hash值, 还有文件快照等
4. Reviewer: 独立判断修改是否满足需求、是否引入风险、是否超出范围。
- 保留: 原始需求, 验收标准和 Scope, 实际 Diff,  修改位置周边代码
- 删除: Executor 的长篇自我解释, 成功构建的完整冗长日志
- 输出: 修改建议, 风险级别
5. Verifier: 用尽可能确定性的方式证明最终结果满足验收标准。
- 保留: 最终 Snapshot ID, 原始验收标准, Reviewer 发现的问题及修复状态
- 删除: 前面的Agent的thinking细节, 旧 Snapshot 的测试结果, 与验收无关的源文件
- 输出? : 

#### 5.2 不同角色为什么应该看到不同的上下文:

1. 需要的信息不同
2. 防止注意力稀释
3. 防止错误逐级传递[给到原始需求, 可以辩证性的判断上个Agent的执行是否合理]
4. 减少安全暴露面 不同的Agent给到不同的Tool, 既可以减少消耗额外的Token, 又会增加错误工具选择的概率

> 我不会让 Planner、Locator、Executor、Reviewer 和 Verifier 共用同一份超长上下文，而会从 PostgreSQL 的权威任务状态中，按照角色、步骤、Snapshot 和 Token Budget 动态构建 Context。Planner 主要保留原始目标、验收标准、约束和架构摘要；Locator 保留定位语义、Hybrid Retrieval、Codemap 和搜索证据；Executor 保留批准计划、当前版本目标代码、直接依赖、测试和修改范围；Reviewer 独立读取原始需求、基线到候选版本的 Diff、相关代码和测试证据，并在第一轮尽量不受 Executor 自我解释影响；Verifier 只关注最终 Snapshot、验收条件和确定性的 Build/Test/Scope Gate。裁剪掉的信息只是退出当前模型输入，仍保存在 PostgreSQL 或 Artifact Store 中，可以通过工具按需获取。跨角色通过带 Schema、来源、内容 Hash 和版本信息的结构化合同交接结论、证据、假设和未解决问题，这样既能降低 Token 成本、注意力污染和角色偏见，又能避免过度裁剪导致的信息断层。

### 6. 子 Agent 的 Context 隔离如何减少污染，又会引入哪些信息损失？

子 Agent 只看最小必要 Context 可减少噪声和交叉注入，但会丢失隐含约束，需通过 Task Contract、共享事实表和带来源摘要补偿。
各Agent存在共享的数据, 但也有负责完成对应任务的context,.

### 7. Coding Agent 的计划、历史事故、仓库事实和 Skill 各属于哪类memory, 该如何管理

- 计划: 本轮中的plan属于workingmemory, 但如果是之前的plan, 有可能会被提炼成workflow而变成Procedural Memory, 上一次任务的计划和执行结果 是EpisodicMemory
- 历史事故: 原始事故记录应该是EpisodicMemory, 但是提炼后可以转化为 ProceduralMemory 用于规避事故的再次发生, 而事故揭示的稳定规律应该是SemanticMemory

