import { appendTaskStep, updateTaskStatus } from "@stu/db";
import { TASK_EXECUTION_QUEUE, type TaskExecutionJobData } from "@stu/shared";
import { Worker } from "bullmq";
import { Redis } from "ioredis";

function readPositiveInteger(name: string, fallback: number): number {
  const rawValue = process.env[name];
  if (rawValue === undefined || rawValue === "") {
    return fallback;
  }
  const value = Number(rawValue);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} 必须是正整数，当前值为: ${rawValue}`);
  }
  return value;
}

function createRedisConnection(): Redis {
  return new Redis({
    host: process.env["REDIS_HOST"] ?? "127.0.0.1",
    port: readPositiveInteger("REDIS_PORT", 6379),
    maxRetriesPerRequest: null,
    ...(process.env["REDIS_PASSWORD"] === undefined || process.env["REDIS_PASSWORD"] === ""
      ? {}
      : { password: process.env["REDIS_PASSWORD"] }),
  });
}

async function setProgress(redis: Redis, taskId: string, status: string): Promise<void> {
  const key = `task:${taskId}:progress`;
  await redis.hset(key, { status, updatedAt: new Date().toISOString() });
  await redis.expire(key, 86_400);
}

export type TaskWorker = {
  worker: Worker<TaskExecutionJobData>;
  close: () => Promise<void>;
};

export type TaskProcessor = (input: { taskId: string; traceId: string; jobId: string | undefined }) => Promise<void>;

async function runDefaultTask(input: { taskId: string; traceId: string; jobId: string | undefined }, redis: Redis): Promise<void> {
  const startedAt = Date.now();
  await setProgress(redis, input.taskId, "planning");
  await updateTaskStatus({ taskId: input.taskId, status: "planning" });
  await appendTaskStep({
    taskId: input.taskId,
    name: "worker-started",
    status: "succeeded",
    output: { traceId: input.traceId, jobId: input.jobId ?? null },
  });

  // Day 5 只运行确定性占位任务；Week 2 在这里接入 Agent Orchestrator。
  await updateTaskStatus({ taskId: input.taskId, status: "succeeded", summary: "Worker 已完成基础异步任务" });
  await appendTaskStep({
    taskId: input.taskId,
    name: "placeholder-execution",
    status: "succeeded",
    output: { message: "Day 5 worker completed", traceId: input.traceId },
    durationMs: Date.now() - startedAt,
  });
  await setProgress(redis, input.taskId, "succeeded");
}

export function createTaskWorker(options: { concurrency?: number; processor?: TaskProcessor } = {}): TaskWorker {
  const redis = createRedisConnection();
  const concurrency = options.concurrency ?? readPositiveInteger("WORKER_CONCURRENCY", 2);
  const worker = new Worker<TaskExecutionJobData>(
    TASK_EXECUTION_QUEUE,
    async (job) => {
      const { taskId, traceId } = job.data;
      if (options.processor !== undefined) {
        await options.processor({ taskId, traceId, jobId: job.id });
        return;
      }
      await runDefaultTask({ taskId, traceId, jobId: job.id }, redis);
    },
    { connection: redis, concurrency },
  );

  worker.on("completed", (job) => console.log(`[worker] completed job=${job.id} task=${job.data.taskId}`));
  worker.on("failed", (job, error) => {
    if (job === undefined) {
      console.error("[worker] failed without job", error);
      return;
    }
    console.error(`[worker] failed job=${job.id} task=${job.data.taskId}`, error);
    if (job.attemptsMade >= (job.opts.attempts ?? 1)) {
      void updateTaskStatus({ taskId: job.data.taskId, status: "failed", errorCode: "WORKER_EXECUTION_FAILED" })
        .then(() => appendTaskStep({ taskId: job.data.taskId, name: "worker-failed", status: "failed", error: { message: error.message } }))
        .then(() => setProgress(redis, job.data.taskId, "failed"))
        .catch((persistenceError: unknown) => console.error("[worker] failed to persist terminal failure", persistenceError));
    }
  });

  return {
    worker,
    async close(): Promise<void> {
      await worker.close();
      await redis.quit();
    },
  };
}