# 全栈可视化 AI 工作流编排平台

## 基本信息

项目描述：面向开发者与业务人员设计并实现低代码 AI 应用构建平台，支持以**可视化节点方式编排 LLM、RAG、Skill 等能力**，解决 AI 应用开发中流程搭建复杂、调试困难与扩展性不足的问题

- 基于**React Flow+Next.js** 构建可视化工作流编辑器，打通应用管理、节点编排、配置面板与运行调试闭环，实现画布状态与业务状态的统一管理。

- 基于 NestJS 模块化架构实现**RAG 知识库能力**，选用**Chroma向量数据库**完成**文档上传、文本切块、Embedding 生成、余弦相似度召回**及结果展示，支撑检索增强问答场景

- 设计**DAG 风格工作流**执行引擎，支持 LLM、RAG、Skill、条件分支等节点编排，并通过 **SSE** 实时回传节点运行状态，提升调试效率和可观测性。

- 实现**多Agent协同工作**，设计统一的常规接口转MCP接口中间件，为AI增强数据查询能力，同时维护各Agent记忆独立，数据共享。

## 资料整理

### 技能点描述

#### 后端描述

- 基于Nest JS模块化架构搭建RAG知识库能力，完成文档上传、文本切块、Embedding生成、余弦相似度召回及结果展示，支撑检索增强问答场景。

i. RAG知识库能力支持用户上传自己的资料，保证agent回复时先命中私有知识。
具体实现：
NestJS 模块化拆了完整链路：文档上传入库、文本切块、向量化（Embedding）生成、检索阶段做余弦相似度召回，最后把 TopK 片段和用户问题一起组织给模型生成答案。
为了保证RAG效果：

1. 文本切块：整篇文章如果不切块，会造成许多无用信息，不够精确。而如果切块太过精细，很多部分会导致上下文的丢失，要做到长度与重叠的平衡。
我们先用 2000/200 做 baseline，再通过离线问题集看召回片段相关性和最终回答质量，必要时往 1000/100 或 1500/150 微调。参数不是固定真理，是和文档类型、问题粒度一起迭代的。
2. 向量化（Embedding）：切块的文本会以向量的形式保存到数据库中，保存的时候直接调用了千问的text-embedding模型，agent检索时会先用 query 向量和 chunk 向量算相似度做召回；再把召回文本作为上下文喂给 LLM 生成回答。取TopK返回，
3. 结果展示：为了保证可调试性，召回的结果会展示命中chunk所对应的文本，方便我们对答案进行检查它的合理性，提升回复的可信度，并且展示出来参考的文本与相似度。
为了保证可以抽离成节点，同时模块化RAG系统，保证可以灵活插入workflow中，也可以扩展给agent。

ii. RAG 和 微调的区别
它们其实是两个很不同的概念，RAG是让AI回复更有依据，而微调是针对A能够更好的解决某个特定问题而且去训练模型，会使用高质量的输入->输出来训练。【让模型在某类固定任务上更稳定，通过高质量输入输出样本去更新参数。】

这个项目不涉及模型训练或微调，我们主要做的是基于现成模型 API 的工程化落地：包括知识库构建、检索召回、上下文拼装、工作流编排和调试可观测

- 实现 JWT 鉴权、统一异常处理、响应拦截、前端请求封装与默认示例数据初始化，提升平台安全性、稳定性和新用户首屏上手体验。

TODO：

#### 前端描述

- 通过React Flow + Zustand打通应用管理、流程编排、节点执行与调试闭环，确保编排过程的数据一致性： 

对节点的添加、移动、删除，边的自适应，都通过ReactFlow来实现。

其中很大的一个挑战是，如何保证状态的实时更新与不同画布workflow的状态持久化，比如删除了一个节点/节点内的属性发生了变化，可以及时地被更新而且保证后端执行workflow要一致并且持久化，如果单纯使用ReactFlow的状态，它其实不承担业务持久化与多个workflow的管理，现在统一收敛到Zustand中。 所有边/节点的变更都要走action，先更新 store，再由画布订阅渲染，保证了画布和store统一，同时还可以持久化。而且后端执行编排的workflow后，返回结果也可以更新到zustand的对应store的状态树中，再同步到每一个节点上，使它可以反馈出节点的执行结果，并据此进行单独的调试。

