import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import { createReadFileTool, redactSensitiveText, ToolPolicy, type ToolDefinition } from "../src/index.ts";

let workspaceRoot: string | undefined;

after(async () => {
  if (workspaceRoot !== undefined) {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

async function getReadPolicy(): Promise<ToolPolicy> {
  workspaceRoot ??= await mkdtemp(join(tmpdir(), "agent-tool-policy-"));
  await writeFile(join(workspaceRoot, "safe.txt"), "token=local-secret\nBearer abc.def\nvisible text", "utf8");
  return new ToolPolicy([createReadFileTool(workspaceRoot)]);
}

test("Tool Policy 拒绝未知工具、路径穿越和超出只读预算", async () => {
  const policy = await getReadPolicy();

  assert.deepEqual(policy.authorize({ request: { name: "delete_everything", input: {} }, hasApproval: false, readCallsUsed: 0 }), {
    allowed: false,
    reason: "unknown_tool",
  });
  assert.deepEqual(policy.authorize({ request: { name: "read_file", input: { path: "../../.env" } }, hasApproval: false, readCallsUsed: 0 }), {
    allowed: false,
    reason: "path_outside_workspace",
  });
  assert.deepEqual(policy.authorize({ request: { name: "read_file", input: { path: "safe.txt" } }, hasApproval: false, readCallsUsed: 5 }), {
    allowed: false,
    reason: "budget_exhausted",
  });
});

test("受限 read_file 只读取工作区文件并脱敏输出", async () => {
  const policy = await getReadPolicy();
  const authorization = policy.authorize({ request: { name: "read_file", input: { path: "safe.txt" } }, hasApproval: false, readCallsUsed: 0 });
  assert.deepEqual(authorization, { allowed: true, reason: "allowed" });

  const output = (await policy.execute({ name: "read_file", input: { path: "safe.txt" } })) as { content: string };
  assert.match(output.content, /token=\[REDACTED\]/);
  assert.match(output.content, /Bearer \[REDACTED\]/);
  assert.match(output.content, /visible text/);
});

test("受控写工具在没有批准事件时被拒绝", () => {
  const writeTool: ToolDefinition<unknown, unknown> = {
    name: "apply_patch",
    risk: "controlled-write",
    validateInput: (input) => input,
    async execute(): Promise<unknown> {
      throw new Error("测试不应真的执行写操作");
    },
  };
  const policy = new ToolPolicy([writeTool]);

  assert.deepEqual(policy.authorize({ request: { name: "apply_patch", input: {} }, hasApproval: false, readCallsUsed: 0 }), {
    allowed: false,
    reason: "approval_required",
  });
});

test("redactSensitiveText 清除常见凭据模式", () => {
  assert.equal(
    redactSensitiveText("password: p@ss\napi_key=abc\npostgres://agent:pw@host/db"),
    "password=[REDACTED]\napi_key=[REDACTED]\n[REDACTED_DATABASE_URL]",
  );
});