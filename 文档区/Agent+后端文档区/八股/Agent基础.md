# Agent 基础

Agent 的大脑是LLM, 他负责决策和推理,而不是应用本身, 而外部系统会负责状态, 工具执行, 权限, 重试和 终止条件. prompt指导LLM的推理和思考,但无法代替程序的安全边界

## LLM 基础

### 基础概念

#### 1. Token 

是LLM处理文本的基本单位,包含系统指令\历史信息\工具定义\检索内容等, 窗口越长会造成更高延迟和成本, 虽然信息变多但是也会导致注意力分散

采样: 对于下一个token生成时的选择

常见的采样参数:

- Temperature：提高随机性
    - 0: 不随机, 直接选择概率最高的
    - 1: 保持LLM推理后的概率去进行选择
    - 2: 让各个选择的概率被拉平
- Top-p: 只在累计概率覆盖一定范围的候选中采样
- Top-k: 只保留概率最高的 K 个候选。
- Max output tokens: 限制的输出长度
- Stop: 遇到特定序列停止

在工程中的建议:

- 创意生成提高temperature
- 事实抽取\路由和工具参数使用低随机性和结构化输出
- 记录token\ 首token延迟\总耗时和工具耗时

在调用openAIAPI时可以传参时 携带采样参数从而左右LLM的推理和答案的随机性和准确性

```ts
const response = await client.responses.create({
    model: "gpt-5",
    temperature: 0.1,
    top_p: 0.95
});
```

#### 2. Prompt

##### 2.1 Prompt 分层

Prompt通常分为:

1. 系统级：身份、总原则、安全边界；
2. 产品级：功能规则、可用能力；
3. 任务级：当前目标和输出格式；
4. 外部数据：检索结果、网页、邮件、记忆；
5. 用户输入：当前请求。

虽然被分为这几类， 但其实不一定真的按照这五类去分别管理，而是明确区分外部数据和内部可信指令来管理。 
比如 系统级、产品级、任务级 都是与内部可信指令， 而外部数据和用户输入都是 外部的， 它们不应该被混在一起

而关于如何做她们之间的区分：

1. 当外部数据[tool result]被注入的时候，会在开头和结尾添加上 untrusted的标签， 代表 被包裹起来的内容都是外部数据。 html先做转义， mcp的普通结果默认加围栏， mcp流式结果会处理 闭合标记被拆成两个chunk的情况，使用carry buffer暂存可能的半截标记 ？？ 对应的ts解决方案 
2. 稳定可信的规则 就会被组装为 system instructions
3. 用户级别的请求被放入user item中，

虽然在此处做了 可信不可信的区分，但它们只是针对于模型侧的信任提示，不能证明攻击绝对无法成功，但能降低模型把数据误当成指令的概率

真正的安全边界，还是工具执行前的风险策略、审批、沙箱sandbox和审计
安全边界后面会更详细地学习

在我们的项目中 

可信规则、用户输入、带围栏的 tool result，最终都会作为当次 LLM 请求的上下文发给模型。
不是自定义“可信/不可信” API 字段，而是标准 system / user / tool 消息；不可信只是内容里的文本围栏。
同时会做截断、压缩和预算控制，不是无限塞。

项目级应用:

    前端角度： 
    ```ts
    export function buildSystemMessage(opt: BuildSystemMessageOpts) : { content: string } {
        // 构造系统级prompt的逻辑
        return {
            content: `
                You are an AI desktop assistant with access to powerful tools:
            `
        }
    }

    sdkSession = await actualClient.createSession({
    mcpServers: mcpConfig,
    hooks,
    tools: allTools,
    systemMessage: { content: opts.systemMessage },
    });
    ```

##### 2.2 Few-shot CoT and Planning Guardrails

