# React 技术面试核心考点体系（附 Vue 对比记忆）

## 一、考点体系总览

以下按五大模块梳理 React 面试高频考点，标注 **★考察频率**（★越多越高频），并附带 Vue 对比记忆切入点。

```
React 技术面试核心考点体系
├── 一、基础语法（★★★）
│   ├── JSX 语法 & 虚拟 DOM 原理
│   ├── 组件类型（Class vs Function）
│   ├── Props & State & setState 机制
│   ├── 受控组件 vs 非受控组件
│   ├── 合成事件系统
│   └── 生命周期（Class 生命周期 → Hooks 对照）
│
├── 二、核心特性（★★★★）
│   ├── Hooks 全家桶（useState/useEffect/useRef/useMemo/useCallback/useReducer）
│   ├── Context API
│   ├── 高阶组件 HOC & Render Props
│   ├── React.memo / PureComponent
│   └── Portals & Fragments
│
├── 三、底层原理（★★★★★ 二面/三面必考）
│   ├── Virtual DOM 设计思想
│   ├── Diff 算法（Tree Diff / Component Diff / Element Diff）
│   ├── Fiber 架构（Fiber 数据结构、双缓冲、时间切片）
│   ├── 并发模式 Concurrent Mode
│   ├── 渲染流程（Render 阶段 + Commit 阶段）
│   ├── Lane 优先级模型
│   └── Hooks 底层实现原理（链表存储）
│
├── 四、性能优化（★★★★）
│   ├── 渲染优化（memo/useMemo/useCallback）
│   ├── 代码分割（React.lazy + Suspense）
│   ├── 长列表虚拟滚动
│   ├── 自动批处理（Automatic Batching）
│   ├── useTransition / useDeferredValue
│   └── 避免不必要渲染（状态下放、Context 拆分）
│
└── 五、生态工具（★★★）
    ├── 状态管理（Redux Toolkit / Zustand / Jotai）
    ├── 路由（React Router v6）
    ├── 服务端渲染 Next.js / RSC
    ├── 数据请求（TanStack Query / SWR）
    └── 测试（React Testing Library）
```


## 二、底层原理：Diff 算法详解

> **考察频率：★★★★★ | 几乎所有大厂二面必问**

### 2.1 为什么需要 Diff 算法？

**虚拟 DOM 的存在不是为了"比 DOM 快"，而是为了实现跨平台和可预测性**。Virtual DOM 是 JS 对象描述的 DOM 结构，当状态变化时，React 创建一棵新的 Virtual DOM 树，需要与旧的 Virtual DOM 树进行对比，找出最小变更集合，再批量更新到真实 DOM。

直接使用经典 diff 算法（将一棵树转为另一棵树）的最低时间复杂度为 **O(n³)**——一个应用有 1000 个节点，需要比较 **十亿次** 才能完成 DOM 更新，这显然不可接受。

因此 React 通过制定一套大胆的假设策略，将时间复杂度优化到 **O(n)**。

### 2.2 Diff 算法的三大前提策略

React 能够将 diff 优化到 O(n)，基于以下三个前提假设：

```
┌─────────────────────────────────────────────────────┐
│                  React Diff 三大策略                  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  策略1: Tree Diff — 只对同级元素比较                  │
│  ┌─────────────────────────────┐                     │
│  │  Web UI 中 DOM 节点跨层级    │                     │
│  │  移动的操作特别少，忽略不计   │                     │
│  │  如果跨层 → 直接销毁+重建    │                     │
│  └─────────────────────────────┘                     │
│                                                      │
│  策略2: Component Diff — 类型不同直接替换             │
│  ┌─────────────────────────────┐                     │
│  │  两个不同类型的组件会产生    │                     │
│  │  两棵不同的树形结构          │                     │
│  │  类型不同 → 卸载旧组件树     │                     │
│  │  → 创建新组件树              │                     │
│  └─────────────────────────────┘                     │
│                                                      │
│  策略3: Element Diff — 通过 key 识别稳定节点         │
│  ┌─────────────────────────────┐                     │
│  │  开发者可通过 key 来确定     │                     │
│  │  哪些子元素可跨渲染保持稳定   │                     │
│  │  key → 复用/移动/新增/删除   │                     │
│  └─────────────────────────────┘                     │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 2.3 Diff 算法执行流程

#### （1）Tree Diff：同层比较，深度优先

React 对 Fiber 树进行分层比较，只比较**同一父节点下的子节点**。采用深度优先遍历，如果发现节点跨层级移动（如 A 节点从 root 下移到 B 节点下），React 不会尝试复用，而是**直接删除旧节点、创建新节点**。

```
        旧树                          新树
        root                          root
       /    \                        /    \
      A      B                      B      C
     / \    / \                    / \    / \
    C   D  E   F                  A   E  G   H
                                 / \
                                C   D

React Diff 处理方式（跨层级不复用）：
  ✗ 删除 root → A 及其子树 (C, D)
  ✗ 在 B 下创建新的 A 节点
  ✗ 在新 A 下创建 C, D 节点
  ✓ 复用 B 节点（同层且类型相同）
```

#### （2）Component Diff：类型决定命运

对于组件间的比较，**只要类型（type）不同，直接替换整个组件树**。即使新旧组件内容完全一致，只要类型不同（如 div 变 p），React 也会销毁旧组件、创建新组件。

这么做是因为实际开发中类型不同但内容一致的情况极少，过度判断反而增加复杂度、降低平均性能。

#### （3）Element Diff：key 是关键

对同一层级的子节点，React 通过 **key** 来识别哪些节点可以稳定复用。涉及**插入、删除、移动**三种操作。

多节点 diff 采用**两轮循环**策略：

```
第一轮循环：新旧节点同位置对比
  ├── 找到第一个无法复用的节点 → 记录基准位置 → 跳出
  └── 三种结果：
        ├── 新节点遍历完 → 删除剩余老节点 ✓
        ├── 老节点遍历完 → 创建剩余新节点 ✓
        └── 都未遍历完 → 进入第二轮循环 ↓

