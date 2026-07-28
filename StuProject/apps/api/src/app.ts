import { randomUUID } from "node:crypto";

import { createIssue, createTask, findIssueById, getTaskDetail } from "@stu/db";
import { getTaskQueue } from "@stu/shared/queue";
import express, { type ErrorRequestHandler, type RequestHandler } from "express";
import pino from "pino";
import { pinoHttp } from "pino-http";
import { z, ZodError } from "zod";

const issueSchema = z.object({
  externalId: z.string().trim().min(1).max(100).optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(10_000),
  labels: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  source: z.record(z.string(), z.unknown()).default({}),
});

const taskSchema = z.object({
  issueId: z.string().uuid(),
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
});

const taskIdSchema = z.object({ taskId: z.string().uuid() });
const issueIdSchema = z.object({ issueId: z.string().uuid() });

export type TaskDispatcher = {
  enqueue: (input: { taskId: string; traceId: string }) => Promise<void>;
};

const defaultDispatcher: TaskDispatcher = {
  async enqueue(input): Promise<void> {
    await getTaskQueue().add("execute-task", input, { jobId: input.taskId });
  },
};

function traceIdMiddleware(): RequestHandler {
  return (request, response, next) => {
    const incomingTraceId = request.header("x-trace-id");
    const traceId = incomingTraceId === undefined || incomingTraceId === "" ? randomUUID() : incomingTraceId;
    response.locals["traceId"] = traceId;
    response.setHeader("x-trace-id", traceId);
    next();
  };
}

const errorHandler: ErrorRequestHandler = (error: unknown, request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "请求参数不合法", details: error.flatten() },
      traceId: response.locals["traceId"],
    });
    return;
  }

  request.log.error({ error }, "未处理的 API 错误");
  response.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "服务内部错误" },
    traceId: response.locals["traceId"],
  });
};

export function buildApp(dispatcher: TaskDispatcher = defaultDispatcher): express.Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "100kb" }));
  app.use(traceIdMiddleware());
  app.use(
    pinoHttp({
      logger: pino({ level: process.env["API_LOG_LEVEL"] ?? "info" }),
      customProps: (_request, response) => ({ traceId: response.locals["traceId"] }),
    }),
  );

  app.get("/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  app.post("/issues", async (request, response, next) => {
    try {
      const input = issueSchema.parse(request.body);
      const issue = await createIssue({
        title: input.title,
        description: input.description,
        labels: input.labels,
        source: input.source,
        ...(input.externalId === undefined ? {} : { externalId: input.externalId }),
      });
      response.status(201).json({ issue, traceId: response.locals["traceId"] });
    } catch (error: unknown) {
      next(error);
    }
  });

  app.get("/issues/:issueId", async (request, response, next) => {
    try {
      const { issueId } = issueIdSchema.parse(request.params);
      const issue = await findIssueById(issueId);
      if (issue === undefined) {
        response.status(404).json({ error: { code: "ISSUE_NOT_FOUND", message: "Issue 不存在" }, traceId: response.locals["traceId"] });
        return;
      }
      response.status(200).json({ issue, traceId: response.locals["traceId"] });
    } catch (error: unknown) {
      next(error);
    }
  });

  app.post("/tasks", async (request, response, next) => {
    try {
      const body = taskSchema.parse(request.body);
      const headerKey = request.header("idempotency-key");
      const idempotencyKey = body.idempotencyKey ?? (headerKey === undefined || headerKey === "" ? undefined : headerKey);
      const issue = await findIssueById(body.issueId);
      if (issue === undefined) {
        response.status(404).json({ error: { code: "ISSUE_NOT_FOUND", message: "不能为不存在的 Issue 创建 Task" }, traceId: response.locals["traceId"] });
        return;
      }

      const result = await createTask({
        issueId: body.issueId,
        traceId: response.locals["traceId"] as string,
        ...(idempotencyKey === undefined ? {} : { idempotencyKey }),
      });
      if (result.created) {
        await dispatcher.enqueue({ taskId: result.task.id, traceId: result.task.traceId });
      }
      response.status(result.created ? 202 : 200).json({ task: result.task, created: result.created, traceId: response.locals["traceId"] });
    } catch (error: unknown) {
      next(error);
    }
  });

  app.get("/tasks/:taskId", async (request, response, next) => {
    try {
      const { taskId } = taskIdSchema.parse(request.params);
      const detail = await getTaskDetail(taskId);
      if (detail === undefined) {
        response.status(404).json({ error: { code: "TASK_NOT_FOUND", message: "Task 不存在" }, traceId: response.locals["traceId"] });
        return;
      }
      response.status(200).json({ ...detail, traceId: response.locals["traceId"] });
    } catch (error: unknown) {
      next(error);
    }
  });

  app.use((_request, response) => {
    response.status(404).json({ error: { code: "NOT_FOUND", message: "路由不存在" }, traceId: response.locals["traceId"] });
  });
  app.use(errorHandler);
  return app;
}