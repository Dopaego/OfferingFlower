# AI Agent / AI 应用开发求职学习手册

> 面向人群：有 React、TypeScript、Electron 基础，希望求职 AI Agent 应用工程师、AI 全栈应用工程师或桌面智能体工程师的应届生。
>
> 案例项目：Microsoft Scout（Electron + React 19 + TypeScript + GitHub Copilot SDK / Gateway + MCP）。
>
> 整理日期：2026-08-05。招聘信息和协议会变化，面试前应重新核对官方资料。

## 0. 先说结论：应该如何使用这份手册

背完概念不能保证拿到 offer。面试官真正判断的是三件事：

1. 你能否讲清楚为什么这样设计，而不只是背框架名词。
2. 你能否独立实现、调试并演示一个可运行的 Agent 产品。
3. 你能否讨论失败路径、安全、成本、测试和工程权衡。

这份手册建议学三遍：

- 第一遍“看懂”：理解名词、链路和架构图，不钻所有源码。
- 第二遍“复现”：独立完成第 18 章的 Electron Agent Workbench。
- 第三遍“表达”：按“结论 → 原因 → 项目证据 → 权衡”回答面试题，不逐字背答案。

学习完成的标准不是“看过”，而是你可以脱离文档：

- 在白板上画出一次消息从 React 到模型、工具再回到 UI 的完整链路；
- 实现一个带流式输出、工具调用、MCP、审批、取消和恢复的最小 Agent；
- 用测试复现超时、重复事件、取消竞态、提示注入等异常；
- 在 5 分钟内演示项目，并解释至少三项工程权衡。

### 关于文中的 TypeScript 示例

文中的代码是为了讲清架构而编写的最小教学实现，并非直接复制 Scout 源码，也省略了部分生产日志、遥测和兼容处理。阅读每个示例时都问自己四个问题：

1. 输入和输出合同是什么？
2. 哪一层拥有状态与副作用？
3. 失败、取消和重复调用怎样处理？
4. 哪些约束只能由程序保证，不能交给模型？

建议先手敲示例，再主动增加一个失败用例。只复制成功路径，无法真正学会 Agent 工程。

### 你的岗位定位

最适合你的方向是：

- AI Agent 应用工程师：将模型、工具、记忆、工作流和权限做成可靠产品；
- AI 全栈应用工程师：React / Electron 前端加 Python 或 Node 后端；
- 桌面智能体工程师：利用 Electron 的本地文件、系统命令和跨平台能力；
- AI 原生前端工程师：专注流式交互、工具过程可视化、审批和可恢复体验。

暂时不应把自己定位为模型训练或算法研究岗，因为那通常要求更强的数学、训练基础设施、论文和深度学习经验。你的差异化优势是：已经理解 UI、状态管理和 Electron，可以比纯后端候选人更快做出“用户真的能用”的 Agent。

### 当前能力与补课优先级

| 能力 | 你的起点 | 求职目标 |
| --- | --- | --- |
| React / TypeScript | 已有基础 | 掌握流式 UI、缓存、虚拟化、错误恢复 |
| Electron | 已有基础 | 掌握进程隔离、typed IPC、权限边界、打包 |
| Agent 核心 | 需要系统化 | 掌握循环、工具、记忆、上下文、状态机 |
| Python | 建议优先补 | FastAPI、asyncio、Pydantic、pytest、LLM SDK |
| 后端基础 | 需要补 | HTTP/SSE/WebSocket、鉴权、数据库、队列、限流 |
| RAG | 需要补 | 切分、召回、重排、引用、评测、权限过滤 |
| 安全与评测 | 重点差异化 | Prompt Injection、最小权限、审计、Eval |

官方校园招聘也印证了这条路线。阿里巴巴 2027 实习 AI Agent 研发岗位要求覆盖 Prompt、RAG、Multi-Agent、Memory、Function Calling、上下文工程和 Agent 全生命周期，同时强调 Java/Python。因此 TypeScript 可以成为优势，但不能成为唯一语言。

---

## 1. 从传统 Web 到 Agent：先改变心智模型

### 一句话理解

传统 Web 的核心是“确定的输入进入确定的程序”；Agent 的核心是“让概率模型在受约束的循环里选择下一步行动”。

### 专业定义

一个可落地的 Agent 通常由六部分组成：

1. Model：负责理解、推理和生成。
2. Instructions：定义目标、角色、限制和输出契约。
3. State：保存当前任务、消息、工具结果和运行状态。
4. Tools：访问外部世界，例如文件、浏览器、数据库、M365 和 Shell。
5. Control loop：决定何时调用模型、工具、重试、暂停或结束。
6. Guardrails / Eval：控制权限、输入输出、安全、质量和成本。

最简循环可以表示为：

    用户目标
       ↓
    构造上下文 → 模型决定：回答 / 调工具 / 请求确认
       ↑                    ↓
       └──── 工具结果 ← 执行、校验、记录
                            ↓
                      达成目标或终止

LLM 不是整个 Agent。真正决定产品可靠性的，通常是循环、状态机、工具协议和失败处理。

### 与前端经验的连接

你已经熟悉的概念可以直接迁移：

| 前端概念 | Agent 工程中的对应物 |
| --- | --- |
| 用户事件 | 用户目标或外部触发 |
| Reducer / 状态机 | Agent 运行状态、逻辑轮次 |
| API Client | 模型和工具适配器 |
| React Query 缓存 | 会话、任务和工具状态的服务端缓存 |
| Loading / Error UI | Streaming / Approval / Retry / Recovery |
| 权限路由 | 工具能力和作用域控制 |
| Error Boundary | 模型、工具和传输故障隔离 |

最大的不同是：模型输出不稳定，工具会产生现实副作用，任务可能运行很久。因此“解析一个字符串然后显示”远远不够。

### 常见坑

- 把聊天框当 Agent：只有问答，没有工具、状态和行动闭环。
- 把所有控制逻辑写进 Prompt：模型可能忽略文字约束，程序必须拥有最终控制权。
- 只实现成功路径：网络断开、工具超时、用户取消和重复事件才是面试深挖点。
- 相信自然语言就是接口：内部边界应使用 Schema 和判别联合类型。

### 面试表达

“我把 LLM 看作一个概率性的决策组件，而不是应用本身。外部系统负责状态、工具执行、权限、重试和终止条件。Prompt 可以指导行为，但不能替代程序级安全边界。”

---

## 2. LLM 应用基础：够用但必须准确

### 2.1 Token、上下文窗口和采样

Token 是模型处理文本的基本单位，不完全等于汉字或单词。上下文窗口包含系统指令、历史消息、工具定义、检索内容、工具结果和当前输出。窗口越长，通常意味着更高延迟和成本，也可能带来“信息很多但注意力分散”。

常见采样参数：

- Temperature：提高随机性，不等于提高知识；
- Top-p：只在累计概率覆盖一定范围的候选中采样；
- Max output tokens：限制输出长度，不等于限制总上下文；
- Stop：遇到特定序列停止，但不能作为唯一安全校验。

工程建议：

- 事实抽取、路由和工具参数使用低随机性与结构化输出；
- 创意生成才提高随机性；
- 不依赖“温度为 0 就完全确定”，服务端版本、并行和数值差异仍可能改变结果；
- 记录 token、首 token 延迟、总耗时和工具耗时，但不记录用户敏感内容。

### 2.2 Prompt 分层

合理的 Prompt 通常分为：

1. 系统级：身份、总原则、安全边界；
2. 产品级：功能规则、可用能力；
3. 任务级：当前目标和输出格式；
4. 外部数据：检索结果、网页、邮件、记忆；
5. 用户输入：当前请求。

外部数据不能与可信指令混在一起。项目使用 [untrusted-wrap.ts](electron/untrusted-wrap.ts) 和 [prompt-boundary.ts](electron/prompt-boundary.ts) 为外部内容建立显式边界、转义闭合标签。它不能证明攻击绝不成功，但能降低模型把数据误当指令的概率，并为后续审计保留来源。

### 2.3 Structured Output 与 Schema

当程序需要消费模型输出时，应优先使用 JSON Schema、Pydantic 或 Zod 校验，而不是从自然语言中截取 JSON。

可靠流程：

    模型输出 → 语法解析 → Schema 校验 → 业务校验 → 执行

四层校验缺一不可：

- 语法正确不代表字段正确；
- 字段正确不代表路径、URL 或金额合法；
- 参数合法不代表当前用户有权限；
- 有权限也不代表高风险操作无需确认。

#### TypeScript 示例：结构化工具参数的四层校验

~~~ts
import { z } from "zod";
import path from "node:path";

const readFileArgsSchema = z.object({
  relativePath: z.string().min(1),
  maxBytes: z.number().int().positive().max(1024 * 1024).default(64 * 1024),
});

type ReadFileArgs = z.infer<typeof readFileArgsSchema>;

type ToolContext = {
  workspaceRoot: string;
  allowedTools: ReadonlySet<string>;
  signal: AbortSignal;
};

function resolveInsideWorkspace(root: string, relativePath: string): string {
  const absoluteRoot = path.resolve(root);
  const candidate = path.resolve(absoluteRoot, relativePath);
  const relative = path.relative(absoluteRoot, candidate);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Path escapes the workspace");
  }

  return candidate;
}

async function executeReadFile(
  rawArgs: unknown,
  context: ToolContext,
): Promise<{ path: string; content: string }> {
  if (!context.allowedTools.has("read_file")) {
    throw new Error("Tool is not enabled for this session");
  }

  const args: ReadFileArgs = readFileArgsSchema.parse(rawArgs);
  const absolutePath = resolveInsideWorkspace(
    context.workspaceRoot,
    args.relativePath,
  );

  context.signal.throwIfAborted();
  const content = await readTextWithLimit(
    absolutePath,
    args.maxBytes,
    context.signal,
  );
  return { path: args.relativePath, content };
}
~~~

这段代码对应四种不同约束：

- Zod 负责运行时结构校验；
- <code>resolveInsideWorkspace</code> 负责业务语义与路径边界；
- <code>allowedTools</code> 负责会话能力校验；
- <code>AbortSignal</code> 负责取消传播。

面试时不要说“有 Zod 就安全”。Schema 只能证明参数形状，不能证明用户有权读取目标文件。

### 2.4 Function Calling

Function Calling 是模型生成“工具名 + 结构化参数”，宿主执行工具并把结果送回模型。模型只提出调用意图，不应直接拥有系统权限。

正确顺序：

1. 应用把可用工具的名称、说明、参数 Schema 发给模型；
2. 模型返回工具调用；
3. 应用校验工具存在、参数合法、用户权限和风险等级；
4. 必要时暂停并请求用户批准；
5. 应用执行工具，记录结果和审计信息；
6. 工具结果回到模型，继续当前逻辑轮次；
7. 模型给出最终答案或再次调用工具。

常见坑：

- 工具描述含糊，导致模型选错工具；
- 工具粒度过大，例如一个万能 execute 接口；
- 参数 Schema 使用任意对象，丢失类型保护；
- 重试写操作却没有幂等键；
- 把 API Key 放入 Prompt 或工具返回；
- 工具错误只返回“失败”，模型无法选择恢复策略。

#### TypeScript 示例：模型只产生意图，宿主负责执行

~~~ts
type ToolCall = {
  id: string;
  name: string;
  arguments: unknown;
};

type ToolResult =
  | { ok: true; callId: string; value: unknown }
  | {
      ok: false;
      callId: string;
      code: "INVALID_ARGS" | "DENIED" | "TIMEOUT" | "FAILED";
      retryable: boolean;
    };

type ToolHandler = (
  args: unknown,
  context: ToolContext,
) => Promise<unknown>;

async function dispatchToolCall(
  call: ToolCall,
  handlers: ReadonlyMap<string, ToolHandler>,
  context: ToolContext,
): Promise<ToolResult> {
  const handler = handlers.get(call.name);
  if (!handler) {
    return {
      ok: false,
      callId: call.id,
      code: "INVALID_ARGS",
      retryable: false,
    };
  }

  try {
    const value = await handler(call.arguments, context);
    return { ok: true, callId: call.id, value };
  } catch (error) {
    return normalizeToolError(call.id, error);
  }
}
~~~

