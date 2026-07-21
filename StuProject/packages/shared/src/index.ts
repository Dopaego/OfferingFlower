/**
 * @stu/shared — 跨 workspace 共享的类型与常量
 *
 * Week 1 阶段先占位；Week 2 会在这里定义 Agent 的 TaskStatus、Tool<Input> 协议、
 * API 请求/响应 Zod schema 等。保持 side-effect free 便于 tree-shaking。
 */

export const APP_NAME = "frontend-issue-agent" as const;

/**
 * 任务的状态机（Week 2 会用到）。这里先声明，让 API/Worker/前端引用同一个真值来源。
 */
export type TaskStatus =
  | "queued"
  | "planning"
  | "reproducing"
  | "searching"
  | "proposing"
  | "awaiting_approval"
  | "applying"
  | "validating"
  | "succeeded"
  | "failed"
  | "needs_review";

/** 全局唯一请求追踪 ID —— 在 API 中间件生成，贯穿日志和 task_steps.trace_id */
export type TraceId = string;
