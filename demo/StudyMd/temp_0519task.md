好的，你列出的这 9 个点非常精准 —— 既有经典八股（路由、微前端、大文件），又有现代工程化核心（BFF、SSE、中间件），还有框架原理和手写能力。我会按照“**面试回答标准**”给你整理答案，每个知识点都包含：核心概念 + 关键原理 + 代码/对比 + 常见追问点。

---

## 1. 前端路由模式 history 与 hash

### 核心区别

| 特性 | `hash` 模式 | `history` 模式 |
|------|-------------|----------------|
| 原理 | 监听 `window.onhashchange`，`location.hash` 变化不触发页面刷新 | 利用 HTML5 History API (`pushState` / `replaceState` / `popstate`)，手动控制浏览器历史栈 |
| URL 表现形式 | `http://site.com/#/user/123` | `http://site.com/user/123` |
| 服务器支持 | 无需额外配置，因为 `#` 后的内容不会发往服务器 | **必须配置 fallback** 到 `index.html`（如 nginx try_files），否则 404 |
| 缺点 | `#` 不美观，某些场景下 SEO 不友好（但 SPA 主流已用 SSR 解决） | 刷新或直接访问子路径时会请求服务器，需后端配合 |

### 手写简易实现（面试常考）

**hash 模式**：
```js
class HashRouter {
  constructor() {
    this.routes = {};
    window.addEventListener('hashchange', () => this.render());
  }
  register(path, callback) {
    this.routes[path] = callback;
  }
  render() {
    const path = location.hash.slice(1) || '/';
    const cb = this.routes[path];
    if (cb) cb();
  }
}
```

**history 模式**：
```js
class HistoryRouter {
  constructor() {
    this.routes = {};
    // 拦截点击 a 标签或手动导航
    window.addEventListener('popstate', () => this.render());
  }
  push(path, data) {
    history.pushState(data, '', path);
    this.render();
  }
  register(path, callback) { this.routes[path] = callback; }
  render() {
    const path = location.pathname;
    this.routes[path]?.();
  }
}
```

**追问**：  
- `pushState` 与 `replaceState` 区别？前者新增历史记录，后者替换当前。  
- 如何让 history 路由在 nginx 生效？`try_files $uri $uri/ /index.html;`

---

## 2. 手写实现 TypeScript 的 Pick 和 Omit

这两个是 TS 内置工具类型，非常高频的手写题 —— 即使不考 TS，也会考察“构造新对象类型”的能力。

### Pick（挑选部分键）
```ts
type MyPick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// 示例
interface User {
  id: number;
  name: string;
  age: number;
}
type UserPreview = MyPick<User, 'id' | 'name'>; // { id: number; name: string; }
```

### Omit（排除部分键）
思路：用 `Exclude` 联合类型差异 + `Pick`
```ts
// 先实现 Exclude（从 T 中排除 U）
type MyExclude<T, U> = T extends U ? never : T;

// 再实现 Omit
type MyOmit<T, K extends keyof T> = Pick<T, MyExclude<keyof T, K>>;

// 或者直接写（面试写下面这个更直观）
type MyOmit<T, K extends keyof T> = {
  [P in keyof T as P extends K ? never : P]: T[P];
};
```

**追问**：`keyof`、`extends` 在 TS 中的作用？`as` 重映射是什么（TS 4.1）？

---

## 3. 微前端：JS 隔离 & CSS 样式隔离

微前端（如 qiankun、wujie、无界）的核心挑战是子应用间的沙箱隔离。

### JS 隔离（防止全局变量污染）

- **快照沙箱**（qiankun 中的 `SnapshotSandbox`）：  
  激活时记录当前 `window` 上所有属性，卸载时还原，适用于单实例场景。
- **代理沙箱**（`ProxySandbox`）：  
  每个子应用关联一个 `fakeWindow`，对 `window` 的读写通过 `Proxy` 拦截，所有修改记录在 `fakeWindow` 上，不影响真实 `window`（但获取时优先从 `fakeWindow` 取）。适合多实例并发。

**简化原理**：
```js
const fakeWindow = {};
const proxyWindow = new Proxy(window, {
  get(target, prop) {
    return fakeWindow[prop] || target[prop];
  },
  set(target, prop, value) {
    fakeWindow[prop] = value;
    return true;
  }
});
```

### CSS 隔离

- **动态样式表**：加载子应用时将其 CSS 文本插入到 `<style>` 标签，卸载时移除。  
- **Shadow DOM**：将子应用挂载在隔离的 Shadow Root 内，内部样式不会泄露到外部，但外部样式也难以侵入（适用性有限）。  
- **CSS Module / Scoped CSS**：由构建工具为每个类名添加唯一前缀（如 `_app123__btn`）。  
- **BEM 命名规范 + 约定前缀**（较原始）。

**追问**：qiankun 是如何处理子应用之间 JS 污染和样式冲突的？（答：JS 用代理沙箱，样式用动态样式表 + 属性 scoped）

---

## 4. Pinia 的使用、底层原理，与 Vuex 比较