- Few-shot: 展示边界样例和格式, 示例的质量比数量更加重要,往往会通过数据库管理,运行时根据任务检索最相关的Few-shot然后插入到prompt中
- CoT Chain of Thought: 这是给出prompt的时候 指导模型去思考,但是现在随着模型越来越强大, 更加追求Plan step by step, 因为推理链可能很长
- Planning:  现代Agent不会单独将planning放进prompt中实现,而是使用Planner Agent
- Guardrails: 约束部分可以直接通过代码来实现filter, 不需要放进数据库中

#### 3. Structured Output 与 Schema

当程序 需要消费模型输出时， 应该优先使用JSON schema 或者Zod做校验， 而不是从自然语言中截取JSON
可靠流程：

    模型输出 → 语法解析 → Schema 校验 → 业务校验 → 执行

四层校验缺一不可：

- 语法正确不代表字段正确；
- 字段正确不代表路径、URL 或金额合法；
- 参数合法不代表当前用户有权限；
- 有权限也不代表高风险操作无需确认。

Zod 只能代表，当前的参数形状是符合要求的，但是是否符合当前的业务逻辑， 用户是否有权限，都应该使用专门函数进行校验

#### 4. Function Calling

Function Calling 是模型生成 “工具名 + 结构化参数”， 代表宿主要去执行对应的工具 传递 当前的参数， 再将结果传送回模型， 模型提出调用意图，不应该直接拥有系统权限

错误也必须结构化。模型可以根据 retryable 和错误码选择修正参数或停止，但是否真的重试仍应受宿主的总次数和预算限制。

Tool代表一个类,要包含name\ description\parameters\execute()
每一个具体的Tool都是他的具体的对象
|
注册表中将当前会话可见的工具转成OpenAIFunction schema[每轮Loop前都调取Toolschema]
|
模型思考后返回结构化意图
|
宿主校验,模型思考过的 结果中要调用的工具是否存在\参数\权限\风险等 [普通情况下可能只调用Zod来进行传入参数的校验,但是到了企业级别的应用,应该还要进行权限, 风险等方面的多层校验]
|
必要时暂停并且请求用户批准[CLI需要inline询问,高风险命令都要被审批,如果审批拒绝就写入toolResult并且标明失败原因]
|
应用执行工具,记录结果和审计[记录工具名、参数（去掉保留字段）、结果摘要、是否错误、session、耗时] 会被PostgreSQL记录下来
|
工作结果回到模型,继续逻辑轮次[不结束用户这一轮，带着更新后的 items 再调一次 LLM]
|
模型给出最终答案,或者再次调用工具

错误也必须结构化。模型可以根据 retryable 和错误码选择修正参数或停止，但是否真的重试仍应受宿主的总次数和预算限制。

#### 5. Agent核心循环与工程状态机

状态机是推理循环的 调度/执行框架（不是推理本身）。
每个状态表示系统当前 卡在流程的哪一步；进入该状态后会触发对应动作（调 LLM、执行工具、等人、收尾）。
如何转移、为何在这里停/继续，由 Agent 开发者设计，用来保证过程 安全、可控、不乱序；
最终回答是否“令人满意”，还要靠 模型推理质量、上下文、工具和提示词，不单靠状态机。

推理范式:
    - ReAct: Reasoning + Action 交替进行推理和行动,适合动态探索
    - Plan-and-Execute: 先生成计划,再逐步执行,适合长任务
    - Router: 先选择专业能力或者子Agent,再转交
    - Reflection: 执行后检查结果并且决定是否修正
    - Deterministic workflow: 关键步骤有代码固定,模型处理模糊环节

在生产中, 这些范式往往会混合使用, 固定的工作流来保证安全, 模型在路由\参数补全\内容生成等节点发挥作用

##### 逻辑轮次与物理请求

- Logical turn： 用户看来的一次完整交互， 可能包含多次模型调用和工具执行
- Physical run / request： 底层的某一次网络流或者是后端的执行

##### AgentLoop 是容错状态机而不是一个while

在简单的Agent开发中,可能状态机就是一个简单的 while true循环,重复着喂prompt 到 调模型, 但是真正生产级别的 状态机, 需要考虑边界情况和复杂情况:  审批, 中断, 排队,重试,子任务生命周期, 都是状态机要包含考虑的情况, 在这种设计下, 才能使Agent能够正常运行, 并且拥有安全 中断又不破坏当前 状态的能力.

