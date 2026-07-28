import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";

import { closePool, query } from "@stu/db";
import request from "supertest";

import { buildApp, type TaskDispatcher } from "../src/app.ts";

after(async () => {
  await closePool();
});

test("POST /issues 在写库前拒绝不合法请求，并返回 traceId", async () => {
  const response = await request(buildApp())
    .post("/issues")
    .set("x-trace-id", "validation-trace")
    .send({ title: "", description: "" });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
  assert.equal(response.body.traceId, "validation-trace");
  assert.equal(response.headers["x-trace-id"], "validation-trace");
});

test("Issue 到 Task 的请求会持久化审计步骤，并以幂等键只入队一次", async () => {
  const enqueued: Array<{ taskId: string; traceId: string }> = [];
  const dispatcher: TaskDispatcher = {
    async enqueue(input): Promise<void> {
      enqueued.push(input);
    },
  };
  const app = buildApp(dispatcher);
  const externalId = `api-test-${randomUUID()}`;
  let issueId: string | undefined;

  try {
    const issueResponse = await request(app)
      .post("/issues")
      .set("x-trace-id", "issue-trace")
      .send({
        externalId,
        title: "列表页偶发白屏",
        description: "访问 /orders 后页面没有内容。",
        labels: ["bug", "frontend"],
        source: { channel: "integration-test" },
      });

    assert.equal(issueResponse.status, 201);
    issueId = issueResponse.body.issue.id as string;
    assert.equal(issueResponse.body.traceId, "issue-trace");

    const firstTaskResponse = await request(app)
      .post("/tasks")
      .set("idempotency-key", "create-task-once")
      .send({ issueId });
    const secondTaskResponse = await request(app)
      .post("/tasks")
      .set("idempotency-key", "create-task-once")
      .send({ issueId });

    assert.equal(firstTaskResponse.status, 202);
    assert.equal(firstTaskResponse.body.created, true);
    assert.equal(secondTaskResponse.status, 200);
    assert.equal(secondTaskResponse.body.created, false);
    assert.equal(secondTaskResponse.body.task.id, firstTaskResponse.body.task.id);
    assert.equal(enqueued.length, 1);
    assert.equal(enqueued[0]?.taskId, firstTaskResponse.body.task.id);

    const detailResponse = await request(app).get(`/tasks/${firstTaskResponse.body.task.id}`);
    assert.equal(detailResponse.status, 200);
    assert.equal(detailResponse.body.task.status, "queued");
    assert.equal(detailResponse.body.steps.length, 1);
    assert.equal(detailResponse.body.steps[0].name, "task-created");
  } finally {
    if (issueId !== undefined) {
      await query("DELETE FROM tasks WHERE issue_id = $1", [issueId]);
      await query("DELETE FROM issues WHERE id = $1", [issueId]);
    }
  }
});
