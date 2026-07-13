# Agent 开发亮点整理（简历与面试版）

> 下面的内容是根据当前项目描述提炼的简历素材。简历中只保留自己实际参与、能够讲清楚调用链和技术取舍的内容；如果目前只是了解设计思路，应使用“设计、实践、探索”，不要写成“独立实现”。

## 一、项目一句话介绍

面向大型前端代码库的 AI Developer Agent，通过 LLM 编排、代码检索、浏览器自动化、CI/CD 工具调用和跨会话状态管理，将“需求分析—代码定位—修改验证—构建部署—测试反馈”串联成可追踪的工程化工作流。

## 二、核心亮点与技术实现

### 1. Orchestrator-Worker 多 Agent 编排

**简历表述：**设计 Orchestrator-Worker 架构，由主 Agent 负责意图识别、任务拆解、工具路由和结果聚合，Browser Agent、Project Agent 等 Worker 负责浏览器验证与工程流水线执行。

**技术实现：**

- 将任务拆成 `plan → execute → validate → summarize` 等步骤；每个 Worker 使用统一协议返回 `taskId`、`status`、`result`、`error` 和 `nextAction`。
- LLM 只负责决策和参数生成，参数校验、权限检查、状态机、结果解析等确定性逻辑由代码完成。
- 对工具增加超时、重试次数和失败原因，避免异常直接交给模型自由发挥。

### 2. 并行 Fan-out/Fan-in 长任务编排

**简历表述：**针对构建、部署、VP Tests 等相互独立的长耗时任务，采用“并行触发、串行汇总”模式，降低整体等待时间。

**技术实现：**

- Python 使用 `asyncio.gather()` 或任务队列并发触发多个流水线。
- 每个任务独立记录 `runId`，通过轮询或 webhook 获取状态。
- 统一处理 `queued`、`running`、`succeeded`、`failed`、`timeout` 和部分成功；补充并发上限、指数退避和幂等键，避免重复触发。

### 3. 三层 Memory 管理

**简历表述：**设计 Context Window、Session Compression 和 Blackboard 三层 Memory，支持 Agent 在有限上下文窗口下持续完成长链路开发任务。

**技术实现：**

1. **Context Window：**为消息设置优先级，永久保留系统约束和当前任务，优先裁剪早期中间过程；工具输出采用截断、摘要或结构化提取。
2. **Session Compression：**会话结束时生成结构化摘要，区分最新用户意图、仍有效的约束和已被替代的信息，下一次会话只注入必要内容。
3. **Blackboard：**使用 Redis、SQLite 或 JSON 保存 `branchName`、`stagedFiles`、`runId`、`stagingUrl` 和 `prId`，让多个 Agent 共享事实状态，而不是依赖自然语言历史。

### 4. 面向代码库的 RAG 与精准检索

**简历表述：**针对大型前端代码库，采用“关键词/语义检索 + 局部文件读取 + 证据引用”的代码 RAG 流程，避免将全量代码塞入上下文。

**技术实现：**

- 先检索文件名、组件名、CSS class、`data-*` 属性和调用链，再按行读取相关文件。
- 对 Markdown、TypeScript 等文件切块，建立倒排索引或向量索引；召回结果携带路径、符号名和行号。
- 要求模型引用检索证据；检索不到时返回“不确定”，而不是生成猜测。
- 设置最大字符数、Top-K 和去重策略，控制上下文长度与 Token 成本。

### 5. Browser Agent：Playwright + 真实页面验证

**简历表述：**基于 Playwright 封装 Browser Agent，用于访问 staging 页面、提取真实 DOM、截图分析和交互验证，解决需求描述与实际组件结构不一致的问题。

**技术实现：**

- 每次任务创建隔离的 browser context，任务结束后关闭，避免 Cookie、Storage 和页面状态污染。
- 获取 DOM、可访问性树、截图、网络请求和控制台错误，并将结果结构化返回。
- 先定位真实 DOM 标识符，再反向检索代码；修改后执行交互断言、样式检查和截图对比。
- 对 staging 冷启动、空白页和 5xx 增加有限重试，并保存失败截图和诊断信息。

### 6. Project Agent：集成 CI/CD 工具链

