# 全栈偏前端实习岗 · Node.js + Next.js 面试复习资料

> **适用岗位**：全栈偏前端开发实习生
> **面向时间**：2024–2026
> **资料定位**：可直接背诵、可模拟自测、重点覆盖高频提问
> **难度说明**：⭐ = 概念级，⭐⭐ = 理解级，⭐⭐⭐ = 追问级（实习岗相对少见）

---


## 一、Node.js 部分

### 1.1 基础概念

**Q1: 什么是 Node.js？它的主要特点是什么？**

难度 ⭐ | 频率 高

Node.js 是一个基于 Chrome V8 引擎的 JavaScript 运行时环境，让我们可以在服务器端写 JavaScript 代码。

它的核心特点就四个：

- **事件驱动 + 非阻塞 I/O**：不会因为一个文件读得慢就把整个服务器卡住，所有 I/O 操作都通过回调来异步处理，主线程能继续接收新请求。
- **单线程但高并发**：主线程只负责执行你的 JS 代码，繁重的 I/O 操作交给底层的 **libuv 线程池**去并行处理，所以单线程也能扛住上万并发。
- **跨平台**：Windows / macOS / Linux 都能跑，适合开发跨系统工具链。
- **npm 生态**：全球最大的开源包管理器，前端工具链几乎都跑在 Node 上。

**加分回答点**：补充说明“Node.js 适合 I/O 密集型场景（API 网关、BFF 层），不适合 CPU 密集型（图像处理、复杂加密）”——面试官会觉得你有场景判断能力。

---

**Q2: Node.js 的优缺点分别是什么？**

难度 ⭐ | 频率 高

**优点**：
- **高并发处理能力强**：基于事件驱动和非阻塞 I/O，天然适合处理大量并发连接。
- **前后端技术栈统一**：全栈 JS，减少团队沟通成本，可共享工具函数和类型定义。
- **性能足够好**：V8 引擎的 JIT 编译让 JS 执行速度很快，适合作为 API 中间层。
- **生态庞大**：npm 上几百万个包，要什么都有。

**缺点**：
- **单线程的天然短板**：CPU 密集型任务（加密、图片处理、大数据计算）会阻塞主线程，影响其他请求的响应时间。
- **回调地狱风险**：虽然现在有 Promise 和 async/await，但大量第三方老库仍使用回调风格。
- **不适合重型后端逻辑**：复杂事务处理、分布式锁等场景还是得用 Java/Go 这样的语言。

**加分回答点**：“Node 最适合做中间层（BFF），把后端微服务的各种数据聚合好，再返回给前端。也能承担 SSR 渲染服务器的角色。”

---

**Q3: 浏览器 JS 和 Node.js 的 JS 有什么区别？**

难度 ⭐ | 频率 高

一句话概括：**同一个语言（ECMAScript 标准），不同的宿主环境。**

| 对比维度 | 浏览器 JS | Node.js JS |
|---------|---------|-----------|
| 全局对象 | `window` | `global` |
| 模块系统 | ESM（`import/export`） | CommonJS（`require/module.exports`）为主，也支持 ESM |
| DOM/BOM API | 完整支持 | **没有**（没有 document、window、localStorage） |
| 文件系统 | 受限（沙箱机制，不能随意读写磁盘） | 完整（`fs` 模块可读写本地文件） |
| 网络请求 | `XMLHttpRequest` / `fetch` | `http` / `https` 内置模块 + 第三方库 |
| 进程控制 | 无（一个标签页 = 一个渲染进程，但 JS 无进程 API） | 有（`process`、`child_process`、`cluster`） |

**面试高分回答**：先说“同语言不同环境”，再举一个具体例子——“比如我想读一个本地文件，浏览器里做不到，但 Node 里直接 `fs.readFileSync()` 就行。反过来，我想操作 DOM，Node 里也做不了，因为没有 HTML 解析引擎。”

---


### 1.2 事件循环（Event Loop）⭐ 重点

**Q4: Node.js 的事件循环机制是怎样的？有几个阶段？**

难度 ⭐⭐ | 频率 高

Node.js 的事件循环基于 **libuv** 实现，它让 Node 在单线程下也能执行非阻塞 I/O 操作。

事件循环分为 **6 个阶段**，按顺序依次执行：

1. **Timers（定时器阶段）** ：执行 `setTimeout`、`setInterval` 的回调。
2. **Pending callbacks（挂起回调阶段）** ：执行延迟到下一轮迭代的 I/O 回调（比如某些系统操作错误）。
3. **Idle / Prepare（空闲/准备阶段）** ：仅内部使用，开发者不感知。
4. **Poll（轮询阶段）** ：**核心阶段**，获取新的 I/O 事件，执行 I/O 相关回调。如果 poll 阶段队列为空且有 `setImmediate` 回调，会跳转到 check 阶段。
5. **Check（检查阶段）** ：执行 `setImmediate()` 的回调。
6. **Close callbacks（关闭回调阶段）** ：执行 `socket.on('close')` 等清理操作。

**关键规则**：`process.nextTick` 和 `Promise.then` 属于**微任务**，不在事件循环的任何阶段中——它们在**每个阶段切换之间**立即清空。

**加分回答点**：“这个六阶段设计让不同类型的异步任务各司其职，不会互相阻塞。面试官经常追问两个宏任务的区别：setTimeout 最快也要 1ms 后才进入 timers 队列，而 setImmediate 在本次事件循环的 check 阶段就会执行。”