第二轮循环：遍历剩余新节点
  ├── 将剩余老节点放入 Map（key → fiber）
  ├── 新节点从 Map 中查找可复用的老节点（key + type 都相同）
  ├── 能找到 → 复用，判断是否需要移动
  └── 找不到 → 新建
```

### 2.4 React Diff 算法版本演进：Fiber 架构前后

这是面试中的**核心加分点**。

#### React 15 Stack Reconciler（同步不可中断）

```
React 15 的 Diff（Stack Reconciler）

┌──────────────────────────────────────┐
│  setState 触发更新                     │
│         ↓                             │
│  从根节点开始递归遍历 Virtual DOM      │
│  ┌────────────────────────────┐       │
│  │  深度优先递归遍历            │       │
│  │  ├── 对比节点 A              │       │
│  │  │   ├── 对比子节点 C         │       │
│  │  │   ├── 对比子节点 D         │       │
│  │  ├── 对比节点 B              │       │
│  │  │   ├── 对比子节点 E         │       │
│  │  │   └── 对比子节点 F         │       │
│  │  └── ... 同步遍历，不可中断   │       │
│  └────────────────────────────┘       │
│         ↓                             │
│  一次性提交 DOM 更新                    │
│                                        │
│  问题：JavaScript 单线程，diff 计算    │
│  霸占主线程，用户输入/动画被阻塞！      │
│  1000个商品列表 → 输入框卡成PPT        │
└──────────────────────────────────────┘
```

React 15 的硬伤：**渲染是同步的，一旦开始就停不下来**。在复杂应用（如电商后台 1000 个商品列表 + 搜索框）中，diff 计算会霸占主线程，用户输入被阻塞，输入框"卡成 PPT"。

#### React 16+ Fiber Reconciler（可中断、分片、优先级调度）

Fiber 的**核心思想**：把一个大任务拆成 N 个小任务，**可以随时暂停、继续、甚至放弃**。

```
React 16+ Fiber Diff 流程

setState → 生成更新任务
              ↓
┌─────────────────────────────────────────┐
│         Render 阶段（可中断！）            │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │  Fiber 工作循环（时间切片）        │   │
│  │  ┌──┐  ┌──┐  ┌──┐  ┌──┐  ┌──┐   │   │
│  │  │A │→│C │→│D │→│B │→│E │→ ... │   │
│  │  └──┘  └──┘  └──┘  └──┘  └──┘   │   │
│  │    ↑ 空闲时逐个处理 ↑             │   │
│  │    │ 高优先级可插队  │             │   │
│  │    └── 时间不够？暂停，下次继续 ──┘   │
│  │                                     │
│  │  requestIdleCallback 利用浏览器空闲  │
│  │  执行 diff、构建 WIP Fiber 树、     │
│  │  标记 effectTag（Placement/Update/  │
│  │  Deletion）                         │
│  └──────────────────────────────────┘   │
│              ↓                          │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│       Commit 阶段（不可中断！）            │
│  ├── Before Mutation（DOM 操作前）        │
│  ├── Mutation（应用 DOM 变更，集中批量）   │
│  └── Layout（useLayoutEffect 执行）      │
│              ↓                          │
│        浏览器绘制 ↑                       │
└─────────────────────────────────────────┘
```


## 三、底层原理：Fiber 架构详解

> **考察频率：★★★★★ | 与 Diff 并列为必考核心**

### 3.1 Fiber 是什么？

Fiber 在 React 中有三层含义：

**① 作为架构**：React 16 引入的新协调引擎（Fiber Reconciler），替代 React 15 的 Stack Reconciler。

**② 作为数据结构**：每个 React 元素在内部对应一个 Fiber 节点对象，是一个 **JS 对象**，同时也是**一个工作单元**。

**③ 作为调度机制**：支持可中断、优先级调度的增量渲染模型。

### 3.2 Fiber 节点的核心数据结构

为什么用**链表**而非树？因为链表的遍历可以随时中断、记住当前位置、下次接着来，而传统递归树遍历一旦开始就停不下来。

```
Fiber 节点简化结构

const fiberNode = {
  // === 节点标识 ===
  type: 'div',              // 节点类型（函数组件/类组件/DOM元素）
  key: 'unique-key',        // diff 复用依据
  tag: HostComponent,       // 节点类型标记

  // === 实例引用 ===
  stateNode: domElement,    // 对应的真实 DOM 或组件实例

  // === 链表结构（关键！可中断遍历的基础） ===
  return: parentFiber,      // 指向父节点
  child: firstChildFiber,   // 指向第一个子节点
  sibling: nextSibling,     // 指向下一个兄弟节点

  // === 双缓冲 ===
  alternate: oldFiber,      // 指向上一次渲染的 Fiber，新旧对比用

  // === 副作用标记 ===
  flags: Placement,         // 标记需要执行的操作（插入/更新/删除）
  subtreeFlags: ...,        // 子树副作用标记

  // === 调度优先级 ===
  lanes: ...,               // 位掩码表示的优先级

  // === 状态 & 更新队列 ===
  memoizedState: ...,       // 当前状态（Hooks 链表挂载于此）
  updateQueue: ...,         // 更新队列（setState 产生的更新）
};
```

**Fiber 树的结构示意**：

```
             Fiber Root
                 │
              App (Fiber)
            /     |     \
         child  sibling sibling
          ↓       →       →
        Header → Main → Footer
          ↓       ↓
        child   child
          ↓       ↓
         Nav    Content
```

### 3.3 双缓冲机制（Double Buffering）

React 同时维护两棵 Fiber 树：

- **current Fiber 树**：当前屏幕上显示内容对应的 Fiber 树
- **workInProgress (WIP) Fiber 树**：正在内存中构建的新 Fiber 树

两棵树的节点通过 `alternate` 属性相互指向。当 WIP 树构建完成，React 在 Commit 阶段**直接切换指针**，WIP 树变为新的 current 树，实现"一次性切换"。

```
双缓冲切换示意：

     current 树           WIP 树
    ┌──────────┐       ┌──────────┐
    │  App     │←─────→│  App'    │
    │  ├─A    │       │  ├─A'   │
    │  ├─B    │       │  ├─C'   │  ← 新增
    │  └─C    │       │  └─B'   │
    └──────────┘       └──────────┘
         ↑                  ↑
    屏幕显示            内存中构建

          Commit 阶段：指针切换 →
              WIP 树变成新的 current 树