**简历表述：**将构建、发布 staging、触发视觉回归测试和解析流水线日志等操作封装为结构化 Agent 工具，打通从代码变更到验证反馈的闭环。

**技术实现：**

- 调用 Azure DevOps Pipeline API 触发指定 definition，保存返回的 `runId`。
- 通过轮询或 webhook 获取 pipeline 状态，解析 staging URL、session ID 和失败原因。
- 将底层 API 的不稳定响应转换为统一结果；长任务先返回任务句柄，后续通过查询工具获取结果，不阻塞主流程。

### 7. Skill-as-Harness 可扩展能力体系

**简历表述：**将专业工作流抽象为可按需加载的 Skill，通过文档约定触发条件、输入、执行步骤和输出格式，降低新增 Agent 能力的接入成本。

**技术实现：**

- 每个 Skill 包含 `SKILL.md`、工具定义、前置条件、执行流程、失败处理和示例。
- Orchestrator 根据任务语义选择 Skill，再读取对应知识，避免所有规则常驻 Prompt。
- 将 Skill 作为流程合同，工具负责执行、LLM 负责在合同约束下决策；后续可增加版本号、权限范围和回归评测集。

### 8. 安全边界、可观测性与错误恢复

**简历表述：**在 Agent 工具层加入权限校验、敏感信息保护、Prompt Injection 防护、结构化日志和失败恢复机制，提升真实研发环境中的可控性。

**技术实现：**

- 工具入口校验分支名、仓库、操作类型和用户权限；高风险操作要求显式确认。
- Token、证书和环境变量通过 Secret Manager 或运行时注入，日志统一脱敏。
- 将外部文档视为不可信数据，文档只能作为检索材料，不能覆盖系统指令或直接触发高风险工具。
- 记录 `traceId`、`taskId`、工具名、耗时、状态和错误类型；对限流、网络抖动和流水线失败使用有限重试、指数退避、断点恢复和人工接管。

## 三、可直接改写到简历中的版本

### 版本 A：偏前端 + AI 应用开发

#### AI Developer Agent｜Python、TypeScript、LLM、Playwright、Azure DevOps

- 面向大型前端代码库设计 AI Developer Agent，通过 Orchestrator-Worker 模式完成任务拆解、代码检索、浏览器验证、构建部署和测试结果聚合。
- 基于 Playwright 封装 Browser Agent，自动提取 staging 页面 DOM、截图和控制台错误，并将真实页面标识符反向用于代码定位和修改后验证。
- 设计 Context Window、Session Compression 和 Blackboard 三层 Memory，持久化任务状态与流水线句柄，支持跨步骤、跨会话恢复长链路任务。
- 采用异步 Fan-out/Fan-in 编排独立构建与测试任务，统一处理轮询、超时、重试和结构化结果。
- 通过 Skill-as-Harness 和按需加载 RAG 组织领域知识，结合工具权限校验、日志脱敏和 Prompt Injection 防护，增强系统可扩展性与安全性。

### 版本 B：目前经验还不完整时使用

#### AI Agent 工程实践项目｜Python、TypeScript、LLM、Playwright

- 学习并实践面向研发场景的多 Agent 编排、Tool Calling、代码检索、浏览器自动化和任务状态管理。
- 设计 Orchestrator、Browser Agent 和 Project Agent 的职责边界，使用结构化协议传递任务状态与执行结果。
- 实践基于优先级的上下文裁剪、会话摘要和 Blackboard 状态共享，探索有限上下文下的长任务连续执行。
- 通过 Playwright 对前端页面进行 DOM、截图和交互验证，理解 AI 应用从“生成代码”到“执行并验证”的闭环。

> 如果尚未真正接入 Azure DevOps、实现向量检索或编写安全拦截代码，请使用“设计”“实践”“探索”，不要使用“实现”“落地”“提升 XX%”等需要真实证据支撑的表述。

## 四、面试准备：每个亮点都要能回答

