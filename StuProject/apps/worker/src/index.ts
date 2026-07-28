import { closePool } from "@stu/db";
import { TASK_EXECUTION_QUEUE } from "@stu/shared";

import { reconcileRecoverableTasks } from "./recovery.js";
import { createTaskWorker } from "./worker.js";

const taskWorker = createTaskWorker();
const recovery = await reconcileRecoverableTasks();
console.log(`[worker] listening queue=${TASK_EXECUTION_QUEUE} recovery=${JSON.stringify(recovery)}`);

let isShuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  console.log(`[worker] received ${signal}; stopping intake and waiting for active jobs...`);
  await taskWorker.close();
  await closePool();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