---

**Q5: 浏览器事件循环和 Node.js 事件循环有什么区别？**

难度 ⭐⭐ | 频率 高

这道题是面试区分“背过知识点”和“真正理解”的分水岭。

**① 架构层面不同**

浏览器事件循环由 **HTML5 标准** 定义，包含渲染管线；Node.js 事件循环由 **libuv** 实现，不涉及 UI 渲染。

**② 宏任务来源不同**

- **浏览器宏任务**：`setTimeout`、`setInterval`、`MessageChannel`、`I/O`、UI 渲染。
- **Node.js 宏任务**：`setTimeout`、`setInterval`、`setImmediate`（Node 专有）、`I/O` 操作。

**③ 微任务执行时机不同**

- **浏览器**：**一个宏任务执行完后，立刻清空整个微任务队列**，然后进行 UI 渲染。
- **Node.js**：微任务在**每个阶段切换之间执行**，而不是等整个事件循环完成一轮。

**④ process.nextTick 是 Node 独有的**

它在微任务队列中优先级最高，**比 Promise.then 还先执行**。

**一句话总结**：浏览器的事件循环服务于“渲染页面”，Node.js 的事件循环服务于“处理 I/O”。

**加分回答点**：“在浏览器里，`requestAnimationFrame` 是在渲染前执行的，Node 里没这个概念。反过来 Node 里的 `setImmediate`，浏览器也没有。”

---

**Q6: `setTimeout(fn, 0)`、`setImmediate(fn)` 和 `process.nextTick(fn)` 的执行顺序？**

难度 ⭐⭐ | 频率 高

**结论**：`process.nextTick` > `Promise.then` > `setTimeout` ≈ `setImmediate`（谁先谁后取决于调用环境）。

**执行顺序解析**：
1. 同步代码全部执行完毕。
2. 进入微任务阶段：`process.nextTick` 最先执行，然后是 `Promise.then`。
3. 进入宏任务阶段：按事件循环的六个阶段顺序执行。

**关于 setTimeout(fn, 0) vs setImmediate：**
- 如果两者都在**主模块**中调用，执行顺序**不确定**，取决于 Node 的启动时间和系统性能。
- 如果两者都在**同一个 I/O 回调**中调用，`setImmediate` **总是先执行**，因为 I/O 回调完成后事件循环进入 poll 阶段，紧接着就是 check 阶段。

**加分回答点**：如果你能说出“process.nextTick 的递归调用会**饿死事件循环**”——因为这会让 nextTick 队列永远清不完，timers 和 I/O 阶段永远得不到执行——面试官会对你刮目相看。

---


### 1.3 模块化

**Q7: CommonJS 和 ESM 有什么区别？**

难度 ⭐ | 频率 高

这是前端模块化的基础题，必须脱口而出。

| 对比维度 | CommonJS | ESM |
|---------|---------|-----|
| 语法 | `require` / `module.exports` | `import` / `export` |
| 加载时机 | **运行时**动态加载（同步） | **编译时**静态分析（异步） |
| 输出方式 | 值的**拷贝**（浅拷贝） | 值的**引用**（动态绑定） |
| this 指向 | 指向当前模块 | `undefined` |
| 是否支持 Tree Shaking | ❌ 静态分析困难 | ✅ 编译时确定依赖关系 |
| Node.js 支持 | 默认支持 | `.mjs` 文件或在 `package.json` 设 `"type":"module"` |

**面试高分回答**：

“CJS 是运行时加载，你可以在 `if` 条件里 `require` 不同的模块。ESM 是编译时加载，`import` 必须写在文件顶层，不能放条件判断里。ESM 输出的是**值的引用**——如果导出模块里的变量变了，导入方拿到的值也会跟着变；而 CJS 输出的是值的**拷贝**，不会同步变化。”

**加分回答点**：“为什么 Node 用 ESM 时必须加文件扩展名？因为 ESM 的模块解析是静态的，Node 不会像 CJS 一样自动补全 `.js`、`.json`、`.node` 等扩展名。”

---

**Q8: `require` 的加载过程是怎样的？**

难度 ⭐⭐ | 频率 中

`require(X)` 的完整流程可以分为五步：

1. **路径解析**：判断 X 是内置模块（如 `fs`）、相对路径模块、还是 `node_modules` 里的第三方包。如果是第三方包，按**就近原则**从当前目录逐级向上查找 `node_modules`。
2. **缓存检查**：去 `Module._cache` 查看是否已经加载过，有缓存直接返回 `module.exports`。**require 最核心的性能优化就是缓存**。
3. **编译执行**：根据文件扩展名（`.js` / `.json` / `.node`）选择不同方式处理。`.js` 文件会被包裹在一个函数里：`(function(exports, require, module, __filename, __dirname) { ... })`。
4. **返回 exports**：将 `module.exports` 返回给调用方。
5. **写入缓存**：将模块对象存入 `Module._cache`，下次 require 直接命中。

**加分回答点**：“`require` 是同步的，所以在服务端启动时加载没问题，但如果是大型应用启动时 require 太多模块会很慢。这也是为什么 ESM 的静态分析可以做 Tree Shaking，而 CJS 不行。”

---


### 1.4 异步编程

**Q9: Node.js 中有哪些异步编程方式？各有什么优缺点？**

难度 ⭐ | 频率 高