```

### 3.4 时间切片与优先级调度（Lanes 模型）

**时间切片**：Fiber 的工作循环在浏览器每帧的空闲时间执行单元任务：

```javascript
// Fiber 工作循环（简化）
function workLoop(deadline) {
  // 只要还有剩余时间，就继续干活
  while (nextUnitOfWork && deadline.timeRemaining() > 0) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
  }
  // 没时间了？下次再说
  if (nextUnitOfWork) {
    requestIdleCallback(workLoop); // 浏览器空闲时继续
  }
}
```

**Lanes 优先级模型**：使用**位掩码**表示多个优先级，可以合并和判断：

- 高优先级：用户输入、点击事件、动画
- 低优先级：数据预加载、非关键渲染
- 使用 `useTransition` 可将更新标记为低优先级


## 四、React vs Vue 核心对比（三大维度）

### 4.1 Diff 算法差异对比

| 对比维度 | React | Vue |
|---------|-------|-----|
| **Diff 起点** | 从根节点开始，**整棵虚拟 DOM 树**全量比较 | 从**变化的组件根节点**开始，局部比较 |
| **比较策略** | **全量比较**：每次更新遍历整个 Virtual DOM 树 | **局部比较**：通过响应式系统精准定位变化的组件 |
| **触发机制** | setState/useState 手动触发，父组件更新默认带动所有子组件（除非 React.memo） | 响应式系统（Proxy）精准收集依赖，仅受影响的组件重新渲染 |
| **数组更新** | 依靠 key 属性识别节点，无 key 或 key 错误时采用低效策略 | 双端比较（首尾指针交叉对比），没有 key 也能较高效处理 |
| **静态优化** | 无内置静态提升，依赖开发者手动优化（memo/useMemo） | 编译阶段静态节点提升（hoistStatic）、PatchFlag 标记动态节点 |
| **Fiber** | 有 Fiber 架构，支持可中断渲染 | Vue 3 无类似概念（本身更新粒度细，不需要） |

**差异的核心原因**：

Vue 的响应式系统通过 Proxy/Object.defineProperty 精准收集了数据依赖，知道"哪个组件用了哪个数据"，因此当数据变化时，Vue 能**直接定位**到受影响的组件，只对该组件及其子树进行 diff。React 的数据是不可变的，每次调用 setState 都意味着"声明一份新数据"，React 不知道具体哪些组件依赖了这个数据，所以默认从根节点开始全量遍历，需要开发者通过 React.memo 等手段手动阻断不必要的遍历。

**原理图对比**：

```
React Diff 流程（全量 + 可中断）：
setState({ name }) ────→ 从根开始遍历整棵树 ────→ Fiber 分片处理
                              ↓
                    ┌─────────────────────┐
                    │  Render 阶段（可中断）│
                    │  遍历所有 Fiber 节点  │
                    │  ↓                    │
                    │  Commit 阶段（不可中断）│
                    │  集中应用 DOM 变更     │
                    └─────────────────────┘


Vue Diff 流程（局部 + 响应式）：
name.value = 'new' ───→ 响应式系统精准定位 ───→ 仅 diff 受影响组件
                              ↓
                    ┌─────────────────────┐
                    │  组件级 diff          │
                    │  双端比较 + 静态提升   │
                    │  ↓                    │
                    │  生成 patch 补丁       │
                    │  ↓                    │
                    │  应用 DOM 变更         │
                    └─────────────────────┘
```

### 4.2 设计理念差异对比

| 对比维度 | React | Vue |
|---------|-------|-----|
| **核心公式** | `UI = f(state)`：UI 是状态的纯函数 | MVVM：数据驱动视图 + 视图自动响应数据变化 |
| **数据管理** | **不可变数据**：通过 setState 声明新数据，驱动重新渲染 | **响应式可变数据**：直接修改数据，框架自动追踪依赖并更新视图 |
| **模板语法** | JSX：JavaScript 的语法扩展，灵活但学习成本略高 | Template 模板语法 + 可选 JSX，直观但灵活性受限 |
| **更新粒度** | 组件级：setState 触发整个组件及子组件重新渲染 | 细粒度：组件内依赖追踪，可精确到具体绑定位置 |
| **角色定位** | **UI 库**：关注视图层，状态管理、路由等交给社区 | **渐进式框架**：提供更多开箱即用的解决方案 |
| **灵活性** | 极高（自由度高，方案选择多） | 适中（约束更多，但统一性更好） |

**API 用法对比示例**：

```javascript
// ========== React ==========
// 不可变数据：必须"替换"而非"修改"
const [user, setUser] = useState({ name: 'Tom', age: 20 })

// ✅ 正确：创建新对象
setUser({ ...user, age: 21 })

// ❌ 错误：直接修改不会触发更新！
// user.age = 21


// ========== Vue ==========
// 响应式数据：直接修改即可
const user = reactive({ name: 'Tom', age: 20 })

// ✅ 正确：直接修改
user.age = 21  // 自动触发视图更新
```

### 4.3 响应式/渲染触发机制对比

```
React 渲染触发链：
State 变化 → 调度更新（Lane 优先级）→ 从根开始协调（Reconciliation）
→ Diff 整棵 Fiber 树（可中断） → Commit DOM 更新

设计理念：纯函数式，UI = f(state)，每次渲染都是全新的执行


Vue 渲染触发链：
数据变化 → 响应式系统（Proxy setter）→ 精准通知依赖该数据的组件
→ 组件级 diff → patch DOM

设计理念：副作用追踪，数据变→组件自动更新，更像"观察者"
```

### 4.4 状态管理方案对比

| 方案 | 生态 | 核心特点 | 学习成本 | 包体积 |
|-----|------|---------|---------|-------|
| **Redux Toolkit** | React | 单一 Store、不可变更新、强大的 DevTools、中间件生态 | 较高 | ~45KB |
| **Zustand** | React | 极简 API、支持可变更新、无 Provider 包裹、基于 Hook | 极低 | ~3KB |
| **Pinia** | Vue | Vue 官方推荐、模块化 Store、TypeScript 友好 | 低 | ~5KB |

**API 用法对比**：

```javascript
// ========== Redux Toolkit ==========
const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment: (state) => { state.value += 1 } // Immer 允许"可变"写法
  }
})
const { increment } = counterSlice.actions
// 使用：dispatch(increment())


