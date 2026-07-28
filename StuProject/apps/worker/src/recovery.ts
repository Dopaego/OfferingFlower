import { listRecoverableTasks } from "@stu/db";
import { getTaskQueue } from "@stu/shared/queue";

export type RecoveryReport = {
  created: number;
  alreadyQueued: number;
  retriedFailedJob: number;
};

/**
 * Redis 丢失队列或 Worker 意外退出后，以 PostgreSQL 的非终态 Task 重建队列。
 * jobId 固定为 taskId，因此重复执行本函数不会制造第二个 job。
 */
export async function reconcileRecoverableTasks(limit = 100): Promise<RecoveryReport> {
  const tasks = await listRecoverableTasks(limit);
  const queue = getTaskQueue();
  const report: RecoveryReport = { created: 0, alreadyQueued: 0, retriedFailedJob: 0 };

  for (const task of tasks) {
    const existingJob = await queue.getJob(task.id);
    if (existingJob === undefined) {
      await queue.add("execute-task", { taskId: task.id, traceId: task.traceId }, { jobId: task.id });
      report.created += 1;
      continue;
    }

    const state = await existingJob.getState();
    if (state === "failed") {
      await existingJob.retry();
      report.retriedFailedJob += 1;
      continue;
    }
    report.alreadyQueued += 1;
  }

  return report;
}