而且这里使用了zustand没使用redux，其实是因为zustand其实也是react flow官方推荐配合使用的，这个使用场景其实只需要保持清晰的数据流，保证编辑- 执行- 返回结果的一致性，zustand更加轻量级也更好上手的就可以完成状态的返回和维护数据，所以没有必要选择使用更复杂的redux。

Redux 更适合中大型多团队场景，尤其需要复杂中间件编排、强约束和可审计调试时，比如一个更新涉及了多个地方的带动更新，这种可以全都放在对应的action中，虽然初始化会复杂一些，但后续维护更轻松。zustand在这种业务情况下store比较分散，所以不如redux适合。

- 复杂场景下如果存在重复渲染问题，应该怎么定位解决：

React Flow本身是一个图编辑器，再叠加zustand做全局状态管理，在节点数量多、嵌套复杂的情况喜爱，容易出现状态更新引发的级联渲染
比如：更新一个节点的状态，但整张图都会重渲染，节点一多性能会下降甚至出现卡顿。
针对这一部分要进行的优化：

1. 状态模型的重构： 把所有节点、边运行状态全部统一收敛到zustand中，保证单一数据源，这样组件内部就不必维护局部state，从源头减少状态分裂带来的同步问题。
2. 订阅粒度优化：利用zustand本身就支持selector，组件只订阅当前节点的数据，避免在依赖数据不变的情况下额外的重渲染。
3. 更新策略优化：采用不可变数据，只更新变化节点的引用，react便可以正确diff。并且约束数据流单向，更新都要走action。

##### 1.1 zustand相关

1. 在项目中的使用：每个业务域独立slice，Slice 把不同领域的状态和 action 聚合在一起，再通过 combine 或手动 merge 进根 store。选择性订阅：每个组件只取自己需要的字段，避免全局重渲染。
2. 中间件：persist，自动持久化到localStorage，其实persist的本质是一个高阶函数 -> 本质上是一个 store 包装器，它在初始化时从 localStorage 读取已保存的状态来做状态恢复，同时劫持 setState ，在每次状态变化后自动同步回存储。这样页面刷新后 store 能恢复到上一次的状态。它支持 partialize 控制只持久化某些字段，也可以换用 sessionStorage 或自定义存储后端
3. 和Context API的对比：Context 的问题是： 一个 Provider 下的所有消费者，只要 context value 变了，就会全部重渲染 （即使消费者用的是完全不同的字段）。而Zustand 的选择器订阅：每个组件只关心自己用的字段，其他字段变化不会触发重渲染

1.2

#### Agent描述

##### 抽象 Skill 工具体系，支持内置工具与 HTTP 自定义技能，并将工具能力标准化接入工作流节点，实现外部能力可插拔扩展

    这里的思想 我认为是有点像MCP出现的意义，因为工作流里肯定会被导入各种各样的工具，而我不可能为每一个工具都写一个专门适配我的工作流的适配器函数，所以干脆将工具体系抽象出来，得到一个统一的协议，将不同的工具按这个协议进行输入输出，那么就可以完美适配我的工作流了。而且这也实现了业务上的解耦，我不需要关注内部的工具运作到底是怎么样的，我只负责处理进行规范地输入输出就可以。
    > {{那么是如何实现进行规范的输入输出的呢，我只是定义好了统一的协议，那输入输出是怎么规范地实现的呢}}

- 统一的数据结构 (Schema) ：在创建 Skill 时，必须通过 JSON 定义好 inputSchema 和 outputSchema ，这相当于定下了契约。前端画布配置节点时，会根据这个 Schema 渲染表单让用户填参数。
- 统一的执行入口 ：在工作流执行时，统一由 SkillNodeExecutor 接管。它只做三件事：从上下文解析出真实的入参、调用统一的 executeSkill 方法、把结果包装成 { result: ... } 返回
- 底层实现多态 ：在 executeSkill 内部，再根据 type 分发。如果是内置工具，调用预设函数；如果是 HTTP 工具，根据配置好的 url、method 将入参组装发出去，拿到 response 原样返回（见 skill.service.ts ）。工作流完全不感知这是一个 HTTP 请求还是本地函数。

- 设计 DAG 风格工作流执行引擎，支持 LLM、RAG、Skill、条件分支等节点编排，并通过 SSE 实时回传节点运行状态，提升调试效率和可观测性。
DAG风格指的是，依赖驱动调度的工作流，我们在画布上实现一个工作流后，肯定会有很多个节点与边之间有相连，那么开始执行时，就会根据入度表，找到入度为零的节点才会开始执行，确保了依赖先完成再运行。

