# 面试题库

> 每题给出：**30 秒回答**（口播）→ **2 分钟展开**（有细节）→ **代码证据**（指到文件）→ **常见追问**。

面试官的评估维度不是"你会不会"，而是"你有没有真正踩过、想过、权衡过"。所以每条答案都必须能落到代码或实验记录上。

---

## 第 1 组：Day 1 —— 工程骨架 & TypeScript

### Q1. 为什么用 monorepo？在这个项目里 npm workspaces 而不是 pnpm/turbo？

**30 秒**：Agent 项目里 API、Worker、共享类型必须共用一份数据契约，否则一改就漂。npm workspaces 是 Node 原生支持，零外部工具就能实现软链和统一安装。学生作品没有多版本发布诉求，pnpm 的硬链节省和 turbo 的缓存收益不是刚需，先用 npm workspaces，等瓶颈出现再迁。

**2 分钟展开**：

- 三个层次的需求：跨包**类型共享**（必须）、跨包**依赖软链**（必须）、跨包**构建缓存**（可选）。前两个 npm workspaces 都能满足。
- pnpm 的优势在磁盘和 phantom dependency，学生项目量级看不出差异。
- Turborepo 的价值在大项目 CI 加速，我这里 `tsc --build` 已经有增量缓存。
- 迁移成本：npm workspaces → pnpm 只需要换 lockfile 和调整 hoisting；不会锁死未来。

**代码证据**：[package.json](../../package.json) 的 `workspaces` 字段、[tsconfig.json](../../tsconfig.json) 的 `references`。

**常见追问**：

- "如果两个 workspace 依赖同一个包的不同版本会怎样？" → npm workspaces 会尝试 hoist，失败则在子包 `node_modules` 单独安装；pnpm 用符号链接彻底隔离。
- "workspaces 里能不能只发布其中一个包？" → 可以，`npm publish --workspace @stu/shared`。但学生项目全部 `private: true`。

---

### Q2. `tsc` 和 `tsc --build` 有什么区别？

**30 秒**：`tsc` 是"编译当前 tsconfig 覆盖的文件"；`tsc --build` 是"按 project references 拓扑排序，增量编译整个图"。monorepo 里跨包引用必须用后者，因为它才会先编译被依赖的包、写出 `.d.ts`，再编译上游。

**2 分钟展开**：

- `tsc --build` 会读 `references` 字段，构建依赖 DAG。
- 每个包生成 `.tsbuildinfo`，二次编译只处理改过的包。
- 上游包 IDE 里跳转到 `packages/shared/dist/index.d.ts`，和真实 npm 包体验一致。
- `composite: true` 是 project references 的前置条件，它强制打开 `declaration + incremental`。

**代码证据**：根 [tsconfig.json](../../tsconfig.json) 的 `references` 数组；[packages/shared/tsconfig.json](../../packages/shared/tsconfig.json) 的 `composite`。

**常见追问**：

- "改了 shared 的类型，api 里为什么没立刻报错？" → IDE 用的是 `.d.ts`，需要重跑 `tsc --build` 或让 IDE 认识 project references（VS Code 默认支持）。

---

### Q3. `noUncheckedIndexedAccess` 会在哪种真实 bug 上救你？

**30 秒**：默认下 `arr[0]` 的类型是 `T`，但运行时可能是 `undefined`。打开后类型系统会强迫我判空。比如从 BullMQ 拿一个 job 的 `job.data.tools[0].name`，如果没打开我可能直接读取空数组的第一项，运行时 `TypeError: cannot read property 'name' of undefined`。打开后 TS 会先要求我处理 `undefined`。

**2 分钟展开**：

- 前端里 `params.get('id')` 也是同一类问题——`URLSearchParams.get` 返回 `string | null`，但很多人直接当 `string` 用。
- 打开后代码变啰嗦，但 bug 减少。项目里我用**类型守卫函数**（如 `assertNonEmpty(arr)`）在数据边界一次判定，内部就当作非空访问，可读性和安全性兼顾。

**代码证据**：[tsconfig.base.json](../../tsconfig.base.json) 打开的 flag 集合。

**常见追问**：

