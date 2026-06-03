# 全栈相关

## 1. Node.js

### 1.1 Node中的事件循环机制

Node.js中的事件循环基于**libuv库**实现，让Node在单线程下也能执行非阻塞的I/O操作。【如果Nodejs亲自执行I/O操作，那么由于js的单线程特性，会导致代码执行的阻塞，因此node可以把此类阻塞操作，委派给libuv库，从而实现了非阻塞的I/O操作】

#### 事件循环的6个阶段

1. **Timers（定时器阶段）** ：执行 `setTimeout`、`setInterval` 的回调。
2. **Pending callbacks（挂起回调阶段）** ：执行延迟到下一轮迭代的 I/O 回调（比如某些系统操作错误）。
3. **Idle / Prepare（空闲/准备阶段）** ：仅内部使用，开发者不感知。
4. **Poll（轮询阶段）** ：**核心阶段**，获取新的 I/O 事件，执行 I/O 相关回调。
    - 如果 poll 阶段队列为空且有 `setImmediate` 回调，会跳转到 check 阶段，如果没有`setImmediate` 回调，则会在此等待新的回调加入队列，直到超时。
    - 如果poll 队列不为空，会同步执行队列中的回调，直到队列为空或达到系统限制。
5. **Check（检查阶段）** ：执行 `setImmediate()` 的回调。
6. **Close callbacks（关闭回调阶段）** ：执行 `socket.on('close')` 等清理操作。

`process.nextTick` 和 `Promise.then` 属于**微任务**，不在事件循环的任何阶段中——它们在**每个阶段切换之间**立即清空。

**setTimeout** 最快也要 1ms 后才进入 timers 队列，而 **setImmediate** 在本次事件循环的 check 阶段就会执行。

#### 浏览器的事件循环和Node.js的事件循环的区别

1. 架构层面不同：
    浏览器事件循环由 **HTML5 标准** 定义，包含渲染管线；Node.js 事件循环由 **libuv** 实现，不涉及 UI 渲染。

2. 宏任务来源不同：
    - **浏览器宏任务**：`setTimeout`、`setInterval`、`MessageChannel`、`I/O`、UI 渲染。
    - **Node.js 宏任务**：`setTimeout`、`setInterval`、`setImmediate`（Node 专有）、`I/O` 操作。

3. 微任务执行时机不同
    - **浏览器**：**一个宏任务执行完后，立刻清空整个微任务队列**，然后进行 UI 渲染。
    - **Node.js**：微任务在**每个阶段切换之间执行**，而不是等整个事件循环完成一轮。

4. process.nextTick 是 Node 独有的
    它在微任务队列中优先级最高，**比 Promise.then 还先执行**。

**一句话总结**：浏览器的事件循环服务于“渲染页面”，Node.js 的事件循环服务于“处理 I/O”。

在浏览器里，`requestAnimationFrame` 是在渲染前执行的，Node 里没这个概念。反过来 Node 里的 `setImmediate`，浏览器也没有。

##### `setTimeout(fn, 0)`、`setImmediate(fn)` 和 `process.nextTick(fn)` 的执行顺序？

`process.nextTick` > `Promise.then` > `setTimeout` ≈ `setImmediate`（谁先谁后取决于调用环境）。

**关于 setTimeout(fn, 0) vs setImmediate：**
    - 如果两者都在**主模块**中调用，执行顺序**不确定**，取决于 Node 的启动时间和系统性能。
    - 如果两者都在**同一个 I/O 回调**中调用，`setImmediate` **总是先执行**，因为 I/O 回调完成后事件循环进入 poll 阶段，紧接着就是 check 阶段。

##### 执行顺序解析

1. 同步代码全部执行完毕。
2. 进入微任务阶段：`process.nextTick` 最先执行，然后是 `Promise.then`。
3. 进入宏任务阶段：按事件循环的六个阶段顺序执行。

process.nextTick 的递归调用会**饿死事件循环**”——因为这会让 nextTick 队列永远清不完，timers 和 I/O 阶段永远得不到执行

## 2.Next.js

React 量身打造的“全栈框架”。如果说 React 负责构建用户界面，那 Next.js 就是给这个界面加上了服务端能力（如 SSR）、文件路由和众多开箱即用的性能优化

### 2.1 SSR、SSG、ISR、CSR的区别、使用场景