> {{这里的依赖关系指的是不是各个节点间的先后顺序之类的，比如说下一个节点的输入会依赖上一个节点的输出 ，这样驱动的工作流}}
    这里的依赖关系主要体现在两个层面：
    1. 执行时序依赖 ：引擎在执行前会遍历画布的连线（edges），生成一个 adjList （邻接表）和 inDegree （入度表）。只有当一个节点的 inDegree 降到 0（意味着排在它前面的所有节点都跑完了），它才会被推入执行队列（BFS 队列调度）。
    2. 数据依赖（上下文传递） ：上一个节点的输出会保存在一个全局的 context 对象里（以节点 ID 为 Key）。下一个节点在执行时，通过类似于 {{node_1.result.data}} 的模板语法，去 context 里提取需要的数据作为自己的输入。”

SSE实时回传节点运行状态： 这里是为了实现节点的调试，每一个节点会展示当时自己的运行结果，方便我们对特定的节点进行调试。而SSE可以做到轻量级的后端 -> 前端的运行状态流。{{ SSE作为高频考点要继续学习 }}

##### 实现多Agent协同工作，设计统一的常规接口转MCP接口中间件，为AI增强数据查询能力，同时维护各Agent记忆独立，数据共享

> 在我的 AI 工作流项目里，多个 Agent 之间的通信是走“共享 Context + 事件总线”模式的。共享 Context 存的是工作流级别的数据，所有 Agent 都能读；事件总线用 Node.js 的 EventEmitter 实现，负责把任务分发给对应的 Agent 监听者。每个 Agent 维护自己的会话记忆，但通过 Context 拿共享数据，这样既解耦又能协同。

在多 Agent 并行场景下，常见通信模式有四种：共享上下文、消息队列、事件总线、直接调用。
具体选哪种，要看 Agent 之间的依赖关系和业务规模。

在 Node.js 这边，我会分两种情况：

- 单机或中小项目：用进程内 EventEmitter 做事件总线，用共享 Context 存上下文，用任务队列控制并发度。
- 分布式或多实例：会用 Redis 做 Pub/Sub 和状态共享，用 Bull 这类任务队列调度。

实际落地时还要考虑三点：

- 通信消息要有 schema，避免脏数据；
- 共享状态要加锁，避免并发写冲突；
- 每个调用要有 trace ID 和超时重试，方便排查和容错。

而且这里的多Agent实现了基于 Planner 的多 Agent 协同机制：主 Agent 接收任务后主动拆解，并行激活多个子 Agent 处理子任务，过程中通过共享 Context 共享中间结果，子 Agent 可根据需要反向触发主 Agent 进行二次规划，避免了单 Agent 串行处理的局限性，提升了复杂任务的处理效率和灵活性。

关于多Agent的调用：应该支持主动激活。常见有三种主动激活方式：

第一种是 Planner 主动调度：主 Agent 拿到任务后自己拆解，主动激活子 Agent。
第二种是事件驱动：某个事件发生时自动激活对应 Agent。
第三种是规则驱动：在工作流里配置规则，满足条件就激活。
在我们的项目里，我用的是“规则 + Planner 混合”的方式。简单任务走规则，复杂任务由主 Agent 拆解。这样既保证响应速度，又保证灵活性。
主动激活的关键不是“能不能激活”，而是“激活谁、什么时候激活、激活几个”。所以通常会有一个决策层（Planner 或规则引擎），避免乱激活。

关于Planner的驱动：

Planner 一般有三种实现层次：

- 第一种是基于规则/模板的 Planner，通过 if/else 或策略模式决定激活哪个 Agent，
实现简单、稳定可控，但只能处理固定任务。

- 第二种是基于 LLM 的 Planner，把可用 Agent 列表和任务描述交给 LLM，
让它返回结构化的子任务和 Agent 分配结果，后端再依次或并行激活。
这是目前最主流的做法。

- 第三种是基于 ReAct 的 Planner，Planner 不一次性拆完，
而是“思考-行动-观察-再思考”，根据 Agent 返回结果动态调整后续规划。
这种实现最能体现多 Agent 的动态协同，也是最有亮点的方案。

在我们项目里，这三种是结合的：简单任务走规则，复杂任务走 LLM 拆解，
需要动态调整的环节走 ReAct 思想。