- "那 `Record<string, User>` 里 `map[id]` 也会变成可空？" → 是的，这是特性不是 bug。它逼你区分"确定存在的字段"和"来自外部的 key"。

---

### Q4. `"type": "module"` 打开后为什么 `import` 要写 `.js` 后缀？

**30 秒**：ESM 规范要求 import 路径必须是**完整 URL**，Node 不做后缀猜测。TypeScript 编译后 `.ts` → `.js`，所以源代码里就要写目标文件名 `.js`，即使当前源文件是 `.ts`。这是一个"写起来别扭但符合规范"的取舍。

**2 分钟展开**：

- CommonJS 时代 Node 会尝试 `./foo`, `./foo.js`, `./foo/index.js` 一堆猜测，规范化后不再猜。
- 用 `moduleResolution: NodeNext` 时 TS 会强制这个规则，避免编译出跑不起来的产物。
- 目前 workspace 依赖走 `@stu/shared` 这种"包名 import"，不受影响；只有本包内相对路径需要 `.js`。

---

### Q5. `tsx` 不做类型检查，为什么开发期还敢用？

**30 秒**：类型检查放到 IDE 和 CI，运行时用最快的转译工具就行。IDE 已经实时报错，CI 有 `tsc --build` 门禁；tsx 只负责"把 TS 变成能跑的 JS"。这样开发反馈快，CI 又能拦住类型问题，两不误。

**2 分钟**：

- `ts-node` 会在启动时做类型检查，冷启动慢。
- `tsx` 底层 esbuild，只做 syntactic transpile，快一个量级。
- 生产不能用 tsx，因为它假设有 TS 工具链。生产走 `tsc --build` 出来的 `dist/`，然后 `node dist/index.js`。

**代码证据**：`apps/api/package.json` 的 `dev` 用 tsx，`start` 用 node。

---

### Q6. Worker 收到 SIGTERM 正在处理任务，正确做法？

**30 秒**：

1. 立刻从队列**停止接单**（BullMQ 里是 `worker.close()`）。
2. 等 in-flight job 处理完毕（或者达到宽限期）。
3. 关掉 PostgreSQL 连接池和 Redis 连接。
4. `process.exit(0)`。

错误做法：直接 `process.exit(0)` 或不监听 → 容器编排给 SIGKILL → 未完成的 job 变 stalled，靠重试机制续跑，浪费一次 LLM 调用 + 可能副作用重复。

**2 分钟展开**：

- `docker stop` 默认 10 秒宽限；Kubernetes `terminationGracePeriodSeconds` 默认 30 秒。宽限期内没退出就 SIGKILL。
- Worker 要设计成"任何一步都可幂等重放"，光靠 graceful 不够，还要靠 `jobId` 幂等 + `task_steps` 追加式日志。
- 我这个项目里的 `TaskState` 状态机就是为了这个：即便 Worker 崩溃，Orchestrator 重启后能读 PG `tasks + task_steps` 重建 Blackboard。

**代码证据**：[apps/worker/src/index.ts](../../apps/worker/src/index.ts) 的信号处理骨架（Day 6 会补完整逻辑）。

---

## 第 2 组：Day 2 —— Docker Compose

### Q7. 镜像、容器、数据卷分别是什么？为什么 PostgreSQL 不能只依赖容器文件系统？

**30 秒**：镜像是不可变模板，容器是它启动后的运行实例，卷是独立于容器生命周期的持久化存储。PostgreSQL 数据写在容器文件系统中，删除并重建容器会丢数据；所以我把 `/var/lib/postgresql/data` 挂到命名卷。这样 `docker compose down` 后再次启动，Issue 和任务日志仍在。

**2 分钟展开**：

- 镜像用分层文件系统分发，例如 `postgres:16-alpine`；同一镜像可创建多个容器。
- 容器的可写层应当视为易失的，升级镜像或重建环境时会消失。
- 命名卷由 Docker 管理，不绑定宿主机绝对路径，适合本地开发；生产常改为云盘或托管数据库。
- 这里 Redis 也使用命名卷并开启 AOF，但它只是队列和热状态的加速层，真正可追溯的 Task 事实仍要落 PostgreSQL。