Node.js 的异步编程经历了三代演进：

1. **回调函数（Callback）** ：最早的方案，直接把回调函数作为参数传入。
   - **缺点**：**回调地狱**——层层嵌套，难以阅读和维护；错误处理繁琐，每个回调都得处理一遍 error。

2. **Promise**：用链式调用的方式包装异步操作。
   - **优点**：可以用 `.then()` 链式调用，用 `.catch()` 统一捕获错误，解决了回调地狱。
   - **缺点**：链式调用太长时仍然不够直观。

3. **async/await**：基于 Promise 的语法糖，是目前最推荐的方式。
   - **优点**：代码像同步的一样易读，`try/catch` 直接处理错误，调试友好。
   - **缺点**：不注意的话可能写出“串行等待”，拖慢性能——可以用 `Promise.all` 解决。

---

**Q10: 如何优雅地处理 Node.js 中的异步错误？**

难度 ⭐⭐ | 频率 中

**核心原则：不要吞掉错误，不要依赖默认行为。**

- **Promise 场景**：用 `.catch()` 或在 `async` 函数内用 `try/catch`。
- **Express/Koa 中间件**：Express 需要写专门的错误处理中间件（四个参数的那个），Koa 用 `try/catch` 包裹 `await next()`。
- **全局兜底**：监听 `process.on('unhandledRejection')` 和 `process.on('uncaughtException')`，记录日志后**优雅退出**（因为进程可能已处于不一致状态）。
- **推荐模式**：上层统一错误处理中间件 + 自定义错误类（带 HTTP 状态码和业务错误码）。

---


### 1.5 核心模块

**Q11: fs.readFile 和 fs.createReadStream 的区别？**

难度 ⭐⭐ | 频率 高

| 对比维度 | fs.readFile | fs.createReadStream |
|---------|-----------|-------------------|
| 工作方式 | 一次性把文件**全部读入内存** | 分块读取，边读边处理 |
| 内存占用 | 文件多大就占多少内存 | 只占用当前块大小（如 64KB） |
| 适用场景 | 小文件（< 50MB） | 大文件（视频、日志、备份） |
| 编码风格 | 回调 / Promise | 事件监听（`data`、`end`、`error`） |

**一句话选择标准**：“小文件用 readFile，大文件用 Stream——这是 Node.js 非阻塞 I/O 思想的核心体现。”

**加分回答点**：“面试官可能会问 **背压（Backpressure）** ——当读取速度比写入速度快时，`pipe` 方法会自动处理背压，暂停读取流，等写入流消化完再继续。你可以用 `stream.pipeline` 替代 `pipe`，它能自动处理错误和清理。”

---

**Q12: Buffer 是什么？什么时候用？**

难度 ⭐ | 频率 中

Buffer 是 Node.js 用来**处理二进制数据**的类，它在 V8 堆外分配内存。

**使用场景**：
- 读取文件时的返回值就是 Buffer（或 Stream 的 chunk）
- TCP 流传输的原始数据
- 图片/视频的二进制处理
- 加密算法（如 crypto 模块的输入输出）

**注意**：Buffer 是 Node.js 的全局类，不需要 require。老版本用 `new Buffer()` 创建（有安全隐患），现在统一用 `Buffer.from()` 和 `Buffer.alloc()`。

---

**Q13: process 对象有哪些常用属性和方法？**

难度 ⭐ | 频率 中

`process` 是 Node.js 的全局对象，代表**当前运行的进程**。

| 常用属性/方法 | 作用 |
|-------------|------|
| `process.env` | 获取环境变量（区分开发/生产环境、加载不同配置） |
| `process.argv` | 命令行参数数组，前两个固定是 node 路径和脚本路径 |
| `process.cwd()` | 获取当前工作目录 |
| `process.exit(code)` | 退出进程（0 = 成功，非 0 = 异常） |
| `process.nextTick(fn)` | 将回调插入微任务队列头部 |
| `process.pid` | 当前进程 ID |
| `process.memoryUsage()` | 查看内存使用情况（排查内存泄漏的关键工具） |

---


### 1.6 进程与线程

**Q14: child_process 的四种创建方式有什么区别？**

难度 ⭐⭐ | 频率 中

- **`exec`**：执行 shell 命令，结果通过回调返回。有**最大输出限制**（默认 200KB），适合执行短命令。
- **`execFile`**：直接执行可执行文件（不启动 shell），比 exec 安全，适合已知的命令行工具。
- **`spawn`**：创建一个子进程，通过流来交互。适合处理**大量输出**（如 `tail -f` 日志），没有输出大小限制。
- **`fork`**：spawn 的一个特例，专门用于创建 **Node.js 子进程**，自带 IPC 通道，父子进程可互相通信。

**加分回答点**：“`fork` 是面试常考点。父子进程之间通过 `process.on('message')` 和 `process.send()` 通信，数据会被序列化（结构化克隆算法）。这是实现多进程计算的常用方案。”

---

**Q15: cluster 模块的工作原理？**

难度 ⭐⭐ | 频率 中

cluster 让 Node.js 可以轻松创建**多个工作进程（Worker）共享同一个端口**。

**工作原理**：
- 主进程（Master）调用 `cluster.fork()` 创建多个子进程。
- 主进程负责**监听端口**，然后将连接**分发给**各个 Worker 进程（由操作系统调度）。
- 每个 Worker 都是一个独立的 Node 实例，有自己独立的内存空间和事件循环。

