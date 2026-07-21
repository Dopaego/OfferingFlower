import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";

import { closePool, query, withTransaction } from "../src/index.ts";

after(async () => {
  await closePool();
});

test("迁移后的核心表存在，且参数化查询可以往返值", async () => {
  const schemaRows = await query<{ issues_table: string | null }>(
    "SELECT to_regclass('public.issues')::text AS issues_table",
  );
  assert.equal(schemaRows[0]?.issues_table, "issues");

  const input = "frontend issue: title contains ' single quote";
  const echoRows = await query<{ echo: string }>("SELECT $1::text AS echo", [input]);
  assert.equal(echoRows[0]?.echo, input);
});

test("withTransaction 在回调失败时回滚，并释放连接", async () => {
  const externalId = `rollback-${randomUUID()}`;

  await assert.rejects(
    withTransaction(async (transaction) => {
      await transaction.query(
        "INSERT INTO issues (external_id, title, description) VALUES ($1, $2, $3)",
        [externalId, "rollback test", "这条记录不应在事务失败后保留"],
      );
      throw new Error("rollback sentinel");
    }),
    /rollback sentinel/,
  );

  const rows = await query<{ count: string }>(
    "SELECT count(*)::text AS count FROM issues WHERE external_id = $1",
    [externalId],
  );
  assert.equal(rows[0]?.count, "0");
});