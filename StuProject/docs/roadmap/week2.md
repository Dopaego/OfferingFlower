# Week 2：LLM Provider、规划 Agent 与工具边界

**目标**：把 Week 1 的确定性 Worker 升级为可替换模型 Provider 驱动的规划 Agent。模型只产出可审计的诊断计划；不允许它直接执行 shell、写文件或应用补丁。

| Day | 关卡 | 主要产出 | 面试关键词 |
| --- | --- | --- | --- |
| 8 | Provider 抽象 + FakeProvider | `@stu/agent`、OpenAI 兼容 HTTP Provider、无 Key 默认 FakeProvider | adapter、依赖倒置、超时、敏感信息 |
| 9 | Planner Orchestrator | 读取 Issue、生成结构化计划、写 Task Step、停在 `awaiting_approval` | 状态机、prompt 边界、审计 |
| 10 | 工具契约与策略 | 受限 Tool schema、allowlist、输入输出脱敏 | tool calling、capability、最小权限 |
| 11 | 上下文与预算 | token/时间预算、上下文裁剪、失败分类 | context window、成本控制 |
| 12 | 人工批准 | 计划确认 API、批准事件、拒绝路径 | human-in-the-loop、不可抵赖审计 |
| 13 | Provider 可靠性 | 超时、可重试错误、限流与 fallback 策略 | 429、指数退避、circuit breaker |
| 14 | 评测与复盘 | 固定 dataset、FakeProvider 评测、Week 2 报告 | eval、回归、指标可信度 |

## Day 8 验收目标

- [x] 新建 `@stu/agent`；Provider 为接口，业务层不依赖具体厂商 SDK。
- [x] `FakeProvider` 保证无 API Key 时开发、测试可重复执行。
- [x] OpenAI 兼容 Provider 用 Node 内置 `fetch`，并设置超时；错误不回显 API Key。
- [x] Provider 返回模型名、耗时和 token 用量（若上游返回），供审计落库。
- [x] 单元测试覆盖 FakeProvider 与 HTTP Provider 的成功/失败输入。

## Day 8 学习产出

- [LLM Provider 抽象与 FakeProvider](../knowledge/day8-llm-provider.md)
- [@stu/agent Provider 实现](../../packages/agent/src/index.ts)
- 验证：`npm run test --workspace @stu/agent`（4 个测试）

## Day 9 验收目标

- [x] Planner 读取 PostgreSQL 的 Issue 和 Task。
- [x] 输出 JSON 计划并进行运行时结构校验。
- [x] 计划写入 `task_steps`，Task 变为 `awaiting_approval`，不执行修复。
- [~] Worker 默认调用 Planner，集成测试已更新为完整状态流断言；等待 Docker Desktop 启动后复验。

## Day 9 学习产出

- [Planner Orchestrator 与人工审批边界](../knowledge/day9-planner-orchestrator.md)
- 代码：[Planner](../../packages/agent/src/planner.ts)、[Orchestrator](../../packages/agent/src/orchestrator.ts)、[Worker 接入](../../apps/worker/src/worker.ts)
- 验证：`npm run typecheck` 与 `npm run test --workspace @stu/agent` 已通过；Worker 集成测试待 Docker daemon 可用后复验。

## Day 10 验收目标

- [x] 定义 Tool 契约、风险级别和工具调用拒绝原因。
- [x] Tool Policy 以 allowlist、输入校验、预算与批准状态授权。
- [x] 第一个只读工具拒绝路径穿越和不可信输入。
- [x] 工具输入、输出与审计日志具备基础脱敏。
- [x] 单元测试覆盖未知工具、非法路径、未批准写入和脱敏。

## Day 10 学习产出

- [Tool 契约、Allowlist 与最小权限](../knowledge/day10-tool-policy.md)
- 代码：[Tool Policy](../../packages/agent/src/tools.ts)、[安全测试](../../packages/agent/test/tools.test.ts)
- 验证：`npm run test --workspace @stu/agent`（10 个测试）已通过。