### 基本使用
```js
// stores/counter.js
import { defineStore } from 'pinia';
export const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  getters: {
    double: (state) => state.count * 2,
  },
  actions: {
    increment() { this.count++; }
  }
});
// 组件内
const store = useCounterStore();
store.count; store.increment();
```

### 底层原理（极简理解）

- Pinia 本质是一个 **Vue 插件**，在 `install` 时通过 `provide` 注入一个全局 `pinia` 实例。
- 每个 `defineStore` 返回一个 **useStore** 函数，调用时会从 `pinia` 实例的 `_s` (stores map) 中获取或创建一个 **reactive** 对象（store）。
- **state** 通过 `ref` 或 `reactive` 变成响应式，**getters** 是 `computed`，**actions** 就是普通函数。
- 天然支持 Composition API、TypeScript 推导好。

### 与 Vuex 4 对比

| 维度 | Vuex 4 (for Vue 3) | Pinia |
|------|---------------------|-------|
| 设计理念 | 单一 Store 树，模块化使用 `modules` | 多个独立 Store（扁平结构） |
| TypeScript | 需要大量辅助类型（`createStore` 泛型等） | 原生 TS 支持，自动推导 |
| mutations | 需要（同步） | 无，统一用 actions（同步异步均可） |
| 代码量 | 较冗长 | 简洁，类似 hooks |
| 调试 | Vue Devtools 支持好 | 也支持（老版本需插件，现在内置） |
| 模块热替换 | 需要额外代码 | 原生支持 `store.$hotUpdate()` |

**追问**：Pinia 中如何跨 store 访问数据？直接在一个 store 里导入另一个 useStore 即可，但要避免循环依赖。

---

## 5. 中间件机制（以 Express / Koa 为例）

中间件本质是 **函数队列**，依次执行，可决定是否继续向后传递。

### Express（基于回调）
```js
app.use((req, res, next) => {
  console.log('A');
  next();
  console.log('B');
});
// 执行顺序 A → 下一个中间件 → B（类似洋葱模型不完全，因为 next 后代码也会执行）
```

### Koa（基于 async/await + 洋葱模型）
```js
app.use(async (ctx, next) => {
  console.log('1');
  await next();
  console.log('2');
});
app.use(async (ctx, next) => {
  console.log('3');
  await next();
  console.log('4');
});
// 输出顺序：1 → 3 → 4 → 2
```

**原理**：`next` 返回一个 Promise，`await next()` 会等待后续中间件全部执行完毕再继续。

**手写简易中间件（Redux 风格）**
```js
function compose(middlewares) {
  return (ctx) => {
    let index = -1;
    function dispatch(i) {
      if (i <= index) return Promise.reject('next called multiple times');
      index = i;
      const fn = middlewares[i];
      if (!fn) return Promise.resolve();
      return Promise.resolve(fn(ctx, () => dispatch(i + 1)));
    }
    return dispatch(0);
  };
}
```

**追问**：中间件中 `next` 重复调用会怎样？一般框架会抛出错误，防止死循环。

---

## 6. BFF（Backend For Frontend）

### 定义
BFF 是一层专门服务于前端（尤其是多端：Web、iOS、Android）的后端服务，负责：
- 聚合多个微服务接口
- 裁剪字段、数据类型转换
- 适配不同端的 UI 需求
- 处理 SSR / 鉴权 / 日志等边缘逻辑

### 典型技术栈
- Node.js（Express / NestJS / Next.js API Routes）
- GraphQL（也可以看作 BFF 的一种形式）

### 与前端的关联（面试回答要点）
> 在大型前端团队中，我们会用 Node.js 搭建 BFF 层，前端直接请求 BFF，BFF 再调用下游服务（如订单、商品、用户）。这样前端可以只关心 UI 需要的数据结构，并且复用同一套 BFF 给不同客户端。

**常见追问**：
- BFF 与 GraphQL 的区别？GraphQL 可以让前端灵活定义返回字段，但 BFF 更侧重按端定制逻辑和协议转换。
- BFF 如何处理并发请求？使用 `Promise.all`、并发限流、缓存等。

---

## 7. 从用户输入 URL 到页面渲染完成，Next.js 全链路做了什么

这个题目考察你对 **Next.js 混合渲染（SSR / SSG / CSR）** 的理解，以及比普通 SPA 多出的服务端环节。

### 简化版流程（以 SSR 为例）

1. **浏览器输入 URL**（假设访问 `https://example.com/post/123`）  
2. **DNS 解析 → TCP 连接 → TLS → 请求到达 Next.js 服务器**  
3. **Next.js 服务端执行**：
   - 匹配路由（`pages/post/[id].js` 或 `app/post/[id]/page.js`）
   - 执行 `getServerSideProps`（或 `generateMetadata` 等），**在此请求下游 API、读取数据库**
   - React 组件在服务端渲染成 HTML 字符串（`renderToString`）
   - 同时生成对应的客户端 hydration 用的 JavaScript bundle 链接