| 主题 | 至少要能讲清楚 |
| --- | --- |
| Agent 编排 | 为什么拆成多个 Agent？哪些逻辑由代码控制，哪些交给 LLM？ |
| Tool Calling | 工具参数如何定义和校验？工具失败后如何重试或终止？ |
| Memory | 为什么不能把全部历史放入 Prompt？如何裁剪、摘要和持久化？ |
| RAG | 如何切块、召回、排序和引用来源？如何判断结果不可信？ |
| Browser Agent | DOM、截图、可访问性树分别解决什么问题？如何避免状态污染？ |
| 异步任务 | 如何记录任务状态？如何处理重复触发、超时和部分成功？ |
| 安全与评估 | 如何防止 Prompt Injection？如何衡量成功率、延迟、Token 成本和人工接管率？ |

## 五、建议的学习任务路线

### 阶段 1：LLM 应用基础（1 周）

- 用 Python 或 TypeScript 调用 LLM API，掌握消息结构、Token、结构化输出和流式响应。
- 完成一个 Tool Calling Demo，让模型调用计算器或文件查询工具，并用 Zod/Pydantic 校验参数。
- 理解 Prompt、Tool、Workflow 和 Agent 的边界。

### 阶段 2：单 Agent 工作流（1 周）

- 实现“读取需求 → 搜索文件 → 生成修改建议 → 输出证据”的最小 Coding Agent。
- 增加状态机、最大步骤数、超时、重试和结构化日志，并为工具编写异常场景测试。

### 阶段 3：RAG 与 Memory（1—2 周）

- 使用 SQLite/JSON 实现 Blackboard，再使用 Redis 理解多进程状态共享。
- 对 Markdown 和 TypeScript 文件切块，完成关键词检索、向量检索和来源引用。
- 实现上下文预算器，比较全文拼接、关键词检索和向量检索的效果与成本。

### 阶段 4：浏览器 Agent（1 周）

- 使用 Playwright 实现访问页面、定位元素、截图、读取控制台错误和断言页面状态。
- 增加页面隔离、网络等待、有限重试和失败截图；要求 Agent 根据 DOM 证据输出结论。

### 阶段 5：多 Agent 生产化（2 周）

- 实现 Orchestrator、Researcher、Browser Tester 三个角色，再尝试 LangGraph 等框架。
- 增加并行任务、任务句柄、轮询、幂等、断点恢复、工具白名单、人工确认、日志脱敏和成本统计。
- 建立 20—50 条评测样例，记录成功率、工具选择准确率、平均延迟、Token 消耗和人工接管率。

## 六、建议做成作品集的最小 Demo

可以将当前项目抽象为 **Frontend Issue Agent**：用户输入前端 Bug → Retriever 搜索本地 Demo 仓库 → Browser Agent 复现问题 → Coder 生成补丁 → Playwright 执行回归测试 → Blackboard 保存状态并支持通过 `taskId` 恢复任务。

该 Demo 能覆盖 AI 应用开发岗位常问的核心能力：LLM API、Tool Calling、RAG、Agent Workflow、Memory、Playwright、异步任务、可观测性和安全边界。

## 七、推荐学习的开源 Agent

### 首选：LangGraph.js