**一句话理解**：“一个 Node 进程只能利用一个 CPU 核心。用 cluster 就能把多核都利用起来，且 Worker 进程崩了不会影响其他进程，天然提高可用性。”

---


### 1.7 常用框架

**Q16: Express 和 Koa 的中间件机制有什么区别？**

难度 ⭐⭐ | 频率 高

| 对比维度 | Express | Koa |
|---------|---------|-----|
| 中间件模型 | **线性模型**（单向流水线） | **洋葱模型**（双向穿透） |
| 异步处理 | 基于回调，需要手动 `next(err)` | 基于 async/await |
| 响应处理 | 通过 `res.send()` / `res.json()` | 通过 `ctx.body` 赋值 |
| 错误处理 | 四个参数的专用错误中间件：`(err, req, res, next)` | `try/catch` 包裹 `await next()` |
| 内置功能 | 自带路由、静态文件服务等 | **极简内核**，几乎全要中间件补充 |

**洋葱模型示意**：

```
请求 → 【中间件1 前置 → 中间件2 前置 → 中间件3 → 中间件2 后置 → 中间件1 后置】 → 响应
```

**加分回答点**：“Express 的中间件容易写出**多次响应**的 bug——如果一个中间件调了 `res.send()` 又调了 `next()`，后续中间件也调了响应，就会报错 `headers already sent`。Koa 的 `ctx.body` 赋值模式则避免了这个问题。”

---

**Q17: Express 中间件的 `next()` 和 Koa 中间件的 `await next()` 有什么区别？**

难度 ⭐⭐ | 频率 中

- **Express 的 `next()`** ：是普通函数调用，不会等待异步逻辑执行完就继续往下走了。如果在 `next()` 之后写了代码，执行时机是不可控的——取决于后面中间件里有没有异步操作。
- **Koa 的 `await next()`** ：因为 `next()` 返回一个 Promise，`await` 会真正**等待**后续中间件全部执行完成后，再回来执行当前中间件剩下的代码。

**一句话理解**：“Koa 的洋葱模型靠的就是 `await next()` 这个机制——它能保证请求进来和响应出去都经过同一层中间件。”

---


### 1.8 性能优化与调试

**Q18: 如何排查 Node.js 内存泄漏？**

难度 ⭐⭐ | 频率 中

**排查三步走**：

1. **先用 `process.memoryUsage()` 看趋势**：定时打印 `heapUsed`、`heapTotal`、`external`、`rss`，确认内存是否持续上涨不回落。
2. **用 Chrome DevTools 做 Heap Snapshot**：用 `node --inspect` 启动应用，在 Chrome 的 Memory 面板抓两次快照，对比 `Delta` 列，看哪些对象数量激增。
3. **检查常见泄漏源**：
   - 全局变量持有大量数据
   - 闭包引用了不需要的大对象
   - 定时器/setInterval 没有 clear
   - 事件监听器没有 `removeListener`
   - Stream 没有销毁

**加分回答点**：“生产环境建议接入 `clinic.js` 或 `heapdump` 工具自动采集和分析。pm2 可以配置 `max_memory_restart` 兜底，但这是临时方案，根本还是要定位泄漏点。”

---


## 二、Next.js 部分

### 2.1 基础概念（SSR / SSG / ISR / CSR）⭐ 必考

**Q19: SSR、SSG、ISR、CSR 的区别？各自适用什么场景？**

难度 ⭐⭐⭐ | 频率 高

**一句话本质区别**：HTML 的**生成时机**不同。

| 渲染方式 | HTML 生成时机 | SEO | 首屏速度 | 数据实时性 | 服务器压力 |
|---------|------------|-----|---------|-----------|-----------|
| **CSR**（客户端渲染） | 浏览器运行时 | ❌ 差 | 慢 | 高 | 无 |
| **SSR**（服务端渲染） | 每次请求时 | ✅ 好 | 快 | ✅ 最高 | 大 |
| **SSG**（静态生成） | 构建时（`next build`） | ✅ 最好 | 最快 | ❌ 差 | 最小 |
| **ISR**（增量静态再生） | 构建时 + 定时后台更新 | ✅ 好 | 快 | ✅ 可接受 | 小 |

**适用场景一句话指南**：

- **CSR**：后台管理系统、内部工具——不需要 SEO，纯交互应用。
- **SSR**：用户仪表盘、个性化推荐页——数据千人千面，需要实时。
- **SSG**：博客文章、文档站、企业官网——内容变化极少，首屏越快越好。
- **ISR**：电商商品详情页、新闻列表——页面多、需要定时更新但不必秒级实时。

---

**Q20: 什么是 Hydration（水合）？**

难度 ⭐⭐ | 频率 中

Hydration 是**客户端将服务端渲染出的静态 HTML 与 React 组件的事件处理程序绑定的过程**。

**工作流程**：
1. 服务端生成完整 HTML 返回浏览器。
2. 用户立刻看到页面内容（但此时按钮点击不了）。
3. 浏览器下载并执行 JS 文件。
4. React 遍历已有的 DOM 树，将事件监听器“附加”上去，让页面变成可交互的。
5. 这个过程完成后，页面就“活”了。

**一句话理解**：“Hydration 就是把服务端渲染的‘静态骨架’变成‘可交互的活页面’。”

