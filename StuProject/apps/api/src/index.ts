/**
 * @stu/api — HTTP 入口
 *
 * Day 1: 只启动一个占位进程，验证 workspace 依赖能被解析。
 * Day 4: 会替换为 Express + Zod + Pino 的完整实现。
 */

import { APP_NAME, type TaskStatus } from "@stu/shared";
import { readDatabaseConfig } from "@stu/db";

// 使用一下类型和常量，避免 TS 报"未使用"
const bootStatus: TaskStatus = "queued";
const databaseConfig = readDatabaseConfig();

console.log(
  `[api] ${APP_NAME} boot placeholder | db=${databaseConfig.host}:${databaseConfig.port}/${databaseConfig.database} | initialStatus=${bootStatus}`,
);
console.log("[api] Day 3 目标：workspace 依赖打通、PostgreSQL 配置可读取。");
console.log("[api] Day 4 会在这里启动 Express，监听 API_PORT。");