- CSR: 客户端渲染 HTML生成是在浏览器运行[浏览器下载空的HTML和JS，JS解析出来页面内容渲染到HTML中]时，SEO差，因为爬虫获取到的数据由于HTML未完整生产所以SEO不准确，首屏加载速度慢，因为需要在浏览器构建HTML，数据实时性高，因为每次数据更新会重新构建HTML。对服务器无格外压力。 这些特点决定了CSR适用于： 后台管理系统、内部工具——不需要 SEO，纯交互应用
- SSR：服务端渲染 HTML生成是在服务端渲染，每次请求时会构建好新的HTML，因此SEO比较好，首屏加载速度也快，数据实时性高，但对服务器压力较大。
- SSG（Static Site Generation）： 静态生成，在项目构建时就一次性生成好所有静态 HTML 页面。所有用户请求直接返回这份静态文件，速度极快。适合内容固定不变的页面。
- ISR（Incremental Static Regeneration）：增量静态再生，既有 SSG 的静态文件速度，又能设置一个更新间隔时间（如60秒），到期后后台会自动生成新页面替换旧缓存，实现内容更新。适合大部分内容展示类页面（如电商商品详情页）。对服务器的压力比较小。

实战中的使用攻略：在 App Router 里，你可以利用 Server Component 和 Client Component 的组合来实现混用
Server Component：代码运行在服务端的组件，
渲染策略 (何时生成 HTML)
├── SSG (构建时)        ——→ 由 Server Component 在构建时执行
├── ISR (构建时 + 定时)  ——→ 由 Server Component 在构建时及后台执行
└── SSR (每次请求)       ——→ 由 Server Component 在每次请求时执行

组件模型 (在哪里运行)
├── Server Component     → 只在服务器运行，是上面三种策略的执行者
└── Client Component     → 在浏览器运行，独立于上面三种策略
                          （但可被嵌入任何一种策略生成的页面中）

#### 2.2 水合指的是什么Hydration

Hydration 是**客户端将服务端渲染出的静态 HTML 与 React 组件的事件处理程序绑定的过程**。

**工作流程**：

1. 服务端生成完整 HTML 返回浏览器。
2. 用户立刻看到页面内容（但此时按钮点击不了）。
3. 浏览器下载并执行 JS 文件。
4. React 遍历已有的 DOM 树，将事件监听器“附加”上去，让页面变成可交互的。
5. 这个过程完成后，页面就“活”了。

**一句话理解**：“Hydration 就是把服务端渲染的‘静态骨架’变成‘可交互的活页面’。”

**加分回答点**：“面试官可能会追问水合不匹配（Hydration Mismatch）——当服务端生成的 HTML 和客户端渲染的结果不一致时，React 会报错。常见原因：用了 `typeof window` 做条件判断、渲染了 `Date.now()`、或者用了浏览器专有 API。”

### 3.BFF（Backend For FrontEnd）

为每种客户端（Web、iOS、Android 等）专门构建一个中间服务层，而不是让前端直接调用通用的微服务 API。
API Routes 和 Server Components 天然都是 BFF 层。
为什么需要 BFF？先看没有 BFF 的痛点
假设你有三个客户端：网页、iOS App、Android App，以及一堆微服务：用户服务、订单服务、商品服务。

没有 BFF 时：

网页首页需要调用 5 个 API，拼出页面数据。

iOS App 首页只需要 3 个 API，但字段不同。

后端的通用 API 为了兼容所有端，设计得臃肿，字段冗余。

客户端需要做大量数据聚合、格式转换工作。

每个端的网络环境不同，移动端需要更激进的数据压缩。

有 BFF 之后：

为每个客户端各建一个 BFF。

Web BFF 直接返回 HTML 所需的完整数据，一次请求搞定。

iOS BFF 返回精简后的 JSON，节省流量。

BFF 负责调用底层微服务、聚合数据、格式化、甚至裁剪字段。

***前端团队的服务器端***

### 4. Agent相关的后端知识SSE
SSE 一般指Server-Sent Events 服务器推送事件，是基于HTTP连接的服务器推送技术。允许服务器向客户端单向流式发送数据。AI对话流输出、实时日志、通知推送【增量输出的场景】非常适用。

#### 4.1 特点
- 基于http1.1 / http2，轻量且不需要ws那样复杂的协议升级
- 只能由服务器向客户端单向发送数据，可以满足文本流场景
- 自动重连，支持自定义事件类型

#### 4.2 使用
##### 前端问题
前端使用的时候，使用eventSource获取对象，使用onmessage监听接收到的数据 onerror可以加埋点报错数据等，监听progress也可以获取数据。{{ 心跳是什么？ 意义在哪里 }}
- 把 EventSource 创建放到一个可复用的 hook/composable： useSSE(url, { onMessage, onEventMap, onError })
- 页面卸载时 close() ，避免后台页面占连接
- 收到 progress / done / error 事件驱动 UI 状态机（loading → streaming → done/failed）
典型追问：为什么不用 axios？