**加分回答点**：“面试官可能会追问水合不匹配（Hydration Mismatch）——当服务端生成的 HTML 和客户端渲染的结果不一致时，React 会报错。常见原因：用了 `typeof window` 做条件判断、渲染了 `Date.now()`、或者用了浏览器专有 API。”

---


### 2.2 App Router vs Pages Router ⭐ 重点

**Q21: App Router 和 Pages Router 的区别？**

难度 ⭐⭐ | 频率 高

Next.js 从 v13.4 起，**App Router 已成为默认路由方案**，新项目建议直接使用。

| 对比维度 | Pages Router | App Router |
|---------|-------------|-----------|
| 目录结构 | `pages/` 文件夹 | `app/` 文件夹 |
| 路由文件 | `index.js` 或命名文件 | **`page.js`**（约定式） |
| 布局系统 | `_app.js` + `_document.js` | **`layout.js`**（可嵌套、可共享） |
| 数据获取 | `getServerSideProps` / `getStaticProps` | **直接在组件中用 `async/await`** |
| 组件默认类型 | 客户端组件 | **服务端组件（Server Components）** |
| 加载状态 | 手动实现 | `loading.js` 文件自动集成 Suspense |
| 错误处理 | 手动实现 Error Boundary | `error.js` 文件自动处理 |
| 高级路由 | 不支持 | 支持路由组、平行路由、拦截路由 |

**面试高分回答**：“App Router 默认使用 React Server Components，大部分组件在服务端执行，不增加客户端 JS 体积。只有在需要交互（useState、onClick 等）时，才在文件顶部声明 `'use client'`。”

---

### 2.3 数据获取

**Q22: App Router 中如何获取数据？和 Pages Router 有什么不同？**

难度 ⭐⭐ | 频率 高

**Pages Router（老方式）** ：
```javascript
// 必须在页面文件顶层导出固定名字的函数
export async function getServerSideProps() {
  const res = await fetch('https://api.example.com/data')
  return { props: { data: await res.json() } }
}

export async function getStaticProps() {
  // 构建时运行
  const res = await fetch('https://api.example.com/data')
  return { props: { data: await res.json() }, revalidate: 60 }
}
```

**App Router（新方式）** ：
```javascript
// 直接在 Server Component 中用 async/await
export default async function Page() {
  const res = await fetch('https://api.example.com/data', {
    next: { revalidate: 60 } // ISR 配置
  })
  const data = await res.json()
  return <div>{data.title}</div>
}
```

**核心差异**：App Router 把数据获取从“页面级别的配置函数”变成了“组件内部的代码”，更灵活、更自然。

**加分回答点**：“Next.js 对 `fetch` 做了扩展，同一个 URL 的请求在同一个渲染周期内会被**自动去重**，避免重复请求。还支持 `cache: 'force-cache'`（默认）和 `cache: 'no-store'` 来控制缓存策略。”

---

### 2.4 Server Components vs Client Components

**Q23: 服务端组件和客户端组件的区别？什么时候用哪个？**

难度 ⭐⭐ | 频率 高

| 对比维度 | Server Component（默认） | Client Component（`'use client'`） |
|---------|------------------------|----------------------------------|
| 执行位置 | 服务端 | 浏览器 |
| JS 体积 | **不增加客户端 JS** | 会被打包发送到浏览器 |
| 交互能力 | ❌ 不能用 useState、useEffect、onClick | ✅ 完整支持 |
| 数据获取 | 直接 async/await 取数据库 | 通过 fetch 或其他客户端方式 |
| 敏感操作 | ✅ 直接访问数据库/文件系统 | ❌ 不能暴露敏感逻辑 |

**选择原则**：“能放服务端的就放服务端，只在需要交互（状态管理、事件处理、浏览器 API、Hooks）时才声明 `'use client'`。”

**一句话记忆**：“服务器组件负责读数据，客户端组件负责交互。”

---

### 2.5 路由系统

**Q24: Next.js App Router 有哪些特殊文件？**

难度 ⭐ | 频率 高

| 文件名 | 作用 |
|-------|------|
| `page.js` | 定义该路由的 UI，使其可公开访问 |
| `layout.js` | 定义该路由及子路由的**共享布局**，路由切换时布局不卸载 |
| `loading.js` | 自动包裹在 Suspense 中的**加载状态 UI** |
| `error.js` | 自动包裹在 Error Boundary 中的**错误处理 UI** |
| `not-found.js` | 当路由不存在时显示的 404 页面 |
| `route.js` | 定义 API 端点（替代 Pages Router 的 `pages/api/`） |

**加分回答点**：`layout.js` 的状态在页面切换时会**保持**，适合放导航栏、侧边栏等不需要重新渲染的部分。

---

### 2.6 性能优化

**Q25: Next.js 有哪些内置的性能优化手段？**

难度 ⭐⭐ | 频率 中

1. **`next/image` 组件**：自动懒加载、自动生成 WebP 等现代格式、防止布局偏移（CLS）、自适应分辨率。
2. **自动代码分割**：按页面拆分 JS 代码，访问哪个页面才加载哪个页面的 JS，不需要手动配置。
3. **字体优化**：`next/font` 在构建时下载字体文件并内联，避免额外的 HTTP 请求。
4. **静态资源缓存**：静态文件带 hash 后缀，可永久缓存。
5. **流式渲染**：`loading.js` + `Suspense` 实现逐步展示内容，不必等整页数据都准备好。
6. **Turbopack**：基于 Rust 的打包工具，开发环境热更新极快。

