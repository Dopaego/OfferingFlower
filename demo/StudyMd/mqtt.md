# mqtt

## 基本问题

1. 概念： 是一种基于发布/订阅模式的轻量级消息传输协议，【客户端-服务器架构的发布/订阅模式】，数据发布者不会根据用户是谁而发送消息，而是有无订阅要发布消息的主题来发送消息。
适合 ***频繁推送场景，轻量级***

- 相对于HTTP协议的优势：请求-响应模型，每次都要建立连接，适合低频交互
- 相对于websocket的优势：长连接双工通信，但需要自己实现心跳和断线重连。

2.什么是QoS？项目中用的哪个级别？

- QoS 0（最多一次）：发送后不确认，可能丢失，但最快
- QoS 1（至少一次）：确认机制，可能重复
- QoS 2（恰好一次）：四次握手，最可靠但最慢

- 遗嘱消息用 QoS 2（确保断线通知一定到达）
- 普通消息默认QoS 0（工单推送允许少量丢失，更注重实时性）

3.遗嘱消息是什么？ 为什么要用？
当客户端异常断开，而非主动调用disconnect时，会自动将遗嘱消息【Will Message】发送给指定的topic

- 监控车辆在线状态
- 在客户端建立连接的时候配置好了遗嘱消息，当异常断开时，发送willMessage
- 后台可以判断出监控客户端已经下线。

## 项目相关

简历描述：

    - 负责车辆监控系统的实时通信模块，采用MQTT协议，同时结合redux-saga管理MQTT生命周期，支持自动重连、遗嘱消息等特性。

    润色后描述：

    - 参与车辆监控系统实时通信链路开发：基于 MQTT.js + Redux-Saga 完成实时消息订阅与状态同步，基于 WebRTC 实现多路视频流播放与弱网重连，并通过 MQTT 回传视频延迟/码率/帧率数据

### 提问

#### 1. 为什么要用redux-saga管理MQTT，不用普通回调

对于我们的系统来讲，MQTT其实是我们实时订阅车辆信息的工具，业务触发常见MQTT客户端条件后，就会创建出MQTT客户，并且传入topic，去订阅到相应的信息。
这里其实是参考了全局单例式 的设计模式，如果使用普通回调，那么会在我们的业务层的代码中，涉及大量的处理MQTT订阅消息的代码，不便于后期的管理和维护。
既然是作为全局对象的MQTT客户端，那么根据开发经验，用Redux来管理再合适不过，这样可以保证了React中的单向数据流，可以统一的由redux来管理，而redux-saga本质上也是一个中间件，将MQTT和redux连接起来了，实现了MQTT作为通信工具和业务代码的解耦。无论从编写代码角度还是后期维护的角度，都更加系统化、工程化了。而这里使用saga也是因为，我们收到了很多的mqtt信息，可能需要处理一些effect副作用，异步操作，与saga也更加契合
在我们的系统中，MQTT其实是作为外部事件源，它的消息接入天然伴随监听、分发、状态同步等副作用处理
如果使用普通回调，那么在我们的业务层代码中，需要处理很多关于MQTT订阅的函数，而且页面创建还要涉及创建MQTT客户端的任务，而且我们的系统更偏向于使用全局单例模式创建MQTT客户端，那么还要避免创建重复MQTT客户端。逻辑会变得不必要的复杂起来。
所以在这种情况下，我们更适合把通信层和业务层拆开处理，通过saga中的eventChannel就可以实现这一点，eventChannel将MQTT信息处理成saga可以消费的数据流，然后saga再相应地分发action，redux执行reducer后完成store的更新。

#### 2. MQTT客户端有什么创建时的配置，都有什么作用呢

1. 连接基础配置：

    - clean：设为true，代表每次重连都不继承上一次的session状态，broker不会保留上一次未处理的消息和订阅上下位。当前项目注重在线期间的实时状态，设为true可以降低会话复杂度，状态更清晰。设为false的情况更适合那种离线后恢复未消费消息、长连接设备端的情况【教师客户端直播，需要接收学生私信】。
    - connectTimeout：连接超时时间，如果超过设置的时长，便认为连接失败，避免一直挂起耗费资源。要设置一个工程上的平衡值。太短会对弱网不友好，太长又会拖慢异常感知。监控类系统希望尽快知道连接是否可用，所以用一个偏保守但不过长的超时时间。
    - clientId：客户端身份标识，唯一的，避免clientId相同时会连接冲突，旧连接异常断开。
    - username：当前登录用户，mqtt鉴权使用
    - password：服务端下发的token，鉴权使用。用username和password便于服务端做权限隔离，连接追踪。
    - maxConnectNum：

