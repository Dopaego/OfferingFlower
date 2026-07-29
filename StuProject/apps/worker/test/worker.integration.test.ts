import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";

import { closePool, createIssue, createTask, getTaskDetail, query } from "@stu/db";
import { closeTaskQueue, getTaskQueue } from "@stu/shared/queue";
import { Redis } from "ioredis";

import { createTaskWorker } from "../src/worker.ts";

async function waitForApprovalTask(taskId: string): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const detail = await getTaskDetail(taskId);
    if (detail?.task.status === "awaiting_approval") {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Task 未在时限内进入 awaiting_approval: ${taskId}`);
}

after(async () => {
  await closeTaskQueue();
  await closePool();
});

test("BullMQ Worker 会生成可审计诊断计划并等待人工批准", async () => {
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
    await waitForApprovalTask(task.id);

    const detail = await getTaskDetail(task.id);
    assert.equal(detail?.task.status, "awaiting_approval");
    assert.deepEqual(detail?.steps.map((step) => step.name), ["task-created", "worker-started", "planner-started", "planner-generated"]);
    const plannerOutput = detail?.steps.at(-1)?.output as { model?: string; plan?: { requiresHumanApproval?: boolean } };
    assert.equal(plannerOutput.model, "fake-planner-v1");
    assert.equal(plannerOutput.plan?.requiresHumanApproval, true);

    const progress = await progressRedis.hgetall(`task:${task.id}:progress`);
    assert.equal(progress.status, "awaiting_approval");
    assert.notEqual(progress.updatedAt, undefined);
  } finally {
    await taskWorker.close();
    await progressRedis.quit();
    await query("DELETE FROM tasks WHERE issue_id = $1", [issue.id]);
    await query("DELETE FROM issues WHERE id = $1", [issue.id]);
  }
});