**代码证据**：[docker-compose.yml](../../docker-compose.yml) 的 `postgres-data`、`redis-data` 和服务 `volumes` 配置。

**常见追问**：

- "`docker compose down` 和 `down -v` 区别？" → 前者删除容器、网络，保留命名卷；后者连命名卷一起删除，所以会清库。
- "为什么不用 bind mount？" → 本项目数据库数据不需要由编辑器直接读写，命名卷跨 macOS / Linux 更少权限和性能差异；源代码才更适合 bind mount。

---

### Q8. 容器显示 running 就代表数据库可用吗？

**30 秒**：不代表。`running` 只说明 PID 1 还活着，PostgreSQL 可能仍在初始化或恢复数据。我要用 healthcheck 明确判断就绪：PostgreSQL 用 `pg_isready`，Redis 用 `redis-cli ping`，Compose 用 `up -d --wait` 等待健康检查通过后才让后续服务启动或测试执行。

**2 分钟展开**：

- readiness 与 liveness 要区分：liveness 表示进程没死，readiness 表示当前能处理请求。Compose 的 healthcheck 在本地把这两者简化了，但生产会将其映射为 Kubernetes liveness/readiness probes。
- 仅等待固定 `sleep 5` 是脆弱方案，机器性能、首次初始化和恢复时间都会变化。
- Day 4 的 API 和 Day 5 的 Worker 启动时应依赖数据库和 Redis 健康，连接失败也需要有限重试，而不是无限 crash loop。

**代码证据**：[docker-compose.yml](../../docker-compose.yml) 的两个 `healthcheck` 与 `start_period`。

---

### Q9. Docker 代理配置后，访问 Docker Registry 返回 401 是失败吗？

**30 秒**：不是。Docker Registry 的 `/v2/` 匿名探测通常返回 `401 Unauthorized` 并带认证挑战头，含义是网络已经连到 Registry，只是请求没有携带镜像拉取令牌。之前超时才是网络故障；配置 Docker Desktop 代理后从超时变为 401，说明代理链路恢复。

**2 分钟展开**：

- 拉取镜像不是只访问一个 URL，还会访问 token 服务和分层 blob。Docker daemon 必须使用代理，只有终端设置代理不一定足够。
- 我用 `curl --connect-timeout 10 https://registry-1.docker.io/v2/` 区分了网络不可达和正常认证挑战。
- Docker Desktop 的 daemon 代理显示为 `http.docker.internal:3128`，所以 Compose 拉取完成；这个排障过程比盲目重复 `docker pull` 更可复现。

---

### Q10. 为什么 Compose 使用 bridge 网络和服务名，而不是固定容器 IP？

**30 秒**：容器 IP 会在重建后变化，Compose 的 bridge 网络提供 DNS，容器可稳定用服务名 `postgres` 和 `redis` 发现依赖。固定 IP 会把部署细节写死，扩容或重建都会变脆。

**2 分钟展开**：

- 本机 API 通过端口映射 `127.0.0.1:5432`、`127.0.0.1:6379` 连接；未来 API 容器化后，会用 `postgres:5432` 和 `redis:6379`。
- 端口映射是给宿主机或外部客户端的，容器内同网络通信不经过宿主机端口。
- 目前网络没有启用 `internal: true`，因为 Day 3 的 Node 进程先运行在宿主机；到 Week 4 全部容器化时会重新评估数据库端口是否还需暴露。

## 第 3 组：Day 3 —— PostgreSQL

### Q11. 什么是 Migration？为什么不直接在数据库终端手动建表？

**30 秒**：Migration 是数据库结构的版本化变更记录，类似数据库的 Git 提交。它把“创建表、索引、约束”写进仓库，任何环境执行同一组 migration 都能获得相同 schema。手动在终端建表不可追溯，也无法保证开发机、CI 和生产环境一致。

**2 分钟展开**：

- 每个 migration 有 `up` 和 `down`：`up` 升级结构，`down` 回退最近一次升级。
- `node-pg-migrate` 用 `agent_schema_migrations` 表记录已执行版本，所以 `npm run db:migrate` 可安全重复执行。
- 线上 migration 不等于随时可以回退：删除字段或表可能造成数据损失。因此本地项目的 `down` 用于学习和实验，生产更常见的是写一条新的“修复 migration”。

