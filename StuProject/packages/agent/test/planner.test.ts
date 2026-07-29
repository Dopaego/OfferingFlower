import assert from "node:assert/strict";
import { test } from "node:test";

import { FakeProvider, parseInvestigationPlan, PlannerOutputError } from "../src/index.ts";

test("Planner 校验 FakeProvider 生成的结构化调查计划", async () => {
  const provider = new FakeProvider();
  const completion = await provider.complete({ messages: [{ role: "user", content: "订单页白屏" }] });
  const plan = parseInvestigationPlan(completion.content);

  assert.equal(plan.requiresHumanApproval, true);
  assert.ok(plan.investigationSteps.length > 0);
  assert.ok(plan.risks.length > 0);
});

test("Planner 拒绝无法解析或未要求人工批准的模型输出", () => {
  assert.throws(() => parseInvestigationPlan("not json"), PlannerOutputError);
  assert.throws(
    () =>
      parseInvestigationPlan(
        JSON.stringify({
          summary: "x",
          hypothesis: "x",
          investigationSteps: ["x"],
          risks: ["x"],
          requiresHumanApproval: false,
        }),
      ),
    /requiresHumanApproval/,
  );
});