// ========== Zustand ==========
const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 }))
}))
// 使用：const count = useStore(s => s.count)


// ========== Pinia (Vue) ==========
const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  actions: {
    increment() { this.count++ } // 直接 this 修改
  }
})
// 使用：const store = useCounterStore(); store.increment()
```

**React 状态管理选型建议**：

- **远程状态**（API 数据、缓存）：优先 **TanStack Query / SWR**，而非 Redux——官方数据显示从 Redux 迁移到 TanStack Query 平均消除 80% 的状态管理代码
- **全局 UI 状态**（主题、语言、全局开关）：**Zustand** 是当前主流选择，体积仅 3KB，API 极简
- **复杂表单/多子值联动**：React 内置的 **useReducer** 即可胜任
- **大型团队需要强约束的项目**：**Redux Toolkit** 仍是最成熟的选择


## 五、性能优化核心考点

> **考察频率：★★★★ | 面试官最爱追问的模块**

### 5.1 渲染层面的优化

| 优化手段 | 作用 | 适用场景 |
|---------|------|---------|
| **React.memo** | 对 props 浅比较，props 不变则跳过渲染 | 纯展示组件，props 变化不频繁 |
| **useMemo** | 缓存计算结果，依赖不变不重新计算 | 复杂计算（排序、过滤大数组） |
| **useCallback** | 缓存函数引用，避免子组件因函数引用变化而重渲染 | 传递给 memo 子组件的回调函数 |
| **状态下放** | 将状态放到最小的使用组件中，减少父组件重渲染波及范围 | 状态仅被部分子树使用 |
| **Context 拆分** | 将不同维度的状态放到不同 Context，避免"全局一起刷新" | 全局状态较多 |

### 5.2 React 18 新特性相关的优化

| 特性 | 作用 | 典型场景 |
|-----|------|---------|
| **Automatic Batching** | Promise/setTimeout 中的 setState 也自动合并，减少渲染次数 | 所有异步操作中的多次 setState |
| **useTransition** | 将更新标记为低优先级（非紧急），不阻塞用户交互 | 搜索输入框：输入高优，结果列表低优 |
| **useDeferredValue** | 延迟某个值的更新，保持 UI 响应 | 列表筛选：输入即时响应，筛选结果可延迟 |
| **Suspense 增强** | 支持数据加载场景下的 Loading 状态管理 | 代码分割、异步数据获取 |

### 5.3 长列表优化（虚拟列表）

面试常考"渲染 10 万条数据如何优化"。

核心原理：只渲染可视区域内的元素。关键参数：

```
可视区域高度 / 单个元素高度 = 可显示元素数量
```

实测数据：Chrome 中全量渲染 10 万条数据首次渲染耗时超 8 秒，滚动帧率仅 15fps，内存占用 400MB+。使用虚拟列表后，仅渲染约 20-30 个 DOM 节点。


## 六、生态工具核心考点

> **考察频率：★★★**

| 工具 | 考察重点 | 典型面试题 |
|------|---------|-----------|
| **React Router v6** | 路由配置、嵌套路由、路由守卫、懒加载 | v6 相比 v5 的变化？如何实现路由拦截？ |
| **TanStack Query** | 缓存策略、自动重取、乐观更新、竞态处理 | 为什么用它替代 Redux 管理服务端状态？ |
| **Next.js** | SSR/SSG/ISR 区别、App Router、RSC | 简述 React Server Components 的工作原理 |
| **Webpack / Vite** | 代码分割、Tree Shaking、懒加载 | 如何分析并优化打包体积？ |
| **React Testing Library** | 测试策略、查询方法、异步测试 | 为什么不建议测试实现细节？ |


## 七、高频面试题速查（附答题要点）

以下汇总面试中最常被问到的延伸问题：

### 7.1 Diff 相关高频题

| 面试题 | 答题要点 |
|--------|---------|
| **React Diff 算法的核心策略？** | 三大假设：同层比较、类型相同复用、key 标识。时间复杂度 O(n)。 |
| **为什么 key 不能用 index？** | 数组增删时 index 错乱导致组件状态错位、DOM 复用错误、渲染 bug。应该用唯一稳定的业务 id。 |
| **React 和 Vue 的 Diff 有什么区别？** | ① React 全量比较（从根开始），Vue 局部比较（响应式精准定位）；② React 通过 Fiber 支持可中断，Vue 通过双端比较 + 静态提升优化；③ 根本差异在于 React 不可变数据 vs Vue 响应式数据。 |
| **为什么 Virtual DOM 不一定比真实 DOM 快？** | Virtual DOM 的优势在于**跨平台 + 可预测性**，而非绝对的性能优势。其价值是让开发者不用手动优化 DOM 操作。 |

### 7.2 Fiber 相关高频题

| 面试题 | 答题要点 |
|--------|---------|
| **Fiber 解决了什么问题？** | React 15 同步渲染阻塞主线程导致卡顿。Fiber 将渲染工作切片，支持可中断、优先级调度。 |
| **Fiber 为什么用链表结构？** | 链表可以随时中断遍历、记住当前位置、下次继续，而递归树遍历一旦开始就停不下来。 |
| **React 的两阶段渲染是什么？** | Render 阶段（可中断）：构建 Fiber 树、diff、标记副作用。Commit 阶段（不可中断）：集中应用 DOM 变更。 |
| **双缓冲机制是什么？** | current Fiber 树 + workInProgress Fiber 树，通过 alternate 互联。WIP 构建完成后指针切换，一次性完成更新。 |

### 7.3 Hooks 相关高频题

| 面试题 | 答题要点 |
|--------|---------|
| **Hooks 为什么不能放在条件/循环中？** | Hooks 依赖**调用顺序**形成链表结构。顺序乱了会导致状态错位。React 通过调用顺序来区分不同 hook 实例。 |
| **useState vs useReducer 如何选择？** | 单一简单状态用 useState，多子值联动/复杂状态逻辑用 useReducer，useReducer 更接近 Redux 模式。 |
| **setState 同步还是异步？** | React 18 之前：合成事件中异步，原生事件/定时器中同步。React 18 之后：自动批处理，统一异步。推荐用函数式更新避免闭包陷阱。 |
| **useEffect 的清理函数何时执行？** | 组件卸载时；依赖变化、下一次 effect 执行前。用途：清除定时器、取消订阅、防止内存泄漏。 |
| **useCallback 和 useMemo 区别？** | useMemo 缓存计算结果（值），useCallback 缓存函数引用。两者都是性能优化手段，不是必选项，过度使用反而增加开销。 |

### 7.4 常见误区汇总

| 误区 | 正确理解 |
|------|---------|
| ❌ Virtual DOM 一定比直接操作 DOM 快 | ✅ Virtual DOM 的优势是跨平台和开发可预测性，不是绝对的性能优势 |
| ❌ 所有场景都用 useCallback/useMemo 包裹 | ✅ 有成本！只在确实存在性能问题、子组件用了 memo 时才需要 |
| ❌ useState 是同步更新的 | ✅ React 18 中自动批处理，统一异步批量更新 |
| ❌ useEffect 空依赖等价于 componentDidMount | ✅ 不完全等价（执行时机不同，严格模式下会执行两次） |
| ❌ React 和 Vue 的设计理念完全对立 | ✅ 两者都使用 Virtual DOM + Diff，只是对开发者的约束和抽象层级不同 |


## 八、学习路线建议

基于面试优先级，建议按以下顺序复习：

```
第一阶段（基础语法）：JSX → 组件 → Props/State → 事件系统 → 受控/非受控
     ↓ 预计 2-3 天
