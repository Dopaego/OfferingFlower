# Digital Employee

面向大型前端代码库的 AI Developer Agent，通过 LLM 编排、代码检索、浏览器自动化、CI/CD 工具调用和跨会话状态管理，将“需求分析—代码定位—修改验证—构建部署—测试反馈”串联成可追踪的工程化工作流。

## 核心亮点与技术实现

### 1. 并行 Fan-out/Fan-in 长任务编排

**简历描述**：针对构建、部署、VPtest等相互独立的长耗时任务，采用“并行触发、串型汇总”模式，降低整体的等待时间

**技术实现**：

- 

### 1. Orchestrator-Worker 多Agent编排

设计 Orchestrator-Worker 架构，由主 Agent 负责意图识别、任务拆解、工具路由和结果聚合，Browser Agent、Project Agent 等 Worker 负责浏览器验证与工程流水线执行。

面向大型前端代码库设计 AI Developer Agent，通过 Orchestrator-Worker 模式完成任务拆解、代码检索、浏览器验证(Browser Agent)、构建部署和测试结果(Project Agent)聚合。

技术实现：

- 将任务拆解成 plan - execute - validate - summarize，每个worker使用统一协议返回 规定格式的数据 例如，taskId、status、result、error、nextAction等
- LLM只负责决策和参数生成，参数校验、权限检查、状态机、结果解析等确定性逻辑由代码完成
- 对工具增加超时、重试次数和失败原因，避免异常直接交给模型自由发挥。