把“开始、等待、执行、取消、失败、结束”在你的产品里定义清楚，并强制执行。

在我所学习的项目中关于状态机的部分: 

1. 根本内核还是 LLM ↔ 工具的循环;
2. 当本轮session真正在跑, 会进行占位, 当前session再跑,那么即便来了新消息,那么会走排队, 避免双开
3. 危险工具会进行审批
4. 取消会用协作式终端在检查点生效
5. 后台子任务会用特殊记录, 记录下 running / 完成 / 失败 / 中断 /取消
6. 控制权在宿主,模型只产生下一步意图, 整个流程都是安全可控的

详细拆解:

- AgentLoop.py是主循环 文件, 里面循环过程 是通过 多层协作来控制状态的, 有以下五个子状态机
    - Session seat: 负责了 一轮有没有在跑, 新消息要怎么处理[跑/进等待队列]
    - 审批:  负责危险动作, 人工审批通过后在继续
    - 中断: 协作式取消
    - 后台任务: 负责的是可查询的子任务生命周期
    - 展示投影: 虽然有不同的状态,但相似的状态可以被收敛为同样的然后展示给前端

###### session seat: 

IDLE  ──claim──►  RUNNING(seat held)
RUNNING ──新消息──► 消息进入 inbox（座位不变）
RUNNING ──结束/取消/失败 finally──► IDLE（release seat）

- 同一个session: 同时只能有 1 个 in-flight turn[在执行中的turn]
- 不同session可以并行
- 同一个session 再进新的消息,不会新开第二轮, 进mid_run_inbox,同时要给inbox设置上限
- 消息生命周期事件大致有: QUEUED / DEFERRED / PROMOTED / DROPPED

###### 审批子状态机

PENDING → APPROVED
        → DENIED
        →（超时路径最终也会落到通过或拒绝，而不是无限 pending）

审批通过后 会将结果返回然后继续执行

###### 中断/ 取消状态机

协作式取消的实现:
RUNNING → CANCELLING(event set) → CANCELLED(finalized) → IDLE

保证后续取消后
- 将 inbox 直接丢弃
- 不继续弹剩余审批卡
- finally release seat, 不然未来永远无法使用该session
- 不承诺外部副作用的回滚

也就是取消,取消的是控制流上的后续步骤, 不仅仅是结束当前的循环[有点像生命周期钩子函数中要释放内存移除eventlistener]

###### 后台子任务生命周期 task

主循环中主要靠session来辨别, 而后台 更接近持久run: 

running → completed
        → failed
        → interrupted
        → cancelled

task需要可恢复\可列表化的持久状态, 进程重启后,可以依据标注runnning的孤儿任务收成interrupted, 

###### 投影状态机

前端 reducer 可以有自己的展示状态；但不能只信 UI。重连后应以服务端 pending approval / active seat 为准

###### 总结

模型产出意图，宿主状态机决定是否执行、如何等待与停止，并尽量保证会话状态不被破坏

ReAct 是基本思想，但生产 Agent 应实现为有界、可恢复、可观测的状态机。每轮组装上下文、调用模型、校验工具、审批执行、回填结果，并在超限时压缩。终止由完成判据、预算、用户取消和循环检测共同决定。WorkPilot 还采用 nudge、移除工具、hard stop 的分级收敛，比一个固定 max_iterations 更容易保留可用结果。

#### 6. Tool Calling: 模型提出调用, 应用才拥有执行权

模型吐出的是「我想调用某某工具、参数大概是这些」的意图；
是否校验、是否批准、是否真执行、如何截断/审计、如何回填，全在应用侧。

##### 1. Function Calling 的标准流程

应用把工具定义给模型 → 模型返回工具调用 → 应用执行代码 → 应用回填工具输出 → 模型生成最终回答或继续调用。

