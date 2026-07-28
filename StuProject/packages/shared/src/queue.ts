import { Queue, type JobsOptions } from "bullmq";

import { TASK_EXECUTION_QUEUE, type TaskExecutionJobData } from "./index.js";

let taskQueue: Queue<TaskExecutionJobData> | undefined;

function readRedisPort(): number {
  const rawPort = process.env["REDIS_PORT"];
  if (rawPort === undefined || rawPort === "") {
    return 6379;
  }

  const port = Number(rawPort);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`REDIS_PORT 必须是正整数，当前值为: ${rawPort}`);
  }
  return port;
}

/** API 和 Worker 共用的队列配置。 */
export function getTaskQueue(): Queue<TaskExecutionJobData> {
  taskQueue ??= new Queue<TaskExecutionJobData>(TASK_EXECUTION_QUEUE, {
    connection: {
      host: process.env["REDIS_HOST"] ?? "127.0.0.1",
      port: readRedisPort(),
      ...(process.env["REDIS_PASSWORD"] === undefined || process.env["REDIS_PASSWORD"] === ""
        ? {}
        : { password: process.env["REDIS_PASSWORD"] }),
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 1_000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    } satisfies JobsOptions,
  });
  return taskQueue;
}

export async function closeTaskQueue(): Promise<void> {
  if (taskQueue === undefined) {
    return;
  }
  const queue = taskQueue;
  taskQueue = undefined;
  await queue.close();
}