4. **服务器返回完整 HTML**（含首屏数据）  
5. **浏览器解析 HTML，下载 CSS / JS**  
6. **React 在客户端 hydrate**：复用现有 DOM，绑定事件  
7. **页面可交互**，后续路由跳转由客户端 `next/link` 接管（类似 SPA）

### 关键区别（与普通 React SPA）
- 普通 CRA：空白 HTML → 下载 JS → 执行 → 请求数据 → 渲染  
- Next.js SSR：首屏直接拿到完整内容，更快，利于 SEO

### 追问点
- 什么是 hydration 失败？服务端与客户端生成的 DOM 结构不一致（比如使用了 `window`、随机数等）。  
- `getServerSideProps` 与 `getStaticProps` 区别？前者每次请求都运行，后者构建时运行一次。  
- Next.js 的 `next/link` 做了哪些优化？预取（prefetch）可视区域内的链接。

---

## 8. 大文件上传 – 前端要做的工作

核心思路：**分片 + 断点续传 + 并发控制**。

### 具体步骤

1. **文件分片**  
   ```js
   const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB
   const chunks = [];
   for (let start = 0; start < file.size; start += CHUNK_SIZE) {
     const end = Math.min(start + CHUNK_SIZE, file.size);
     chunks.push(file.slice(start, end));
   }
   ```

2. **生成文件哈希**（用于标识唯一文件，支持断点续传）  
   - 使用 `spark-md5` 或 `crypto.subtle.digest`，可对每个分片计算后合并，或抽样计算。  
   - 发请求询问后端哪些分片已上传。

3. **并发上传分片**  
   - 限制并发数（如 3～6 个），使用 `p-limit` 或手写任务队列。  
   - 每个分片带序号、文件哈希。

4. **断点续传**  
   - 上传前调用 `/check` 接口，获取已上传的分片列表，跳过已上传的分片。

5. **合并请求**  
   - 所有分片完成后，通知后端合并文件。

6. **其他优化**  
   - **错误重试**：单个分片失败后重试最多 3 次。  
   - **进度条**：`(已上传分片数 / 总分片数) * 100`。  
   - **Web Worker** 计算哈希避免阻塞 UI。

### 常见追问
- 如果两个用户同时上传同一个文件怎么办？后端可以基于哈希实现秒传（存储一份，多个用户关联同一个记录）。  
- 分片大小如何选择？网络好的情况可大点（5-10MB），移动网络可小点（1-2MB）。  
- 如何保证分片顺序？后端根据序号拼接，或者借助 文件偏移量。

---

## 9. SSE（Server-Sent Events）

### 定义
SSE 是一种基于 HTTP 的服务器推送技术，允许服务器向客户端**单向**流式发送数据。适用于 AI 对话流式输出、实时日志、通知推送等。

### 特点
- 基于 HTTP/1.1 或 HTTP/2，无需 WebSocket 那样复杂的协议升级。
- 只能由服务器发往客户端（单向）。  
- 自动重连、支持自定义事件类型。

### 前端使用
```js
const eventSource = new EventSource('/api/stream');
eventSource.onmessage = (event) => {
  console.log('新数据:', event.data);
};
eventSource.addEventListener('heartbeat', (e) => {
  console.log('心跳:', e.data);
});
eventSource.onerror = () => eventSource.close();
```

### 后端实现（Node.js + Express 示例）
```js
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // 发送普通数据
  res.write(`data: ${JSON.stringify({ msg: 'hello' })}\n\n`);
  
  // 发送带类型的事件
  res.write(`event: customEvent\ndata: 自定义内容\n\n`);
  
  // 定期发送心跳
  const interval = setInterval(() => {
    res.write(`: heartbeat\n\n`); // 以冒号开头的注释不会触发 onmessage
  }, 30000);
  
  req.on('close', () => clearInterval(interval));
});
```

### 与 WebSocket 对比
| | SSE | WebSocket |
|--|-----|------------|
| 方向 | 单向（服务器→客户端） | 双向 |
| 协议 | HTTP | WS/WSS（独立协议） |
| 自动重连 | 有 | 无，需手动实现 |
| 二进制数据 | 需 Base64 编码 | 原生支持 |
| 实现复杂度 | 轻量 | 较复杂 |

**追问**：SSE 如何实现类似聊天的双向通信？可以结合客户端用普通 HTTP 发消息，服务器用 SSE 推送消息（半双工）。

---

## 总结与学习建议

你列的这 9 个点覆盖了：
- **基础底层**（路由、手写工具类型、微前端隔离）  
- **状态管理**（Pinia vs Vuex）  
- **后端思维**（中间件、BFF、SSE）  
- **框架深度**（Next.js 全链路）  
- **实战场景**（大文件上传）

建议你按以下顺序攻克：
1. 先理解原理，再看代码（上面的示例足够应对面试手写）
2. 自己动手跑一遍 Next.js 项目 + 大文件上传 demo
3. 把每个点的“追问”自己回答一遍，录下来听是否流畅

如果你需要某个点的**完整可运行代码仓库**，或者**针对性模拟面试题**，随时告诉我。加油！