###### 关于AI有没有使用框架

我先把当前项目里的工作流执行链路再对齐一下，然后给你一套“真实但不吃亏”的面试回答口径，重点是把自研编排解释成与 `LangChain/LangGraph` 同构的设计。

        
            
toolName: file_search
            
status: success
          
file_pattern: **/*executor*
          

        
            
toolName: file_search
            
status: success
          
file_pattern: **/*.ts
          

        
            
toolName: search_by_regex
            
status: success
          
query: interface INodeExecutor|execute\(|node-executors|WorkflowService|class .*Workflow
          
我已经定位到这套编排不是“单纯调一次 LLM 接口”，而是典型的“节点执行器 + 图执行引擎”模式。下面我再读几个核心文件，把它和 `LangChain/LangGraph` 一一映射清楚。

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/services/workflow-executor.service.ts
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/services/node-executor.factory.ts
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/services/node-executors/llm-node.executor.ts
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/services/node-executors/condition-node.executor.ts
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/types/index.ts
          
我已经把核心执行引擎读完了，结论很明确：这套系统更适合被解释成“基于 `NestJS` 的轻量级 DAG/Agent 编排框架”，而不是“手写几个 if else 调 LLM”。我补一眼工作流数据模型，再给你一套能直接背的回答模板。

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/workflow.service.ts
          

        
            
toolName: view_files
            
status: success
          
            
filePath: /Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/workflow.module.ts
          
**核心口径**
- 这个问题本质上不是在问“你有没有装 `langchain` 这个 npm 包”，而是在问：你做的是不是“真正的编排系统”，还是只是“按顺序调几个接口”。
- 你不能回答“没用框架”，更好的说法是：
- `工作流编排层没有直接依赖 LangChain/LangGraph SDK，但我实现的是一套基于 NestJS 的轻量级图编排引擎，设计思想和 LangGraph 很接近；如果类比 LangChain，它对应的是 Prompt/LLM/Retriever/Tool 这些能力组件的组合执行。`

**先给你一句能直接背的**
- `我们不是简单顺序调用 LLM 接口，而是在 NestJS 里实现了一套节点化的 DAG 编排框架。工作流以 nodes/edges 的图结构持久化，运行时由统一执行引擎调度，不同节点类型通过 Executor 抽象解耦，比如 LLM、RAG、Skill、Condition、Output。这个设计理念上更接近 LangGraph；如果用 LangChain 的术语来讲，就是把 Prompt、Model、Retriever、Tool 这些能力组件做了可视化编排和统一上下文传递。`

**为什么这套话成立**
- 工作流不是写死代码，而是把 `nodes` 和 `edges` 持久化存储，再在运行时解析执行，见 [workflow.service.ts](file:///Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/workflow.service.ts#L14-L25) 和 [workflow.service.ts](file:///Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/workflow.service.ts#L52-L59)。
- 真正的执行核心是 [WorkflowExecutorService](file:///Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/services/workflow-executor.service.ts#L14-L137)，它会构建邻接表、维护入度、按图结构调度节点执行，不是简单 `await llm(); await rag(); await output();`。
- 节点执行不是写在一个大函数里，而是通过 [INodeExecutor](file:///Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/types/index.ts#L1-L5) 和 [NodeExecutorFactory](file:///Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/services/node-executor.factory.ts#L12-L39) 做类型分发，这就是典型的“可扩展执行器架构”。
- 节点类型是分开的：`llm`、`rag`、`skill`、`condition`、`output`、`userInput`，注册在 [workflow.module.ts](file:///Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/workflow.module.ts#L21-L32)。
- LLM 节点只负责模型调用，见 [llm-node.executor.ts](file:///Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/services/node-executors/llm-node.executor.ts#L9-L30)；RAG 节点只负责检索，见 [rag-node.executor.ts](file:///Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/services/node-executors/rag-node.executor.ts#L9-L23)；条件节点负责分支，见 [condition-node.executor.ts](file:///Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/services/node-executors/condition-node.executor.ts#L6-L25)。

**怎么和 LangChain 解释**
- 你可以说：`如果按 LangChain 的抽象去映射，我的 LLM 节点相当于 model runnable，RAG 节点相当于 retriever，skill 节点相当于 tool，变量替换相当于 prompt template，整个节点串联就是 chain。`
- 对应证据：
- 变量替换逻辑在 [llm-node.executor.ts](file:///Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/services/node-executors/llm-node.executor.ts#L17-L18) 和 [llm-node.executor.ts](file:///Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/services/node-executors/llm-node.executor.ts#L32-L48)，本质就是 prompt template 渲染。
- RAG 节点把 query 从上下文中解析后发给检索层，见 [rag-node.executor.ts](file:///Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/services/node-executors/rag-node.executor.ts#L13-L21)，这就是 retriever 调用。
- Skill 节点虽然我这次没展开读代码，但从模块注册上已经是独立能力节点，可以类比 LangChain tools。

你可以这样说：
- `如果换成 LangChain 来实现，这套系统完全可以落到 PromptTemplate + Retriever + ChatModel + Tool 的组合上；我现在项目里是把这些能力抽象成了统一节点接口，放进自己的执行引擎里。`

**怎么和 LangGraph 解释**
- `LangGraph` 更适合解释你的项目，因为它强调“有状态的图执行”。
- 你的项目和 `LangGraph` 的对应关系非常清晰：
- `nodes + edges`：就是 graph 定义，见 [workflow.service.ts](file:///Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/workflow.service.ts#L56-L58)。
- `context`：就是 graph state，见 [workflow-executor.service.ts](file:///Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/services/workflow-executor.service.ts#L54-L56)。
- `executor.execute(node, context)`：就是每个 graph node 的运行逻辑，见 [workflow-executor.service.ts](file:///Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/services/workflow-executor.service.ts#L76-L85)。
- 条件分支：非常像 `LangGraph` 的 conditional edges，见 [workflow-executor.service.ts](file:///Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/services/workflow-executor.service.ts#L94-L112)。
- 节点执行结果写回 `context[nodeId] = output`，这本质就是 state update，见 [workflow-executor.service.ts](file:///Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/services/workflow-executor.service.ts#L83-L85)。
- SSE 状态通知可以类比运行事件流、callbacks 或 tracing，见 [workflow-executor.service.ts](file:///Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/services/workflow-executor.service.ts#L79-L89)。

你可以直接背这句：
- `如果类比 LangGraph，我这个项目本质上就是一个简化版的 StateGraph：工作流定义是 nodes/edges，context 是共享状态，NodeExecutor 是每个节点的可执行单元，Condition 节点负责条件边选择，执行器负责根据图结构调度并把结果持续写回状态。`

**面试时最稳的回答方式**
- 面试官问：`你这个所谓工作流，不就是调了一下 LLM 接口吗？`
- 你回答：
- `不是单纯调 LLM。LLM 只是其中一种节点类型。我们把整个 AI 流程拆成了 start、userInput、llm、rag、skill、condition、output 等节点，每个节点都有统一执行接口，由图执行引擎按 edges 调度。这样做的价值是把“模型调用”升级成“可编排的 AI 流程”，例如先检索知识库，再判断是否命中条件，再决定是否调用工具，最后汇总输出。这个思路和 LangGraph 很接近，只是我当时是在 NestJS 体系里实现了轻量执行引擎。`

**如果对方继续追问“那你为什么不用 LangChain/LangGraph？”**
- 不要说“因为我不会”或者“项目太小没必要”。
- 更好的回答是：
- `当时主要有两个考虑。第一，项目已经是基于 NestJS 的模块化后端，RAG、Skill、权限、工作流存储都在同一个服务里，自研轻量执行层接入成本更低；第二，我们当时的节点类型和执行需求相对可控，用统一 Executor 抽象就能满足需求。`
- 然后补一句加分：
- `不过从架构抽象上我会参考 LangChain/LangGraph，比如把节点执行和状态传递解耦。如果后续要增强多轮记忆、Agent 循环、人工介入、持久化状态回放，LangGraph 会是很自然的升级方向。`

**这句特别重要**
- 你的目标不是“冒充我用了 LangGraph”，而是要表达：
- `虽然没有直接依赖 LangChain/LangGraph SDK，但我的实现遵循了同类框架的核心抽象。`
- 这句话既真实，又有技术深度。

**高频追问怎么接**

**追问：那你这和 LangChain 最大区别是什么？**
- `LangChain 更偏能力封装和链式组合，比如 Prompt、Model、Retriever、Tool 的标准化；我当前项目里这些能力是按节点封装的，但没有直接使用 LCEL 这类表达式式编排。`

**追问：那你这和 LangGraph 最大区别是什么？**
- `LangGraph 更强调复杂状态机、循环、多代理和持久化运行。我这个项目目前更像一个轻量 DAG/StateGraph，已经支持节点状态流转、条件分支和共享上下文，但在多轮状态恢复、checkpoint、agent loop 上还没做到 LangGraph 那么完整。`

**追问：你这不还是 if else 吗？**
- `不是把所有逻辑写死在 if else 里，而是把节点类型注册到工厂，由统一执行引擎根据工作流图动态调度。这意味着新增节点类型时不需要改核心调度器，只需要新增一个 NodeExecutor 并注册到工厂。`

这个点你可以用 [node-executor.factory.ts](file:///Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/services/node-executor.factory.ts#L24-L30) 证明。

**一套更像高级工程师的说法**
- `我会把这套系统定义成“面向 AI 场景的图编排内核”。LLM 调用只是叶子能力之一，真正的核心是三件事：一是节点抽象，统一不同能力的执行接口；二是状态流转，把上游输出沉淀到共享上下文；三是图调度，根据有向边和条件边执行不同路径。从设计思想上，它和 LangGraph 是一致的，只是实现上选择了更贴合业务后端的 NestJS 原生方案。`

**你可以直接拿去用的最终模板**
- `我们的工作流不是简单串行调用一个 LLM API，而是基于 NestJS 做了一套轻量级图编排框架。工作流以 nodes 和 edges 的形式持久化，运行时由 WorkflowExecutor 负责图调度，不同节点类型通过统一的 NodeExecutor 抽象执行，比如 LLM、RAG、Skill、Condition、Output。节点输出会写回共享 context，供下游节点继续消费，条件节点还能决定分支路径。这个设计如果类比开源框架，概念上更接近 LangGraph 的 StateGraph；如果用 LangChain 的术语来解释，就是把 Prompt、Model、Retriever、Tool 做成了可视化的链式编排。我们没有直接依赖 LangChain/LangGraph SDK，但底层抽象和它们是同构的。`

**面试禁忌**
- 不要说：`就是自己写的，没用啥框架。`
- 不要说：`其实就是调用一下模型接口。`
- 不要说：`LangChain/LangGraph 我没用过。`
- 要改成：
- `底层没有直接依赖对应 SDK，但架构抽象和 LangGraph/LangChain 是一致的，我能清楚说明各自的映射关系和升级路径。`

**下一步练习**
- 你可以直接回复我一句：`继续拷打我`
- 我下一轮会扮演面试官，连续追问你 8 个问题，包括：
- `你这为什么更像 LangGraph 而不是 LangChain？`
- `context 为什么说是 state？`
- `新增一个工具节点你要改哪些地方？`
- `为什么你说不是简单调 LLM？`
- `如果让我用 LangGraph 重构你会怎么做？`
**结论**
- 有，而且优化空间还不少。
- 你的项目现在已经有了“可用的 AI 工作流雏形”，但离成熟框架级别还差几层：`标准化抽象`、`状态管理`、`可观测性`、`错误恢复`、`异步任务化`、`检索质量优化`。
- 如果你想在面试里把这个项目讲高级，最好的方式不是硬吹“我已经很完善了”，而是清楚地说出：`我现在这套是自研轻量内核，后面我会优先引入 LangChain/LangGraph 这类成熟抽象，把底层能力从“能跑”升级到“可扩展、可观测、可恢复”。`

**先说你项目当前的优点**
- 图执行思路是对的：`nodes + edges + context + executor` 这套抽象已经搭起来了，核心在 [workflow-executor.service.ts](file:///Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/services/workflow-executor.service.ts)。
- 节点扩展方式也对：统一接口 `INodeExecutor` 和工厂分发在 [index.ts](file:///Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/types/index.ts) 和 [node-executor.factory.ts](file:///Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/services/node-executor.factory.ts)。
- RAG 也已经打通了上传、切块、embedding、召回这条主链路，核心在 [rag.service.ts](file:///Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/rag/services/rag.service.ts)。
- 所以它不是“烂项目”，而是“第一版工程化还不够完整的自研框架”。

**主要优化点**
- `工作流执行模型偏轻`：当前执行器本质还是一次性跑完图，缺少 checkpoint、重试策略、持久化状态恢复，见 [workflow-executor.service.ts](file:///Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/services/workflow-executor.service.ts#L67-L137)。
- `context 结构过于自由`：现在是 `Record<string, any>`，灵活但不安全，节点之间容易出现字段覆盖、命名冲突、类型漂移，见 [workflow-executor.service.ts](file:///Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/services/workflow-executor.service.ts#L55-L56)。
- `LLM 节点能力偏薄`：目前只做了 prompt 渲染和一次模型调用，还没有 message schema、history、structured output、tool calling 抽象，见 [llm-node.executor.ts](file:///Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/services/node-executors/llm-node.executor.ts)。
- `RAG 质量还有明显提升空间`：切块策略较粗、召回没有 rerank、没有混合检索、没有引用聚合，见 [splitText](file:///Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/rag/services/rag.service.ts#L232-L244) 和 [retrieve](file:///Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/rag/services/rag.service.ts#L196-L217)。
- `文档处理偏同步`：上传后直接切块和 embedding，真实场景下大文件、多文件会卡接口，更适合异步任务队列。
- `缺少可观测性`：虽然有 SSE 节点状态推送，但没有 tracing、token 消耗、耗时、失败原因聚合和链路回放，见 [workflow-executor.service.ts](file:///Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/services/workflow-executor.service.ts#L79-L89)。
- `条件分支还不够强`：当前条件节点能做简单判断，但不支持复杂路由、循环、人工介入、多代理协作，见 [condition-node.executor.ts](file:///Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/services/node-executors/condition-node.executor.ts)。

**怎么优化到“成熟框架思路”**
- 第一层，`先保留现有业务接口，替换底层 AI 编排抽象`
- 第二层，`LangChain` 负责能力标准化，`LangGraph` 负责状态图执行
- 第三层，`RAG` 接到标准 retriever/tool 体系里，而不是散落在自定义 executor 中

你可以这样理解：
- 你现在像是在自己搭一个“简版操作系统”
- 成熟框架像是：`LangChain` 提供标准组件库，`LangGraph` 提供稳定调度内核
- 你的优势是业务接入灵活，框架的优势是抽象更稳、生态更全、调试更强

**推荐升级路径**
- `第一步：引入 LangChain，先不动整体工作流 UI`
- 把 `LLMNodeExecutor` 从“直接调用 aiService”升级成 `PromptTemplate + ChatModel + OutputParser`
- 把 `RAGNodeExecutor` 升级成 `Retriever` 抽象
- 把 `SkillNodeExecutor` 升级成 `Tool` 抽象
- 这样你在面试里就可以说：`我先把底层能力标准化，再逐步替换编排引擎`

- `第二步：引入 LangGraph，替换 WorkflowExecutor`
- 把现在的 `nodes + edges + context` 映射成 `StateGraph`
- 把 `ConditionNodeExecutor` 映射成 conditional edges
- 把 `context` 映射成 typed state
- 把 SSE 状态流升级成 graph run trace
- 这一步完成后，你就不只是“类比 LangGraph”，而是真的在用它

- `第三步：优化 RAG`
- 切块升级为递归语义切块
- 检索升级为“向量召回 + BM25 混合召回 + rerank”
- 回答阶段增加 citation/source attribution
- 文档入库改成异步任务，支持失败重试和增量更新

**如果真正接入成熟框架，你会明显感受到的差距**
- `抽象层差距`
- 你现在是自己定义 `INodeExecutor`，这很好，但比较原始。
- 框架会直接给你标准化的 `model / retriever / tool / parser / memory / runnable` 抽象。
- 差距在于：你现在要自己约定节点输入输出，框架已经把这套接口设计好了。

- `状态管理差距`
- 你现在的 `context` 是一个大对象，简单直接，但缺乏约束。
- `LangGraph` 的 state 更强调类型化、节点更新规则和状态流转边界。
- 差距在于：你的状态是“能传”，框架的状态是“可控、可回放、可恢复”。

- `调试与追踪差距`
- 你现在能知道“哪个节点成功/失败”，但不知道 prompt 长什么样、token 用了多少、retriever 召回了哪些文档、哪一步最耗时。
- 成熟框架通常配合 tracing 工具能看到整条链路。
- 差距在于：你现在能“看结果”，框架能“看过程”。

- `错误恢复差距`
- 你当前某个节点挂了，整个链路大概率就结束了。
- 框架更容易接 checkpoint、retry、fallback、human-in-the-loop。
- 差距在于：你现在偏“一次性执行”，框架偏“可持续运行”。

- `Agent 能力差距`
- 你当前更像 DAG workflow。
- 成熟框架更容易支持循环决策、工具反复调用、plan-and-execute、多 agent 协作。
- 差距在于：你现在适合固定流程，框架更适合开放式推理。

**面试里怎么讲“我和成熟框架的差距”**
- 不要说：`我项目太简单，所以没必要用。`
- 更好的说法是：
- `我当前项目是偏业务驱动的自研轻量编排内核，解决了节点化执行、RAG 接入和基本条件分支的问题；但和 LangChain/LangGraph 这类成熟框架相比，我明显感受到差距主要在标准抽象、状态持久化、链路观测和复杂 Agent 支持上。`
- 然后继续说：
- `这也是我后续想优化的方向，先用 LangChain 标准化模型、retriever、tool 接口，再用 LangGraph 承接更复杂的状态图执行。`

这段话会显得你很清醒，不装，也不弱。

**你可以直接背的高级回答**
- `我觉得当前项目最大的价值是把 AI 工作流从“调接口”抽象成了“节点化图执行”，但它还是偏第一版工程实现。真正和成熟框架对比后，我觉得差距主要有四点：第一，当前节点协议是自定义的，缺少像 LangChain 那样统一的 model/retriever/tool 抽象；第二，当前 context 是自由对象，缺少像 LangGraph 那样更清晰的状态建模和持久化恢复；第三，可观测性还比较弱，只有节点级状态，没有完整 tracing；第四，RAG 目前是基础版，召回质量和异步化能力还有提升空间。所以我后续会考虑把能力层迁移到 LangChain，把图执行层迁移到 LangGraph，这样既保留现有业务编排界面，也能获得成熟框架的稳定性和扩展性。`

**具体怎么落地改造**
- `LLM 节点改造`
- 现在：prompt 字符串替换后直接调用模型，见 [llm-node.executor.ts](file:///Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/services/node-executors/llm-node.executor.ts#L17-L29)
- 可升级成：模板化 prompt、结构化输出、消息历史、模型 fallback、流式输出

- `RAG 节点改造`
- 现在：节点只拿 query 去 retrieve，见 [rag-node.executor.ts](file:///Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/services/node-executors/rag-node.executor.ts#L13-L21)
- 可升级成：多路检索、召回去重、rerank、citation 注入 prompt、召回阈值动态控制

- `执行器改造`
- 现在：自己维护邻接表、入度、分支跳过，见 [workflow-executor.service.ts](file:///Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/services/workflow-executor.service.ts#L30-L66)
- 可升级成：图状态持久化、断点恢复、节点重试、fallback 分支、人工审批节点

- `存储模型改造`
- 现在：`nodes/edges/variables` 以 JSON 形式持久化，见 [workflow.service.ts](file:///Users/wupo/MinCodingPlatform/aiflow-studio/flowai-studio-backend/src/modules/workflow/workflow.service.ts#L52-L59)
- 可升级成：节点 schema 校验、版本化、工作流草稿/发布态、执行快照

**如果面试官问“那你为什么当初不直接上 LangChain/LangGraph”**
- 可以这样答：
- `当时项目目标是先快速验证 AI 工作流产品形态，所以优先做了可控的自研轻量方案，方便和现有 NestJS、权限体系、数据库模型以及前端画布联动。后续我复盘后发现，底层执行引擎和能力抽象其实已经接近 LangGraph/LangChain 的思路，所以我会把下一步优化重点放在接入成熟框架，而不是继续堆自定义逻辑。`

**最重要的一点**
- 面试官其实不怕你“第一版没用成熟框架”
- 面试官怕的是你不知道自己的系统短板在哪，也不知道成熟方案为什么更强
- 你只要能清楚回答：
- `我现在做到哪一步`
- `成熟框架强在哪`
- `我准备怎么迁移`
- 这就已经很像真正做过工程的人了

**我建议你下一步这样练**
- 我可以继续帮你做两件事里的一个：
- `方案 A`：我帮你把当前项目“升级成 LangChain/LangGraph 版”的架构图和迁移方案讲清楚，适合面试表达
- `方案 B`：我直接模拟面试官，连续追问你“你和 LangGraph 的差距在哪”“为什么不直接上框架”“如果现在让你重构怎么做”

如果你愿意，我建议下一轮直接选 `方案 A`，我给你一版“可直接写进简历和面试回答”的升级版项目叙述。