**代码证据**：[初始 migration](../../packages/db/migrations/1710720000000_initial-schema.js)、[@stu/db 脚本](../../packages/db/package.json)。

---

### Q12. 为什么要拆分 `issues`、`tasks` 和 `task_steps`，不放进一张表？

**30 秒**：它们代表不同层级的事实。Issue 是用户的缺陷单，一个 Issue 可以多次触发 Agent；Task 是一次执行；Task Step 是这次执行的步骤审计。拆开后能表达一对多关系，也能查询同一 Issue 的重试历史以及一次 Task 的完整工具调用过程。

**2 分钟展开**：

- `issues → tasks` 用外键，且 `ON DELETE RESTRICT`：已有任务历史时不允许直接删 Issue。
- `tasks → task_steps` 用 `ON DELETE CASCADE`：若测试环境删除 Task，其步骤不应留下孤儿数据。
- `task_steps` 的 `(task_id, sequence)` 唯一约束为 Worker 重试提供基础，防止同一步骤重复记录。
- 这也是 Agent 可观测性的基础：出错时不只看到“失败”，还能定位到哪一个工具、输入摘要、耗时和错误。

**代码证据**：[初始 migration](../../packages/db/migrations/1710720000000_initial-schema.js)。

---

### Q13. JSONB 和普通列分别什么时候用？

**30 秒**：稳定、常查询、需要关联或排序的字段用普通列，例如 `status`、`issue_id`、`created_at`；结构可能随工具变化的附加上下文用 JSONB，例如 `task_steps.input/output/error`。JSONB 是灵活性，不是逃避建模。

**2 分钟展开**：

- Agent 不同工具的输入输出格式不同，全部为它们建固定列会导致 schema 快速膨胀，所以用 JSONB 保存结构化证据。
- 任务状态会高频筛选，必须是普通 `TEXT` 列并加索引，不能藏在 JSONB。
- PostgreSQL 可以查询和索引 JSONB，但查询复杂、约束弱；只有真实出现按 JSON 字段过滤的热点需求时，才考虑添加 JSONB 的 GIN 索引。

**代码证据**：[初始 migration](../../packages/db/migrations/1710720000000_initial-schema.js) 中 `tasks.status` 与 `task_steps.input/output` 的对比。

---

### Q14. 为什么用连接池？连接池大小如何思考？

**30 秒**：建数据库连接有认证和网络开销，且 PostgreSQL 能承受的连接数有限。连接池复用少量连接，避免每个请求都建立新连接。`PG_POOL_MAX=10` 是本地起点；生产要按实例数、Worker 数和数据库最大连接数计算，不能盲目设很大。

**2 分钟展开**：

- 本项目每个 Node 进程只持有一个共享 `Pool`，而不是每次 query 都 `new Pool()`。
- 粗略约束是：所有 API 实例 Pool 上限 + Worker 连接 + 管理余量，不应超过数据库 `max_connections`。
- Pool 太小：请求排队，延迟上升；Pool 太大：数据库上下文切换、内存占用增加，最终拒绝连接。
- 事务从 Pool 借出特定 client，结束后必须 `release()`；不释放会造成连接泄漏。

**代码证据**：[数据库连接池](../../packages/db/src/index.ts) 的 `getPool()`、`createPool()`、`closePool()`。

---

### Q15. 参数化查询如何防止 SQL 注入？

**30 秒**：SQL 结构和用户数据必须分开。SQL 写成 `WHERE external_id = $1`，用户值放数组 `[externalId]` 交给 `pg` 驱动。这样单引号和恶意字符只会被当成数据，不会被拼进 SQL 语法。

**2 分钟展开**：

- 错误写法是模板字符串拼接：`... WHERE id = '${id}'`。它既可能因单引号报错，也可能让恶意输入改变查询语义。
- 参数化不是只保护 SELECT；INSERT、UPDATE、DELETE 都应使用占位符。
- 表名和列名不能用 `$1` 参数化。如果确实需要动态表名，应该使用代码白名单，而不是接受用户字符串。

