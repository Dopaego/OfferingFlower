# Digital Employee

面向大型前端代码库的 AI Developer Agent，通过 LLM 编排、代码检索、浏览器自动化、CI/CD 工具调用和跨会话状态管理，将“需求分析—代码定位—修改验证—构建部署—测试反馈”串联成可追踪的工程化工作流。

## 核心亮点与技术实现

### 1. Orchestrator-Worker 多Agent编排

设计 Orchestrator-Worker 架构，由主 Agent 负责意图识别、任务拆解、工具路由和结果聚合，Browser Agent、Project Agent 等 Worker 负责浏览器验证与工程流水线执行。