第二阶段（核心特性）：Hooks 全家桶 → Context → React.memo → HOC
     ↓ 预计 3-5 天（Hooks 是重点）
第三阶段（底层原理）：Virtual DOM → Diff 算法 → Fiber 架构 → 渲染流程 → Lane 模型
     ↓ 预计 5-7 天（最耗时的部分，必须结合源码理解）
第四阶段（性能优化 + 生态）：优化手段 → React 18 新特性 → 状态管理 → Next.js
     ↓ 预计 3-4 天
第五阶段（刷题巩固）：用本文高频面试题自问自答，模拟面试场景
```

**结合 Vue 基础的高效记忆策略**：每学一个 React 概念，心中默念三个问题——① API 用法和 Vue 有什么不同？② 底层实现有什么区别？③ 为什么会有这种差异（设计理念）？这种差异化对比的方式能让你更快建立知识网络，在面试中展示出"知其然也知其所以然"的深度。


# Redux 高频面试考点全梳理

> **考察频率**：★★★★（React 生态中状态管理必问，大中厂高频）
> **难度**：基础到进阶均有，重点是理解**单向数据流**、**中间件机制**和**Redux Toolkit 实践**

---


## 一、Redux 核心概念（必考）

### Q1: Redux 的三大原则是什么？

难度 ⭐ | 频率 高

1. **单一数据源（Single Source of Truth）**：整个应用的状态存储在一棵对象树中，并且只存在于唯一一个 Store 中。
2. **State 是只读的**：唯一修改 State 的方式是派发（dispatch）一个 Action，这样所有的状态变更都可以被记录和追溯。
3. **使用纯函数（Reducer）来执行修改**：Reducer 接收旧 State 和 Action，返回新 State，不产生副作用。

**面试话术**：“这三大原则让 Redux 的可预测性极强。比如做时间旅行调试，就是基于‘只读 State + 纯函数’实现的。”

---


### Q2: Redux 的数据流是怎样的？

难度 ⭐⭐ | 频率 高

Redux 采用严格的**单向数据流**：

```
View (点击按钮)
  → dispatch(action)
    → Store 调用 Reducer(state, action)
      → Reducer 返回新的 state
        → Store 更新 state
          → View 重新渲染
```

**关键点**：
- 数据只能朝一个方向流动。
- 组件无法直接修改 Store，必须通过 Action 和 Reducer。

**加分回答**：“这个流程保证所有状态变更都有记录。Redux DevTools 就是通过记录这些 Action 实现时间旅行和状态回溯。”

---


### Q3: Action、Reducer、Store 分别是什么？它们是怎么配合的？

难度 ⭐ | 频率 高

- **Action**：一个普通 JS 对象，必须有一个 `type` 字段描述“发生了什么事”，可选 `payload` 携带数据。
- **Reducer**：一个**纯函数**，签名 `(state, action) => newState`，根据 action.type 决定如何更新状态。
- **Store**：全局唯一的数据仓库，提供 `getState()`、`dispatch(action)`、`subscribe(listener)` 方法。

**配合流程**：
1. 组件调用 `dispatch(action)`。
2. Store 把当前 state 和 action 交给 Reducer。
3. Reducer 返回新 state，Store 保存它。
4. Store 通知所有订阅者（通常是 React 组件重新渲染）。

---


## 二、React-Redux 集成（高频实践考点）

### Q4: 如何在 React 中连接 Redux？（mapStateToProps / mapDispatchToProps / Hooks）

难度 ⭐⭐ | 频率 高

**老方法（connect HOC）**：
```javascript
import { connect } from 'react-redux'

function Counter({ count, increment }) {
  return <button onClick={increment}>{count}</button>
}

const mapStateToProps = (state) => ({ count: state.count })
const mapDispatchToProps = (dispatch) => ({
  increment: () => dispatch({ type: 'INCREMENT' })
})

export default connect(mapStateToProps, mapDispatchToProps)(Counter)
```

**新方法（Hooks，推荐）**：
```javascript
import { useSelector, useDispatch } from 'react-redux'