2. 订阅配置：

    - subscribes：按照消息的作用范围，分了issue、user、team三种topic订阅，避免一个总topic订阅后还要对 消息进行分类来消费的额外工作。同时，拆分topic也可以更方便的实现权限的控制。

3. 异常断开通知配置：

    - will：遗嘱消息，用于客户端异常断开连接后的处理，主要是发送will.topic online: false,同时QoS 2 提供最高等级的消息投递保障语义，用于尽量确保遗嘱消息被可靠投递。而且上线时其实还发送过一个online： true。保证在线离线要让server知道当前状态。

4. 生命周期回调配置：

    - events： 比如说onConnect、onMessage等回调对应的函数，我们的架构中是通过emitter往saga channel发送事件，所以这些events的大部分内容都是，emmiter对应的type。

#### 3. 自动重连如何实现的

依赖mqtt中自带的reconnectPeriod配置，封装为5秒重试一次【当前其实是无限重连的】
可以优化的点：
我认为应该设置重连治理机制，但不一定只是简单的最大次数限制。对于实时系统，自动重连是必要的，因为它能提升短时网络抖动下的恢复能力；但如果一直无限重连，会带来资源浪费，也可能掩盖鉴权失败这类根因问题。所以更合理的是结合重连间隔、最大重试次数和错误类型判断，在短时异常下自动恢复，在长期异常下停止重试并提示用户处理。
如果我要实现重连治理，我不会只依赖库默认的 reconnectPeriod，因为它更像固定频率重试，不方便做精细控制。更合理的方式是关闭默认无限重连，在连接管理层维护 retryCount、最大重试次数和退避时间；网络类错误走指数退避自动恢复，鉴权类错误先刷新 token，再决定是否重建连接；如果是用户主动关闭或者超过阈值，就停止自动重连并同步连接状态到 Redux，再提示用户处理。

#### 4. watchMqttResponse()关于接收到mqtt消息后如何消费

watchMqttResponse函数中，存在一个持久的监听器，它负责的是消费MQTT事件，并把它们翻译成Redux action。
本质要做的事情：持续监听mqttChannel，将外部的MQTT事件流，转为内部Redux状态流。
具体流程如下：

1. 在初始化mqtt客户端时，saga已经创建了一个eventChannel，用于接受mqtt的消息并且把事件送进saga。
2. 当mqtt客户端收到消息后，生命周期中的回调函数会emitter对应的事件类型，监听器中在此时会take到当前的事件。
3. 再根据事件类型决定下一步的执行。[这里执行起来比较特殊的地方是，我们在put分发时间时，没有再根据不同的事件类型写不同的put参数，而是直接传了对象，存在type和payload属性，然后直接分发，redux拿到这个对象后，根据type字段来判断执行什么reducer来处理该跳条action，进而实现了react的组件刷新]。

如果没有这个全局的监听器，那么组件要各自监听mqtt取到对应的消息后再使用setState等手动更新，现在通过这一个监听器就实现了对全局页面的统一管理和更新。

#### 5. Broker是什么

类似于一个消息中转服务器，在mqtt里，客户端服务端并不直接通信，而是broker来判断某个topic被那些客户端订阅了，只有订阅了该topic的客户端才会收到该消息。
Broker就是一个消息中转和路由中心。而关于mqtt中比较经典的遗嘱消息、会话管理、订阅关系的维护也都是Broker这一层负责。

#### 6. 为什么用mqtt而不是http长轮询

当前业务是实时场景，Broker可以持续推送消息，避免前端频繁轮询接口带来的延迟和资源浪费。

#### 7. 封装层的工作是什么

把原始mqtt.js的连接、事件和订阅逻辑抽象成统一接口，降低了业务层直接操作底层SDK的复杂性，为Saga层做消息桥接提供了稳定入口。
要注意到的地方： 在message事件里，mqttjs收到的是原始消息体，而业务方需要的是结构化对象，所以在封装层先做一次标准化处理。



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

### MQTT架构描述

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

#### 整个MQTT的生命周期

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

### WebRTC描述

基于现有RTC 播放器能力完成前端接入，并围绕播放、质量监控、弱网重连做工程化处理

我负责的部分是，webRTC播放端接入和稳定性处理。具体流程：
组件挂载后，创建RTC播放器实例，并且调用play(videoUrl)发起播放；
当远端视频轨道到达时，会在ontrack回调里把MediaStream挂到video元素上完成渲染。

