import { appendTaskStep, findIssueById, getTaskDetail, updateTaskStatus } from "@stu/db";

import type { LlmProvider } from "./index.js";
import { createInvestigationPlan, type InvestigationPlan } from "./planner.js";

export type PlannerOrchestrationResult = {
  plan: InvestigationPlan;
  provider: string;
  model: string;
};

/**
 * 只生成并审计诊断计划。任何工具执行、写文件和补丁应用都不属于此阶段。
 */
export async function orchestratePlanning(input: {
  taskId: string;
  traceId: string;
  provider: LlmProvider;
}): Promise<PlannerOrchestrationResult> {
  const detail = await getTaskDetail(input.taskId);
  if (detail === undefined) {
    throw new Error(`未找到 Task: ${input.taskId}`);
  }
  const issue = await findIssueById(detail.task.issueId);
  if (issue === undefined) {
    throw new Error(`未找到 Task 对应的 Issue: ${detail.task.issueId}`);
  }

  await updateTaskStatus({ taskId: input.taskId, status: "planning" });
  await appendTaskStep({
    taskId: input.taskId,
    name: "planner-started",
    status: "succeeded",
    output: { traceId: input.traceId, provider: input.provider.name, promptVersion: "planner-v1" },
  });

  const { plan, completion } = await createInvestigationPlan(input.provider, issue);
  await appendTaskStep({
    taskId: input.taskId,
    name: "planner-generated",
    status: "succeeded",
    output: {
      plan,
      provider: input.provider.name,
      model: completion.model,
      promptVersion: "planner-v1",
      ...(completion.usage === undefined ? {} : { usage: completion.usage }),
    },
    durationMs: completion.durationMs,
  });
  await updateTaskStatus({ taskId: input.taskId, status: "awaiting_approval", summary: plan.summary });

  return { plan, provider: input.provider.name, model: completion.model };
}