function Counter() {
  const count = useSelector(state => state.count)
  const dispatch = useDispatch()
  return <button onClick={() => dispatch({ type: 'INCREMENT' })}> {count} </button>
}
```

**面试建议**：两种都写出来，并说明“目前项目倾向使用 Hooks，但 connect 在老项目中仍然常见”。

---


### Q5: useSelector 的性能问题——什么时候会导致不必要的重渲染？

难度 ⭐⭐ | 频率 中高

`useSelector` 默认使用 **`===` 严格相等**来判断是否重渲染。如果你返回的是一个新对象或新数组，即使内容相同，每次都会触发重渲染。

**问题示例**：
```javascript
// ❌ 每次返回新对象，永远触发渲染
const { count, name } = useSelector(state => ({ count: state.count, name: state.name }))
```

**解决方案**：
1. 多次调用 `useSelector`，每个返回一个原始值。
2. 传入第二个参数 `shallowEqual`（浅比较）。
3. 使用 `reselect` 创建带记忆的选择器。

```javascript
import { shallowEqual } from 'react-redux'

// ✅ 使用浅比较
const { count, name } = useSelector(
  state => ({ count: state.count, name: state.name }),
  shallowEqual
)
```

**加分回答**：“在大型应用中，选择器（Selector）的优化至关重要。我会用 `createSelector` 将衍生数据的计算缓存，避免在每次渲染时都重新计算过滤、排序等昂贵操作。”

---


## 三、中间件机制（Redux 核心扩展机制）

### Q6: Redux 中间件是什么？有什么作用？用过哪些？

难度 ⭐⭐ | 频率 高

**本质**：中间件是 `dispatch` 的增强器，它在 Action 到达 Reducer 之前拦截和处理 Action。

**作用**：
- 支持异步操作（如 `redux-thunk`、`redux-saga`）
- 日志记录（`redux-logger`）
- 崩溃报告
- 权限校验

**经典中间件**：
- **redux-thunk**：允许 Action 为函数，而非只能是对象。函数内可执行异步任务并 dispatch。
- **redux-saga**：使用 Generator 函数集中管理异步副作用，更强大但也更复杂。
- **redux-observable**：基于 RxJS，适合复杂异步流。

**手写简易中间件（面试加分）**：
```javascript
// 一个日志中间件
const loggerMiddleware = store => next => action => {
  console.log('dispatching', action)
  const result = next(action)
  console.log('next state', store.getState())
  return result
}
```

**链式调用机制**：中间件通过 `applyMiddleware` 组合，形成一个洋葱模型——`middleware1 → middleware2 → ... → 原始dispatch`。

---


### Q7: redux-thunk 和 redux-saga 的区别？如何选型？

难度 ⭐⭐ | 频率 中高

| 对比维度 | redux-thunk | redux-saga |
|---------|------------|------------|
| 学习成本 | 低（就是函数） | 高（需要学 Generator 和 saga 的各种 Effect） |
| 异步处理方式 | 在 Action 函数里写异步 | 在 Saga 文件里用 yield 集中处理 |
| 适用场景 | 简单异步（API 调用） | 复杂异步流程（竞速、取消、并发控制） |
| 测试 | 较难（函数内部直接调用） | 易（Generator 返回纯对象） |
| 体积 | ~2KB | ~14KB |

**选型指南**：
- 如果只是简单的 API 请求，用 **thunk** 就够了。
- 如果有复杂异步流（如多步表单提交、WebSocket 重连、竞态处理），用 **saga** 更合适。
- **Redux Toolkit 已内置 thunk**，默认就是推荐方案。

---


## 四、Redux Toolkit（现代 Redux，必考）

### Q8: 为什么有了 Redux 还需要 Redux Toolkit？它解决了什么问题？

难度 ⭐⭐ | 频率 高

Redux 有三大痛点：
1. **配置繁琐**：需要手动创建 Store、合并 Reducer、配置中间件、设置 DevTools。
2. **样板代码多**：每个状态都要写 Action 类型、Action 创建函数、Reducer 逻辑，文件极多。
3. **不可变更新麻烦**：在 Reducer 中需要手动扩展运算符或 `Object.assign`，容易出错。

**Redux Toolkit 的解决方案**：
- `configureStore()` 一行配置 Store，自动集成 thunk 和 DevTools。
- `createSlice()` 同时定义 Reducer 和 Action Creator，自动生成 Action 类型。
- `createAsyncThunk()` 简化异步请求的状态管理（loading/error/data）。
- 内置 **Immer**，在 Reducer 中可以直接“修改”状态，内部自动转为不可变更新。

**典型代码**：
```javascript
// 用 createSlice，Action 和 Reducer 在一起
const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment: (state) => { state.value += 1 } // 可直接“修改”，Immer 处理
  }
})
```

**面试话术**：“现在新项目直接上 Redux Toolkit，它是官方推荐的标准写法。原来 5 个文件能做的事，现在一个 slice 文件搞定。”

---


## 五、进阶与对比（大厂加分点）

### Q9: Redux 与 useReducer + useContext 对比，什么时候该用 Redux？

难度 ⭐⭐ | 频率 中

| 对比维度 | useReducer + useContext | Redux |
|---------|----------------------|-------|
| 使用场景 | 组件内或局部子树的状态共享 | 全局状态、多组件、复杂异步 |
| 中间件 | 无，需自己封装 | 完善（thunk/saga） |
| DevTools | 无 | 时间旅行、状态导出、Action 重放 |
| 性能优化 | 需手动处理 Context 拆分 | 细粒度订阅，选择器优化 |
| 包体积 | 0（内置） | ~45KB（RTK） |

**判断标准**：
- 状态只在少数几个组件间共享、没有复杂异步、不需要调试工具 → `useReducer + useContext`。
- 状态几乎整个应用都要用、团队协作、需要中间件和 DevTools 支持 → **Redux Toolkit**。

---


### Q10: Redux 与 Zustand 等轻量库对比

难度 ⭐⭐ | 频率 中

| 对比维度 | Redux Toolkit | Zustand |
|---------|--------------|---------|
| 包体积 | ~45KB | ~3KB |
| 学习成本 | 较高（需学 action/reducer/dispatch 模式） | 极低（只是一个 hook） |
| 模板代码 | 有一定量（slice/thunk 定义） | 极少 |
| 不可变更新 | Immer 内置 | 支持可变，也可用 Immer 中间件 |
| 中间件/DevTools | 强大且成熟 | 支持，但生态较小 |
| 适用场景 | 大型应用、团队协作、高可维护性 | 中小型项目、快速开发、追求极简 |

**典型 Zustand 用法**：
```javascript
const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 }))
}))
```

**面试话术**：“如果是我自己快速写 Demo 或小项目，用 Zustand 很爽；但在大团队里，Redux Toolkit 提供的约束和统一模式让代码更易维护和交接，这是它的核心价值。”

---


## 六、Redux 常见面试题速查

| 面试题 | 答题要点 |
|--------|---------|
| Redux 三大原则 | 单一 Store、只读 State、纯函数 Reducer |
| Action 可以不是对象吗？ | 原生 Redux 必须是对象，但用了 thunk 后可以是函数 |
| 为什么 Reducer 必须是纯函数？ | 保证可预测性和时间旅行调试 |
| 多个 Reducer 如何合并？ | `combineReducers`，每个 Reducer 管理独立的一片 state |
| 如何在 Redux 中处理异步？ | 中间件：thunk（函数 Action）、saga（Generator 集中管理） |
| Redux 中间件的洋葱模型是怎么实现的？ | 通过 `applyMiddleware` 和 `compose` 函数串联，每个中间件可以拦截并包装 dispatch |
| Redux 和 MobX 的区别？ | Redux 单向数据流、不可变数据、更可预测；MobX 响应式可变数据、更少模板代码 |
| Redux 状态持久化怎么做？ | `redux-persist`，将部分 Store 存入 localStorage，页面刷新后恢复 |

---

## 七、Redux 面试考前自测清单

- [ ] 能画出 Redux 单向数据流图
- [ ] 能手写 connect / useSelector + useDispatch 的基本用法
- [ ] 能说出中间件的原理和 applyMiddleware 的作用
- [ ] 能解释 Redux Toolkit 解决了原生 Redux 的哪些痛点
- [ ] 能区分 thunk 和 saga 的使用场景
- [ ] 能说明 useReducer + useContext 与 Redux 的选型标准
- [ ] 知道如何避免 useSelector 的无效重渲染

把这七点吃透，Redux 相关面试基本稳了。即使你项目里没怎么用 Redux，面试官也会认为你“有能力快速上手”。

在 Vue 生态里，状态管理从 Vuex 到 Pinia 的演进，和 React 生态中从 Redux 到 Zustand 的轻量化趋势很相似。理解 Pinia 不仅能帮你应对 Vue 面试，还能反哺你对 React 状态管理选型的判断。

---

## 一、Pinia 的使用（快速上手）

难度 ⭐ | 频率 高

### 1. 定义一个 Store

Pinia 用 `defineStore` 定义仓库，支持两种语法：**Options API 风格** 和 **Composition API 风格**。

**Options 风格（类似 Vuex）：**

```javascript
// stores/counter.js
import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  getters: {
    doubleCount: (state) => state.count * 2,
  },
  actions: {
    increment() {
      this.count++
    },
  },
})
```

**Composition 风格（更灵活，推荐）：**

```javascript
export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const doubleCount = computed(() => count.value * 2)

  function increment() {
    count.value++
  }

  return { count, doubleCount, increment }
})
```

### 2. 在组件中使用

```vue
<script setup>
import { useCounterStore } from '@/stores/counter'
import { storeToRefs } from 'pinia'