- MidiaStream: 流媒体对象，音视频数据的一种封装格式，挂载到video或者audio标签上播放

#### 播放

组件挂载后，创建RTC播放器实例，并且调用play(videoUrl)发起播放；
当远端视频轨道到达时，会在ontrack回调里把MediaStream挂到video元素上完成渲染。

#### 质量监控

针对于播放质量和断流的判断依据，都是通过监控视频码率和帧率做到的。具体流程：
在播放器运行过程中，周期性调用RTCPeerConnection.getStats()， 采集inbound-rtp数据
基于当前和上一次 bytesReceived / timestamp 计算码率
再从framesPerSecond读取帧率
再存进_reportRef.current中。

- 码率 bitRate： 前后两次bytesReceived差值 和 时间差的计算
- 帧率 frameRate：来自report.framesPerSecond字段
- 延迟时间 delay： 后面通过视频帧回调估算
- RTCPeerConnection：会话控制，网络和媒体信息收发，类似于http对象

#### 弱网重连

在质量监控部分，如果检测出来 码率为0，就认为媒体流存在异常，如果连续超过五次异常，才执行关闭重连
如果仅一次码率为0就关闭，可能只是网络抖动。

#### 调用play（）失败时也有重试

除了播放过程中的断流【码率为0时】的断流重试，代码还处理了启动失败。
当play失败时，要关闭当前播放器再重新打开。

#### 延迟的计算

- video.requestVideoFrameCallback(...)
- frame.rtpTimestamp
- 自己封装了formatTimestamp

计算过程：浏览器渲染某帧视频，拿到这帧的时间戳，再结合本地当前时间，估算当前帧的延迟。

#### webRTC的质量数据通过MQTT回传的意义

采集到的质量指标会按批次通过MQTT回传给监控侧，用于链路质量的监控

#### 清理逻辑防止内存泄漏

- _RTCRef.current.close()
- clearInterval(delayIntervalRef.current)
- clearInterval(reconnectIntervalRef.current)
- videoRef.current = null
避免页面离开后RTC连接还占资源
定时器泄漏
旧实例和新实例互相影响。
在组件卸载时显式关闭 RTC 实例并清理所有采样和重连定时器，避免资源泄漏和重复拉流。

#### 比较常用的API?

- ontrack：远端媒体轨道到达时触发，播放端收到远端视频轨道后，在ontrack里拿到stream，再挂到video.srcObject
- video.srcObject：把媒体流MediaStream绑定到<video>,是视频显示到页面上的关键一步
- video.play： 显式触发播放，当浏览器自动播放策略下的兜底处理，如果视频挂上去了但没有真正的开始播放后再调用
- getStats：用RTC传输统计信息，每秒轮询一次stats，重点看inbount-rtp的bytesReceived和framesPerSecond等字段，用于计算码率和监控帧率。
- requestVideoFrameCallback： 在视频帧真正渲染时的回调，结合frame.rtpTimestamp和本地时间做延迟近似估算，用于页面的展示和质量监控
- close： 关闭RTC的播放实例，在组件卸载或者重连前调用，主动关闭旧实例清理定时器，避免资源泄漏和重复拉流。

#### 被追问到底层

这块我知道它的大致原理，比如 WebRTC 建连通常会涉及 SDP 协商和 ICE 过程，但在这个项目里我主要负责的是前端播放端接入、质量监控和异常恢复，没有直接实现信令交换和 STUN/TURN 服务。

### WebRTC + MQTT配合使用

- webRTC负责实时的视频播放
- mqtt负责把质量数据回传给监控侧

#### 步骤

1. 拉起WebRTC进行视频播放
2. 采集视频质量指标，比如调用getStats方法计算码率，framePerSecond获取帧率，还有通过时间戳计算延迟等指标
3. 将指标聚合后通过MQTT上传
4. 再根据质量结果做断流判断和重连

核心思想： 不能只是播视频，而是升级成 **可观测、可恢复、可上报的实时视频链路**

各自的职责：

- webRTC：负责实时视频流传输，将远端媒体流送到浏览器，提供底层相应抓取码率的能力
- mqtt：负责轻量级实时消息回传，把前端采集到的视频质量指标发给监控系统、并且和整体监控消息链路保持统一。

#### 业务理解

1. 为什么不直接展示质量数据，而是还要上报：

页面展示数据和质量只是满足了从使用方对于系统的监控，并没有持久化存储。我们想实现的是，针对不同车辆、不同视频流的质量监控。这种实时监控的数据不仅是为了展示给用户，更是方便出了问题可以针对性地排查。

