# day6Note

## 主要工作任务

因为 Worker 可能会失败, 所以相应的 进程停止, 重启Redis ,代码抛出错误相应的问题. 而关于失败也要有记录, 适当的重试, 并且 从PostgreSQL 恢复队列

## 概念

- **SIGINT / SIGTERM**: os发给process的停止信号, 终端 通常发SIGINT; Dockers / Kubernetes 发 SIGTERM
- **优雅退出**: 停止接收新工作，等待正在执行的工作结束，再关闭连接。
- **in-flight job**：Worker 已领取、尚未完成的 job。
- **重试（retry）**：失败后再次运行同一个 job。本项目上限是 3 次。
- **指数退避（exponential backoff）**：每次重试等待更久，防止依赖故障时持续打满 Redis、数据库或外部 API。
- **stalled job**：Worker 突然死掉，队列检测到 job 长时间没有心跳后的状态；BullMQ 会按自己的机制处理重试。
- **恢复协调（reconciliation）**：把“事实源记录的应有状态”和“派生系统的实际状态”进行比较，再补齐缺失工作。

## 重试与失败

处理器连续失败三次后，Worker 将 Task 标成 `failed`，写 `WORKER_EXECUTION_FAILED`，并追加 `worker-failed` 审计步骤。
重试次数必须有上限，否则永久错误会无限占用资源。
真正的 Agent 后续可把需人工判断的异常转为 `needs_review`，而不是机械重试。

## Redis丢失后的恢复

1. 查询 PostgreSQL 内所有非终态 Task：`queued`、`planning`、`reproducing`、`searching`、`proposing`、`applying`、`validating`。
2. 用稳定 `taskId` 查询对应 BullMQ job。
3. Redis 中没有 job 时新建 job；job 为 `failed` 时调用 `retry()`；其余状态不重复入队。

## 现实场景回答框架

“线上 Redis 故障时，你怎么避免任务直接消失？”

先说明边界：队列中的临时 job 可能丢失或延迟，不能假装 Redis 永远可靠。然后说明措施：业务 Task 和步骤先落 PostgreSQL；Worker 重启时扫描非终态 Task，用 `taskId` 做稳定 jobId 进行 reconciliation；业务步骤本身保持幂等，避免恢复后的重复执行产生重复外部副作用。最后补充监控：应告警 queued 任务积压、failed 数、恢复数量和最长任务等待时间。

