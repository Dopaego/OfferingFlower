# Day 3｜PostgreSQL 数据建模 + Migration + 连接池 + 事务

> 目标：让 Agent 系统不只“能跑一次”，而是能可靠保存 Issue、任务过程和截图/补丁等产物；即使 Worker 之后崩溃，也能查明它走到哪一步。
>
> 这一课不假设你会数据库。先理解“为什么需要数据库”，再理解表、SQL、Migration、连接池、事务和索引分别解决什么问题。

## 一、Day 3 到底完成了什么

到 Day 2，我们已经有运行中的 PostgreSQL 容器，但里面只有一个空数据库 `issue_agent`。Day 3 做的是给数据库定义一套**长期保存事实**的结构，并让 Node.js 可以安全地读写它。

本次新增的能力：

1. 使用 [node-pg-migrate](https://github.com/salsita/node-pg-migrate) 管理数据库结构变更。
2. 用原生 SQL 创建 `issues`、`tasks`、`task_steps`、`artifacts` 四张业务表。
3. 使用 `pg` 创建一个进程级 PostgreSQL **连接池**。
4. 统一提供参数化 `query()` 和自动提交/回滚的 `withTransaction()`。
5. 用真实 PostgreSQL 集成测试验证：表存在、参数化查询可传包含单引号的字符串、事务异常后数据会回滚。

```text
用户提交一个前端 Bug
        │
        ▼
     issues 表                 “Bug 是什么？”
        │
        ▼
     tasks 表                  “Agent 为这个 Bug 创建了哪次任务？”
        │
        ▼
  task_steps 表                “这次任务走了哪些步骤，花多久，是否报错？”
        │
        ▼
   artifacts 表                “截图、日志、补丁、报告放在哪里？”
```

## 二、先区分：PostgreSQL、Redis 和 AOF 各做什么

### PostgreSQL 是什么

PostgreSQL 是一个关系型数据库。你可以把它理解成“有明确表格和约束的长期账本”：

- 一行是一条记录，例如一个 Issue 或一次任务。
- 一列是这条记录的一个字段，例如标题、状态、创建时间。
- 外键可以约束记录之间的关系，例如某个 Task 必须属于一个真实存在的 Issue。
- 事务保证“要么全部写进去，要么全部不写”，避免半成品数据。

这里 PostgreSQL 是**事实源（source of truth）**：任务的最终状态、每个步骤、产生的证据都应能在它中间查到。

### Redis 是什么

Redis 是以内存为主、速度非常快的键值存储。Day 5 会用它做：

- BullMQ 的异步任务队列。
- 短期 Blackboard 状态，例如“当前任务已搜索过哪些文件”。
- 缓存，例如最近一次代码搜索的结果。

它适合高频、短生命周期的数据，但不应替代 PostgreSQL 作为可审计的长期记录。

### AOF 是什么

**AOF（Append Only File，追加写文件）**是 Redis 的一种持久化方式。Redis 每次发生写操作时，会把命令追加到文件里；重启时 Redis 可以重放这些命令来恢复数据。

Day 2 在 Redis 中打开了：

```yaml
command: ["redis-server", "--appendonly", "yes"]
```

这能减少开发机重启导致队列或缓存立即丢失的概率，但不改变架构原则：

```text
PostgreSQL：长期事实，必须可审计、可恢复
Redis + AOF：高性能的短期状态，加速恢复，但允许被重建
```

面试不要说“AOF 让 Redis 等于数据库”。更准确的说法是：**AOF 提高 Redis 重启后的数据恢复能力，但 Redis 在本项目仍不是 Task 的唯一事实源。**

## 三、Migration：为什么不能手动改数据库

### Migration 是什么

**Migration（数据库迁移）**是一段版本化的代码，用于描述“数据库结构如何从旧版本变成新版本”。

可以类比前端的 Git 提交：

- Git 提交记录“源代码从旧版本如何变到新版本”。
- Migration 记录“数据库表结构从旧版本如何变到新版本”。

本项目第一份 migration 是：

- [1710720000000_initial-schema.js](../../packages/db/migrations/1710720000000_initial-schema.js)

它有两个函数：

```js
exports.up = (pgm) => {
  // 向前升级：创建表、约束、索引
};

exports.down = (pgm) => {
  // 向后回退：按依赖反序删除表
};
```

### 为什么要有 `up` 和 `down`

`up` 是“升级”，`down` 是“撤销最近一次升级”。例如某次写错了表结构，可以回退 migration 后修正再执行。

```bash
# 执行还未执行过的 migration
npm run db:migrate

# 回退最近一条 migration；会删除 Day 3 的所有业务表，谨慎使用
npm run db:migrate:down
```

`node-pg-migrate` 会在 PostgreSQL 中自动维护 `agent_schema_migrations` 表。它记住哪些 migration 已执行，所以第二次运行 `npm run db:migrate` 会提示：

```text
No migrations to run!
```

这叫做**幂等**：同一条升级命令重复运行不会重复创建相同的表。

### 为什么不直接打开 psql 手动 `CREATE TABLE`

手动改表的最大问题是不可复现：

- 你本机改过，但同事机器和 CI 没改。
- 过两周忘了改过什么。
- 线上出问题时无法知道数据库是哪一版。

Migration 文件跟代码一起进 Git，任何环境只要按顺序执行就能得到相同结构。这是比“我记得在终端敲过一条 SQL”可靠得多的协作方式。

## 四、四张表怎么设计

### 1. `issues`：用户的缺陷单

`issues` 保存用户最初提交的前端问题：

| 字段 | 例子 | 为什么需要 |
| --- | --- | --- |
| `id` | UUID | 数据库内部主键，避免依赖外部系统格式。 |
| `external_id` | `FE-1024` | 可选的外部工单号，设为唯一，避免重复导入。 |
| `title` / `description` | “移动端登录按钮被遮挡” | Agent 需要理解的原始问题。 |
| `labels` | `["mobile", "z-index"]` | 标签数量不固定，适合 JSONB 数组。 |
| `source` | `{ "reporter": "qa" }` | 非核心但可能变化的来源元数据。 |
| `created_at` / `updated_at` | 时间戳 | 审计和排序。 |

`id UUID PRIMARY KEY DEFAULT gen_random_uuid()` 的意思：

- **UUID** 是很长、几乎不会重复的 ID，例如 `9b6c...`。
- **PRIMARY KEY（主键）**表示每一行的唯一身份证，不能重复、不能为空。
- `DEFAULT gen_random_uuid()` 表示插入时不传 `id`，PostgreSQL 自动生成。
- `pgcrypto` 扩展提供了 `gen_random_uuid()`，所以 migration 首先执行 `CREATE EXTENSION IF NOT EXISTS "pgcrypto"`。

### 2. `tasks`：一次 Agent 执行

同一个 Issue 可以被多次处理，例如第一次失败，用户修改描述后重试。因此 `tasks` 不直接混在 `issues` 中。

| 字段 | 作用 |
| --- | --- |
| `issue_id` | **外键**，指向 `issues.id`，表明该任务属于哪个 Issue。 |
| `trace_id` | 一次请求链路的追踪 ID；Day 4 API 日志、Day 5 Worker 日志都要带它。 |
| `idempotency_key` | 幂等键；相同请求重复提交时，避免创建两次任务。 |
| `status` | Agent 当前状态，例如 `queued`、`searching`、`succeeded`。 |
| `input` | 原始任务输入，结构可能随阶段演进，使用 JSONB。 |
| `summary` / `error_code` | 最终结果摘要与标准化错误码。 |
| `started_at` / `finished_at` | 用于计算任务耗时。 |

**外键（Foreign Key）**是数据库层面的“引用必须存在”规则：

```sql
issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE RESTRICT
```

含义是：Task 的 `issue_id` 必须在 `issues` 表找到。如果某个 Issue 已有 Task，`ON DELETE RESTRICT` 会阻止删除这个 Issue，避免留下“没有父 Issue 的孤儿任务”。

### 3. `task_steps`：任务执行过程的审计日志

一个 Agent Task 不是黑盒的一次调用，它会经过“解析 Issue → 搜索代码 → 浏览器复现 → 生成建议 → 验证”等步骤。`task_steps` 每行记录一个步骤：

| 字段 | 作用 |
| --- | --- |
| `task_id` | 属于哪个 Task。 |
| `sequence` | 第几步，从 1 开始。 |
| `name` / `tool_name` | 步骤和工具名称，例如 `search-repository`。 |
| `input` / `output` / `error` | 工具调用的结构化证据。 |
| `duration_ms` | 本步骤耗时。 |
| `token_count` | Week 2 接 LLM 后记录本步骤 Token。 |
| `status` | `started`、`succeeded`、`failed` 或 `skipped`。 |

这里有一个重要约束：

```sql
UNIQUE (task_id, sequence)
```

它保证“同一个任务的第 2 步”不能有两条记录。未来 Worker 崩溃重试时，我们可以利用它防止重复追加同一个步骤。

### 4. `artifacts`：大文件的元数据，不直接存文件本体

截图、补丁、日志、报告都叫 **Artifact（产物）**。本表记录它们的元数据：

| 字段 | 作用 |
| --- | --- |
| `kind` | `screenshot`、`patch`、`report` 等固定种类。 |
| `storage_path` | 文件真实位置或对象存储 key。 |
| `content_type` | MIME 类型，例如 `image/png`。 |
| `byte_size` / `sha256` | 文件大小与校验和，用于验证文件没有被改坏。 |
| `metadata` | 额外信息，例如截图 viewport。 |

为什么不把 PNG 图片直接塞进 PostgreSQL？小项目也可以，但会让数据库膨胀、备份慢、读取路径复杂。本项目先保存路径和元数据；Week 3 Playwright 截图会写到受控目录，生产环境则可以把文件放对象存储。

## 五、JSONB：什么时候用，什么时候不用

**JSONB** 是 PostgreSQL 中以二进制形式存 JSON 的字段类型，支持查询、索引和约束。

本项目将这些“结构可能变化”的数据放进 JSONB：

- `issues.labels`：标签数组长度不固定。
- `issues.source`：不同来源可能字段不同。
- `tasks.input`：Agent 输入会随着功能演进变化。
- `task_steps.input/output/error`：不同工具的入参与输出结构不同。
- `artifacts.metadata`：不同 Artifact 的额外信息不同。

但这些长期稳定、频繁过滤的字段仍使用普通列：

- `tasks.status`，因为会按状态查待处理任务。
- `tasks.created_at`，因为会按时间排序。
- `tasks.issue_id`，因为要做外键关联。

简单判断法：

```text
字段稳定、经常 WHERE / JOIN / ORDER BY？→ 普通列
字段结构不稳定、主要是附加上下文？ → JSONB
```

不要把整张表都设计成一个 JSONB。那会失去类型、约束、索引和关系查询的优势。

## 六、索引：为什么查得快，也为什么不能乱加

**索引（Index）**像书末的目录：不建索引时，数据库可能要从第一行翻到最后一行；建索引后可以更快定位目标记录。

Day 3 建了这些索引：

```sql
CREATE INDEX tasks_issue_id_created_at_idx
  ON tasks (issue_id, created_at DESC);

CREATE INDEX tasks_status_created_at_idx
  ON tasks (status, created_at DESC);

CREATE INDEX task_steps_task_id_sequence_idx
  ON task_steps (task_id, sequence);

CREATE INDEX artifacts_task_id_created_at_idx
  ON artifacts (task_id, created_at DESC);
```

它们对应未来真实查询：

| 查询场景 | 对应索引 |
| --- | --- |
| 查看一个 Issue 的历史任务，最新在前 | `(issue_id, created_at DESC)` |
| Worker 查找某状态的任务，按时间处理 | `(status, created_at DESC)` |
| 按顺序展示 Task 的步骤时间线 | `(task_id, sequence)` |
| 展示某个 Task 的附件列表 | `(task_id, created_at DESC)` |

索引不是越多越好。每新增一个索引，`INSERT` / `UPDATE` 都要额外维护它，写入变慢、占用更多磁盘。正确做法是先根据真实查询建索引，再通过 `EXPLAIN ANALYZE` 验证。

## 七、连接池：为什么不能每次请求都 new 一个数据库连接

### 单次连接的问题

建立数据库连接需要 TCP 握手、认证、分配服务器资源。若每个 HTTP 请求都新建一个 `new Pool()` 或新连接：

- 延迟更高。
- PostgreSQL 很快被大量连接耗尽。
- 连接不关闭时会泄漏资源。

### Pool 是什么

**连接池（Connection Pool）**预先维护少量可复用的数据库连接：

```text
请求 A ─┐
请求 B ─┼─→ Pool（最多 10 条连接）─→ PostgreSQL
请求 C ─┘
```

本项目的 [index.ts](../../packages/db/src/index.ts) 使用：

```ts
let sharedPool: Pool | undefined;

export function getPool(): Pool {
  sharedPool ??= createPool();
  return sharedPool;
}
```

`??=` 的意思是“只有 `sharedPool` 还是 `undefined` 时才创建”。因此一个 Node.js 进程只创建一个 Pool，而不是每次查询创建一个。

`PG_POOL_MAX=10` 是一个本地开发起点，不是放之四海皆准的答案。真实配置要考虑：

```text
总连接上限 >= API 实例数 × 每实例 Pool 最大连接数 + Worker 连接数 + 管理连接余量
```

如果数据库最大只允许 100 个连接，而 20 个 API 实例每个都设 `max=10`，理论上就会要求 200 个连接，必然失败。

## 八、参数化查询：为什么不要用字符串拼接 SQL

错误示例：

```ts
// 错误：用户输入会直接变成 SQL 语法的一部分
const sql = `SELECT * FROM issues WHERE external_id = '${externalId}'`;
```

如果 `externalId` 包含单引号，SQL 可能直接报错；如果是恶意输入，还可能造成 **SQL 注入（SQL Injection）**。

正确示例：

```ts
const rows = await query(
  "SELECT * FROM issues WHERE external_id = $1",
  [externalId],
);
```

`$1` 是占位符，第二个数组才是数据。数据库驱动会把 SQL 结构与数据分开处理，数据中的单引号只会被当作普通字符。

集成测试 [database.integration.test.ts](../../packages/db/test/database.integration.test.ts) 特意传入了包含单引号的字符串，验证参数化查询能完整往返。

## 九、事务：要么全成功，要么全失败

### 事务是什么

**事务（Transaction）**是一组必须一起成功的数据库操作。

例如创建 Task 时通常要：

1. 写入 `tasks`。
2. 写入第一条 `task_steps`。
3. 将审计事件写入后续表。

如果第 1 步成功、第 2 步失败，数据库留下一条没有步骤的 Task，系统状态就不完整。事务可以把这些操作包成一个整体：

```text
BEGIN
  写 tasks
  写 task_steps
COMMIT        所有步骤成功，正式保存

任何一步报错：
ROLLBACK      恢复到 BEGIN 前，前面的写入也消失
```

本项目的封装：

```ts
await withTransaction(async (transaction) => {
  await transaction.query("INSERT INTO tasks ...", values);
  await transaction.query("INSERT INTO task_steps ...", values);
});
```

[packages/db/src/index.ts](../../packages/db/src/index.ts) 中的 `withTransaction()` 做了三件关键事：

1. `BEGIN` 开始事务。
2. 回调成功才 `COMMIT`。
3. 回调抛错时 `ROLLBACK`，无论成功失败都在 `finally` 调用 `client.release()`。

`release()` 极其重要。事务用的是连接池里借出的某一条特定连接；不归还它，连接池会逐渐被借空，后续请求只能等待直到超时。这叫**连接泄漏**。

集成测试故意插入 Issue 后立刻抛错，最后查询到记录数为 `0`，证明回滚真的发生，而不只是“代码看起来像有回滚”。

## 十、Day 3 命令卡片

```bash
cd /Users/wupo/OfferingFlower/StuProject

# Day 2 的依赖应先保持健康
docker compose up -d --wait

# 执行尚未运行的 migration
npm run db:migrate

# 查看业务表
docker compose exec -T postgres \
  psql -U agent -d issue_agent \
  -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"

# 执行数据库集成测试
npm run test --workspace @stu/db

# TypeScript 类型检查
npm run typecheck

# 谨慎：仅回退最近一条 migration，会删除 Day 3 的业务表
npm run db:migrate:down
```

## 十一、Day 3 面试题（自测）

1. Migration 和手动执行 SQL 有什么差异？为什么 `up` / `down` 都要写？
2. `issues` 与 `tasks` 为什么拆成两张表？一个 Issue 是否能有多个 Task？
3. PostgreSQL 是事实源，Redis 开了 AOF 后为什么仍不能代替它？
4. JSONB 和普通列的取舍是什么？为什么 `status` 不放 JSONB？
5. 索引为什么能加速查询？为什么不能给每个字段都建索引？
6. 为什么每个请求不能新建数据库连接？连接池 `max` 太大会发生什么？
7. 参数化查询如何防 SQL 注入？`$1` 和 `[value]` 分别做什么？
8. 事务中 `COMMIT`、`ROLLBACK`、`release()` 各自解决什么问题？
9. `ON DELETE RESTRICT` 与 `ON DELETE CASCADE` 为什么在不同表关系中有不同选择？

参考答案见 [../interview/qa.md](../interview/qa.md) 第 3 组。
