import { closePool } from "@stu/db";
import { closeTaskQueue } from "@stu/shared/queue";

import { buildApp } from "./app.js";

const rawPort = process.env["API_PORT"] ?? "4000";
const port = Number(rawPort);
if (!Number.isInteger(port) || port <= 0) {
  throw new Error(`API_PORT 必须是正整数，当前值为: ${rawPort}`);
}

const server = buildApp().listen(port, () => {
  console.log(`[api] listening on http://127.0.0.1:${port}`);
});

let isShuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  console.log(`[api] received ${signal}; closing HTTP server and connections...`);
  server.close(async () => {
    await Promise.all([closeTaskQueue(), closePool()]);
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
