import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";

import { closePool, createIssue, createTask, getTaskDetail, query } from "@stu/db";
import { closeTaskQueue, getTaskQueue } from "@stu/shared/queue";

import { reconcileRecoverableTasks } from "../src/recovery.ts";
import { createTaskWorker } from "../src/worker.ts";

async function waitForStatus(taskId: string, expectedStatus: string): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const detail = await getTaskDetail(taskId);
    if (detail?.task.status === expectedStatus) {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Task 未在时限内进入 ${expectedStatus}: ${taskId}`);
}

after(async () => {
  await closeTaskQueue();
  await closePool();
});

async function createQueuedTask(prefix: string): Promise<{ issueId: string; taskId: string; traceId: string }> {
  const issue = await createIssue({
    externalId: `${prefix}-${randomUUID()}`,
    title: `${prefix} integration test`,
    description: "验证 Day 6 恢复与重试行为。",
    labels: ["test"],
    source: { channel: "integration-test" },
  });
  const { task } = await createTask({ issueId: issue.id, traceId: `${prefix}-trace` });
  return { issueId: issue.id, taskId: task.id, traceId: task.traceId };
}

async function removeTaskAndIssue(issueId: string): Promise<void> {
  await query("DELETE FROM tasks WHERE issue_id = $1", [issueId]);
  await query("DELETE FROM issues WHERE id = $1", [issueId]);
}

test("恢复协调器会把 PostgreSQL 中无 Redis job 的 queued Task 重新入队", async () => {
  const data = await createQueuedTask("recovery");
  const taskWorker = createTaskWorker({ concurrency: 1 });

  try {
    const firstReport = await reconcileRecoverableTasks();
    assert.equal(firstReport.created, 1);

    const secondReport = await reconcileRecoverableTasks();
    assert.equal(secondReport.created, 0);
    assert.equal(secondReport.alreadyQueued, 1);

    await waitForStatus(data.taskId, "succeeded");
    const detail = await getTaskDetail(data.taskId);
    assert.equal(detail?.task.status, "succeeded");
  } finally {
    await taskWorker.close();
    await removeTaskAndIssue(data.issueId);
  }
});

test("Worker 对临时失败最多尝试三次，最终失败会回写 Task", async () => {
  const data = await createQueuedTask("retry");
  let attempts = 0;
  const taskWorker = createTaskWorker({
    concurrency: 1,
    async processor(): Promise<void> {
      attempts += 1;
      throw new Error("injected transient failure");
    },
  });

  try {
    await getTaskQueue().add("execute-task", { taskId: data.taskId, traceId: data.traceId }, { jobId: data.taskId });
    await waitForStatus(data.taskId, "failed");

    const detail = await getTaskDetail(data.taskId);
    assert.equal(attempts, 3);
    assert.equal(detail?.task.errorCode, "WORKER_EXECUTION_FAILED");
    assert.equal(detail?.steps.at(-1)?.name, "worker-failed");
  } finally {
    await taskWorker.close();
    await removeTaskAndIssue(data.issueId);
  }
});