**加分回答点**：“Next.js 帮你做了 80% 的性能优化，开发者只需要关心‘用哪种渲染策略’和‘数据在哪获取’。”

---

### 2.7 中间件

**Q26: Next.js 中间件（Middleware）是什么？能做什么？**

难度 ⭐⭐ | 频率 中

Middleware 是运行在**请求完成之前**的代码，可以在 Edge Runtime 上执行。

**能做什么**：
- URL 重定向（如未登录跳转登录页）
- 请求头修改（添加 CORS 头）
- A/B 测试（根据 Cookie 分流）
- Bot 拦截
- 国际化路由检测

**不能做什么**：
- 直接操作数据库（Edge Runtime 不支持大多数 Node 原生模块）
- 修改响应体

**代码示例**：
```javascript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // 未登录 → 跳转登录页
  if (!request.cookies.get('token')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

// 配置哪些路径触发中间件
export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*']
}
```

---


## 三、手写题 / 编码题

**Q27: 手写一个简易 Express 中间件 compose 函数**

难度 ⭐⭐ | 频率 高

```javascript
/**
 * Express 中间件 compose 实现
 * 本质：将一组中间件函数串联为可顺序执行的函数
 * 场景：理解 Express/Connect 的中间件机制
 */
function compose(middlewares) {
  return function (req, res, next) {
    let index = -1

    function dispatch(i) {
      // 防止多次调用 next
      if (i <= index) throw new Error('next() called multiple times')
      index = i

      let fn = middlewares[i]
      // 所有中间件执行完毕，调用最终回调
      if (i === middlewares.length) fn = next
      if (!fn) return

      try {
        fn(req, res, dispatch.bind(null, i + 1))
      } catch (err) {
        // 错误时调用 next(err)，会触发错误处理中间件
        next(err)
      }
    }

    dispatch(0)
  }
}

// 用法演示
const app = {
  middlewares: [],
  use(fn) {
    this.middlewares.push(fn)
  },
  handleRequest(req, res) {
    const fn = compose(this.middlewares)
    fn(req, res, (err) => {
      if (err) {
        res.statusCode = 500
        res.end('Internal Server Error')
      } else {
        res.end('Not Found')
      }
    })
  }
}
```

**关键考点**：
- 每个中间件的第三个参数 `next` 实际是 `dispatch(i+1)`，形成递归调用链
- 用 `index` 防止在同一个中间件里多次调用 `next()`
- 错误要传给 `next(err)`，Express 会跳过普通中间件找到四个参数的错误处理中间件

---

**Q28: 手写一个 fs.readFile 的 Promise 化（promisify）**

难度 ⭐⭐ | 频率 高

```javascript
const fs = require('fs')

/**
 * 通用 promisify 函数
 * 将遵循 (err, result) 回调风格的函数转为返回 Promise 的函数
 */
function promisify(fn) {
  return function (...args) {
    return new Promise((resolve, reject) => {
      fn.call(this, ...args, (err, result) => {
        if (err) reject(err)
        else resolve(result)
      })
    })
  }
}

// 使用
const readFile = promisify(fs.readFile)

async function main() {
  try {
    const data = await readFile('./test.txt', 'utf-8')
    console.log(data)
  } catch (err) {
    console.error('读取失败:', err)
  }
}

main()
```

**延伸追问**：“Node.js 内置了 `util.promisify`，可以直接用。但手写这个能看出你是否理解回调转 Promise 的本质。”

---

**Q29: 手写一个简单的 EventEmitter**

难度 ⭐⭐ | 频率 高

```javascript
class EventEmitter {
  constructor() {
    this._events = Object.create(null) // 无原型链污染
  }

  // 注册事件监听
  on(event, callback) {
    if (!this._events[event]) {
      this._events[event] = []
    }
    this._events[event].push(callback)
    return this // 支持链式调用
  }

  // 触发事件
  emit(event, ...args) {
    const callbacks = this._events[event]
    if (!callbacks) return false
    callbacks.forEach(cb => cb.apply(this, args))
    return true
  }

  // 移除事件监听
  off(event, callback) {
    const callbacks = this._events[event]
    if (!callbacks) return this
    // 只移除指定的回调函数
    this._events[event] = callbacks.filter(cb => cb !== callback)
    return this
  }

  // 只执行一次
  once(event, callback) {
    const wrapper = (...args) => {
      callback.apply(this, args)
      this.off(event, wrapper) // 执行后自动移除
    }
    this.on(event, wrapper)
    return this
  }
}
```

**关键考点**：
- 用 `Object.create(null)` 避免原型链上的属性干扰
- `once` 的实现方式：创建 wrapper 函数，执行后自动调用 `off`
- 返回 `this` 支持链式调用
- `emit` 时要用 `apply` 确保 `this` 指向正确

---

**Q30: 用 Stream 实现大文件拷贝**

难度 ⭐⭐ | 频率 中

