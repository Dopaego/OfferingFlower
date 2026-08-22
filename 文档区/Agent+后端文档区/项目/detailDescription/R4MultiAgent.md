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

### 4. 什么是 Lost in the Middle、Context Rot 和注意力稀释？上下文窗口足够大时为何仍不能把整个仓库塞进去？

- Lost In the Middle字面意义上就是模型比较难利用上下文中部的信息。 出现原因是, Transformer使用Self-Attention, 对于当前生成的Token, 模型要计算和之前出现的所有Token的相关性, 随着Tokenshu
- Context rot是上下文增长后，信息检索和使用能力都逐渐下降。
- 注意力稀释时，噪声、重复或冲突内容拥有关键信号。 



