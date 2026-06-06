# React

## 1. React 中的Diff算法

Diff算法常用于 尽量少次数的操作更新真实DOM，使真实DOM渲染出的页面是新的虚拟DOM树对应的页面，状态变化时，React会创建一颗新的虚拟DOM树，会与旧的虚拟DOM树进行对比，找出最小的变更合集，再批量更新到真实DOM上。避免了重排重绘阻塞主线程导致用户使用体验变差。

React中的Diff算法主要的三大策略：1. 同级元素比较 2. 类型不同的元素直接替换 3.通过key识别稳定节点

### 执行流程

1. 同层元素比较Tree Diff： 同层比较，深度优先
只比较同一父节点下的子节点，DFS，如果某个节点出现了跨层级移动，那么会直接删除该节点以及该节点下的子树，创建新节点
2. 类型不同直接替换Component Diff： 类型不同，直接替换
对于组件间的比较，只要类型不同，那么会直接替换整个组件树，即使新旧组件内容一致，比如div -> p，也会销毁旧组件、创建新组件
3. 通过Key识别稳定节点Element Diff： 通过key判断节点能否复用
同一层级的子节点，可以通过key来识别节点能否稳定复用，key相同直接复用。

``` text
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

## 2. Fiber架构解析

### 2.1 基本概念

是react中可中断、优先级调度的增量渲染模型，在每个react元素内部都对应了一个Fiber节点对象。
而Fiber节点其实是链表的一个节点，因为链表的遍历可以中断，防止停不下来导致了阻塞主线程进而影响用户的使用体验
Fiber节点的常见属性

```typescript
// Fiber 节点简化结构

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

### 2.2 双缓冲机制

React同时维护两棵Fiber树：

- currentFiber： 当前屏幕上显示对应的Fiber树
- workInProgress Fiber： 正在内存中构建的新的Fiber树

两棵树的节点通过 alternate 属性互相指向，当WIP树构建完成，React在Commit阶段，直接切换指针，使WIP树变为current树，实现一次性切换

### 2.3 时间切片与优先级调度（Lanes 模型）

**时间切片**：Fiber 的工作循环在浏览器每帧的空闲时间执行单元任务：
在Fiber 工作循环中，只有当 有剩余时间才继续实现fiber树的更新，没有空闲时间就不继续，保证了不阻塞优先级比较高的事件执行

**Lanes 优先级模型**：使用**位掩码**表示多个优先级，可以合并和判断：

- 高优先级：用户输入、点击事件、动画
- 低优先级：数据预加载、非关键渲染
- 使用 `useTransition` 可将更新标记为低优先级

react 在diff时 ，分为了两个阶段

- Render阶段：遍历所有 Fiber节点，可以被中断
- Commit阶段： 开始进行DOM变更，不可以被中断

## 3. React中的性能优化

### 3.1 渲染层面的优化

| 优化手段 | 作用 | 适用场景 |
| --------- | ------ | --------- |
| **React.memo** | 对 props 浅比较，props 不变则跳过渲染 | 纯展示组件，props 变化不频繁 |
| **useMemo** | 缓存计算结果，依赖不变不重新计算 | 复杂计算（排序、过滤大数组） |
| **useCallback** | 缓存函数引用，避免子组件因函数引用变化而重渲染 | 传递给 memo 子组件的回调函数 |
| **状态下放** | 将状态放到最小的使用组件中，减少父组件重渲染波及范围 | 状态仅被部分子树使用 |
| **Context 拆分** | 将不同维度的状态放到不同 Context，避免"全局一起刷新" | 全局状态较多 |

## 4. React中的Hooks

### 4.1 React中常见的Hooks

- useState： 让组件拥有状态，状态更新时，组件重新渲染，更新时，必须使用setState，而且在react18后，如果一个事件处理函数中多次调用setState，会合并成一次渲染，尽可能减少重排重绘
- useEffect： 用于副作用处理，在浏览器绘制后异步执行。依赖数组通常分为三种情况：1. [] 2. [state] 3. 不传。对应的情况： 1.[] 只在首次渲染后调用useEffect中传入的副作用函数 2. state更新后执行函数 3. 每次渲染后都要执行。
- useContext: 可以跨组件层级传递数据，无需手动层层传递props。但是当Context的value发生变化后，会引起所有用到该Context的组件重新渲染，所以必要时可以用useMemo包裹Context Value
- useRef：返回一个 可变的引用对象，修改该对象不会导致组件的重渲染，常用于获取DOM节点，保存任意的可变值。如果一个变量需要跨渲染周期保持，但又不需要驱动UI变动，此时可以使用useRef引用
- useMemo： 缓存值，只有当依赖值变了才重新计算，避免了组件内部进行无意义的重计算。不然每次重渲染后都会重新计算某个值，但该值可能并没有发生变化。
- useCallback： 缓存函数，如果父组件传给子组件一个函数，当父组件重新渲染时，函数也会重新渲染，函数引用变化也会导致被传入到的子组件也会发生不必要的重新渲染。此种情况下，可以将函数用useCallback包裹。子组件配合着export default React.memo(Child)
- useReducer： 管理复杂状态，在实际的组件文件可以只进行dispatch选择对应的操作和传参，具体的执行函数放到专门的reducer函数中。如果一个对象的不同字段互相影响，会导致使用setState需要重复在很多地方复写很多相同的函数，但是使用useReducer可以都归纳到reducer中。

### 4.2 Hooks的实现原理

Hooks数据保存在Fiber节点的memorizedState属性中，每个react组件对应了一个FiberNode
Fiber.memoizedState 是Hook链表的入口，每个 Hook 节点通过 next 指针形成单向链表，顺序就是在组件里写 Hooks 的顺序。也正因此 Hooks不可以被写在条件中/循环中，因为是这里的Hooks是单向链表。

