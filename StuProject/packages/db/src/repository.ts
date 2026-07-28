import type { TaskStatus } from "@stu/shared";

import { query, withTransaction } from "./index.js";

export type Issue = {
  id: string;
  externalId: string | null;
  title: string;
  description: string;
  labels: unknown;
  source: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export type Task = {
  id: string;
  issueId: string;
  traceId: string;
  idempotencyKey: string | null;
  status: TaskStatus;
  summary: string | null;
  errorCode: string | null;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  updatedAt: Date;
};

export type TaskStep = {
  id: string;
  taskId: string;
  sequence: number;
  name: string;
  status: "started" | "succeeded" | "failed" | "skipped";
  toolName: string | null;
  input: unknown;
  output: unknown;
  error: unknown;
  durationMs: number | null;
  tokenCount: number | null;
  createdAt: Date;
  completedAt: Date | null;
};

type IssueRow = {
  id: string;
  external_id: string | null;
  title: string;
  description: string;
  labels: unknown;
  source: unknown;
  created_at: Date;
  updated_at: Date;
};

type TaskRow = {
  id: string;
  issue_id: string;
  trace_id: string;
  idempotency_key: string | null;
  status: TaskStatus;
  summary: string | null;
  error_code: string | null;
  created_at: Date;
  started_at: Date | null;
  finished_at: Date | null;
  updated_at: Date;
};

type TaskStepRow = {
  id: string;
  task_id: string;
  sequence: number;
  name: string;
  status: TaskStep["status"];
  tool_name: string | null;
  input: unknown;
  output: unknown;
  error: unknown;
  duration_ms: number | null;
  token_count: number | null;
  created_at: Date;
  completed_at: Date | null;
};

function toIssue(row: IssueRow): Issue {
  return {
    id: row.id,
    externalId: row.external_id,
    title: row.title,
    description: row.description,
    labels: row.labels,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    issueId: row.issue_id,
    traceId: row.trace_id,
    idempotencyKey: row.idempotency_key,
    status: row.status,
    summary: row.summary,
    errorCode: row.error_code,
    createdAt: row.created_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    updatedAt: row.updated_at,
  };
}

function toTaskStep(row: TaskStepRow): TaskStep {
  return {
    id: row.id,
    taskId: row.task_id,
    sequence: row.sequence,
    name: row.name,
    status: row.status,
    toolName: row.tool_name,
    input: row.input,
    output: row.output,
    error: row.error,
    durationMs: row.duration_ms,
    tokenCount: row.token_count,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

export async function createIssue(input: {
  externalId?: string;
  title: string;
  description: string;
  labels: string[];
  source: Record<string, unknown>;
}): Promise<Issue> {
  const rows = await query<IssueRow>(
    `INSERT INTO issues (external_id, title, description, labels, source)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
     RETURNING *`,
    [
      input.externalId ?? null,
      input.title,
      input.description,
      JSON.stringify(input.labels),
      JSON.stringify(input.source),
    ],
  );
  const row = rows[0];
  if (row === undefined) {
    throw new Error("创建 Issue 后没有返回记录");
  }
  return toIssue(row);
}

export async function findIssueById(id: string): Promise<Issue | undefined> {
  const rows = await query<IssueRow>("SELECT * FROM issues WHERE id = $1", [id]);
  const row = rows[0];
  return row === undefined ? undefined : toIssue(row);
}

export async function createTask(input: {
  issueId: string;
  traceId: string;
  idempotencyKey?: string;
}): Promise<{ task: Task; created: boolean }> {
  return withTransaction(async (transaction) => {
    const inserted = await transaction.query<TaskRow>(
      `INSERT INTO tasks (issue_id, trace_id, idempotency_key)
       VALUES ($1, $2, $3)
       ON CONFLICT (idempotency_key) DO NOTHING
       RETURNING *`,
      [input.issueId, input.traceId, input.idempotencyKey ?? null],
    );

    const insertedRow = inserted.rows[0];
    if (insertedRow !== undefined) {
      await transaction.query(
        `INSERT INTO task_steps (task_id, sequence, name, status, output, completed_at)
         VALUES ($1, 1, 'task-created', 'succeeded', $2::jsonb, now())`,
        [insertedRow.id, JSON.stringify({ traceId: input.traceId })],
      );
      return { task: toTask(insertedRow), created: true };
    }

    if (input.idempotencyKey === undefined) {
      throw new Error("创建 Task 失败，且没有幂等键可恢复查询");
    }

    const existing = await transaction.query<TaskRow>(
      "SELECT * FROM tasks WHERE idempotency_key = $1",
      [input.idempotencyKey],
    );
    const existingRow = existing.rows[0];
    if (existingRow === undefined) {
      throw new Error("幂等 Task 未找到");
    }
    return { task: toTask(existingRow), created: false };
  });
}

export async function getTaskDetail(id: string): Promise<{ task: Task; steps: TaskStep[] } | undefined> {
  const taskRows = await query<TaskRow>("SELECT * FROM tasks WHERE id = $1", [id]);
  const taskRow = taskRows[0];
  if (taskRow === undefined) {
    return undefined;
  }

  const stepRows = await query<TaskStepRow>(
    "SELECT * FROM task_steps WHERE task_id = $1 ORDER BY sequence ASC",
    [id],
  );
  return { task: toTask(taskRow), steps: stepRows.map(toTaskStep) };
}

export async function listRecoverableTasks(limit = 100): Promise<Task[]> {
  if (!Number.isInteger(limit) || limit <= 0 || limit > 1_000) {
    throw new Error(`恢复任务查询 limit 必须在 1 到 1000 之间，当前值为: ${limit}`);
  }
  const rows = await query<TaskRow>(
    `SELECT * FROM tasks
     WHERE status IN ('queued', 'planning', 'reproducing', 'searching', 'proposing', 'applying', 'validating')
     ORDER BY created_at ASC
     LIMIT $1`,
    [limit],
  );
  return rows.map(toTask);
}

export async function updateTaskStatus(input: {
  taskId: string;
  status: TaskStatus;
  summary?: string;
  errorCode?: string;
}): Promise<Task> {
  const terminal = input.status === "succeeded" || input.status === "failed" || input.status === "needs_review";
  const rows = await query<TaskRow>(
    `UPDATE tasks
     SET status = $2,
         summary = COALESCE($3, summary),
         error_code = COALESCE($4, error_code),
         started_at = CASE WHEN $2 <> 'queued' THEN COALESCE(started_at, now()) ELSE started_at END,
         finished_at = CASE WHEN $5 THEN now() ELSE finished_at END,
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [input.taskId, input.status, input.summary ?? null, input.errorCode ?? null, terminal],
  );
  const row = rows[0];
  if (row === undefined) {
    throw new Error(`未找到 Task: ${input.taskId}`);
  }
  return toTask(row);
}

export async function appendTaskStep(input: {
  taskId: string;
  name: string;
  status: TaskStep["status"];
  toolName?: string;
  output?: Record<string, unknown>;
  error?: Record<string, unknown>;
  durationMs?: number;
}): Promise<TaskStep> {
  return withTransaction(async (transaction) => {
    await transaction.query("SELECT pg_advisory_xact_lock(hashtext($1))", [input.taskId]);
    const sequenceResult = await transaction.query<{ next_sequence: number }>(
      "SELECT COALESCE(MAX(sequence), 0) + 1 AS next_sequence FROM task_steps WHERE task_id = $1",
      [input.taskId],
    );
    const sequence = sequenceResult.rows[0]?.next_sequence;
    if (sequence === undefined) {
      throw new Error(`无法为 Task 分配步骤序号: ${input.taskId}`);
    }
    const result = await transaction.query<TaskStepRow>(
      `INSERT INTO task_steps (task_id, sequence, name, status, tool_name, output, error, duration_ms, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, now())
       RETURNING *`,
      [
        input.taskId,
        sequence,
        input.name,
        input.status,
        input.toolName ?? null,
        JSON.stringify(input.output ?? {}),
        input.error === undefined ? null : JSON.stringify(input.error),
        input.durationMs ?? null,
      ],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("创建 Task Step 后没有返回记录");
    }
    return toTaskStep(row);
  });
}
