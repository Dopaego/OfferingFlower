# Redux

## 1. Redux三大特性

1. 单一数据源： 整个应用的状态被存在一颗对象树中，并且只存在于唯一一个Store中
2. State是只读的：修改一个Store的唯一方式是 dispatch一个Action，这样所有的状态可以被记录和追溯
3. 使用reducer来执行修改：reducer接受旧的State和Action，返回新的State。

数据流：view进行了操作 -> dispatch（action） -> store调用reducer接收（state， action） -> reducer返回新的 state -> store 更新state，通知所有订阅者更新 -> view重新渲染，。
可以看出来数据流是单向流动的，视图组件都无法直接修改state。保证了所有状态变更都有记录。

>Action、Reducer、Store 分别是什么？它们是怎么配合的？

难度 ⭐ | 频率 高

- **Action**：一个普通 JS 对象，必须有一个 `type` 字段描述“发生了什么事”，可选 `payload` 携带数据。
- **Reducer**：一个**纯函数**，签名 `(state, action) => newState`，根据 action.type 决定如何更新状态。
- **Store**：全局唯一的数据仓库，提供 `getState()`、`dispatch(action)`、`subscribe(listener)` 方法。

redux出现的意义：由于react的单向数据流，想管理数据状态非常复杂的应用比如说跨层级，通过props和state来管理是非常复杂且实现起来也会冗杂很多，因此出现了redux可以将所有的state集中到组件顶部，灵活地将所有的state分发给需要它的组件。

底层实现的原理：**把store直接集成到React应用的顶层props里面，只要各个子组件能访问到顶层props就行了**
<Provider> <APP> </Provider>

## 2. createStore做了什么

核心逻辑：

- 维护一个state
- 维护一个listeners树组

提供三个方法：

- getState
- dispatch
- subscribe，添加listener

关键点：
dispatch 内部执行reducer，修改state，更新后，遍历执行所有listeners

本质就是一个 **带状态的 发布订阅模型**

## 3. 关于 reducer 为什么必须是 **纯函数** ？

纯函数指的是：

1. 相同的输入必须得到相同的输出。结果只依赖于传入的参数，不依赖任何外部状态
2. 函数执行过程中不会修改外部状态。

意义：
Redux 应该支持DevTools时间旅行，能够记录每一次action以及对应的前后状态。如果reducer不纯，可能会导致重放action得到不同的新状态，时间旅行功能就失效了。
而且Redux 的本质是是一个可预测的状态容器，为了管理复杂的全局状态而存在，如果状态的更新由于非纯函数的某些操作而变得混乱，背离了Redux的设计初衷。

## 4. state不可以直接修改，而是要返回一个新的值是为什么呢

Redux通过浅比较引用变化来检测状态更新，如果直接修改state，引用地址一样，无法捕捉到内部状态是否变化，便不会触发重新渲染，而且devTools的撤销、重放的功能，都是依赖action前后的状态快照，当state不变【引用地址一样】的时候，也不会添加新的状态快照。调试工具也失效了

## 5. 为什么一次dispatch会导致多组件渲染

因为redux在state发生变化时是全量广播，在dispatch后，订阅某个store的组件都会收到通知，它不会判断某个listenr是否只关心state的某个特定切片。只要订阅过的都会被通知。但组件是否真的重新渲染，取决于返回值的比较：

- useSelector： listener执行的时候调用selector获取新的值，与旧值进行浅比较来判断是否需要重新渲染组件，避免了不必要的重复渲染。
- connect： 执行mapStateToProps生成新的props，与旧的浅比较判断是否需要重新渲染。

Redux的subscribe 是 “粗颗粒”的，在订阅的时候订阅的是整个store，尽管在使用的时候可能只是使用内部的某个部分，但整体变的时候会通知所有listener，所以是“粗颗粒的”