关键点是错误也必须结构化。模型可以根据 <code>retryable</code> 和错误码选择修正参数或停止，但是否真的重试仍应受宿主的总次数和预算限制。

---

## 3. Agent 核心循环与工程状态机

### 一句话理解

ReAct 是推理范式，状态机才是生产控制面。

### 常见范式

- ReAct：观察后交替进行推理和行动，适合动态探索；
- Plan-and-Execute：先生成计划，再逐步执行，适合长任务；
- Router：先选择专业能力或子 Agent，再转交；
- Reflection：执行后检查结果并决定是否修正；
- Deterministic workflow：关键步骤由代码固定，只让模型处理模糊环节。

不要迷信某一种。生产系统常把它们混合：固定工作流保证安全，模型只在路由、参数补全和内容生成等节点发挥作用。

### 逻辑轮次与物理请求

这是非常重要的面试概念：

- Logical turn：用户看来的一次完整交互，可能包含多次模型调用和工具调用；
- Physical run / request：底层某一次网络流或后端执行。

一次逻辑轮次可能经历：

    RUNNING
      ├─ 工具需确认 → WAITING_APPROVAL → RUNNING
      ├─ 工具执行中 → WAITING_TOOL → RUNNING
      ├─ 连接中断 → RECONNECTING → RUNNING
      ├─ 用户取消 → CANCELLING → CANCELLED
      ├─ 不可恢复错误 → FAILED
      └─ 语义完成 → COMPLETED

Scout 的 Gateway 后端使用 [exec-approval-turn-tracker.ts](electron/backend/gateway/exec-approval-turn-tracker.ts) 跟踪审批前后属于同一个逻辑轮次，避免把一次任务错误统计成多轮。会话层在 [sessions.ts](electron/sessions.ts) 处理发送、事件、恢复和后端无关的状态。

### 状态机必须回答的问题

- 哪些状态允许接收新消息？
- 取消和完成同时到达时谁获胜？
- 断线重连后从哪里恢复？
- 重复事件是否会重复写入 UI？
- 工具审批期间任务是否仍算活跃？
- 底层 stream 结束是否等于语义任务结束？
- 超时后底层任务还在运行怎么办？

### 工程建议

- 为每个 run 分配稳定 ID，事件携带 sessionId、runId、sequence；
- reducer 应尽可能幂等，重复事件不改变最终结果；
- 使用 AbortSignal 将取消向模型、工具和传输层传播；
- 为写操作设置 idempotency key；
- 把 retryable 与 terminal error 分开；
- 超时是调用方停止等待，不等于执行方一定停止；
- 终止条件由程序判断：最大步数、时间预算、费用预算、明确完成事件。

#### TypeScript 示例：显式状态机与迟到事件防护

~~~ts
type RunStatus =
  | "idle"
  | "running"
  | "waiting_approval"
  | "cancelling"
  | "completed"
  | "failed"
  | "cancelled";

type RunState = {
  runId: string;
  status: RunStatus;
  text: string;
  lastSequence: number;
  errorCode?: string;
};

type RunEvent =
  | { type: "started"; runId: string; sequence: number }
  | { type: "delta"; runId: string; sequence: number; text: string }
  | { type: "approval_required"; runId: string; sequence: number }
  | { type: "cancel_requested"; runId: string; sequence: number }
  | { type: "cancelled"; runId: string; sequence: number }
  | { type: "completed"; runId: string; sequence: number }
  | { type: "failed"; runId: string; sequence: number; code: string };

const terminalStatuses = new Set<RunStatus>([
  "completed",
  "failed",
  "cancelled",
]);

function reduceRun(state: RunState, event: RunEvent): RunState {
  if (event.runId !== state.runId || event.sequence <= state.lastSequence) {
    return state;
  }

  if (terminalStatuses.has(state.status)) {
    return state;
  }

  const base = { ...state, lastSequence: event.sequence };

  switch (event.type) {
    case "started":
      return { ...base, status: "running" };
    case "delta":
      return state.status === "running"
        ? { ...base, text: state.text + event.text }
        : base;
    case "approval_required":
      return { ...base, status: "waiting_approval" };
    case "cancel_requested":
      return { ...base, status: "cancelling" };
    case "cancelled":
      return { ...base, status: "cancelled" };
    case "completed":
      return state.status === "cancelling"
        ? base
        : { ...base, status: "completed" };
    case "failed":
      return { ...base, status: "failed", errorCode: event.code };
  }
}
~~~

这里通过 <code>runId</code> 拒绝旧任务事件，通过 <code>sequence</code> 去重，通过终态保护避免取消后又被迟到 delta 激活。生产实现还应定义完整的合法迁移表，而不是仅依赖 switch。

### 面试表达

“我不会用 stream close 判断任务完成，因为审批、重连或后端切换可能切断物理流，但逻辑轮次还未结束。我会用 runId 和显式状态机跟踪语义完成，并让事件消费保持幂等。”

---

## 4. Scout 的完整消息链路

### 一句话理解

这是一个“React 交互层 → 平台服务 → 安全 IPC → 会话编排 → 可插拔后端 → 标准事件 → UI”的闭环。

### 核心链路

    React ChatPanel
        ↓ 乐观插入用户消息、发起发送
    src/services/copilot.ts
        ↓ 依赖平台无关服务接口
    src/platform/electron/chat-service.ts
        ↓ window.electronAPI 命名空间
    electron/preload.cjs
        ↓ contextBridge + typed IPC channel
    electron/ipc/chat-ipc.ts
        ↓ ipcHandle 统一包装
    electron/sessions.ts
        ↓ 会话、并发、恢复、权限协调
    ISessionBackend
        ↓ CopilotBackend 或 GatewayBackend
    BackendEvent 标准化事件
        ↓ IPC event → Query cache / reducer
    VirtualizedChatSurface

建议按以下顺序读源码：

1. [ChatPanel.tsx](src/features/chat/components/ChatPanel.tsx)：用户输入、乐观更新和交互入口；
2. [copilot.ts](src/services/copilot.ts)：Renderer 服务边界；
3. [chat-service.ts](src/platform/electron/chat-service.ts)：Electron 平台适配；
4. [ipc-contract.ts](common/ipc-contract.ts)：IPC 单一类型真相；
5. [preload.cjs](electron/preload.cjs)：Renderer 能访问的最小能力；
6. [chat-ipc.ts](electron/ipc/chat-ipc.ts)：Main 进程入口；
7. [ipc-handle.ts](electron/ipc/ipc-handle.ts)：统一错误、遥测和测试路由；
8. [sessions.ts](electron/sessions.ts)：核心会话编排；
9. [types.ts](electron/backend/types.ts)：后端契约和标准事件；
10. [VirtualizedChatSurface.tsx](src/features/chat/components/VirtualizedChatSurface.tsx)：长会话渲染。

### 为什么分这么多层

每层都在解决一种变化：

- React 组件处理交互变化；
- 平台服务隔离 Electron 与未来 Web 环境；
- IPC 合同处理跨进程变化；
- SessionManager 处理业务状态；
- Backend interface 处理模型供应商变化；
- 标准事件隔离各 SDK 的事件格式。

如果组件直接调用某个 SDK，一旦更换模型后端，UI、会话和测试都会被迫修改。这就是架构中的“变化轴隔离”。

---

## 5. Electron Agent 架构：把你的既有优势升级

### Main、Renderer、Preload 的职责

| 进程 | 应做 | 不应做 |
| --- | --- | --- |
| Renderer | 展示、交互、缓存、可视化 | 直接读文件、执行 Shell、持有系统密钥 |
| Preload | 暴露最小且命名化的桥接 API | 暴露整个 ipcRenderer 或万能 invoke |
| Main | 系统能力、模型客户端、权限、持久化 | 混入 React UI 状态 |
| common | 纯类型、纯函数、协议 | 导入 Electron 或 Renderer 实现 |