##### 2. Tool 工具执行管线

模型不能说调用哪个function就调用哪个function, 所以生产系统会将调用细化成后续的:
意图 -> 校验 → 风险/审批 → 资源准入 → 执行 → 脱敏截断 → 审计 → 回填
每一步都应该可以被 拒绝 改写或者暂停

在我们的项目中关于 workPilot的 工具执行管线

LLM tool_call (name, args, call_id)
  │
  ├─ [Loop] 中断检查 / clarify fence / 工具是否在 exclude 列表
  │
  ├─ [Preflight · 串行 hooks]
  │     EStopGate        急停直接拒绝
  │     PolicyGate       策略/RBAC
  │     ApprovalGate     assess_risk → 评分/策略表 → 可能等人批
  │
  ├─ 若 REJECT → 合成错误结果回填模型（不执行）
  │
  ├─ [Registry.execute_full]
  │     剥离保留字段（防 LLM 伪造 _session_id 等）
  │     工具是否存在 / 是否 agent 允许
  │     validate / claims
  │     并发协调器排队（读共享/写独占/路径层级冲突）
  │     interrupt 已 set → 不执行
  │     tool.execute(**kwargs)   ← 真正副作用只在这里
  │     输出截断、凭证脱敏
  │     审计 log_tool
  │
  ├─ [Postflight · 串行 hooks]
  │     LeakScanner / Auditor 等
  │
  └─ [Loop] 按 call_id 写 function_call_output → 再调 LLM

也就是 一次Tool Calling 完整的过程在我们的项目中,要包含 Preflight, Execute, Postflight三个阶段[因为一次tool calling可能不只是执行一个function]

- Preflight: 在真正执行之前,进行评估, 比如风险, 审批, 取消等操作, 上一个tool 的审批结束再去审批下一个tool. 门禁本身通常很快，串行成本可接受
- Execute:  工具的真正执行阶段, 但在这个阶段也会执行审计 log, 并且支持多个function 在满足条件下并行execute, 因为有些同时执行可能会发生读写冲突,父子路径冲突 这种都需要排队 还要去检查工具是否存在等工作 **真正跑工具主体时，多个已批准的调用可以重叠进行。**
- Postflight: 执行之后对于结果的扫描,改写,审计

审批也可以并行，但人机确认是交互瓶颈，并行会多卡并发、取消难撤、决策依赖乱、状态爆炸

Postflight 负责脱敏、截断、审计和生成最终 tool output，属于结果发布管道，常有共享副作用和顺序依赖，并行收益低、一致性风险高，所以串行

#### Context Engineering 

上下文工程 = 在有限 token 预算里，挑选、排列、压缩“此刻最该让模型看见的信息”。

##### 上下文的组成

1. 安全边界, 类似于 system prompt
2. 当前的Agent/Skill 指令
3. 用户目标和最近对话
4. 任务相关记忆和检索证据
5. 当前可用的工具定义
6. 必须成对保留的 tool call/ result
7. Token的预算和输出预留

##### 压缩策略

1. 滑动窗口: 简单,但会丢掉早期的约束
2. 摘要: 压缩率高,但会产生摘要漂移[对内容进行了摘要后, 与原本信息不一致]
3. 结构化状态：保存目标、完成项、待办、关键事实、文件/实体 ID；
4. 检索式历史：需要时再召回；

我们项目中的压缩策略: 
分为了 常规压缩和紧急压缩两种情况

- 常规压缩: 清理旧Tool的结果 / 必要时进行摘要
- 紧急压缩: 避免下一次请求直接超窗

##### context 的流水线 pipeline

- 加载历史: SessionManager.smart_load_session(), 会从新往旧 装turn
- 进入Agent Loop:  预估token , 来决定是否使用 紧急压缩
- 调用LLM
- LLM返回结果:  检测 prompt_tokens
- 失败保底: compact_fallback(),硬截断最近的user_turn

##### 计算token [ToLearn]

##### 

#### RAG

检索增强生成