**代码证据**：[集成测试](../../packages/db/test/database.integration.test.ts) 使用含单引号的输入验证参数化往返。

---

### Q16. 事务中的 `BEGIN`、`COMMIT`、`ROLLBACK`、`release()` 分别做什么？

**30 秒**：`BEGIN` 开始一组原子操作；全部成功才 `COMMIT` 持久化；任意一步失败就 `ROLLBACK` 撤销本次事务的写入；最后 `release()` 把连接还给连接池。前三个保证数据一致性，最后一个避免连接池泄漏。

**2 分钟展开**：

- 创建 Task 通常要同时写 Task 主记录和首个步骤。没有事务时可能只写成功一半。
- `withTransaction()` 中的 `finally` 无论成功、回滚失败还是抛出异常都会执行，确保连接归还。
- 当前默认隔离级别是 PostgreSQL 的 `READ COMMITTED`，对本项目当前“创建一次任务并追加步骤”的场景够用。若未来需要同时抢占同一个任务，需要研究行锁、乐观锁或更高隔离级别。
- 测试中故意插入 Issue 后抛出异常，随后查到数量为 0，证明回滚真实生效。

**代码证据**：[事务封装](../../packages/db/src/index.ts)、[回滚集成测试](../../packages/db/test/database.integration.test.ts)。

## 第 4 组：Day 4 —— Express + Zod

### Q17. 为什么有 TypeScript 还要 Zod？

**30 秒**：TypeScript 只在编译期存在，HTTP JSON 到服务端时仍然是未知数据。Zod 在运行时检查 title、description、UUID 等边界条件；校验失败返回固定的 `400 VALIDATION_ERROR`，不会让坏数据进 PostgreSQL。

**2 分钟展开**：类型描述的是“我希望数据长什么样”，schema 是“我在运行时实际验证数据长什么样”。边界只校验一次，内部逻辑可以信任已解析的类型；这比在每层 scattered `if` 更清晰。Schema 还让错误响应契约可测试。

**代码证据**：[apps/api/src/app.ts](../../apps/api/src/app.ts)、[API 集成测试](../../apps/api/test/api.integration.test.ts)。

**常见追问**："Zod 是否会自动防 SQL 注入？" → 不会。它负责格式与业务边界；SQL 注入仍靠 `pg` 参数化查询。

### Q18. traceId 如何跨 API、队列和 Worker 传播？

**30 秒**：API 优先使用请求头 `x-trace-id`，没有就生成 UUID，并回写到响应头。创建 Task 时写进 PostgreSQL；入 BullMQ job 时放进 job data；Worker 写审计步骤时继续携带。因此可以从 HTTP 日志定位到同一次后台执行。

**2 分钟展开**：traceId 不是数据库主键，也不是幂等键。它是观测关联键；Task UUID 是实体标识；idempotency key 是重复请求去重键。三者混用会让排障变得模糊。

**代码证据**：[apps/api/src/app.ts](../../apps/api/src/app.ts)、[packages/db/src/repository.ts](../../packages/db/src/repository.ts)。

### Q19. HTTP 202 与 200/201 有什么不同？

**30 秒**：`201 Created` 表示 Issue 已创建；`202 Accepted` 表示 Task 已持久化且已被接受为异步工作，但不代表 Agent 完成。重复幂等请求返回已有 Task 的 `200`。

**代码证据**：[apps/api/src/app.ts](../../apps/api/src/app.ts)、[Day 4 讲义](../knowledge/day4-express-zod-api.md)。

## 第 5 组：Day 5 —— Redis + BullMQ

### Q20. 为什么 PostgreSQL 和 Redis 同时存在？

**30 秒**：PostgreSQL 记录可审计的业务事实，Redis 支撑高吞吐队列和短期进度。Redis 可重启或清空，不能成为唯一事实源；恢复时以 PG 的非终态 Task 重建队列。

**代码证据**：[packages/db/migrations/1710720000000_initial-schema.js](../../packages/db/migrations/1710720000000_initial-schema.js)、[apps/worker/src/recovery.ts](../../apps/worker/src/recovery.ts)。