如果想优化：1. useSelector中使用浅比较 2. reselect创建记忆化selector 3.使用state分片
**Redux 的 dispatch 会触发所有订阅者的监听函数（全量广播），但 React-Redux 通过 useSelector 的返回值浅比较来控制实际渲染。若 selector 每次返回新引用（如未使用记忆化或总是构造新对象），则所有订阅组件都会重新渲染，造成性能浪费**

## 6. 中间件原理

### 为什么需要中间件

在Redux中的dispatch默认是同步的，一旦调用dispatch，那么就会立即执行reducer并进行同步更新state，会导致无法直接处理异步操作，比如说定时/请求API的操作。
middleware的出现便能够，在action到达reducer之前，专门处理副作用。

### middleware的本质

一个函数链，每个中间件都可以 拦截、延迟、替换、终止 action，或者在action之后插入额外逻辑。

1. 拦截dispatch： 在触发action前后，执行自定义代码
2. 增强action： 允许dispatch
3. 组合： 多个中间件串联，形成洋葱模型。

redux-saga其实就是一个中间件。可以执行复杂的异步流程【管理Mqtt的生命周期？？】

### middleware的使用

每个中间件都 接收三个参数：

- store: 提供getState和dispatch
- next： 下一个中间件的dispatch函数
- action： 当前被派发的action

### redux-thunk的原理【最常用的异步中间件】

是一个函数，包装了延迟执行的表达式。它允许dispatch可以接受一个函数，并在函数内部执行异步逻辑，在手动派发普通的action，当检测到action是一个函数时，thunk会执行函数并且注入dispatch和getState，异步任务完成后在手动派发普通action。

### 7. Redux中的Toolkit

RTK解决了原生Redux配置繁琐、代码冗余。中间件配置复杂的问题，开发时更简洁、效率更高。
核心优势：

- 内置Immer，允许在reducer中“直接修改state”，Immer底层自动生成不可变更新，无需手动展开对象或者数组。
- 简化了reducer的写法，用createSlice自动生成action creators和action types，不需要手动写switch case和单独的action文件
- 内置了thunk，直接封装了异步请求，自动生成pending/fufilled/rejected三种action无需额外配置中间件
- 自动生成action slice.actions自动生成与reducer同名的action creators，减少样板代码。

本质其实是，Redux的最佳实践都打包成一个开箱即用的工具集合

### 8. 关于redux的性能优化

redux的订阅是粗颗粒的，所以会导致state发生改变的时候，会通知所有listener，如果没有做好合理的订阅，会导致组件进行重复的渲染而影响性能，所以针对redux的性能优化，往往是细节化订阅来实现的。

#### 使用reselect做缓存【记忆化Select】

如果selector 每次调用会返回一个新的对象或者数组，那么即使数据没变，但由于比较的时候是浅引用，也会重新渲染组件

使用reselect的createSelector 创建记忆化selector，只有当依赖的state切片发生变化的时候，才重新计算，并返回新引用，否则返回上一次缓存的引用。
比如依赖state.todos, 即便state变动通知了，但todos不变就不需要重新渲染。

#### useSelector + shallowEqual【浅引用】

useSelector默认使用 === 比较，当返回对象或者数组的时候容易因每次新引用导致无效渲染，传入shallowEqual，便只对比对象的第一层属性值，如果属性值没变则不会触发重渲染。

#### 拆分state，降低订阅的颗粒度

// ❌ 订阅整个 store
const state = useSelector(state => state);
// ✅ 只订阅需要的字段
const userName = useSelector(state => state.user.name);
const cartItems = useSelector(state => state.cart.items);

#### 结构共享

只修改需要变化的地方，其余地方复用旧引用，Redux Toolkit内置了Immer可以自动做结构共享。
在我们更新深层数据的时候，仅仅在新路径上创建新对象，其他所有未受影响的节点应该直接复用旧引用。不仅能减少内存分配，还能让引用比较快速识别出没有变化的地方。Immer直接实现了这一部分。

#### 批量更新

在react18之前，多个dispatch在 settimeout Promise、原生事件会导致多次同步渲染，性能比较差。

在react 18 中默认开启了自动批处理，都会合并成一次渲染。createRoot
