# Node

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