仓库：[langchain-ai/langgraphjs](https://github.com/langchain-ai/langgraphjs)

它最适合对应当前项目的 Orchestrator-Worker 设计。重点阅读这些概念：

- `StateGraph`：把 Agent 工作流表达为状态图，节点是任务步骤，边是执行顺序。
- `addConditionalEdges`：根据当前 State 决定下一步，类似 Orchestrator 的路由器。
- `Send`：将一个状态拆成多个并行任务，对应 Fan-out。
- `MemorySaver` 和 `checkpointer`：按 `thread_id` 保存状态，对应 Blackboard 和跨步骤恢复。
- `interrupt` / `Command({ resume })`：暂停工作流等待人工确认，再继续执行。

官方源码中可以重点搜索 `agent_simple.mts`、`graph_structure.test.ts`、`time_travel.test.ts` 和 `checkpoint.test.ts`。测试文件比复杂 Demo 更适合学习，因为每个能力通常都有输入、执行和断言。

LangGraph.js 的典型结构可以抽象成：

```text
START → agent → 条件路由
                ├─ tool → agent
                └─ END
```

### 前端配套参考：Vercel AI SDK

仓库：[vercel/ai](https://github.com/vercel/ai)

如果你想快速掌握前端项目中真正的 Tool Calling 和流式响应，可以阅读它的 `ToolLoopAgent`、`WorkflowAgent` 以及 `examples/ai-functions`。重点关注：

- 工具如何用 Zod 定义输入 Schema。
- 模型返回 Tool Call 后，Agent 如何执行工具并把 Tool Result 放回消息历史。
- 如何通过 `stopWhen` 限制工具循环次数。
- 如何通过 `onStepStart`、`onToolExecutionStart` 和 `onStepFinish` 做可观测性。
- 高风险工具如何使用 `needsApproval` 请求人工确认。

两者的学习顺序建议是：先读下面的零依赖 Demo，理解状态和调用链；再读 LangGraph.js 的图编排；最后用 Vercel AI SDK 接入真实模型和前端流式 UI。

## 八、TypeScript 小型 Agent Demo

对应代码：[demo/agent-ts-demo/mini-agent.ts](../../agent-ts-demo/mini-agent.ts)

这个 Demo 不依赖模型 SDK，故意把“模型决策”替换成确定性的 `createPlan`，让你先看懂 Agent 的工程骨架。它完成了：创建任务状态、注册工具、并行检索、浏览器检查、Blackboard 持久化和 Session Compression。

### 1. 用类型定义 Agent State 和 Tool

```ts
type TaskState = {
  taskId: string;
  userRequest: string;
  files: string[];
  evidence: string[];
  results: string[];
  status: "planned" | "running" | "succeeded" | "failed";
  attempts: number;
};

type Tool<Input> = {
  name: string;
  description: string;
  execute: (input: Input, context: ToolContext) => Promise<string>;
};
```

这里的 `TaskState` 就是 LangGraph 中的 Graph State，也是当前项目 Blackboard 的业务视图。它保存事实状态，不保存一大段不可查询的自然语言叙述。

`Tool<Input>` 使用泛型约束工具输入。以后接入真实 LLM 时，可以把 `Input` 换成 Zod Schema 推导出来的类型，避免模型传入错误参数。

### 2. 用工具注册表隔离副作用

```ts
const tools: Record<string, Tool<{ term: string }>> = {
  searchCode: { /* 搜索代码 */ },
  inspectBrowser: { /* 检查页面 */ },
};
```

工具注册表对应 Project Agent 或 Browser Agent 的能力边界。模型不能直接读写文件系统，而是只能选择注册过的工具；工具内部负责参数校验、权限检查、日志和真实副作用。

当前 Demo 的 `searchCode` 和 `inspectBrowser` 是假的：前者生成文件路径，后者生成 DOM 证据。替换为真实实现时，可以分别接入本地 `fs`/代码索引和 Playwright。

### 3. `createPlan` 对应 Orchestrator 的规划阶段

```ts
function createPlan(userRequest: string): Plan {
  const terms = userRequest.match(/[a-zA-Z][a-zA-Z0-9_-]*/g) ?? [];
  return {
    searchTerms: terms.length > 0 ? terms.slice(0, 2) : ["IssuePanel"],
    checks: ["inspectBrowser"],
  };
}
```

为了让 Demo 零成本运行，这里用正则提取关键词。真实版本应改为一次结构化 LLM 调用：要求模型只返回符合 `Plan` 类型的 JSON，例如 `searchTerms`、`filesToInspect`、`checks` 和 `riskLevel`。

关键原则是：LLM 生成计划，代码校验计划。比如 `checks` 只能选择白名单工具，`riskLevel=high` 时必须暂停等待人工确认。

### 4. `runParallel` 对应 Fan-out

```ts
async function runParallel<T>(jobs: Array<() => Promise<T>>): Promise<T[]> {
  return Promise.all(jobs.map((job) => job()));
}
```

`Promise.all` 会并发执行独立搜索任务，对应项目里的 `asyncio.gather()`。生产代码不能只写这一行，还要补充并发上限、超时、取消信号、重试和部分失败策略。

例如：代码搜索失败时可以保留其他搜索结果继续执行；发布 staging 失败时则不能继续触发依赖 staging URL 的视觉测试。

### 5. `runAgent` 展示完整调用链

```ts
const state = createState(userRequest);
const plan = createPlan(userRequest);
blackboard.set(`${state.taskId}:plan`, plan);

const searchResults = await runParallel(searchJobs);
const browserResult = await tools.inspectBrowser.execute(...);

blackboard.set(`${state.taskId}:state`, state);
```

这段代码可以映射到简历中的完整工作流：

1. 创建 `taskId` 和初始 State。
2. Orchestrator 生成 Plan。
3. Blackboard 保存 Plan，Worker 读取并执行。
4. 并行调用代码检索工具。
5. 调用 Browser Agent 获取真实页面证据。
6. 更新状态并持久化结果。
7. 生成跨会话摘要。

### 6. `compressSession` 对应跨会话记忆

```ts
function compressSession(state: TaskState): string {
  return JSON.stringify({
    taskId: state.taskId,
    latestIntent: state.userRequest,
    stillApplicable: state.evidence.slice(-3),
    files: state.files,
    status: state.status,
  });
}
```

摘要不应该只是“把所有消息截短”。它需要保留下一次执行真正需要的事实：用户最新意图、仍有效的证据、已定位文件和当前状态。早期中间过程可以丢弃，敏感信息也应该在此处过滤。

## 九、如何把零依赖 Demo 升级成真实 Agent

### 第一步：接入真实模型，但保留现有 State

将 `createPlan` 替换成模型结构化输出，推荐使用 Vercel AI SDK：

```ts
import { generateObject } from "ai";
import { z } from "zod";

const PlanSchema = z.object({
  searchTerms: z.array(z.string()).max(3),
  checks: z.array(z.enum(["inspectBrowser"])),
});

const { object: plan } = await generateObject({
  model,
  schema: PlanSchema,
  prompt: userRequest,
});
```

模型只能生成合法 Plan，代码仍然负责执行工具。不要让模型直接生成并执行任意 Shell 命令。

### 第二步：把假工具替换为真实工具

- `searchCode`：使用 `fs`、ripgrep 子进程或代码索引，返回文件路径、符号和行号。
- `inspectBrowser`：使用 Playwright 创建隔离 Browser Context，返回 URL、DOM 证据、截图路径和控制台错误。
- `runTests`：使用 `child_process` 执行白名单脚本，限制工作目录、环境变量和超时时间。

### 第三步：加入 LangGraph.js 的状态图

当节点、分支和恢复逻辑变多后，再使用 LangGraph.js 表达工作流：

```ts
const workflow = new StateGraph(State)
  .addNode("agent", callModel)
  .addNode("tool", callTool)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("tool", "agent");

const graph = workflow.compile({ checkpointer });
```

这里的 `StateGraph` 对应任务状态图，`shouldContinue` 对应 Orchestrator 路由，`checkpointer` 对应可恢复的 Blackboard。不要一开始就使用框架；先能手写出 Demo，再看框架替你解决了哪些问题。

### 第四步：补齐生产能力

- 为工具加 Zod 输入校验、工具白名单和人工确认。
- 为每次任务添加 `traceId`，记录节点、工具、耗时、Token 和错误类型。
- 为 Agent 建立固定评测集，比较工具选择正确率、任务成功率、平均延迟、Token 成本和人工接管率。
- 使用 Redis 或数据库替换内存中的 `Map`，使用队列处理长时间构建和流水线任务。

## 十、学习时的代码阅读顺序

1. 先运行并修改 `mini-agent.ts`：把 `searchCode` 改成串行，观察并行差异；再制造工具异常，观察状态如何变成 `failed`。
2. 给 `TaskState` 增加 `riskLevel` 和 `approvalRequired`，实现高风险任务暂停。
3. 给 `compressSession` 增加敏感字段过滤和最大长度限制。
4. 阅读 LangGraph.js 的 `agent_simple.mts`，将 Demo 中的 `runAgent` 映射到 StateGraph 节点。
5. 阅读 Vercel AI SDK 的 Tool Calling 示例，接入真实模型和 Zod。
6. 最后把 `inspectBrowser` 接入 Playwright，形成 Frontend Issue Agent 作品集。