```javascript
const fs = require('fs')
const { pipeline } = require('stream/promises')

/**
 * 使用 stream 拷贝大文件
 * 边读边写，内存占用恒定，不会撑爆内存
 */
async function copyFile(src, dest) {
  const readStream = fs.createReadStream(src, { highWaterMark: 64 * 1024 }) // 64KB 缓冲区
  const writeStream = fs.createWriteStream(dest)

  try {
    await pipeline(readStream, writeStream)
    console.log('拷贝完成')
  } catch (err) {
    console.error('拷贝失败:', err)
  }
}

// ========== 进阶版：带进度条 ==========
async function copyFileWithProgress(src, dest) {
  const stat = await fs.promises.stat(src)
  const totalSize = stat.size
  let copiedSize = 0

  const readStream = fs.createReadStream(src)
  const writeStream = fs.createWriteStream(dest)

  readStream.on('data', (chunk) => {
    copiedSize += chunk.length
    const percent = ((copiedSize / totalSize) * 100).toFixed(2)
    process.stdout.write(`\r进度: ${percent}%`)
  })

  await pipeline(readStream, writeStream)
}
```

**关键考点**：
- 使用 `pipeline` 而非 `pipe`——它能自动处理错误和流清理
- `highWaterMark` 控制缓冲区大小
- Stream 的内存占用与文件大小无关，只取决于缓冲区大小

---

**Q31: 手写一个 Next.js 风格的简易 SSR Demo**

难度 ⭐⭐⭐ | 频率 中

```javascript
const http = require('http')
const { renderToString } = require('react-dom/server')
const React = require('react')

// 模拟从数据库获取数据
async function fetchBlogPosts() {
  return [
    { id: 1, title: 'Node.js 入门指南', content: '...' },
    { id: 2, title: 'Next.js 实战', content: '...' },
  ]
}

// React 页面组件
function BlogList({ posts }) {
  return React.createElement('div', null,
    React.createElement('h1', null, '博客列表'),
    React.createElement('ul', null,
      posts.map(post =>
        React.createElement('li', { key: post.id },
          React.createElement('h2', null, post.title),
          React.createElement('p', null, post.content)
        )
      )
    )
  )
}

// HTML 模板
function htmlTemplate(reactHtml, data) {
  return `<!DOCTYPE html>
<html>
<head><title>博客</title></head>
<body>
  <div id="root">${reactHtml}</div>
  <script>
    // 注入预取数据，避免客户端重复请求（水合用）
    window.__INITIAL_DATA__ = ${JSON.stringify(data)}
  </script>
  <script src="/bundle.js"></script>
</body>
</html>`
}

// 创建 HTTP 服务器
const server = http.createServer(async (req, res) => {
  if (req.url === '/') {
    const posts = await fetchBlogPosts()
    const reactHtml = renderToString(React.createElement(BlogList, { posts }))
    res.setHeader('Content-Type', 'text/html')
    res.end(htmlTemplate(reactHtml, posts))
  }
})

server.listen(3000, () => {
  console.log('SSR Server running on http://localhost:3000')
})
```

**关键考点**：
- `renderToString` 将 React 组件渲染为 HTML 字符串
- 将服务端数据注入到 `window.__INITIAL_DATA__`，客户端水合时使用同一份数据
- 这就是 Next.js 在底层做的事情——只不过 Next.js 做了路由、流式渲染、自动代码分割等等

---


## 四、综合场景题（实习岗常问）

**Q32: 如果让你用 Next.js 做一个博客系统，你会怎么设计？SSR 还是 SSG？为什么？**

难度 ⭐⭐⭐ | 频率 高

**我的设计方案**：

**文章详情页 → SSG + ISR**
- 文章发布后内容变化极少，用 SSG 构建时生成静态 HTML，首屏最快。
- 但文章可能会修改，所以我设置 `revalidate: 60`（60 秒），让它支持 ISR，修改后自动后台更新。
- 在 `generateStaticParams` 里只生成热门文章的静态页面，长尾文章用 ISR on-demand 方式生成。

**首页/列表页 → SSG + ISR**
- 同上逻辑，构建时生成 + 定时更新。

**用户评论 → 客户端组件**
- 评论区需要实时交互（点赞、回复），用 `'use client'` 渲染，通过 fetch 请求评论 API。

**后台管理 → CSR**
- 完全不需要 SEO，纯交互操作，直接用客户端渲染，甚至不必 Next.js 页面。

**数据层**：
- 用 Next.js 的 Server Components 直接从数据库查数据，不需要额外搭建 API 服务。
- 或者用 API Routes（App Router 里的 `route.js`）提供 REST 接口。

**面试高分点**：说清楚“为什么不同页面选不同策略”，而不是一刀切。这展示的是“根据场景做技术选型”的能力。

---

**Q33: 有一个接口需要从 3 个不同的微服务拿数据，怎么设计 Node.js 中间层？**

难度 ⭐⭐ | 频率 中

**方案设计**：

1. **并行请求**：3 个服务之间没有依赖关系，用 `Promise.all` 同时发起请求，等待所有结果返回。
2. **超时控制**：每个请求设置 timeout（如 3 秒），用 `Promise.race` 或 `AbortController` 实现，避免某个慢服务拖垮整个接口。
3. **降级策略**：某个服务挂了不能影响其他数据。用 `Promise.allSettled` 拿到成功的结果，失败的返回空数据或默认值，日志中记录。
4. **数据聚合**：把 3 个服务返回的数据按前端需要的格式拼装成一个 JSON 返回。
5. **缓存层**：如果数据更新不频繁，可以在中间层加 Redis 缓存，减少对下游服务的压力。

**一句话总结**：这是典型的 **BFF（Backend For Frontend）模式**——前端需要什么数据格式，中间层就拼装什么格式，后端微服务保持纯粹。

