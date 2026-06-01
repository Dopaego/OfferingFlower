# mqtt 

## 基本问题
1. 概念： 是一种基于发布/订阅模式的轻量级消息传输协议，【客户端-服务器架构的发布/订阅模式】，数据发布者不会根据用户是谁而发送消息，而是有无订阅要发布消息的主题来发送消息。
适合 ***频繁推送场景，轻量级***

- 相对于HTTP协议的优势：请求-响应模型，每次都要建立连接，适合低频交互
- 相对于websocket的优势：长连接双工通信，但需要自己实现心跳和断线重连。

2. 什么是QoS？项目中用的哪个级别？
- QoS 0（最多一次）：发送后不确认，可能丢失，但最快
- QoS 1（至少一次）：确认机制，可能重复
- QoS 2（恰好一次）：四次握手，最可靠但最慢

- 遗嘱消息用 QoS 2（确保断线通知一定到达）
- 普通消息默认QoS 0（工单推送允许少量丢失，更注重实时性）

3. 遗嘱消息是什么？ 为什么要用？
当客户端异常断开，而非主动调用disconnect时，会自动将遗嘱消息【Will Message】发送给指定的topic

- 监控车辆在线状态
- 在客户端建立连接的时候配置好了遗嘱消息，当异常断开时，发送willMessage
- 后台可以判断出监控客户端已经下线。

## 项目相关：

简历描述：
- 负责车辆监控系统的实时通信模块，采用MQTT协议，同时结合redux-saga管理MQTT生命周期，支持自动重连、遗嘱消息等特性。

润色后描述：
- 参与车辆监控系统实时通信链路开发：基于 MQTT.js + Redux-Saga 完成实时消息订阅与状态同步，基于 WebRTC 实现多路视频流播放与弱网重连，并通过 MQTT 回传视频延迟/码率/帧率数据


### 提问

#### 1. 为什么要用redux-saga管理MQTT，不用普通回调






### 整体代码编写逻辑
1. /src/fetch/mqtt/index.ts 做了MQTT客户端的封装，比如定义了基础的mqtt客户端的连接状态，还有客户端的回调事件有那几类。同时定义出来MQTTClient类，构造函数里也有相应的调用mqtt原生方法，传入url去建立连接。
2. redux/rootSagas.ts Saga中集成MQTT。使用了eventChannel，收敛MQTT的回调方法，避免直接回调破坏react的单向数据流，而且可以追踪和测试函数。比如说 saga中的mqtt执行了onConnect函数，那么这个onConnect函数中会存在一个eventChannel的emitter，saga捕捉到对应type的emiiter后便可以执行后续的异步操作，比如yield等等。
同时还给eventChannel设置了buffer，避免一瞬间推送大量消息后的丢失

[因为MQTT是回调式的，直接用会破坏React数据流，
所以我用eventChannel把MQTT的回调转成saga可监听的迭代器。
saga通过take监听channel，收到消息后put分发Redux action，
最终更新store，组件通过useSelector订阅更新。

我还给eventChannel配置了expanding buffer（32条），
防止消息突增时丢失。]

### MQTT架构描述：

1. 连接层（MqttClient类）：
- 封装mqtt.js，定义好状态枚举，提供统一的连接和发布订阅的接口
- 配置好： 5秒自动重连、4秒超时、遗嘱消息等

2. 桥接层（EventChannel）：
- MQTT是外部事件源，利用 eventChannel将其接入 Redux-Saga生态
- 把MQTT的回调API，转换成Saga可take的迭代器。
- 配置buffer.expanding（32）防止消息在突增时的丢失

3. 状态层（Redux + Saga）：
- saga通过take（mqtt Channel）监听事件，该channel是封装过mqttClient的，
- saga监听到对应类型的事件后，执行put，便可以通过事件类型分发Redux action。
- 最终store更新，组件通过useSelector订阅更新。

数据单向流动 MQTT -> Saga -> Redux -> React

#### 整个MQTT的生命周期：

1. 连接过程：
页面触发"create_MQTT_CLIENT"
eventChannel 内部注册的全局监听器收到事件后创建 MqttClient。
客户端建立连接后，会在连接回调里发出 CONNECTION_OK 事件，
并按配置订阅对应 topic。
2. 接受信息过程：
MQTT 客户端收到消息后，会进入 onMessage 回调；
回调里调用 emitter ，把 MQTT 消息写入 eventChannel。
saga 侧通过 take(mqttChannel) 持续消费这些消息，再根据消息类型 put 对应的 Redux action。
redux通过reducer更新store
组件通过useSelector更新UI

这个过程实现了MQTT和业务层的解耦。
本质来讲MQTT其实是我们拿到信息的工具，这些信息都是与业务相关的。
而在开发的时候，我们天然应该将工具层和业务层解耦。不管是在写页面的时候会单独分出utils来，还是现在做的工作将MQTT单独封装一层。这样不仅便于管理项目、编写代码、提高代码的复用性，更是一种开发规范，使我们后期的调试可以更快速的找准问题在哪里。
而如何收敛分散的MQTT消息并规范到业务层中的Redux，其实就是Saga中eventChannel的作用：channel不仅实现了调用封装好的MQTTCLIENT相关的api，也实现了对MQTT的监听和实现监听后要处理的任务比如说执行回调函数来更新视图等情况。而最后对store的更新也是使用的成熟的Redux。因为Saga本质也是一个Redux的中间件吧。因为有些时候要执行异步操作，所以选择了Saga。

因为 MQTT 是长连接推送场景，消息来源独立于页面生命周期，放在 saga 里统一管理更适合，避免组件层出现大量订阅、解绑和业务判断逻辑。

MQTT 属于外部事件源，它的消息到达是异步且持续的，不适合让页面组件直接监听和处理，
所以我用 redux-saga 的 eventChannel 把它封装成 saga 可消费的消息通道。
这样业务层只关心标准化后的 action 和 store，不直接依赖 MQTT 客户端，实现了通信层和业务层解耦。
同时 saga 很适合承接这类异步副作用逻辑，比如连接建立、消息消费、按 messageType 分发 action，这样 reducer 仍然保持纯函数，整个状态流转也更清晰。