## 5. react中的状态管理与通信

### 5.1 Redux三大特性

1. 单一数据源： 整个应用的状态被存在一颗对象树中，并且只存在于唯一一个Store中
2. State是只读的：修改一个Store的唯一方式是 dispatch一个Action，这样所有的状态可以被记录和追溯
3. 使用reducer来执行修改：reducer接受旧的State和Action，返回新的State。

数据流：view进行了操作 -> dispatch（action） -> store调用reducer接收（state， action） -> reducer返回新的 state -> store 更新state -> view重新渲染，。
可以看出来数据流是单向流动的，视图组件都无法直接修改state。保证了所有状态变更都有记录。

>Action、Reducer、Store 分别是什么？它们是怎么配合的？

难度 ⭐ | 频率 高

- **Action**：一个普通 JS 对象，必须有一个 `type` 字段描述“发生了什么事”，可选 `payload` 携带数据。
- **Reducer**：一个**纯函数**，签名 `(state, action) => newState`，根据 action.type 决定如何更新状态。
- **Store**：全局唯一的数据仓库，提供 `getState()`、`dispatch(action)`、`subscribe(listener)` 方法。

redux出现的意义：由于react的单向数据流，想管理数据状态非常复杂的应用比如说跨层级，通过props和state来管理是非常复杂且实现起来也会冗杂很多，因此出现了redux可以将所有的state集中到组件顶部，灵活地将所有的state分发给需要它的组件。

底层实现的原理：**把store直接集成到React应用的顶层props里面，只要各个子组件能访问到顶层props就行了**

<Provider> <APP> </Provider>

### 5.2 React组件间通信方式

1. 父 -> 子：通过props
2. 子 -> 父： 父组件通过props传递回调函数
3. 兄弟组件： 状态提升到共同父组件，或者使用Context/Redux
4. 深层嵌套：Context API 或者状态管理库(Redux)

### 5.3 redux-saga

1. 使用 createSagaMiddleware 方法创建 saga 的 Middleware ，然后在创建的 redux 的 store 时，使用 applyMiddleware 函数将创建的 saga Middleware 实例绑定到 store 上，最后可以调用 saga Middleware 的 run 函数来执行某个或者某些 Middleware 。

2. 在 saga 的 Middleware 中，可以使用 takeEvery 或者 takeLatest 等 API 来监听某个 action ，当某个 action 触发后， saga 可以使用 call 发起**异步操作**，操作完成后使用 put 函数触发 action ，同步更新 state ，从而完成整个 State 的更新。

## 6. 组件与生命周期

### 6.1 类组件与函数组件的区别

- 类组件：使用class定义，有生命周期和状态。内部可以保存state
- 函数组件： Hooks出现前，没有状态，后面通过Hooks实现状态和生命周期逻辑。

对于类组件来说，存在生命周期：

1. 挂载阶段： consturctor -> render -> componentDidMount
2. 更新阶段： shouldComponentUpdate -> render -> componentDidUpdate
3. 卸载阶段： componentWillUnmount

类组件功能最为完备和强大，某些**特殊用途**(如错误边界)组件只能写成类式组件。函数组件没有this困扰且代码简洁，大部分的普通组件都可以写成函数组件

### 6.2 受控组件和非受控组件

- 受控组件： 表单值由React状态控制（value 绑定 state），state发生变化，视图重新渲染。
- 非受控组件： 表单数据由 DOM 自身管理。React 不设置 value 属性，而是通过 ref 在需要时（如提交时）直接从 DOM 获取当前值。用户交互不会触发表单组件的重新渲染。
**“表单” 这个词是泛指所有可供用户输入或选择数据的交互元素**

// 受控组件
<input value={text} onChange={e => setText(e.target.value)} />

// 非受控组件
<input ref={inputRef} defaultValue="hello" />

### 6.3 setState 是同步还是异步？

首先 setState后做的工作：
调用 setState 函数之后，React 会**将传入的参数对象与组件当前状态**合并，然后触发调和过程，经过调和过程，React 会以相对高效的方式，根据新的状态构建 React 元素树并重新渲染整个 UI 界面
在 React 得到元素树之后， React 会自动计算出新旧树节点的差异，根据差异对界面进行最小化重新渲染，React 的差异算法能相对精确得知发生改变的节点，保证按需更新

关于同步异步：

- react18 之前：
  在 setTimeout、原生 DOM 事件、Promise 回调中，setState 是同步更新。setTimeout、原生事件（addEventListener）、Promise.then 等回调不在 React 的调用栈内，执行时 React 已经退出自己的上下文，isBatchingUpdates 默认为 false。此时每个 setState 调用都会立即触发一次重新渲染（同步更新）。
  在其他情况下都是异步更新【组件生命周期或 React 合成事件】

- react18 之后：
  都改成了自动批处理
React 18 通过引入全局调度器（Scheduler）和并发模式，将所有 setState 调用统一视为可调度的更新任务，不再依赖调用栈中的 isBatchingUpdates 标志。这样，即使在 setTimeout、Promise、原生事件回调中，多个 setState 也会被自动合并成一次批处理更新。

异步更新的意义：如果是同步更新，那么会导致的结果是每调用一次setState会导致页面的重渲染，造成较大性能压力，因此会多次收集setState，一次性更新dom

异步在这里的意思是：不会立即同步执行渲染，而是将更新放入队列，在事件循环的某个阶段统一处理。状态本身在调用 setState 后就已经标记为“待更新”，但组件不会立刻重新渲染。