const store = useCounterStore()

// ✅ 直接解构会丢失响应式，需要 storeToRefs
const { count, doubleCount } = storeToRefs(store)
// ✅ actions 可以直接解构（函数引用不变）
const { increment } = store
</script>

<template>
  <div>{{ count }} - {{ doubleCount }}</div>
  <button @click="increment">+1</button>
</template>
```

**关键点**：`storeToRefs` 只解构 `state` 和 `getters`，保留其响应式；`actions` 可直接解构，不需要额外处理。

---

## 二、Pinia 底层原理

难度 ⭐⭐ | 频率 中

### 2.1 核心架构：为什么不需要 mutations？

Pinia 本质上是一个**基于 Vue 3 响应式系统的仓库工厂**。

```
defineStore(id, setup)
        ↓
  createSetupStore(id, setup)
        ↓
    创建 reactive 对象包裹 setup() 返回的数据
        ↓
    state、getters、actions 全部变成响应式
        ↓
    注入到 App 的 pinia 实例中，全局共享
```

- **state**：内部用 `reactive()` 包裹，实现深层响应。
- **getters**：其实就是 `computed`，在 Store 内部注册为计算属性。
- **actions**：普通的函数，但内部可以直接 `this.xxx` 访问 state 和 getters（Options 风格），因为 Pinia 在调用时绑定了上下文。

**为什么不需要 mutations？**

Vuex 要求 mutations 是为了**追踪同步变更**，但实际上 mutations 的存在只是为了配合 DevTools 记录状态快照。Pinia 直接去掉了这一层，**actions 就是可异步可同步**，同时 DevTools 同样能追踪每一次 action 的调用和状态变化——因为 Pinia 内部会在 action 执行前后触发订阅钩子。

### 2.2 如何实现“全局唯一”？

调用 `useCounterStore()` 时，Pinia 会检查当前注入的 `pinia` 实例中是否已有该 id 的 store：

- 有 → 直接返回缓存的 store（单例）。
- 没有 → 调用 `defineStore` 的 setup 创建新 store，并缓存。

这意味着**你可以在任何地方调用 `useCounterStore()`，拿到的都是同一个实例**。这比 Redux 的 `useSelector` 和 `useDispatch` 模式更简洁。

### 2.3 响应式原理深度绑定 Vue 3

Pinia 不自己管理订阅和分发，它完全依赖 Vue 3 的响应式系统。这带来两个好处：

1. **细粒度更新**：只有用到某个具体 state 的组件才会在该 state 变化时重新渲染，不像 Context 整个子树一起刷新。
2. **天然支持 Composition API**：store 内部可以直接用 `ref`、`computed`、`watch`，这些都会自动转成响应式状态。

---

## 三、Pinia vs Vuex：从 API 到底层，再到设计理念

难度 ⭐⭐ | 频率 高

| 对比维度 | Vuex 4（Vue 3 版本） | Pinia |
|---------|----------------------|-------|
| **API 设计** | `state` / `getters` / `mutations` / `actions` / `modules` | `state` / `getters` / `actions`（无 mutations） |
| **TypeScript 支持** | 需要额外类型声明，推断困难 | **完美自动推断**，`defineStore` 可推断出所有类型 |
| **模块化** | 嵌套 modules，命名空间，`map` 辅助函数 | **扁平结构**，每个 store 独立文件，直接导入 |
| **体积** | ~33KB | **~5KB** |
| **DevTools** | 完整支持 | **更好**，自动追踪 actions，时间轴清晰 |
| **服务端渲染** | 需要额外配置 | 内置 SSR 支持，逻辑更清晰 |
| **废弃 mutations** | 必须通过 mutation 改 state | **直接修改**（或通过 actions），DevTools 依然追踪 |
| **创建方式** | 单一 Store 实例，模块嵌套 | **多 Store 设计**，按功能划分，按需加载 |

### 3.1 API 用法差异

**Vuex 写一个计数器：**

```javascript
// store/index.js
export default createStore({
  state: { count: 0 },
  mutations: {
    INCREMENT(state) { state.count++ }
  },
  actions: {
    increment({ commit }) { commit('INCREMENT') }
  },
  getters: {
    doubleCount: (state) => state.count * 2
  }
})