---

**Q34: 如何排查一个 Node.js 应用在生产环境突然变慢的问题？**

难度 ⭐⭐ | 频率 中

**我的排查思路**：

1. **先看监控**：看 CPU、内存、事件循环延迟（event loop lag）是否有异常。如果 event loop lag 很高，说明主线程被阻塞了。
2. **看日志**：有没有异常错误堆积？有没有慢接口日志？
3. **定位阻塞点**：
   - 检查是否有同步的 CPU 密集操作（JSON.parse 大文件、复杂正则）
   - 检查是否有未关闭的数据库连接导致连接池耗尽
   - 检查是否有内存泄漏导致频繁 GC
4. **用 profiling 工具**：
   - `node --prof` 生成 V8 性能分析日志
   - `clinic doctor` 一键诊断
   - Chrome DevTools 的 CPU profiler
5. **临时止血**：pm2 配置 `max_memory_restart` 兜底重启，但根本还是要修 bug。

**加分回答**：“如果面试官追问‘突然变慢而不是一直慢’，可以补充：很可能是上游某个接口变慢了、数据库连接池满了、或者最近上线了新的正则处理导致 ReDoS。”

---

**Q35: 从用户输入 URL 到页面渲染完成，Next.js 全链路做了什么？**

难度 ⭐⭐ | 频率 中

这是小红书真实面经中出现过的题目。

**全链路流程**：

1. **请求到达**：用户访问 `/blog/123`。
2. **Middleware 拦截**：检查登录状态、国际化路由等，可重定向或修改请求头。
3. **路由匹配**：Next.js 根据 `app/` 目录的文件结构匹配到对应的 `page.js`。
4. **数据获取**：
   - 如果是 Server Component，执行组件内的 `async` 函数（如 fetch 数据库或 API）。
   - 如果是 SSG 且缓存命中，直接返回预渲染好的 HTML。
5. **服务端渲染**：React Server Components 在服务端渲染成 HTML，和 Client Components 的标记一起组成完整 HTML。
6. **流式传输**：`loading.js` 包裹的内容可以先返回，数据就绪的部分逐步推送（Streaming）。
7. **浏览器接收 HTML**：用户立刻看到首屏内容（此时还不能交互）。
8. **Hydration（水合）** ：浏览器下载 JS bundle，React 执行水合，将事件监听器附加到 DOM 上，页面变得可交互。
9. **后续导航**：用户点击链接时，Next.js 预加载目标页面的 JS，实现客户端路由切换。

**一句话总结**：“从 URL 到页面，Next.js 帮你在服务端做好了渲染、数据获取、代码分割，在客户端做好水合和预加载——这就是它‘全栈框架’的含义。”

---


## 五、实习面试自查清单

> 以下 **20 个核心知识点**，面试前必须能脱口而出。建议逐条自测，打勾通过。

### Node.js（12 条）

- [ ] **Node.js 是什么**：基于 V8 的 JS 运行时，事件驱动 + 非阻塞 I/O
- [ ] **为什么单线程能高并发**：主线程只执行 JS，I/O 交给 libuv 线程池
- [ ] **Node.js 事件循环 6 个阶段**：timers → pending callbacks → idle/prepare → poll → check → close callbacks
- [ ] **浏览器 vs Node.js 事件循环区别**：来源（HTML5 vs libuv）、有无 UI 渲染、process.nextTick 独有
- [ ] **微任务 vs 宏任务执行顺序**：nextTick > Promise.then > setTimeout ≈ setImmediate
- [ ] **CommonJS vs ESM**：运行时 vs 编译时、值拷贝 vs 值引用
- [ ] **require 加载过程**：路径解析 → 缓存检查 → 编译执行 → 返回 exports
- [ ] **fs.readFile vs Stream**：一次性读入内存 vs 分块读取，选型标准是文件大小
- [ ] **Express vs Koa 中间件区别**：线性模型 vs 洋葱模型、next() vs await next()
- [ ] **cluster 工作原理**：主进程 fork 多个 Worker，共享端口，利用多核
- [ ] **child_process 四种方式**：exec / execFile / spawn / fork，核心区别
- [ ] **promisify 实现**：回调 (err, result) → Promise

### Next.js（8 条）

- [ ] **SSR / SSG / ISR / CSR 区别**：HTML 生成时机不同，各自适用场景
- [ ] **Hydration 是什么**：客户端将服务端 HTML 与 React 事件绑定的过程
- [ ] **App Router vs Pages Router 核心区别**：Server Components 默认、async 数据获取、layout 嵌套
- [ ] **Server Component vs Client Component**：执行位置、JS 体积、交互能力、选择原则
- [ ] **App Router 特殊文件**：page / layout / loading / error / not-found / route
- [ ] **数据获取方式演变**：getServerSideProps → async Server Component
- [ ] **Next.js 内置优化**：Image 组件、代码分割、字体优化、流式渲染
- [ ] **Middleware 能做什么**：路由守卫、重定向、请求头修改，运行在 Edge Runtime

---


> **写在最后**：实习岗位的面试官不会期待你背出源码细节，但会通过这些高频问题考察你是否**真的理解概念并能应用**。最加分的行为不是罗列知识点，而是能说出“什么时候用”、“为什么这么选”。回答问题时多举具体场景，用“比如”开头，面试通过率会高很多。