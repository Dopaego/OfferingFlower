# day3 Notes

## 主要工作任务

第二天的工作内容是，定义好了docker，镜像中规定了postgresql、redis的版本，创建了容器
而第三天就是细化其中的postgresql：

给数据库定义结构，并且让Node。js可以安全的读写

1. 使用node pg migrate 管理数据库结构变更
2. 用原生的SQL 创建 issues、tasks、task_steps、artifacts 四张业务表
3. 使用pg 创建 进程级的 PostgreSQL 连接池
4. 统一提供参数化的query和回滚的 withTransaction
5. 集成测试认证


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

## 关于 PostgreSQL的学习

他是一个关系型数据库，有着明确的结构，一行是一个记录，外键之间互相约束
在Agent项目中 担任了 事实源：任务的最终状态、中间的每个步骤、产生的证据都能在其中查到

### migration

migration适用于 数据库版本化的代码，可以描述，每次数据库结构的变化。
migration 文件可以跟代码一起被git追踪，任何环境按照顺序执行 就可以得到相同的结构的表

### JSONB

**JSONB** 是PostgreSQL中 以二进制形式存JSON的字段类型，支持查询、索引和约束

应该被放进JSONB的数据应该是

- 字段结构不稳定，需要被附加到上下文中。

关于 稳定的字段依旧使用普通列

### 索引

索引的存在可以提高我们的查询速度。

比如说 查找Worker 某状态的任务

### 连接池

当我发起了一次 数据库的请求搜索，并不是直接执行SQL
而是要TCP三次握手，建立Socket（后端和PostgreSQL通信的通道），PostgreSQL认证身份
分配后端进程： PostgreSQL 的 每个连接都对应一个操作系统进程
而每个后端进程都会占用系统资源，建立连接也需要时间。所以可以提前建立好多个连接，操作就可以加快速度，不需要每次查询再重新创建来链接

```text
总连接上限 >= API 实例数 × 每实例 Pool 最大连接数 + Worker 连接数 + 管理连接余量
```

### 事务

事务是一组必须一起成功的数据库操作

比如说 一条的记录需要多步操作，当后面的操作失败了之后，要撤销前面的操作

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

## 关于Agent项目中对于关系型数据库的必要和结构描述

1. `issues`：用户的缺陷单

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

2. `tasks`：一次 Agent 执行

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

3. `task_steps`：任务执行过程的审计日志

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