- 因为 SSE 是持续的 event stream，不是一次性响应；axios 主要是 request/response 模型，不适合事件流分发。

##### 后端问题
后端：发送数据时应该定义 Content-Type为 text/event-stream且设置cache-control为no-cache，Connection为keep-alive定义长连接。

##### 可靠性：断线重连、去重、不丢消息怎么保证

要先区分这个流是否具备可恢复语义，再决定重连策略：如果是通知流可以直接重连
- 浏览器会自动重连，这是eventSource自带的特性
- 在设计数据结构时，应该给服务端每条消息携带id，
- 断线后，客户端发送最后一次接受的id，服务端据此补发。同时 客户端也可以根据id去重。

但如果是AI对话流，那要结合会话ID等信息决定要重试整次请求还是恢复已生成内容。

#### 4.3 与ws做对比
- sse单向，ws是双向的
- sse更轻量，ws的协议会更复杂一些
- sse更适合AI输出流，ws由于是全双工通信，更适合协同编辑那种多人实时互动的场景。

#### 4.4 流式输出的实现

后端： 调用模型的流式接口，按chunk读取增量内容，最后把内容包装成SSE消息返回给前端，最后发送done/error事件

前端： fetch+ReadableStream 或 EventSource读取响应，TextDecoder解码字节流再按SSE协议边界解析事件，最后根据不同类型的消息进行渲染 更新UI。

##### 常见问题
1. 每个chunk都是完整的JSON吗：
不一定。底层网络传输时是按字节流切分，一个chunk可能是一条消息的一部分，所以不能把底层chunk直接当成完整JSON解析。
所以应该先做流式解码，再按SSE消息边界拆分，对完整的data做JSON parse

2. 中断SSE
如果是fetch + ReadableStream，一般配合AbortController，如果是EventSource，可以调用Close（）。

3. 如何实现打字机效果：
如果追求最低延迟，可以按 流 的到达速度直接渲染，如果有更平滑的打字机效果，可以加一层buffer，把内容先缓存，在用setInterval或者raf来渲染。把模型返回节奏和ui渲染节奏解耦。

4. 心跳的意义：
心跳指的是 服务器定时向客户端发送消息，防止中间件超时断开空闲连接。
- 防止浏览器或网络中间件（代理、负载均衡、Nginx）断开空闲连接
    很多网络设备或服务器（如 Nginx、AWS ALB）对 HTTP 长连接有 空闲超时 设置（默认 60-120 秒）。
    如果 SSE 长时间不发送任何数据，中间件会认为连接已“死掉”，主动断开。
    心跳通过定期发送一条小数据（比如每隔 30 秒），让连接始终有流量，从而保持长连接。

- 检测客户端是否意外断开（客户端重连机制）
    浏览器原生 EventSource 会在连接异常断开后自动尝试重连。
    但如果服务端不知道客户端已断开（比如客户端网络闪断），服务端可能还在持续往一个死连接上写数据，造成资源浪费。
    通过心跳，服务端可以定期检查写入是否失败（如 res.write 报错），一旦失败就停止发送数据并清理资源。

- 提供一种“连接存活”的证据，便于监控
    有些业务场景需要知道当前在线客户端数量。心跳消息可以用来统计活跃连接。
    如果服务端超过 N 个心跳周期没收到客户端任何反馈（SSE 是单向的，但可以通过另外的 HTTP 请求上报客户端时间戳），可以判定客户端已失联。

常见的设置30s，不能超过网关的超时时间。

### 5. 中间件机制

中间件的本质是 一组按顺序执行的函数，它可以在请求到达服务端前和客户端接收到最终响应前执行一些操作，使之可以进行一些通用的操作，比如说修改响应，修改请求，处理错误，日志记录等操作。每个中间件都有机会查看或修改传入的请求对象以及传出的响应对象。
中间件的创建方式主要有两种：

- 在 main.ts 中使用 app.use 创建一个函数中间件，作用全局，但不支持依赖注入；
- 使用命令创建中间件类，在模块中调用，可以设置应用范围，更灵活，且支持依赖注入。

在编写中间件时，运行到了next（）就会执行下一个中间件，这里的「下一个」指的是**按照注册顺序紧邻的下一个函数**

而且在使用时，我们可以配置路由/controller，特定路由/controller下的请求/响应走中间件 实现特定的中间件编写。