### Q21. `jobId = taskId` 是如何实现幂等的？

**30 秒**：Task 的 UUID 已经是一次执行的稳定身份；入队复用为 BullMQ `jobId`，重复调用不会制造不同 ID 的第二个 job。API 层还用数据库唯一 `idempotency_key` 阻止重复创建 Task。

**2 分钟展开**：队列幂等只能减少重复投递，不能自动消除外部副作用重复。因此未来 LLM、评论、补丁应用仍要用 Task Step/状态检查点记录“是否已经完成”。

**代码证据**：[packages/shared/src/queue.ts](../../packages/shared/src/queue.ts)、[apps/api/src/app.ts](../../apps/api/src/app.ts)。

### Q22. TTL 为什么设为 24 小时？

**30 秒**：`task:{taskId}:progress` 是 UI 短期进度，不是审计记录，设 24 小时防止 Redis 无限增长。真正的 Task、步骤和错误码在 PostgreSQL，不随 TTL 删除。

**代码证据**：[apps/worker/src/worker.ts](../../apps/worker/src/worker.ts)。

## 第 6 组：Day 6 —— 故障恢复

### Q23. Worker 收到 SIGTERM 时为什么先 `worker.close()`？

**30 秒**：它先停止领取新 job，再等待当前 in-flight job 完成；之后才关闭 DB pool 并退出。直接 `process.exit()` 会让执行中的任务半途消失，增加 stalled 和重复执行概率。

**代码证据**：[apps/worker/src/index.ts](../../apps/worker/src/index.ts)。

### Q24. 重试策略如何避免无限消耗资源？

**30 秒**：队列默认最多 3 次、指数退避。最后一次仍失败就把 Task 写为 `failed`、记录 `WORKER_EXECUTION_FAILED` 和失败 Step；需要人判断的未来可转 `needs_review`。

**代码证据**：[packages/shared/src/queue.ts](../../packages/shared/src/queue.ts)、[恢复测试](../../apps/worker/test/recovery.integration.test.ts)。

### Q25. Redis 清空后任务为什么不会永久丢失？

**30 秒**：因为先落 PG 再入队。Worker 启动时扫描 PG 中所有非终态 Task；没有对应 job 就按固定 `taskId` 重建，已有 job 就不重复创建。自动化实验已经验证第一次补 job、第二次幂等跳过。

**代码证据**：[apps/worker/src/recovery.ts](../../apps/worker/src/recovery.ts)、[恢复实验](../labs/week1-recovery.md)。

### Q26. 面对“线上任务重复执行”你怎么回答？

**30 秒**：先承认 BullMQ 属于至少一次处理，不能承诺队列层 exactly-once。然后说明分层措施：API 幂等键、`jobId=taskId`、数据库审计步骤、外部副作用前的检查点和恢复协调。最后说明会监控重复率、failed 数、队列积压和恢复数量。

**真实场景回答**：我会先暂停高风险副作用（例如自动应用补丁），保留 Task/Step 证据，按幂等键和 traceId 定位重复来源；对已完成副作用打业务去重标记，再安全重放未完成步骤。

## 第 7 组：Day 7 —— 复盘与系统表达

### Q27. 你怎么用两分钟解释这个 Agent 项目当前的端到端链路？

**30 秒**：客户端创建 Issue 和 Task，Task 先写 PostgreSQL 再放 BullMQ；Worker 处理并持续追加 Task Step。PostgreSQL 是事实源，Redis 是队列和短期进度，因此 Worker 或 Redis 出故障时，通过扫描非终态 Task 重建队列。

**2 分钟展开**：先说数据流，再说故障流，最后讲边界。数据流是 API 校验、幂等创建、异步消费、审计落库；故障流是三次重试、最终失败落库、启动 reconciliation；边界是当前尚未接 LLM 和浏览器，后续先让模型输出经过人工批准的计划。

**代码证据**：[Week 1 复盘](../knowledge/day7-week1-retrospective.md)、[恢复协调器](../../apps/worker/src/recovery.ts)。

### Q28. 你如何保证简历项目描述真实？

