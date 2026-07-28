# Week 1 故障恢复实验记录

## 环境

- Node.js 22 + TypeScript
- Docker Compose：PostgreSQL 16、Redis 7
- BullMQ 5
- 命令：`npm run test --workspace @stu/worker`
- 执行日期：2026-07-26

## 实验 1：正常异步执行

**操作**：创建 PostgreSQL Issue 与 queued Task，向 `task-execution` 队列添加 `jobId = taskId` 的 job，启动 Worker。

**预期**：Worker 消费 job；Task 变为 `succeeded`；步骤按顺序出现；Redis 记录 24 小时进度。

**结果**：通过。测试断言观察到：

- Task 状态为 `succeeded`。
- 步骤顺序为 `task-created`、`worker-started`、`placeholder-execution`。
- `task:{taskId}:progress` 的 `status` 为 `succeeded`。

## 实验 2：持续失败与有界重试

**操作**：注入每次都抛出 `injected transient failure` 的 Worker 处理器。

**预期**：BullMQ 至多处理 3 次，最终 Task 不再维持非终态，并留下错误证据。

**结果**：通过。日志出现 3 次失败；测试断言：

- 处理器调用计数为 3。
- Task 最终状态为 `failed`。
- `error_code = WORKER_EXECUTION_FAILED`。
- 最后一个审计步骤名为 `worker-failed`。

**结论**：重试不是无限循环。对于永久错误，系统必须转为终态并保留可查证的错误信息；后续可将需要人工判断的异常转 `needs_review`。

## 实验 3：Redis job 缺失后的恢复协调

**操作**：只在 PostgreSQL 创建 queued Task，不添加 BullMQ job；启动 Worker 后运行 `reconcileRecoverableTasks()` 两次。

**预期**：第一次根据 PG 创建 job，第二次识别 job 已存在而不重复创建，Worker 最终完成 Task。

**结果**：通过。首次报告 `created = 1`；第二次 `created = 0`、`alreadyQueued = 1`；Task 最终变为 `succeeded`。

**结论**：PostgreSQL 的非终态 Task 是恢复依据；Redis/BullMQ 是可以重建的投递层。固定 `jobId = taskId` 让协调器可以安全重复运行。

## 实验边界

本周未直接执行 `kill -9` 或停 Redis 容器的人工演练，也未接入 LLM、浏览器工具或真实外部副作用。以上自动化测试验证的是同类恢复条件：数据库存在未完成任务而 Redis 中缺 job、以及处理器反复失败。等 Week 2 接入模型调用后，需增加“已产生外部副作用后崩溃”的检查点实验。
