# day7Note

## 学习内容

保证了在Agent项目中的后端基础能力

- PostgreSQL数据库作为事实源, 持久化存储每次request对应的issue,还有关于issue派生出来的task, 保证了在出现异常 或者 断开连接的情况下 即使Redis内存中的内容失效, 硬盘中的数据库可以恢复任务的进行
- Redis中保存了BullMQ, BullMq作为node的队列库可以存储 对应要执行的task
- 取出task后 给到worker进程去执行
- 同时保证了 恢复协调, 将PostgreSQL中 无 Redis的Job 重新入队, 任务不会被打断

这些都是可以直接用的 对于我们开发 和 维护 后续的agent时提供了便利