**30 秒**：每一条已写表述必须对应代码位置、可运行验证命令和取舍说明；没有测试、实验或运行结果的能力只写为“设计中”，不写成“已实现”。

**代码证据**：[简历证据映射](resume-evidence.md)。

## 第 8 组：Week 2 Day 8 —— LLM Provider

### Q29. 为什么要抽象 LLM Provider，而不是在 Worker 里直接调用 OpenAI SDK？

**30 秒**：Worker 是业务编排层，不应该知道厂商 URL、鉴权字段和响应格式。`LlmProvider` 把这些放在适配层，业务只依赖稳定的 completion 契约；测试可换 FakeProvider，未来换模型服务也不改编排逻辑。

**代码证据**：[@stu/agent](../../packages/agent/src/index.ts)、[Provider 测试](../../packages/agent/test/provider.test.ts)。

### Q30. FakeProvider 有什么工程价值？

**30 秒**：它让测试确定、无网络、无费用、不会受模型随机性和配额影响。真实 Key 未配置时默认选它，开发环境不会意外调用付费模型；真实 Provider 则单独测试协议映射和错误分类。

**常见追问**："FakeProvider 会不会掩盖真实模型问题？" → 会，所以它只保证编排回归；还需用少量受控真实请求做 smoke test，并把结果与成本单独记录，不能替代线上观察。

## 第 9 组：Week 2 Day 9 —— Planner Orchestrator

### Q31. Planner Orchestrator 和 LLM Provider 分别负责什么？

**30 秒**：Provider 只负责把统一的对话请求发给模型并返回结果；Orchestrator 负责读取 Issue/Task、推进状态机、构造受控 Prompt、校验计划、写审计步骤和决定是否进入人工审批。这样厂商协议和业务流程不会耦合。

**2 分钟展开**：Provider 可替换为 Fake 或 OpenAI 兼容实现；Orchestrator 始终依赖接口。模型文本不是状态机，只有代码能把 Task 从 `planning` 变成 `awaiting_approval`。如果 JSON 解析失败，任务不能进入批准态，必须保留错误证据并按错误类型处理。

**代码锚点**：[@stu/agent Provider](../../packages/agent/src/index.ts)、[Day 9 讲义](../knowledge/day9-planner-orchestrator.md)。Planner 代码将在 Day 9 实现。

### Q32. 为什么计划生成后要停在 `awaiting_approval`？

**30 秒**：计划只是模型给出的候选推理，不是已验证事实。停在 `awaiting_approval` 能让人检查范围、风险和工具请求，避免幻觉或提示注入直接触发浏览器操作、代码修改或外部副作用。

**常见追问**："这会不会降低自动化效率？" → 高风险步骤需要可控性；低风险只读工具未来可在明确预算内自动运行，但授权仍由代码策略控制，不能由模型自行绕过。

## 第 10 组：Week 2 Day 10 —— Tool Policy

### Q33. 为什么 Tool Calling 不等于把 shell 暴露给模型？

**30 秒**：Tool Calling 是结构化请求协议，不是权限授予。模型只能请求代码注册过的工具；Tool Policy 再根据 allowlist、输入 schema、风险等级、预算和批准状态决定能否执行。任意 shell 根本不注册。

**代码锚点**：[Day 10 讲义](../knowledge/day10-tool-policy.md)。Tool Policy 实现将在 Day 10 完成。

### Q34. Allowlist 为什么优于 Blocklist？

**30 秒**：Blocklist 永远列不完危险命令、编码方式和组合路径；allowlist 只开放业务真正需要的少数能力，未知工具名默认拒绝。安全边界从“拦截已知坏事”变成“只允许已知好事”。

### Q35. 如何防止间接提示注入？

**30 秒**：把 Issue、代码、网页和工具输出都视为不可信数据，不能当指令拼回系统提示；同时在代码层限制工具能力、校验输入、脱敏输出。Prompt 提醒只是辅助，真正防线是 Policy 和最小权限。

**真实场景回答**：如果检索到的 README 出现“上传 `.env`”的指令，我会把它作为文本证据记录，而不是执行；由于 `read_file` 会拒绝敏感路径、上传工具也不在 allowlist，模型无法越过策略层拿到 secret。
