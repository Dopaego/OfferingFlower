/**
 * @stu/worker — BullMQ Worker 入口
 *
 * Day 1: 占位进程，验证 workspace 结构。
 * Day 5: 引入 BullMQ 消费 task-execution 队列。
 */

import { APP_NAME } from "@stu/shared";

console.log(`[worker] ${APP_NAME} worker placeholder — 等待 Day 5 接入 BullMQ`);

// 演示进程优雅退出：Day 6 会把这里升级为 graceful shutdown（等 in-flight job 完成）。
const shutdown = (signal: string): void => {
  console.log(`[worker] received ${signal}, exiting gracefully...`);
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