// 组件中使用
import { useStore } from 'vuex'
const store = useStore()
store.dispatch('increment')
store.getters.doubleCount
```

**Pinia 同样功能：**

```javascript
// stores/counter.js
export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const doubleCount = computed(() => count.value * 2)
  function increment() { count.value++ }
  return { count, doubleCount, increment }
})

// 组件中使用
const counter = useCounterStore()
counter.increment()
counter.doubleCount
```

**不需要字符串 dispatch，不需要 mapMutations，没有魔法字符串**，这就是 Pinia 最直观的改善。

### 3.2 底层实现逻辑差异

**Vuex** 的核心是一个全局单例 Store，内部通过 **commit → mutation → 变更 state** 的同步链路确保状态可追踪。它自己维护了一套订阅系统（`store.subscribe`），不直接依赖 Vue 的响应式追踪 action 调用。

**Pinia** 利用 Vue 3 的 **effectScope** 和 **响应式系统** 来管理 store。每个 store 是一个独立的响应式作用域，当组件卸载且 store 不再被使用时，可以自动清理。而 Vuex 的 modules 是全局注册的，不会自动卸载，可能导致大型应用的内存占用。

**关于性能**：Pinia 的细粒度依赖收集意味着 `state.count` 变化时，只有用到它的组件会更新；Vuex 则订阅了整个 store，需要配合 `mapGetters` 做局部优化，否则容易全量重渲染。

### 3.3 设计理念差异

**Vuex 的设计哲学**：借鉴了 Redux 的单向数据流和中间件机制，强调严格的约束（mutation 同步修改）来保证状态变更的可预测性。适合大型、多人协作的项目，**约束性强，灵活性低**。

**Pinia 的设计哲学**：拥抱 Vue 3 的 Composition API，**类型安全、简单直观**。它不再硬性分离 mutation 和 action，相信开发者能在 action 里正确地同时处理同步和异步逻辑。就像前端状态管理从“强制规则”走向“开发者体验优先”。

**一句话总结**：Vuex 像老一辈严苛的教练，每一步都要求标准；Pinia 像新派的搭档，给你自由但保持规范。

---

## 四、Pinia vs Redux Toolkit（跨框架对比，强化记忆）

既然你在学习 React，对比一下 Pinia 和 Redux Toolkit 能帮你加深理解。

| 对比维度 | Pinia (Vue) | Redux Toolkit (React) |
|---------|-------------|----------------------|
| **核心概念** | store = reactive + computed + functions | store = configureStore + slices |
| **不可变性** | 可以直接修改（Vue 响应式代理） | **必须不可变更新**（但 Immer 让你写“可变”代码） |
| **类型推断** | 自动完美（TS 原生支持） | 良好（需要一些 Hook 类型定义） |
| **异步处理** | 直接写在 actions 里（async/await） | createAsyncThunk 或 RTK Query |
| **选择器** | 不需要（响应式依赖追踪） | 需要 useSelector，选择性订阅 |
| **体积** | ~5KB | ~45KB |
| **学习曲线** | 极低 | 中等（需要理解 action/reducer/dispatch） |

**跨框架启示**：
- React 的函数式 + 不可变数据哲学催生了 Redux 严格的单向流。
- Vue 的响应式系统让 Pinia 可以“肆无忌惮”地直接修改状态，依赖追踪自动处理更新。
- 两者都走向了“提供更好的开发体验，减少模板代码”的道路。

---

## 五、常见面试追问与误区

**Q：为什么 Pinia 可以没有 mutations？**  
A：Vue 的响应式系统能追踪到 action 中对 state 的每次修改，不需要 mutation 作为中间人来记录同步变更。Pinia 通过包装 action，在内部触发 DevTools 钩子，依然能实现状态快照。

**Q：Pinia 为什么比 Vuex 更省内存？**  
A：Pinia 的 store 是按需创建的，组件卸载且无引用后可以被垃圾回收；Vuex 的 modules 挂载在全局 store 下，生命周期与应用一致。

**Q：如何在 Pinia 中实现中间件或插件？**  
A：Pinia 支持 `pinia.use(plugin)`，插件可以监听 store 的 `$subscribe`（状态变化）和 `$onAction`（action 调用前后），实现日志、持久化、权限校验等。

**Q：误区：Pinia 的 store 就是全局单例，和 Vuex 没区别？**  
A：不完全一样。Pinia 虽然调用同一个 store 函数返回同一个实例，但多个 store 之间是扁平的、独立的作用域，不需要像 Vuex 模块那样手动命名空间。

---

**总结一句话**：Pinia 是 Vue 3 时代的 Vuex 替代品，它抛弃了 mutations 的冗余，完美利用响应式系统实现轻量、类型安全、可自动清理的状态管理，开发者只需要会用 Composition API，就能立刻上手 Pinia。