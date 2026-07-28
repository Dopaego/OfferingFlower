import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";

import { closePool, createIssue, createTask, getTaskDetail, query } from "@stu/db";
import { closeTaskQueue, getTaskQueue } from "@stu/shared/queue";
import { Redis } from "ioredis";

import { createTaskWorker } from "../src/worker.ts";

async function waitForSucceededTask(taskId: string): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const detail = await getTaskDetail(taskId);
    if (detail?.task.status === "succeeded") {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Task 未在时限内完成: ${taskId}`);
}

after(async () => {
  await closeTaskQueue();
  await closePool();
});

test("BullMQ Worker 会消费任务，并同步 PostgreSQL 审计与 Redis 短期进度", async () => {
  const externalId = `worker-test-${randomUUID()}`;
  const issue = await createIssue({
    externalId,
    title: "Worker 集成测试",
    description: "验证异步任务状态和审计步骤。",
    labels: ["test"],
    source: { channel: "integration-test" },
  });
  const { task } = await createTask({ issueId: issue.id, traceId: "worker-integration-trace" });
  const taskWorker = createTaskWorker({ concurrency: 1 });
  const progressRedis = new Redis({ host: process.env["REDIS_HOST"] ?? "127.0.0.1", port: Number(process.env["REDIS_PORT"] ?? "6379") });

  try {
    await getTaskQueue().add("execute-task", { taskId: task.id, traceId: task.traceId }, { jobId: task.id });
    await waitForSucceededTask(task.id);

    const detail = await getTaskDetail(task.id);
    assert.equal(detail?.task.status, "succeeded");
    assert.equal(detail?.steps.length, 3);
    assert.deepEqual(detail?.steps.map((step) => step.name), ["task-created", "worker-started", "placeholder-execution"]);

    const progress = await progressRedis.hgetall(`task:${task.id}:progress`);
    assert.equal(progress.status, "succeeded");
    assert.notEqual(progress.updatedAt, undefined);
  } finally {
    await taskWorker.close();
    await progressRedis.quit();
    await query("DELETE FROM tasks WHERE issue_id = $1", [issue.id]);
    await query("DELETE FROM issues WHERE id = $1", [issue.id]);
  }
});