项目明确规定 <code>electron/**</code> 和 <code>src/**</code> 不能互相导入，只能通过 [ipc-contract.ts](common/ipc-contract.ts) 与 preload/IPC 通信。边界检查和循环依赖检查进入 CI。

### Typed IPC 五层

新增一个 IPC 能力时应检查：

1. Contract：Invoke/Event 类型；
2. Main handler：使用统一 <code>ipcHandle()</code>；
3. Preload：暴露命名空间方法；
4. E2E stub：仅在确实依赖 SDK 时补；
5. Test mock：测试需要断言调用时补。

所有响应使用类似 <code>{ success, error?, data... }</code> 的 envelope。类型只能降低编译期错误，运行时仍需校验来自磁盘、网络和旧版本的数据。

#### TypeScript 示例：由合同推导 Renderer API

~~~ts
import { z } from "zod";

type IpcInvokeMap = {
  "chat:send": {
    request: { sessionId: string; text: string };
    response:
      | { success: true; runId: string }
      | { success: false; error: string };
  };
  "chat:cancel": {
    request: { runId: string };
    response:
      | { success: true }
      | { success: false; error: string };
  };
};

type Channel = keyof IpcInvokeMap;
type RequestOf<C extends Channel> = IpcInvokeMap[C]["request"];
type ResponseOf<C extends Channel> = IpcInvokeMap[C]["response"];

type Invoke = <C extends Channel>(
  channel: C,
  request: RequestOf<C>,
) => Promise<ResponseOf<C>>;

const sendRequestSchema = z.object({
  sessionId: z.string().min(1),
  text: z.string().min(1).max(50_000),
});

function registerChatHandlers(invokeHandle: IpcHandleRegistrar): void {
  invokeHandle("chat:send", async (_event, rawRequest: unknown) => {
    const request = sendRequestSchema.parse(rawRequest);
    const runId = await sessionManager.send(request);
    return { success: true, runId };
  });
}
~~~

preload 不应暴露任意 channel：

~~~ts
contextBridge.exposeInMainWorld("electronAPI", {
  chat: {
    send: (request: RequestOf<"chat:send">) =>
      ipcRenderer.invoke("chat:send", request) as Promise<
        ResponseOf<"chat:send">
      >,
    cancel: (request: RequestOf<"chat:cancel">) =>
      ipcRenderer.invoke("chat:cancel", request) as Promise<
        ResponseOf<"chat:cancel">
      >,
  },
});
~~~

这里的类型断言只发生在 preload 的受控边界，Main handler 仍对 <code>unknown</code> 做运行时解析。不要把 <code>ipcRenderer.invoke(channel, ...args)</code> 整体暴露给页面。

### Electron 常见安全坑

- 开启 Node integration 或关闭 contextIsolation；
- 把任意 channel 和任意参数暴露给 Renderer；
- 在 Renderer 保存 API Key；
- 直接打开模型返回的 URL；
- 让 AI 拼接 Shell 字符串；
- 把文件路径当普通字符串，不校验是否越界；
- 打包后仍假设资源位于源码目录；
- 在 <code>app.whenReady()</code> 前访问 safeStorage；
- Windows 启动子进程忘记隐藏窗口，或使用系统 Node 而非捆绑 Node。

### 面试表达

“Electron 不只是壳，它也是权限边界。我把 Renderer 当不可信 Web 环境，只通过 preload 暴露按命名空间划分的最小 API；Main 对参数做运行时校验、授权和审计，模型无法绕过宿主直接获得系统能力。”

---

## 6. 可插拔后端：用多态隔离供应商

### 一句话理解

共享代码问“后端能做什么”，不问“后端是谁”。

项目在 [types.ts](electron/backend/types.ts) 定义：

- <code>ISessionBackend</code>：会话和消息能力；
- <code>IToolBackend</code>：工具能力；
- <code>IAutomationBackend</code>：自动化能力；
- <code>IBackendProvider</code>：组合并创建后端能力；
- <code>BackendEvent</code>：统一的流事件。

[create-backend.ts](electron/backend/create-backend.ts) 负责在 composition root 选择具体实现。共享 SessionManager 不能导入 Copilot 或 Gateway 具体目录，也不能在业务代码里到处写：

    if (backend.origin === "gateway") { ... }

正确方式是：

- 共同能力放进接口；
- 差异行为由实现多态完成；
- UI 根据 capability 决定功能是否可用；
- 供应商事件先标准化，再进入共享层；
- 每个新接口方法都写 conformance test，证明所有后端遵守契约。

### Capability 与 identity branching

错误问题：“现在是不是 Gateway？”

正确问题：

- 是否支持中断？
- 是否支持恢复？
- 是否支持后台自动化？
- 是否支持某种工具？

这样新增第三个后端时，不需要搜索整个代码库修改身份判断。

### SDK confinement

项目把 GitHub Copilot SDK 类型限制在具体后端目录，共享层使用 <code>Scout*</code> 中立类型，并通过编译期 witness 检查二者是否仍兼容。这个模式可以防止供应商 SDK 类型渗透成整个系统的领域模型。

#### TypeScript 示例：后端中立接口与 capability

~~~ts
type BackendCapabilities = {
  cancellation: boolean;
  reconnect: boolean;
  unattendedRuns: boolean;
};

type BackendEvent =
  | { type: "run_started"; runId: string }
  | { type: "text_delta"; runId: string; text: string; sequence: number }
  | { type: "tool_requested"; runId: string; call: ToolCall }
  | { type: "run_completed"; runId: string }
  | { type: "run_failed"; runId: string; code: string };

interface SessionBackend {
  readonly capabilities: BackendCapabilities;

  send(input: {
    sessionId: string;
    text: string;
    signal: AbortSignal;
  }): AsyncIterable<BackendEvent>;

  cancel(runId: string): Promise<void>;
}

class SessionService {
  constructor(private readonly backend: SessionBackend) {}

  async cancel(runId: string): Promise<void> {
    if (!this.backend.capabilities.cancellation) {
      throw new Error("The active backend cannot cancel a run");
    }
    await this.backend.cancel(runId);
  }
}
~~~

共享层只认识 <code>SessionBackend</code> 和领域事件。具体 SDK 的 event、error、message 类型应在 adapter 内转换，不能穿透到 <code>SessionService</code>。

#### TypeScript 示例：契约测试验证语义

~~~ts
type BackendFactory = () => SessionBackend;

function sessionBackendContract(
  name: string,
  createBackend: BackendFactory,
): void {
  describe(name, () => {
    it("emits one terminal event for every run", async () => {
      const backend = createBackend();
      const events: BackendEvent[] = [];

      for await (const event of backend.send({
        sessionId: "session-1",
        text: "hello",
        signal: AbortSignal.timeout(2_000),
      })) {
        events.push(event);
      }

      const terminalEvents = events.filter(
        (event) =>
          event.type === "run_completed" || event.type === "run_failed",
      );
      expect(terminalEvents).toHaveLength(1);
    });
  });
}

sessionBackendContract("mock backend", () => new MockBackend());
sessionBackendContract("provider backend", () => new ProviderBackend());
~~~

接口签名只能保证“有这个方法”，契约测试才验证“行为语义一致”。真实网络后端可以在更慢的 integration suite 中运行，普通 CI 使用可控 fake。

### 常见坑

- 为某个后端添加 optional 方法，让共享层到处判空；
- 标准事件丢失供应商原始语义，无法表达审批或恢复；
- 为了“通用”设计巨大接口，导致实现者只能空实现；
- capability 在前后端各维护一份，最终漂移；
- 兼容层长期不删除，变成第二套架构。

### 面试表达

“供应商抽象不是简单包一层 SDK。我会先定义领域事件和最小共同能力，在 composition root 注入实现；差异通过 capability 或多态表达，并用 conformance test 保证每个后端满足相同契约。”

---

## 7. 流式事件与 AI 原生前端

### 一句话理解

流式 UI 不是不断 append 字符串，而是消费一组可能重复、乱序、撤销和恢复的领域事件。

### 典型事件

- run started / completed / failed；
- assistant delta；
- reasoning/status delta；
- tool requested / approval required / started / result；
- attachment / citation；
- reconnect / resumed；
- usage updated。

项目将供应商事件标准化为 <code>BackendEvent</code>，Renderer 再把事件投影成聊天行。[useChatRows.ts](src/features/chat/hooks/useChatRows.ts) 负责行模型，[VirtualizedChatSurface.tsx](src/features/chat/components/VirtualizedChatSurface.tsx) 处理长会话虚拟化。

### 前端实现建议

- 立即乐观显示用户消息，但失败后要标记而非静默消失；
- 高频 token delta 做批处理，避免每个 token 都触发整个树重渲染；
- 以 messageId / toolCallId 更新目标项，不依赖数组最后一项；
- 将服务端状态放 Query cache，将局部交互状态留在组件；
- 写操作使用 mutation，暴露 pending / error；
- 订阅在应用启动时接一次，组件只消费缓存；
- 保持滚动锚点，用户向上阅读时不要强制拉到底部；
- 长会话使用虚拟化，但注意动态高度、代码块和图片加载；
- 工具卡片显示名称、参数摘要、风险、状态和可取消动作；
- 断线时明确展示“正在重连”，不要伪装成模型思考。

### 常见竞态

- 用户取消后迟到的 delta 又把状态改回 running；
- retry 产生两个并发 run，事件互相覆盖；
- optimistic message 与服务端回放消息重复；
- 组件重新挂载导致重复订阅；
- stream 很快，React state closure 仍引用旧值；
- 虚拟列表测量变化造成滚动跳动。

#### TypeScript 示例：按动画帧批量提交 token delta

~~~ts
type FlushDelta = (messageId: string, combinedText: string) => void;

class StreamingDeltaBuffer {
  private readonly chunks = new Map<string, string[]>();
  private frameId: number | undefined;

  constructor(private readonly flushDelta: FlushDelta) {}

  push(messageId: string, text: string): void {
    const messageChunks = this.chunks.get(messageId) ?? [];
    messageChunks.push(text);
    this.chunks.set(messageId, messageChunks);

    if (this.frameId === undefined) {
      this.frameId = requestAnimationFrame(() => this.flush());
    }
  }

  dispose(): void {
    if (this.frameId !== undefined) {
      cancelAnimationFrame(this.frameId);
    }
    this.frameId = undefined;
    this.chunks.clear();
  }

  private flush(): void {
    this.frameId = undefined;

    for (const [messageId, chunks] of this.chunks) {
      this.flushDelta(messageId, chunks.join(""));
    }
    this.chunks.clear();
  }
}
~~~

如果底层每秒产生数十个 delta，直接对每个 delta 调用 React state setter 会造成无意义渲染。这个 buffer 把同一动画帧的文本合并，但最终状态仍由 messageId 定位，不能假设“最后一条消息就是当前消息”。

React 中使用时还要在组件卸载或 run 切换时调用 <code>dispose()</code>，否则旧 run 缓存的文本可能写进新会话。

### 面试表达

“我会将流式响应建模为带 runId、messageId 和 sequence 的事件，而不是字符串回调。前端 reducer 幂等消费事件，高频 delta 批处理；取消后通过 run 状态拒绝迟到事件，长会话再用虚拟化控制渲染成本。”

---

## 8. MCP、Function Calling、Skill 与 RAG 的区别

### 8.1 MCP

Model Context Protocol 是 Host 与外部能力之间的标准协议，不等于 Agent 框架，也不规定 Agent 如何规划。

官方架构包含：

- Host：AI 应用，管理权限、用户体验和多个连接；
- Client：Host 内与某个 Server 建立一对一会话；
- Server：暴露能力；
- 数据层：基于 JSON-RPC 2.0；
- Transport：stdio、Streamable HTTP；
- Server primitives：Tools、Resources、Prompts；
- Client primitive：Elicitation；
- Notification：进度和能力变化等通知。

Scout 支持内置 Playwright MCP 以及用户配置的 stdio、HTTP/SSE MCP。文件、Shell、Search Web 和 WorkIQ 在当前项目中不都属于 MCP；面试时不要把“所有工具”都说成 MCP。

### 8.2 Function Calling

Function Calling 是模型怎样表达工具调用。工具可能是进程内函数，也可能通过 MCP、HTTP 或消息队列实现。MCP 解决工具发现、调用和传输的标准化问题。

### 8.3 Skill

Skill 是可复用的任务知识与工作流程，常包含说明、模板、脚本和资源。它教 Agent “怎样完成一类任务”，不一定新增底层权限。工具是“能做什么”，Skill 更接近“怎样组合能力做得好”。

### 8.4 RAG

RAG 在生成前检索外部知识，把相关片段和出处注入上下文。它解决知识新鲜度、私域知识和引用问题，不负责执行有副作用的动作。

### 面试中的一句话区分

“Function Calling 是模型提出结构化行动；MCP 是 Host 与能力提供方的标准连接协议；Skill 是可复用工作方法；RAG 是检索知识进入上下文。四者可以组合，但解决的问题不同。”

### MCP 工程坑

- stdio Server 把日志写到 stdout，污染 JSON-RPC；
- 子进程退出后 Host 仍认为工具在线；
- 未设置请求超时、取消和最大返回大小；
- 远程 MCP 地址没有 SSRF 和域名校验；
- Server 名或 Tool 名发生冲突；
- 动态能力列表变化后缓存未失效；
- 关闭工具时直接断连接，影响同一 Server 的其他能力；
- Windows 打包后找不到 Node 或弹出控制台窗口；
- 工具返回内容未经隔离，形成间接提示注入。

#### TypeScript 示例：为 MCP 调用增加超时、取消和大小限制

~~~ts
type McpCallResult = {
  content: unknown;
};

interface McpClient {
  callTool(
    input: { name: string; arguments: unknown },
    options: { signal: AbortSignal },
  ): Promise<McpCallResult>;
}

async function callMcpToolBounded(
  client: McpClient,
  call: ToolCall,
  parentSignal: AbortSignal,
): Promise<McpCallResult> {
  const signal = AbortSignal.any([
    parentSignal,
    AbortSignal.timeout(15_000),
  ]);

  const result = await client.callTool(
    { name: call.name, arguments: call.arguments },
    { signal },
  );

  const encodedSize = new TextEncoder().encode(
    JSON.stringify(result.content),
  ).byteLength;

  if (encodedSize > 2 * 1024 * 1024) {
    throw new Error("MCP tool result exceeds the configured limit");
  }

  return result;
}
~~~

这只是传输边界。返回的 <code>content</code> 仍是 <code>unknown</code>，进入业务层前要按工具 Schema 校验，进入模型上下文前要按外部不可信内容包装。

stdio MCP Server 还应把诊断日志写到 stderr：

~~~ts
function logMcpDiagnostic(message: string): void {
  process.stderr.write("[mcp] " + message + "\n");
}
~~~

stdout 是 JSON-RPC 协议通道，普通日志写入 stdout 会破坏消息解析。

---

## 9. 工具权限与 Human-in-the-loop

### 一句话理解

模型可以建议做什么，但程序和用户决定能不能做。

项目的权限核心位于：

- [policy.ts](electron/permissions/policy.ts)：策略入口；
- [policy-rules](electron/permissions/policy-rules/)：命令和能力规则；
- [approval-broker.ts](electron/permissions/approval-broker.ts)：审批请求生命周期；
- [card-manager.ts](electron/permissions/card-manager.ts)：向用户呈现审批卡；
- [audit-log.ts](electron/audit-log.ts)：审计记录。

Shell 命令按风险分层：

- 自动允许：明确只读、作用域可控；
- 请求批准：写文件、网络、安装、外部副作用；
- 直接阻止：危险删除、越权或无法安全解释。

管道和重定向必须逐段检查。<code>Get-Content file | Invoke-WebRequest ...</code> 的第一段只读，不代表整体安全。

### 权限决策需要的上下文

- 用户是谁；
- 当前会话和工作区；
- 工具与参数；
- 目标资源；
- 是否有写入、网络或执行副作用；
- 请求是否来自无人值守任务；
- 之前的授权是一次性、会话级还是永久；
- Server 或 Tool 是否被用户禁用。

### 审批 UI 设计

一个好的审批卡应说明：

- 将执行什么；
- 访问或修改哪里；
- 为什么需要；
- 风险是什么；
- 允许一次 / 本会话允许 / 拒绝；
- 如何取消正在执行的任务。

不要让用户批准不可读的长 JSON，也不要把“同意所有未来命令”作为默认选项。

#### TypeScript 示例：权限决策使用判别联合类型

~~~ts
type PermissionDecision =
  | { kind: "allow"; reason: string }
  | {
      kind: "ask";
      reason: string;
      summary: string;
      scope: "once" | "session";
    }
  | { kind: "deny"; reason: string; code: string };

type ToolPermissionRequest = {
  toolName: string;
  hasWriteEffect: boolean;
  usesNetwork: boolean;
  targetInsideWorkspace: boolean;
  unattended: boolean;
};

function evaluateToolPermission(
  request: ToolPermissionRequest,
): PermissionDecision {
  if (!request.targetInsideWorkspace) {
    return {
      kind: "deny",
      reason: "Target is outside the active workspace",
      code: "OUTSIDE_SCOPE",
    };
  }

  if (request.unattended && (request.hasWriteEffect || request.usesNetwork)) {
    return {
      kind: "deny",
      reason: "Unattended runs cannot perform this side effect",
      code: "UNATTENDED_SIDE_EFFECT",
    };
  }

  if (request.hasWriteEffect || request.usesNetwork) {
    return {
      kind: "ask",
      reason: "The tool can change or disclose external state",
      summary: "Review the target and parameters before continuing",
      scope: "once",
    };
  }

  return { kind: "allow", reason: "Read-only operation in workspace" };
}
~~~

使用判别联合类型后，调用方必须显式处理 allow、ask、deny，而不能把 <code>false</code> 同时解释成“拒绝”“需要确认”或“系统异常”。

执行入口仍需绑定审批结果与原始请求，防止批准 A 后参数被替换成 B：

~~~ts
type ApprovedCall = {
  callId: string;
  argumentsHash: string;
  expiresAt: number;
};

function assertApprovalMatches(
  approval: ApprovedCall,
  call: ToolCall,
  now: number,
): void {
  if (
    approval.callId !== call.id ||
    approval.argumentsHash !== stableHash(call.arguments) ||
    approval.expiresAt < now
  ) {
    throw new Error("Approval does not match the current tool call");
  }
}
~~~

真实项目中 <code>hasWriteEffect</code> 等字段必须由可信策略解析器产生，不能相信模型自己标注“这是只读命令”。

### 面试表达

“权限检查必须在工具执行前的可信宿主完成。我的策略会按动作、资源和作用域判断风险；模型返回的参数还要经过 Schema、路径、URL 和业务权限校验。写操作要求明确审批并记录审计日志。”

---

## 10. Agent 安全：Prompt Injection 不是 Prompt 技巧题

### 10.1 直接与间接注入

- 直接注入：用户直接要求忽略系统指令；
- 间接注入：网页、邮件、文档或工具结果中藏有恶意指令，Agent 读取后尝试执行。

拥有文件、Shell、浏览器和邮箱权限的 Agent，间接注入尤其危险。RAG 和微调不能彻底解决它，因为恶意内容仍可能进入上下文。

### 10.2 分层防御

1. 数据边界：把外部内容标记为不可信数据；
2. 最小权限：默认不给不需要的工具和资源；
3. 参数校验：Schema、路径、URL、域名、命令分段；
4. Human-in-the-loop：高风险或不可逆动作确认；
5. 输出校验：模型说“完成”不代表操作真的成功；
6. 隔离执行：工作区、容器、只读挂载、网络白名单；
7. 审计与检测：记录工具、风险、结果和关联 runId；
8. 机密隔离：Token 永远不进入 Prompt 和工具文本结果。

#### TypeScript 示例：外部内容边界与程序级授权

~~~ts
type UntrustedSource = "web" | "email" | "mcp" | "memory";

function escapeBoundary(text: string): string {
  return text.replaceAll("</untrusted-data>", "<\\/untrusted-data>");
}

function wrapUntrusted(source: UntrustedSource, text: string): string {
  return [
    '<untrusted-data source="' + source + '">',
    escapeBoundary(text),
    "</untrusted-data>",
  ].join("\n");
}

async function executeModelRequestedTool(
  call: ToolCall,
  context: ToolContext,
): Promise<ToolResult> {
  const normalized = normalizeToolCall(call);
  const decision = permissionPolicy.evaluate(normalized, context);

  if (decision.kind === "deny") {
    return {
      ok: false,
      callId: call.id,
      code: "DENIED",
      retryable: false,
    };
  }

  if (decision.kind === "ask") {
    const approval = await approvalBroker.request(normalized, decision);
    if (!approval.approved) {
      return {
        ok: false,
        callId: call.id,
        code: "DENIED",
        retryable: false,
      };
    }
    assertApprovalMatches(approval.proof, call, Date.now());
  }

  return toolRegistry.execute(normalized, context);
}
~~~

<code>wrapUntrusted</code> 只帮助模型识别数据边界。真正阻止副作用的是 <code>permissionPolicy</code>、审批绑定与工具注册表。即使模型被注入后执意请求危险工具，可信宿主仍必须拒绝。

### 10.3 项目证据

[untrusted-wrap.ts](electron/untrusted-wrap.ts) 包装来自外部系统的内容，[prompt-boundary.ts](electron/prompt-boundary.ts) 处理边界标签转义；权限系统在执行前做策略检查；外部 URL 通过安全封装验证 scheme 和 domain；日志禁止记录客户正文和凭据。

### 10.4 不要夸大

应说“降低攻击成功概率并限制影响面”，不要说“完全防住 Prompt Injection”。OWASP 也强调这是分层风险管理问题。

### 高频追问：把文本包在 XML 标签中就安全吗？

不安全。标签能帮助模型区分指令和数据，但模型仍可能被内容影响。真正安全依赖程序级权限、校验、隔离、确认和审计。

---

## 11. Memory 与上下文工程

### 一句话理解

Memory 不是把所有聊天永久塞回 Prompt，而是选择什么信息在什么时机、以什么可信度进入上下文。

### Memory 分类

- Working memory：当前任务需要的短期状态；
- Episodic memory：过去会话或任务经历；
- Semantic memory：稳定事实和用户偏好；
- Procedural memory：完成任务的方法，可由 Skill 表达。

### Context engineering

需要决定：

- 历史保留多少；
- 何时摘要；
- 工具结果保留全文还是结构化摘要；
- 哪些记忆需要来源和时间；
- 新事实与旧事实冲突时如何处理；
- 敏感信息是否允许长期保存；
- 不同租户、用户、会话如何隔离。

### 推荐策略

- 最近消息原文 + 旧历史分层摘要；
- 工具结果保存结构化数据，Prompt 只放必要片段；
- 记忆包含 source、createdAt、confidence、scope；
- 用户可查看、更正和删除；
- 不自动把模型推测写成事实；
- 读取后仍以不可信或低信任数据进入上下文；
- 压缩前保留关键决策、未完成事项和引用。

#### TypeScript 示例：带来源、作用域和过期时间的记忆

~~~ts
type MemoryScope =
  | { kind: "user"; userId: string }
  | { kind: "workspace"; workspaceId: string }
  | { kind: "session"; sessionId: string };

type MemoryEntry = {
  id: string;
  fact: string;
  source: string;
  scope: MemoryScope;
  confidence: number;
  createdAt: number;
  expiresAt?: number;
};

function selectMemories(
  entries: readonly MemoryEntry[],
  scope: MemoryScope,
  now: number,
): MemoryEntry[] {
  return entries
    .filter((entry) => sameScope(entry.scope, scope))
    .filter((entry) => entry.expiresAt === undefined || entry.expiresAt > now)
    .filter((entry) => entry.confidence >= 0.7)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 20);
}

function formatMemoriesForPrompt(entries: readonly MemoryEntry[]): string {
  const lines = entries.map((entry) =>
    [
      "memory_id=" + entry.id,
      "source=" + entry.source,
      "confidence=" + entry.confidence.toFixed(2),
      "fact=" + entry.fact,
    ].join(" | "),
  );

  return wrapUntrusted("memory", lines.join("\n"));
}
~~~

重点不在数组过滤，而在数据模型：记忆没有 scope 就可能跨用户泄漏，没有 source 就无法纠错，没有过期时间就会长期污染上下文。实际选择还可以加入语义相关性，但权限过滤必须先于相关性排序。

### 常见坑

- 无限增长导致成本和延迟上升；
- 摘要反复摘要，事实逐渐漂移；
- 用户一句临时要求被错误记为永久偏好；
- 跨用户或跨租户泄漏；
- 过期信息没有 TTL；
- Memory 与知识库概念混淆。

### 面试表达

“Memory 的关键不是存，而是选择、隔离和纠错。我会把事实、来源、作用域和置信度一起保存，按任务检索；长期记忆进入 Prompt 时仍作为可能过期的外部事实，并提供用户删除与更正能力。”

---

## 12. RAG：岗位需要补，但不要冒充本项目能力

Scout 不是一个典型的向量数据库 RAG 教学项目。你可以从它学习工具、上下文和安全，但简历上的 RAG 最好在自己的 Workbench 中独立实现。

### 标准链路

    文档采集
      → 解析与清洗
      → 按语义和结构切分
      → Embedding + 元数据
      → 向量 / 关键词混合召回
      → 权限过滤
      → Rerank
      → 上下文组装
      → 带引用生成
      → 评测

### 关键工程点

- Chunk 不是越小越好：小块提高定位，大块保留语义；
- 文档标题、章节、时间、租户、ACL 都应成为元数据；
- Hybrid search 常比只用向量更稳；
- Top-k 不是越大越好，过多噪声会降低答案；
- Rerank 可提升相关性，但增加延迟和成本；
- 引用必须对应真实片段，不能让模型自己编出处；
- 先按用户权限过滤，再让内容进入模型；
- 文档更新需要增量索引、版本和删除传播；
- Prompt Injection 文档也可能被召回，因此仍需隔离。

### 评测指标

- Retrieval：Recall@k、MRR、nDCG；
- Generation：faithfulness、answer relevance、citation correctness；
- Product：任务成功率、无答案时拒答率、延迟和成本；
- 数据集：真实问题、困难负例、权限边界和时间敏感问题。

#### TypeScript 示例：权限过滤后的混合召回

~~~ts
type SearchHit = {
  chunkId: string;
  documentId: string;
  text: string;
  allowedUserIds: readonly string[];
};

type RankedHit = SearchHit & {
  rank: number;
};

function reciprocalRankFusion(
  rankedLists: readonly RankedHit[][],
  k = 60,
): SearchHit[] {
  const scores = new Map<string, { hit: SearchHit; score: number }>();

  for (const list of rankedLists) {
    for (const hit of list) {
      const current = scores.get(hit.chunkId) ?? { hit, score: 0 };
      current.score += 1 / (k + hit.rank);
      scores.set(hit.chunkId, current);
    }
  }

  return [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .map((item) => item.hit);
}

async function retrieveForUser(
  query: string,
  userId: string,
): Promise<SearchHit[]> {
  const [keywordHits, vectorHits] = await Promise.all([
    keywordIndex.search(query),
    vectorIndex.search(query),
  ]);

  const visibleKeywordHits = keywordHits.filter((hit) =>
    hit.allowedUserIds.includes(userId),
  );
  const visibleVectorHits = vectorHits.filter((hit) =>
    hit.allowedUserIds.includes(userId),
  );

  return reciprocalRankFusion([
    addRanks(visibleKeywordHits),
    addRanks(visibleVectorHits),
  ]).slice(0, 8);
}
~~~

示例使用 Reciprocal Rank Fusion 合并关键词与向量排名。真实生产系统更推荐让存储层在查询阶段执行 ACL 过滤，避免无权内容先被取回应用内存。返回的片段还需 rerank、去重、控制 token，并生成可验证引用。

### 面试问题：Function Calling 和 RAG 如何选择？

结论：查知识优先 RAG，执行动作或查询实时结构化系统优先工具调用。比如“公司的报销规则”适合 RAG；“查询我的报销单状态”适合调用业务 API。复杂 Agent 往往先用工具取实时数据，再检索解释性文档。

---

## 13. 自动化与无人值守 Agent

### 一句话理解

无人值守任务不是“定时调用一次聊天接口”，而是身份、权限、租约、重试和通知的完整运行系统。

项目在 [automations/manager.ts](electron/automations/manager.ts) 管理自动化，[32-unattended-sessions.md](docs/architecture/32-unattended-sessions.md) 说明无人值守会话。

需要设计：

- Schedule：cron、时区、错过的任务是否补跑；
- Lease / lock：多实例不能重复执行；
- Identity：任务以谁的权限运行；
- Secret：凭据怎样读取、轮换和过期；
- Approval：没有人在场时，高风险工具如何处理；
- Retry：指数退避、最大次数、死信；
- Idempotency：重复触发不会重复发邮件或改数据；
- Checkpoint：长任务从哪一步恢复；
- Budget：步数、token、时间和费用上限；
- Notification：成功、失败、需要人工介入；
- Audit：谁创建、何时运行、调用过什么。

### 面试表达

“无人值守模式会改变威胁模型。我不会复用交互会话的默认授权，而会使用更窄的工具白名单和资源作用域；写操作要求预授权策略或转人工，任务由租约、幂等键和 checkpoint 保证重复调度安全。”

#### TypeScript 示例：租约、幂等键与 checkpoint

~~~ts
type AutomationExecution = {
  executionKey: string;
  automationId: string;
  checkpoint: number;
  status: "running" | "completed" | "failed" | "needs_attention";
};

interface AutomationStore {
  acquireLease(
    automationId: string,
    ownerId: string,
    leaseMs: number,
  ): Promise<boolean>;
  getOrCreateExecution(
    executionKey: string,
    automationId: string,
  ): Promise<AutomationExecution>;
  saveCheckpoint(executionKey: string, checkpoint: number): Promise<void>;
  complete(executionKey: string): Promise<void>;
  releaseLease(automationId: string, ownerId: string): Promise<void>;
}

async function runAutomation(
  automationId: string,
  scheduledAt: string,
  workerId: string,
  store: AutomationStore,
): Promise<void> {
  const hasLease = await store.acquireLease(
    automationId,
    workerId,
    30_000,
  );
  if (!hasLease) return;

  const executionKey = automationId + ":" + scheduledAt;

  try {
    const execution = await store.getOrCreateExecution(
      executionKey,
      automationId,
    );
    if (execution.status === "completed") return;

    for (
      let step = execution.checkpoint;
      step < automationSteps.length;
      step += 1
    ) {
      await automationSteps[step]({ executionKey });
      await store.saveCheckpoint(executionKey, step + 1);
    }

    await store.complete(executionKey);
  } finally {
    await store.releaseLease(automationId, workerId);
  }
}
~~~

这个例子仍有一个刻意留给你的思考题：如果某一步外部写入已经成功，但保存 checkpoint 前进程崩溃怎么办？答案是该写操作自身也必须接受 <code>executionKey + step</code> 作为幂等键，不能只依赖本地 checkpoint。

---

## 14. Multi-Agent：什么时候值得用

### 一句话理解

多 Agent 是职责与上下文隔离手段，不是“多个模型一定更聪明”。

项目的设计资料在 [30-squad-orchestration.md](docs/architecture/30-squad-orchestration.md)，后端契约也表达了 squad 能力。

### 常见模式

- Supervisor / workers：主管拆解、分配和汇总；
- Router / specialists：按领域转交专业 Agent；
- Planner / executor / reviewer：规划、执行、审查分离；
- Parallel fan-out：独立子任务并行，最后聚合。

### 通信内容

不要只传自然语言聊天。任务信封至少包含：

- taskId、parentTaskId；
- objective；
- input references；
- allowed tools / scope；
- expected output schema；
- deadline / budget；
- status / error；
- provenance。

### 何时不该用

- 一个 Agent 加两个确定性工具就能完成；
- 子任务强依赖共享的巨大上下文；
- 延迟和成本严格；
- 无法定义清晰的责任和输出合同；
- 只是为了简历显得复杂。

### 异常处理

- 子 Agent 超时：主管可重试、降级或返回部分结果；
- 部分失败：不要丢弃已完成结果，标注完整性；
- 循环委派：限制深度和总步骤；
- 输出冲突：基于证据和规则仲裁，不盲目多数投票；
- 工具越权：每个子 Agent 获得独立 capability token；
- 成本失控：每层继承并扣减总预算。

#### TypeScript 示例：结构化子任务信封

~~~ts
type TaskBudget = {
  remainingSteps: number;
  remainingTokens: number;
  deadline: number;
};

type AgentTask<TInput> = {
  taskId: string;
  parentTaskId?: string;
  objective: string;
  input: TInput;
  allowedTools: readonly string[];
  expectedOutputSchema: string;
  budget: TaskBudget;
};

type AgentTaskResult<TOutput> =
  | {
      status: "completed";
      taskId: string;
      output: TOutput;
      usedSteps: number;
      usedTokens: number;
      evidence: readonly string[];
    }
  | {
      status: "failed" | "partial";
      taskId: string;
      errorCode: string;
      partialOutput?: TOutput;
      usedSteps: number;
      usedTokens: number;
    };

function allocateChildBudget(
  parent: TaskBudget,
  requestedSteps: number,
  requestedTokens: number,
): TaskBudget {
  if (
    requestedSteps > parent.remainingSteps ||
    requestedTokens > parent.remainingTokens ||
    Date.now() >= parent.deadline
  ) {
    throw new Error("Child task exceeds the parent budget");
  }

  return {
    remainingSteps: requestedSteps,
    remainingTokens: requestedTokens,
    deadline: parent.deadline,
  };
}
~~~

不要只给子 Agent 一段自然语言和全部工具。结构化信封让目标、输出合同、权限与预算都可验证。主管还需要在分配时从父预算中预留或扣减，避免多个并行子任务各自认为可以花完整预算。

### 面试表达

“我只在任务可分解、上下文可隔离、并行收益大于通信成本时使用多 Agent。子任务通过结构化任务信封传递，主管控制预算、最大深度和失败策略；每个 Agent 的工具权限独立收窄。”

---

## 15. 可观测性、成本与 Eval

### 15.1 三类可观测性

- Logs：一次事件的结构化细节；
- Metrics：成功率、延迟、token、工具错误率等聚合数字；
- Traces：一次任务跨模型、工具、MCP、子 Agent 的调用链。

建议 trace 层级：

    session
      └─ logical turn
          ├─ model span
          ├─ tool span
          ├─ approval span
          └─ child-agent span

每个 span 至少记录：traceId、runId、模型、耗时、token、工具名、结果状态、错误码。不要记录邮件正文、用户问题全文、Token 或客户文件内容。

#### TypeScript 示例：只记录脱敏元数据

~~~ts
type RunTelemetry = {
  traceId: string;
  runId: string;
  operation: "model" | "tool" | "approval";
  name: string;
  durationMs: number;
  status: "ok" | "error" | "cancelled";
  inputBytes?: number;
  outputBytes?: number;
  tokenCount?: number;
  errorCode?: string;
};

function recordRunTelemetry(event: RunTelemetry): void {
  telemetry.emit("agent_operation", event);
}

async function traceToolCall(
  traceId: string,
  runId: string,
  call: ToolCall,
  execute: () => Promise<unknown>,
): Promise<unknown> {
  const startedAt = performance.now();

  try {
    const result = await execute();
    recordRunTelemetry({
      traceId,
      runId,
      operation: "tool",
      name: call.name,
      durationMs: performance.now() - startedAt,
      status: "ok",
      inputBytes: byteLengthOf(call.arguments),
      outputBytes: byteLengthOf(result),
    });
    return result;
  } catch (error) {
    recordRunTelemetry({
      traceId,
      runId,
      operation: "tool",
      name: call.name,
      durationMs: performance.now() - startedAt,
      status: "error",
      errorCode: classifyError(error),
    });
    throw error;
  }
}
~~~

代码刻意只记录工具名、大小、耗时和错误码，没有记录参数和值。生产中还应限制 <code>name</code> 和 <code>errorCode</code> 为已知枚举，避免异常消息或用户内容被误塞进低基数字段。

### 15.2 成本优化

- 小模型做分类、抽取和路由，大模型处理高难推理；
- 缓存稳定系统提示和可缓存结果；
- 对历史和工具结果压缩；
- 限制最大步骤、并行度和返回大小；
- RAG 先检索再注入，不塞整个知识库；
- 失败重试区分限流、网络和业务错误；
- 给用户展示长任务进度和取消能力。

模型路由不应只看价格，还要考虑能力、安全等级、上下文、延迟和失败降级。

### 15.3 Eval

不能只用“感觉回答不错”评估 Agent。

评测层次：

1. Unit：Schema、权限规则、事件 reducer；
2. Component：Prompt 或单工具在固定数据集上的表现；
3. Trajectory：工具选择、参数、顺序和步数；
4. End-to-end：任务最终是否完成；
5. Safety：提示注入、越权、敏感信息和危险命令；
6. Online：真实用户反馈、成功率、回退率、成本。

数据集应包含正常、边界、对抗和不可回答样本。LLM-as-judge 可以扩展评测，但要用人工标注样本校准，并防止 judge 偏差。

### 面试表达

“我会同时评最终结果和执行轨迹，因为答案碰巧正确不代表工具选择安全。离线数据集固定版本并进入 CI；线上只采集脱敏元数据和用户反馈。任何优化都同时看质量、P95 延迟和单任务成本。”

---

## 16. 测试策略：把不确定模型包在确定测试里

### 项目的测试层

- 普通 unit / node / browser；
- Storybook component；
- Playwright E2E；
- 实账号 CDP E2E；
- backend conformance；
- host conformance；
- M365 integration；
- mock scenario / E2E stub。

可参考：

- [conformance.test.ts](electron/backend/conformance.test.ts)：所有后端满足共同契约；
- [e2e-stubs.ts](electron/e2e-stubs.ts)：不依赖真实模型复现事件；
- [tests/host-conformance](tests/host-conformance/)：跨 Host 边界约束；
- [07-testing-and-debugging.md](docs/architecture/07-testing-and-debugging.md)：测试分层。

### 应该怎样测 Agent

不要在普通 CI 中每次请求真实模型来断言整句文本。更稳的做法：

- 用 fake transport 回放确定事件；
- 断言工具名、参数 Schema 和权限决策；
- 用虚拟时钟测试超时和重试；
- 注入重复、乱序、丢失、迟到事件；
- 对高风险 Prompt 使用版本化 eval 数据集；
- 少量真实模型 smoke / nightly test 观察漂移；
- E2E 重点验证用户可见状态和恢复路径。

### 必测故障矩阵

| 故障 | 期望行为 |
| --- | --- |
| 模型 429 | 遵守 Retry-After，退避且可取消 |
| 流中断 | 显示重连或可重试，不伪装完成 |
| 工具超时 | 标记工具失败，模型可选择替代方案 |
| 审批拒绝 | 不执行工具，Agent 能解释或降级 |
| 重复事件 | UI 不重复消息或工具卡 |
| 取消后迟到事件 | 不重新激活已取消 run |
| MCP 崩溃 | 隔离该 Server，其他能力仍可用 |
| 恶意工具结果 | 不自动触发高风险动作 |
| 磁盘旧数据 | Schema 迁移或安全拒绝，不崩 Main |

#### TypeScript 示例：可编程 Fake Backend 回放故障

~~~ts
type ScriptedEvent = {
  delayMs: number;
  event: BackendEvent;
};

class ScriptedBackend implements SessionBackend {
  readonly capabilities: BackendCapabilities = {
    cancellation: true,
    reconnect: true,
    unattendedRuns: false,
  };

  constructor(private readonly script: readonly ScriptedEvent[]) {}

  async *send(input: {
    sessionId: string;
    text: string;
    signal: AbortSignal;
  }): AsyncIterable<BackendEvent> {
    for (const item of this.script) {
      await wait(item.delayMs, input.signal);
      yield item.event;
    }
  }

  async cancel(_runId: string): Promise<void> {}
}

it("ignores a late delta after cancellation", async () => {
  const initial: RunState = {
    runId: "run-1",
    status: "running",
    text: "",
    lastSequence: 0,
  };

  const events: RunEvent[] = [
    { type: "cancel_requested", runId: "run-1", sequence: 1 },
    { type: "cancelled", runId: "run-1", sequence: 2 },
    { type: "delta", runId: "run-1", sequence: 3, text: "late" },
  ];

  const finalState = events.reduce(reduceRun, initial);

  expect(finalState.status).toBe("cancelled");
  expect(finalState.text).toBe("");
});
~~~

Fake 的价值是让你精确制造真实网络难以稳定复现的时序。下一步练习可以把 sequence 2 重复发送，或让 sequence 3 先于 sequence 2 到达，观察当前 reducer 是否满足你的协议定义。

---

## 17. 开发时最容易踩的坑

### 架构

- UI 直接依赖模型 SDK，后续无法换后端；
- 领域模型被供应商类型污染；
- 到处按 provider 名称分支，而不是 capability；
- 新功能把 Prompt、工具和 IPC 成本无条件加给所有用户；
- 类型定义分散，Renderer 与 Main 靠人工同步；
- 先写实现后补合同，导致边界含糊。

### 流式与并发

- 把物理流关闭当逻辑任务结束；
- 没有 runId，旧任务事件污染新任务；
- retry 所有错误，包括权限拒绝和参数错误；
- 写操作重试无幂等；
- AbortController 只取消前端，后端仍执行；
- 高频 token 造成 React 重渲染风暴。

### 工具与 MCP

- 工具描述太长或功能重叠；
- Schema 只验证类型，不验证路径、域名和资源权限；
- stdio stdout 混入日志；
- 远程 URL 允许内网探测；
- 工具结果无大小限制；
- MCP 连接断开后没有能力降级。

### 安全

- 认为系统 Prompt 是安全边界；
- 把 RAG 内容当可信指令；
- 日志记录原始 Prompt、邮件或 Token；
- 模型生成 Shell 后直接执行；
- 对所有工具一次授权永久有效；
- 只做输入过滤，没有执行前授权。

### Electron

- preload 暴露万能 API；
- Main 和 Renderer 互相 import；
- 开发环境能跑，打包后资源路径失效；
- 依赖系统 Node；
- safeStorage 初始化过早；
- Windows child process 弹黑窗；
- URL 和本地文件打开没有安全封装。

### 求职表达

- 把阅读的企业项目写成自己开发；
- 写“提升 50%”却没有基线和测量；
- 堆 LangChain、MCP、RAG 名词，无法画请求链路；
- 只讲 Happy Path；
- 说“解决幻觉”或“完全防止注入”；
- 多 Agent 只是多个 Prompt 串联，没有协议和异常处理。

---

## 18. 你的独立作品：Electron Agent Workbench

这是建议你真正实现并写入简历的项目。可以参考 Scout 的工程思想，但代码、命名、界面和实现都应由你独立完成。

### 18.1 最小可投递版本

技术栈建议：

- Electron + React + TypeScript；
- Python FastAPI 作为可选业务服务；
- OpenAI-compatible SDK 或其他公开模型 SDK；
- Zod（TS）/ Pydantic（Python）；
- SQLite；
- MCP SDK；
- Vitest + Playwright；
- OpenTelemetry 或轻量自建 trace。

功能：

1. 多会话聊天和流式输出；
2. 文件读取、工作区搜索、计算器三个工具；
3. 一个 stdio MCP Server；
4. 工具参数校验和审批卡；
5. 取消、超时、重试和断线恢复；
6. 结构化运行轨迹；
7. Fake backend 回放测试；
8. Prompt Injection 演示与防御。

#### TypeScript 示例：把模型、工具、预算和事件串成主循环

~~~ts
type ModelMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string }
  | { role: "tool"; callId: string; content: string };

type ModelDecision =
  | { kind: "final"; text: string }
  | { kind: "tool_call"; call: ToolCall };

interface ModelClient {
  decide(input: {
    messages: readonly ModelMessage[];
    signal: AbortSignal;
  }): Promise<ModelDecision>;
}

type AgentRuntimeOptions = {
  runId: string;
  userText: string;
  maxSteps: number;
  deadline: number;
  signal: AbortSignal;
};

async function* runAgent(
  options: AgentRuntimeOptions,
  model: ModelClient,
  handlers: ReadonlyMap<string, ToolHandler>,
  toolContext: ToolContext,
): AsyncIterable<BackendEvent> {
  const messages: ModelMessage[] = [
    { role: "user", content: options.userText },
  ];

  yield { type: "run_started", runId: options.runId };

  for (let step = 0; step < options.maxSteps; step += 1) {
    options.signal.throwIfAborted();
    if (Date.now() >= options.deadline) {
      yield {
        type: "run_failed",
        runId: options.runId,
        code: "DEADLINE_EXCEEDED",
      };
      return;
    }

    const decision = await model.decide({
      messages,
      signal: options.signal,
    });

    if (decision.kind === "final") {
      yield {
        type: "text_delta",
        runId: options.runId,
        text: decision.text,
        sequence: step + 1,
      };
      yield { type: "run_completed", runId: options.runId };
      return;
    }

    yield {
      type: "tool_requested",
      runId: options.runId,
      call: decision.call,
    };

    const result = await dispatchToolCall(
      decision.call,
      handlers,
      toolContext,
    );
    messages.push({
      role: "tool",
      callId: decision.call.id,
      content: serializeToolResultForModel(result),
    });
  }

  yield {
    type: "run_failed",
    runId: options.runId,
    code: "MAX_STEPS_EXCEEDED",
  };
}
~~~

这段主循环的工程含义比代码量更重要：

- 模型只能返回 final 或 tool_call，不能直接执行副作用；
- 工具统一经过 <code>dispatchToolCall</code>，因此 Schema、权限和错误模型只有一套；
- 最大步骤、deadline 和 AbortSignal 由宿主控制；
- 每个阶段都产生领域事件，UI、持久化与 Trace 不必依赖模型 SDK；
- <code>serializeToolResultForModel</code> 应限制大小、隐藏机密并包装外部不可信内容；
- 达到预算时明确失败，不能让模型无限循环。

为了保持示例简洁，final 文本被一次性作为 delta 发出。你的项目中可让 <code>ModelClient</code> 返回异步事件流，但仍应在 adapter 内将供应商事件归一化。

### 18.2 进阶版本

- 两个模型后端，实现同一接口和 conformance test；
- 本地知识库：hybrid retrieval + rerank + 引用；
- 记忆管理页：查看、更正、删除；
- 定时任务：租约、幂等和失败通知；
- Planner + Worker 双 Agent，只处理明确可分解任务；
- Eval 面板：任务成功、轨迹、安全、成本、延迟。

### 18.3 推荐目录

    common/
      agent-contract.ts
      events.ts
      schemas.ts
    electron/
      ipc/
      agent/
        runtime.ts
        state-machine.ts
        permissions.ts
      backends/
        types.ts
        provider-a/
        mock/
      mcp/
    src/
      features/chat/
      features/approvals/
      features/traces/
      platform/
    python-service/
      app/
      tests/
    e2e/

### 18.4 演示脚本

面试时用 5 分钟完成：

1. 让 Agent 阅读工作区并总结文件；
2. Agent 请求执行一个有写入风险的工具；
3. 展示审批卡，拒绝后 Agent 采用只读替代方案；
4. 模拟模型流中断并恢复；
5. 打开 trace 展示模型、工具、耗时和 token；
6. 运行一条 E2E 或故障注入测试；
7. 展示一份带恶意指令的文档，证明高风险动作仍被宿主拦截。

能现场演示这些，比简历写十个框架名更有说服力。

---

## 19. 十二周学习路线

每周建议 15–20 小时。如果时间更少，保持顺序并延长周期。

### 第 1–2 周：LLM 与 Python 基础

学习：

- Token、上下文、消息角色、采样、Structured Output；
- Function Calling 和流式响应；
- Python 类型、asyncio、FastAPI、Pydantic、pytest；
- HTTP、SSE、WebSocket、超时和重试。

产出：

- Python 流式聊天 API；
- 两个结构化工具；
- 10 个 Schema 错误测试。

验收：能解释为什么 async 不等于并行，SSE 断开怎样处理。

### 第 3–4 周：Agent Loop 与 Electron 边界

学习：

- ReAct、Plan-and-Execute、状态机；
- Electron Main / Preload / Renderer；
- typed IPC 和 AbortSignal。

产出：

- Workbench 主链路；
- runId + 显式状态机；
- cancel / timeout / retry；
- fake event transport。

验收：画出完整调用链，演示取消后迟到事件不会恢复任务。

### 第 5 周：Tools、MCP 与 Skill

学习：

- 工具设计、JSON Schema；
- MCP Host / Client / Server 和 stdio；
- Tool、Resource、Prompt、Elicitation；
- Skill 的可复用任务知识。

产出：

- 一个 MCP Server；
- 进程崩溃和超时处理；
- 一个可复用代码审查 Skill。

验收：能准确区分 MCP、Function Calling、Skill、RAG。

### 第 6 周：权限与安全

学习：

- Prompt Injection / XPIA；
- 最小权限、审批、审计；
- 路径、URL、命令安全；
- Secret 管理。

产出：

- 三档权限策略；
- 审批卡；
- 20 条攻击测试；
- 安全设计文档。

验收：恶意网页无法直接触发写文件或外发数据。

### 第 7–8 周：RAG 与 Memory

学习：

- 文档解析、chunk、embedding、hybrid retrieval、rerank；
- Recall@k、faithfulness、引用；
- Memory 类型、摘要和隔离。

产出：

- 50–100 个文档的小知识库；
- 30 条离线评测问题；
- 引用与无答案拒答；
- Memory 查看和删除页。

验收：能展示一个“检索到但生成错误”和一个“根本没召回”的失败案例，并分别修复。

### 第 9 周：AI 原生前端

学习：

- 事件 reducer、批处理、虚拟化；
- optimistic update；
- 工具过程、审批、引用和错误 UX；
- 可访问性。

产出：

- 长会话流畅渲染；
- 工具卡片和重连状态；
- Storybook / component tests。

验收：网络慢、失败、取消时 UI 都给出真实反馈。

### 第 10 周：Eval、Trace 与成本

学习：

- 离线数据集、trajectory eval、LLM-as-judge；
- trace / metrics / logs；
- 模型路由和预算。

产出：

- Eval 脚本与报告；
- trace 页面；
- 每任务 token、延迟和成本统计。

验收：能用数据说明一次优化的收益和副作用。

### 第 11 周：自动化或 Multi-Agent 二选一

优先做自动化，因为更贴近企业可靠性。如果做 Multi-Agent，必须有结构化任务合同、预算和失败处理。

### 第 12 周：求职包装

- 重构 README：问题、架构、演示、权衡、测试；
- 录制 3–5 分钟视频；
- 准备 30 道面试题；
- 简历只保留可现场证明的能力；
- 做两次模拟面试；
- 针对岗位补 Python / Java、数据库和算法基础。

---

## 20. 面试高频问题与参考答案

以下答案是表达骨架，不应逐字背。每个答案都尽量遵循“结论 → 原因 → 项目例子 → 权衡”。

### Q1：什么是 Agent？和 Chatbot 有什么区别？

Agent 是在目标驱动下，通过模型进行决策、调用工具、维护状态并迭代到终止条件的系统。Chatbot 可以只完成单轮文本生成。工程上 Agent 还必须有控制循环、权限、失败恢复和评测。例如桌面 Agent 读取文件后可能调用搜索、请求 Shell 审批再汇总结果。代价是延迟、成本和风险更高，所以简单问答不应强行 Agent 化。

### Q2：ReAct 的问题是什么？

ReAct 适合动态探索，但容易步骤膨胀、循环、受工具结果注入影响，而且中间推理难以稳定测试。我的做法是把最大步数、超时、权限和终止条件放在宿主状态机中；关键业务使用确定性工作流，只把模糊决策交给模型。

### Q3：如何设计 Agent Loop？

先定义状态和事件，再实现循环：构造上下文、调用模型、解析 action、校验、授权、执行工具、记录 observation、继续或终止。每个 run 有 ID、预算和 AbortSignal；写工具有幂等键；错误分 retryable 和 terminal。模型不能自行越过最大步数或权限。

### Q4：如何处理上下文过长和漂移？

我会采用最近消息原文、旧消息分层摘要、按需检索和工具结果结构化压缩。摘要保留目标、约束、关键事实、引用和未完成事项，并定期从原始记录重新生成，避免摘要反复压缩造成漂移。重要事实带来源和时间。

### Q5：Function Calling 如何保证可靠？

模型只生成调用意图。宿主依次做 Schema、业务语义、权限和风险校验，执行后返回结构化结果。参数错误可以让模型修正，权限拒绝不能自动重试；写操作必须幂等。工具描述保持单一职责，并用固定数据集评测工具选择与参数正确率。

### Q6：MCP 解决了什么？与插件系统有什么不同？

MCP 标准化 AI Host 与外部 Server 的能力发现、调用和传输，使用 JSON-RPC 2.0，可走 stdio 或 Streamable HTTP。插件是更宽泛的扩展机制，可能包含 UI、代码、安装生命周期等。MCP 不定义 Agent 怎样规划，也不自动解决权限，Host 仍要授权、隔离和审计。

### Q7：stdio MCP 最容易踩什么坑？

协议消息走 stdout，所以普通日志必须写 stderr；还要处理进程生命周期、初始化握手、请求 ID、超时、取消、返回大小和崩溃重启。Electron 打包时应使用可控的捆绑运行时，Windows 注意隐藏子进程窗口。

### Q8：如何防 Prompt Injection？

不存在单一 Prompt 能完全解决。我会把外部内容显式标为不可信，限制进入上下文的范围；工具执行前做程序级 Schema、资源、权限校验；高风险操作请求确认；Secret 不进入模型；执行环境做最小权限和网络限制；最后用对抗数据集和审计验证。包装标签是辅助，不是安全边界。

### Q9：如何设计 Shell 权限？

先解析而不是关键词匹配，按管道、重定向和子命令逐段判断。只读且作用域明确的操作可自动通过；写入、网络和安装需确认；危险删除、提权和越界直接拒绝。命令运行在限定工作区，设置超时、输出上限和取消，并记录脱敏审计。

### Q10：流式消息乱序或重复怎么办？

事件携带 sessionId、runId、实体 ID 和 sequence。Reducer 按事件 ID 去重，并只允许合法状态迁移；实体更新按 messageId/toolCallId 定位。重连从 checkpoint 或已知序号恢复，无法保证严格顺序时让事件设计成幂等。

### Q11：用户取消时怎么保证后端真的停止？

前端取消只是第一步。我会通过 IPC 将 AbortSignal 或 cancel(runId) 传播到模型客户端、MCP 请求和子进程。状态先进入 CANCELLING，收到确认后 CANCELLED；迟到事件依据 run 状态丢弃。对无法取消的外部写操作，要明确提示“停止等待不等于操作回滚”。

### Q12：如何切换多个模型后端？

定义后端中立的接口、领域事件和错误模型，在 composition root 注入具体 Provider。共享层按 capability 做决策，不按供应商名称分支；供应商 SDK 类型限制在适配器内。通过 conformance test 对所有实现运行相同契约用例。

### Q13：为什么不能让接口全是 optional？

Optional 会把差异传播给所有调用方，形成大量判空和身份分支。共同能力应是所有实现真正能满足的最小集合；非共同能力用独立 capability interface 或显式能力描述。这样编译器能帮助维护契约。

### Q14：如何做 RAG？

从权限感知的数据采集开始，按文档结构切分并保存元数据，使用向量加关键词混合召回，必要时 rerank，再把有限片段和稳定引用注入上下文。用 Recall@k 判断检索，用 faithfulness 和 citation correctness 判断生成。无证据时应拒答，不让模型补全。

### Q15：RAG 与 Fine-tuning 怎么选？

需要新鲜或私域事实、引用和可删除知识时选 RAG；需要改变稳定行为、格式或领域模式且有高质量数据时考虑微调。微调不适合频繁更新事实，也不能天然解决提示注入。实际常用基础模型 + RAG，再对稳定行为做微调。

### Q16：Memory 和 RAG 有什么区别？

RAG 通常从外部知识库检索事实；Memory 保存与用户、会话或过去任务相关的信息。两者技术上都可能使用向量检索，但数据来源、生命周期、权限和纠错机制不同。Memory 更强调用户可控、作用域、过期和冲突。

### Q17：什么时候使用 Multi-Agent？

当任务能拆成相对独立的子问题、专业工具或上下文需要隔离，且并行收益超过通信成本时。否则单 Agent 加工作流更简单。我会用结构化任务信封、预算、最大深度和独立工具权限，明确处理部分失败。

### Q18：子 Agent 失败怎么办？

主管根据错误类型决定重试、换实现、降级或返回部分结果。所有子任务有 taskId、deadline 和幂等语义；已经完成的结果保留来源和完整性标记。不能无限递归委派，总预算由父任务分配。

### Q19：如何评测 Agent？

同时评最终任务和执行轨迹。Unit 测规则和 reducer，离线集测工具选择、参数、引用和安全，E2E 测完整任务，线上观察成功率、回退、延迟和成本。LLM judge 需要用人工样本校准，关键安全判断不能只靠另一个模型。

### Q20：模型幻觉怎么解决？

不能承诺消灭，只能降低和控制影响。事实问答用检索与引用，结构化结果用 Schema，关键操作以工具真实结果为准，不让模型自报成功；低证据时拒答；离线评测区分检索失败和生成不忠实。

### Q21：怎样优化成本？

先用 trace 找成本来源，再做模型路由、上下文压缩、缓存、限制工具返回、最大步数和并行度。分类抽取用小模型，高难推理用强模型。优化必须同时看质量和延迟，不能只追求 token 下降。

### Q22：429 和网络错误如何重试？

只重试可恢复错误，尊重 Retry-After，采用指数退避加 jitter，并设置总时限。写操作要求幂等键；权限、Schema 和业务拒绝不重试。重试过程可取消，并在 UI 中显示真实状态。

### Q23：Agent 应用和普通 Web 应用最主要的区别？

Agent 增加了概率决策、长运行任务、流式事件和外部副作用。普通 Web 的 API 成功通常意味着确定结果；Agent 的“完成”还要验证轨迹、工具结果和终止条件。因此需要更强的状态机、权限、可观测性和 Eval。

### Q24：Electron 中如何保护 API Key？

Renderer 永远不持有长期密钥。密钥放 Main 进程或后端服务，使用系统安全存储或服务端 Secret Manager；preload 只暴露业务动作，不暴露取密钥接口。日志和模型上下文都不包含 Key，并设计轮换与撤销。

### Q25：为什么使用 React Query，而不是 useEffect 拉数据？

会话和任务属于异步服务端状态，需要缓存、去重、失效、重试和 pending/error 语义。React Query 提供统一生命周期；写操作用 mutation，事件到来时更新或失效缓存。useEffect + useState 容易重复请求和产生竞态。

### Q26：长对话页面如何优化？

先减少更新范围：delta 只更新目标消息，批量刷新；然后 memo 化稳定组件；长列表虚拟化；代码高亮延迟或放 worker；避免每个 token 重新解析全部 Markdown。用 React Profiler 测量，不凭感觉优化。

### Q27：自动化任务如何避免重复执行？

调度器使用持久化 lease / distributed lock，并给每次计划运行生成唯一 execution key。工具写入携带幂等键，状态持久化 checkpoint。崩溃后新的 worker 接管过期 lease，从安全点恢复。

### Q28：如何设计日志又不泄漏隐私？

记录 ID、计数、长度、模型、工具名、耗时、token、错误码和策略结果，不记录 Prompt、正文、邮箱、文件内容和凭据。必要的调试内容必须显式用户同意、脱敏、限时保留并有访问控制。

### Q29：你会选择 LangChain 还是自己写循环？

先看复杂度。原型和常见集成可用框架加速；核心状态、权限、领域事件和可观测性不能完全交给黑盒。即便使用 LangChain / LangGraph，我也会在外层保持自有合同和测试，避免供应商与框架渗透。

### Q30：如果模型说任务完成，但工具实际失败了呢？

程序状态以工具结构化结果为准，不以模型文本为准。失败结果包含可恢复性和错误码，模型可以提出替代方案，但只有所有必需步骤成功且终止条件满足，宿主才把 run 标为 completed。

---

## 21. 简历写法：必须建立在你独立实现之后

### 21.1 项目名称与介绍

**Agent Workbench｜Electron 桌面 AI Agent 开发平台（个人项目）**

技术栈：Electron、React、TypeScript、Python FastAPI、MCP、SQLite、Vitest、Playwright

项目介绍：

“面向本地知识与工作区操作的桌面 AI Agent。支持流式会话、结构化工具调用、MCP 扩展、权限审批、任务取消恢复和运行轨迹评测；采用 Main / Preload / Renderer 隔离系统能力，并实现可替换模型后端。”

### 21.2 可用的简历描述

只选择你已经实现、测试并能演示的条目。

1. 设计 Electron Main / Preload / Renderer 分层与 TypeScript IPC 单一契约，将模型、文件和 MCP 等系统能力收敛到 Main 进程，结合运行时 Schema 校验和命名空间 API，降低跨进程接口漂移与 Renderer 越权风险。
2. 实现后端中立的 Agent Runtime，将会话能力、工具能力和标准流事件从具体模型 SDK 中解耦；通过 capability 驱动功能展示，并使用契约测试验证 Mock 与真实后端的一致行为。
3. 基于 runId 和显式状态机构建流式会话，覆盖工具调用、审批等待、取消、超时、重试、断线恢复和迟到事件去重；在 React 侧通过事件 reducer、批量更新和虚拟列表呈现长任务轨迹。
4. 接入 stdio MCP Server 与本地工具，设计工具 Schema、超时、取消和生命周期管理；实现只读自动允许、写操作确认、危险操作阻止的分级权限策略，并记录脱敏审计日志。
5. 针对间接 Prompt Injection 建立外部内容信任边界，结合路径 / URL / 命令校验、最小权限和 Human-in-the-loop 限制高风险副作用，并以对抗用例验证恶意文档无法绕过宿主授权。
6. 构建 Fake Event Transport 与端到端故障场景，覆盖重复 / 乱序事件、模型限流、MCP 崩溃和取消竞态；记录模型与工具 trace、token、延迟和错误码，为质量、成本和恢复策略提供依据。
7. （实现后再用）实现权限感知的本地 RAG，采用文档结构切分、关键词 + 向量混合召回、rerank 和引用校验，并通过版本化评测集区分检索失败与生成不忠实。
8. （实现后再用）实现无人值守任务调度，使用持久化租约、幂等键、checkpoint、预算和失败通知，限制后台任务的工具白名单与资源作用域。

### 21.3 不要这样写

- “参与 Microsoft Scout 核心开发”——除非你真的参与过并可证明；
- “完全解决 Prompt Injection”——不专业；
- “准确率提升 40%”——没有数据集、基线和测量就不要写；
- “精通 RAG / Multi-Agent”——只有教程 Demo 不算精通；
- “独立开发企业级系统”——项目规模和使用证据不足时会被追问击穿。

---

## 22. 简历逐条追问与回答

### 描述 1：Typed IPC 与进程隔离

**追问：为什么不能直接在 Renderer 调模型 SDK？**

回答：Renderer 是承载网页内容的高风险环境，直接拥有密钥、文件或 Shell 能力会扩大 XSS 影响。我把系统能力放 Main，preload 只暴露命名化业务接口；IPC 合同由共享类型推导，Main 再做运行时 Schema 和权限校验。代价是多一层样板代码，但获得安全边界、可测试性和平台替换能力。

**追问：TypeScript 已有类型，为什么还要运行时校验？**

回答：类型在编译后消失，IPC、磁盘旧数据和网络响应都可能与声明不一致。Zod/Pydantic 验证外部边界，TypeScript 约束内部调用，两者解决不同问题。

**追问：如何避免 IPC 新增一半？**

回答：把 channel、请求、响应和事件放在单一 contract，通过辅助类型推导 Renderer API；新增能力按 contract、handler、preload、stub、test 五层检查，并用边界测试防止 raw IPC 绕过统一包装。

### 描述 2：可插拔 Runtime

**追问：你的接口如何设计？**

回答：先从共享用例提炼最小能力，例如 createSession、send、cancel、events，不直接暴露供应商 SDK 类型。特殊能力用 capability 或独立窄接口；Provider 在 composition root 创建实现。统一错误和 BackendEvent 后，上层不感知供应商格式。

**追问：为什么要 conformance test？**

回答：TypeScript 只能证明方法签名，不能证明语义。例如 cancel 是否发终止事件、失败是否归一化，需要对所有实现运行同一组行为用例。每新增接口方法就补一条共同测试，避免只在主后端可用。

**追问：第三个后端加入要改哪里？**

回答：实现接口、事件映射和 Provider 注册；共享 Session 和 UI 不应按后端名称修改。如果新能力不是所有后端都有，则新增 capability 并提供降级体验。

### 描述 3：流式状态机

**追问：状态有哪些？**

回答：至少 idle、running、waiting_approval、waiting_tool、reconnecting、cancelling、completed、failed、cancelled。状态迁移由事件表约束，终态拒绝普通迟到事件。

**追问：审批之后为什么还是同一轮？**

回答：审批只是逻辑轮次中的暂停点，底层可能产生新的物理请求，但用户目标、runId 和预算没有变化。若把它算新轮，会破坏上下文、统计和取消语义。

**追问：重复事件怎么处理？**

回答：每个事件有 eventId 或 sequence，消费端保存已应用序号；实体按稳定 ID upsert。状态迁移本身幂等，例如 completed 再收到 completed 不追加第二条消息。

### 描述 4：MCP 与权限

**追问：关闭一个 MCP 工具时为什么不一定断开 Server？**

回答：一个 Server 可能同时提供多个工具、资源和通知。用户禁用某工具，应在 pre-execution policy 阻止它；直接断开会影响同 Server 的其他能力。只有禁用整个 Server 才考虑关闭连接。

**追问：如何判断 Shell 只读？**

回答：不能只看命令首词。我会解析管道、重定向、子命令和目标路径，每段按规则评估；出现写入、网络或未知结构就升级为审批，危险模式直接阻止。默认 fail closed。

**追问：MCP 本身提供权限吗？**

回答：协议提供能力交换，不替 Host 做最终授权。Host 知道用户、会话、工作区和审批状态，因此权限应由 Host 控制，Server 也应做自己的服务端鉴权，形成纵深防御。

### 描述 5：Prompt Injection 防御

**追问：外部内容包装是怎样做的？**

回答：内容放入明确的不可信边界，携带来源，转义可能闭合边界的字符，并在系统指令中说明只把它当数据。但我不会把包装视为安全保证；真正的防线是工具白名单、参数校验、最小权限和审批。

**追问：怎么验证有效？**

回答：构造包含“忽略指令、读取密钥、上传文件”等攻击文档，检查 Agent 可能仍会产生调用意图，但宿主必须拒绝越权工具；同时断言敏感内容不进入日志或外发参数。评测重点是影响面受控，而不是模型从不复述攻击文本。

### 描述 6：测试与可观测性

**追问：为什么用 Fake Transport？**

回答：真实模型输出会漂移、成本高且速度慢，不适合验证确定的状态机。Fake Transport 可精确回放 delta、工具、审批、断线和乱序；少量真实模型测试用于发现 SDK 或模型行为变化。

**追问：你记录哪些指标？**

回答：任务成功状态、首 token 和总延迟、模型与工具耗时、token、步骤数、重试次数、审批结果、错误码。通过 traceId / runId 串联，但不记录原始 Prompt、工具正文或凭据。

**追问：怎么证明优化有效？**

回答：先固定评测集和基线，同时比较任务成功率、P95 延迟和平均 token / 成本。比如压缩上下文降低成本后，如果引用正确率下降，就不能只宣称优化成功。

### 描述 7：RAG

**追问：为什么混合检索？**

回答：向量适合语义近似，关键词对型号、错误码和专有名词更稳定。两路召回合并后 rerank，通常比单一方式更鲁棒。最终收益要用 Recall@k 和端到端答案评测验证。

**追问：如何做权限过滤？**

回答：文档块带 tenant、owner、ACL 等元数据，检索阶段就按当前身份过滤；不能先把无权内容召回再只靠 Prompt 要求模型忽略。索引更新和删除也要传播权限变化。

### 描述 8：无人值守任务

**追问：应用崩溃后如何恢复？**

回答：调度和运行状态持久化，每一步成功后写 checkpoint；worker 使用有过期时间的 lease。新实例接管后检查幂等键和已完成步骤，从安全点继续，而不是重新执行所有写操作。

**追问：没有用户在场怎么审批？**

回答：后台任务只使用创建时明确预授权的窄能力和资源范围；超出范围的操作转为 needs_attention 并通知用户，而不是自动批准。高风险能力可以在无人值守模式完全禁用。

---

## 23. 项目讲述模板

### 30 秒版本

“我基于 Electron、React 和 TypeScript 独立实现了一个桌面 Agent Workbench。它不只是聊天 UI，还包括可替换模型 Runtime、结构化工具与 MCP、分级审批、流式状态机和故障回放测试。项目重点解决模型输出不确定、工具有副作用以及 Electron 跨进程安全问题。”

### 2 分钟版本

“这个项目要解决本地工作区任务，例如读取代码、检索资料并生成修改建议。架构上 Renderer 只负责 UI，Main 管模型、工具、权限和密钥，preload 暴露 typed IPC。Agent Runtime 用标准事件隔离具体 SDK，每次任务有 runId 和状态机，覆盖审批、取消、重连和终止。工具调用先经过 Schema、资源和权限校验，写操作请求用户确认；外部文档按不可信数据进入上下文，宿主权限是最终边界。测试上我用 Fake Transport 回放重复、乱序、429 和 MCP 崩溃，再用少量真实模型做 smoke test。最大的权衡是抽象和测试增加了初期代码量，但后端替换、安全性和调试效率明显更可控。”

### STAR 深挖模板

- Situation：需要让模型安全地操作本地工作区；
- Task：实现可扩展、可取消、可审计的桌面 Agent；
- Action：typed IPC、Runtime 契约、状态机、MCP、权限、故障测试；
- Result：只陈述真实可测结果，例如“通过 25 条故障用例”“两个后端通过同一契约测试”，不要编百分比；
- Reflection：如果重做，会怎样简化接口、改进 Eval 或安全隔离。

---

## 24. 面试前自检清单

### 代码与演示

- [ ] 项目可以从 README 在新环境启动；
- [ ] 没有提交 Key、Token、客户数据；
- [ ] 有架构图和完整请求链路；
- [ ] 可以演示成功、拒绝、失败、取消和恢复；
- [ ] 至少一个 MCP Server；
- [ ] 至少一个 Prompt Injection 对抗用例；
- [ ] Fake backend 测试可运行；
- [ ] 有明确的已知限制。

### 知识

- [ ] 能区分 Agent、Workflow、Chatbot；
- [ ] 能区分 Function Calling、MCP、Skill、RAG；
- [ ] 能解释 logical turn 和 physical request；
- [ ] 能解释为什么 Prompt 不是安全边界；
- [ ] 能解释 RAG 召回和生成的不同失败；
- [ ] 能设计 retry、idempotency、cancel；
- [ ] 能解释 capability 而不是 provider identity；
- [ ] 能给出 Eval 数据集和指标。

### 基础面试

AI 应用岗仍会考基础，不要只准备 Agent：

- JavaScript event loop、Promise、closure、React 渲染；
- Electron 进程模型和安全；
- HTTP、SSE、WebSocket、TCP 基础；
- 数据库索引、事务和并发；
- Python async、类型、异常、pytest；
- 操作系统进程、线程、锁；
- 常见算法和数据结构；
- 项目中的一个最难 bug。

---

## 25. 资料来源与使用边界

### 当前项目

- [仓库入口说明](AGENTS.md)
- [架构快速索引](docs/architecture/00-quick-reference.md)
- [IPC Bridge](docs/architecture/03-ipc-bridge.md)
- [Session Lifecycle](docs/architecture/04-session-lifecycle.md)
- [MCP Servers](docs/architecture/05-mcp-servers.md)
- [Permissions](docs/architecture/06-permissions.md)
- [Testing](docs/architecture/07-testing-and-debugging.md)
- [Skills](docs/architecture/09-skills-and-marketplace.md)
- [XPIA Defense](docs/architecture/25-xpia-defense.md)
- [Squad Orchestration](docs/architecture/30-squad-orchestration.md)
- [Unattended Sessions](docs/architecture/32-unattended-sessions.md)

### 联网资料

- [阿里巴巴校园招聘：AI Agent 研发工程师](https://campus-talent.alibaba.com/campus/position/199903280015)：用于核对岗位对 Agent 全生命周期、Prompt、RAG、Multi-Agent、Memory、Function Calling、上下文工程与 Python/Java 的要求。
- [字节 Agent 开发四面面经整理](https://notes.kamacoder.com/interview/llm/20260506bytedance.html)：非企业官方资料，用于观察项目深挖、MCP、Memory、RAG、上下文、成本和安全等提问方向，不能视为题库保证。
- [MCP 官方 Architecture](https://modelcontextprotocol.io/docs/learn/architecture)：用于核对 Host / Client / Server、JSON-RPC、Transport 和 primitives。
- [OWASP LLM01 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)：用于核对直接 / 间接注入和分层防御建议。

### 重要边界

- 招聘信息和面经只反映特定时间与岗位，不代表所有公司；
- 本手册对 Scout 的描述来自当前工作区源码，不代表你拥有其项目经历；
- 测试命令曾因内部 Azure npm feed 返回 401、依赖未完整安装而无法完成，因此本文不声称当前仓库测试已通过；
- 你应把架构思想独立复现为个人作品，再使用简历描述；
- 不要背诵无法在代码、测试或演示中证明的数字和结论。

---

## 结语

从前端转向 AI Agent 应用并不是推倒重来。React 让你理解交互状态，Electron 让你理解本地能力和进程边界，TypeScript 让你重视合同；现在需要补上的，是概率系统思维、后端基础、工具安全、状态机、RAG 和 Eval。

真正有竞争力的候选人不是“会调用一个大模型 API”，而是能够回答：

- 模型不稳定时，系统怎样仍然可靠？
- 工具有副作用时，用户怎样仍然掌控？
- 后端、协议和模型变化时，架构怎样仍然可维护？
- 任务失败时，怎样观察、恢复并证明修复有效？

当你能用自己的项目和测试回答这四个问题时，就具备了 AI Agent / AI 应用开发应届岗位所需要的核心工程叙事。
