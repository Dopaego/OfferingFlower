# Week 1：Node + PostgreSQL + Redis + BullMQ + Docker

**目标**：不引入 LLM，先把整个 Agent 系统的后端骨架、数据流、故障恢复练熟。这一周结束时，你要能对 8 个高频面试题给出 30 秒回答 + 2 分钟展开 + 指向代码证据。

## 每日关卡

| Day | 关卡 | 主要产出 | 面试关键词 |
| --- | --- | --- | --- |
| 1 | 工程骨架 + TypeScript 严格模式 | `package.json` workspaces、`tsconfig.base.json`、四个 workspace 空入口、`tsc --build` 全绿 | monorepo、project references、`strict`、`noUncheckedIndexedAccess` |
| 2 | Docker Compose 起 PostgreSQL / Redis | `docker-compose.yml`、healthcheck、命名卷、`psql`/`redis-cli` 手动连通 | 镜像 vs 容器 vs 卷、`depends_on: service_healthy`、bridge 网络 |
| 3 | PostgreSQL 数据层 | `packages/db` migration、`issues/tasks/task_steps/artifacts` 四张表、`pg` 连接池 + `withTransaction` | 连接池大小、参数化查询、事务隔离级别、B-Tree/JSONB 索引 |
| 4 | Express API + Zod 边界 | `POST /issues`、`POST /tasks`、`GET /tasks/:id`、Pino 日志、统一错误结构、`traceId` 中间件、Supertest | 事件循环、中间件顺序、边界校验、错误响应契约 |
| 5 | Redis + BullMQ | `apps/worker` 消费 `task-execution`、`jobId` 幂等、`attempts/backoff`、Redis key 命名与 TTL | 队列 vs 缓存 vs DB、至少一次投递、幂等、TTL 语义 |
| 6 | 故障与恢复实验 | 三条实验脚本：Worker `kill -9`、Redis 停机、Redis 清空后从 PG 恢复 Blackboard；`docs/labs/week1-recovery.md` | stalled job、graceful shutdown、事实源 vs 派生状态、SIGTERM |
| 7 | 文档 + 面试题 + 复盘 | `docs/knowledge/day{1..6}-*.md`、`docs/interview/qa.md` +15 题、Week 1 复盘 | 能把整周内容用白板讲通 |

## Day 1 验收清单 ✅

- [x] 根 `package.json` 声明 `workspaces: ["apps/*", "packages/*"]`
- [x] `tsconfig.base.json` 开启 `strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes`
- [x] 4 个 workspace 通过 TypeScript project references 相互引用（`apps/api` 引用 `packages/shared` 与 `packages/db`）
- [x] `npm install` 成功建立 workspace 软链
- [x] `npm run typecheck`（= `tsc --build`）零错误
- [x] `npx tsx apps/api/src/index.ts` 能打印 boot placeholder，说明 `@stu/shared` / `@stu/db` 依赖被解析
- [x] `.env.example` 列出后续所有变量占位符
- [x] `.gitignore` 覆盖 `node_modules/`、`dist/`、`.env`、`*.tsbuildinfo`

## Day 1 学习产出

- 讲义：[../knowledge/day1-workspaces-and-strict-ts.md](../knowledge/day1-workspaces-and-strict-ts.md)
- 面试题：[../interview/qa.md](../interview/qa.md) 第 1 组

## Day 2 验收清单 ✅

- [x] Docker Desktop 已启动；`docker info` 确认 Client 可以连接 daemon。
- [x] [docker-compose.yml](../../docker-compose.yml) 编排 `postgres:16-alpine` 和 `redis:7-alpine`。
- [x] PostgreSQL 使用 `postgres-data` 命名卷，Redis 使用 `redis-data` 命名卷；两者不会因普通 `docker compose down` 丢失。
- [x] 两个服务都有 healthcheck；`docker compose up -d --wait` 等待成功后再返回。
- [x] PostgreSQL 健康检查使用 `pg_isready`；容器内查询返回数据库 `issue_agent`、用户 `agent`。
- [x] Redis 健康检查使用 `redis-cli ping`；容器内查询返回 `PONG`。
- [x] Docker Hub 拉取初次超时后，配置 Docker Desktop 代理；`registry-1.docker.io/v2/` 返回 `401`，这是 Registry 已连通、未认证访问的正常响应。

## Day 2 操作卡片

```bash
# 解析变量和 Compose 语义，但不启动容器
docker compose config --quiet

# 创建网络、命名卷、容器，并等待 healthcheck 成功
docker compose up -d --wait

# 查看真实状态，而不是只看 "container started"
docker compose ps

# 直接使用镜像内置客户端验证服务
docker compose exec -T postgres \
  psql -U agent -d issue_agent -c 'SELECT current_database(), current_user;'
docker compose exec -T redis redis-cli ping

# 停服务但保留命名卷；下次 up 会复用数据
docker compose down

# 删除命名卷，数据才会真正清除；只用于需要干净环境的实验
docker compose down -v
```

## Day 2 需要讲清的设计

| 概念 | 本项目中的实例 | 面试回答要点 |
| --- | --- | --- |
| 镜像 | `postgres:16-alpine`、`redis:7-alpine` | 不可变模板；容器由镜像创建 |
| 容器 | `issue-agent-postgres`、`issue-agent-redis` | 镜像的运行实例；容器文件系统可被销毁 |
| 命名卷 | `issue-agent-postgres-data`、`issue-agent-redis-data` | Docker 管理的持久化目录，生命周期独立于容器 |
| Bridge 网络 | `issue-agent-network` | 容器可用服务名 `postgres` / `redis` 通信；本机通过映射端口访问 |
| Healthcheck | `pg_isready`、`redis-cli ping` | 判断服务是否真的可用，不能把进程启动等同于依赖就绪 |

**为什么 PostgreSQL 与 Redis 都要卷？** PostgreSQL 是事实源，必须保留 Issue、Task 和审计日志；Redis 将在 Day 5 保存 BullMQ 队列与短期 Blackboard，AOF 加命名卷让 Docker 重启后的开发环境更贴近真实情况。Redis 不会成为永久事实源，丢失时仍应由 PostgreSQL 重建状态。

## Day 3 验收清单 ✅

- [x] `@stu/db` 安装 `pg` 与 `node-pg-migrate`，使用原生 SQL 管理 schema，不引入 ORM。
- [x] [初始 migration](../../packages/db/migrations/1710720000000_initial-schema.js) 创建 `issues`、`tasks`、`task_steps`、`artifacts` 四张业务表与迁移历史表。
- [x] `issues → tasks` 使用 `ON DELETE RESTRICT`，防止删除仍有历史任务的 Issue；`tasks → task_steps/artifacts` 使用 `ON DELETE CASCADE`，避免 Task 删除后残留无归属的明细。
- [x] 为任务列表、状态筛选、步骤时间线、Artifact 列表建立组合索引。
- [x] `packages/db/src/index.ts` 提供进程级连接池、参数化 `query()`、`withTransaction()` 和 `closePool()`。
- [x] `npm run db:migrate` 首次创建表，重复执行显示 `No migrations to run!`。
- [x] `npm run test --workspace @stu/db` 通过真实 PostgreSQL 集成测试：参数化查询可处理单引号，异常事务会回滚。
- [x] `npm run typecheck:clean && npm run typecheck` 通过，API 冒烟入口可读取真实数据库配置。

## Day 3 操作卡片

```bash
# Day 2 基础服务要先启动
docker compose up -d --wait

# 升级到最新数据库结构，可重复执行
npm run db:migrate

# 查看当前 public schema 中的业务表
docker compose exec -T postgres \
  psql -U agent -d issue_agent \
  -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"

# 验证真实参数化查询和事务回滚
npm run test --workspace @stu/db

# 仅在实验数据库结构回退时使用；会回退最后一条 migration
npm run db:migrate:down
```

## Day 3 学习产出

- 讲义：[../knowledge/day3-postgresql-data-layer.md](../knowledge/day3-postgresql-data-layer.md)
- 面试题：[../interview/qa.md](../interview/qa.md) 第 3 组

## Day 4 验收清单 ✅

- [x] Express API 提供 `GET /health`、Issue 创建/查询、Task 创建/查询。
- [x] Zod 在 HTTP 边界校验请求体和 UUID 路径参数；错误响应统一为 `VALIDATION_ERROR` 或业务错误码。
- [x] 每个请求具有 `traceId`，响应头 `x-trace-id`、日志、Task 与审计步骤均可关联。
- [x] API 以 `idempotency-key` 对重复创建 Task 去重；首次返回 `202`，重复返回已有 Task 的 `200`。
- [x] `npm run test --workspace @stu/api` 通过 2 个真实 PostgreSQL HTTP 集成测试。

## Day 5 验收清单 ✅

- [x] API 使用 BullMQ `task-execution` 队列，固定 `jobId = taskId`。
- [x] Worker 消费真实 Redis job，将状态、摘要和步骤写入 PostgreSQL。
- [x] Redis 短期进度 key 使用 `task:{taskId}:progress` 命名与 24 小时 TTL。
- [x] `npm run test --workspace @stu/worker` 验证真实 Redis、BullMQ 与 PostgreSQL 的完成链路。

## Day 6 验收清单 ✅

- [x] API / Worker 均处理 SIGINT/SIGTERM；Worker 先 `worker.close()`，再关闭 Redis 与 PostgreSQL 连接。
- [x] BullMQ 采用 3 次尝试和指数退避；最终失败写入 `failed`、错误码和审计步骤。
- [x] 启动恢复协调器从 PostgreSQL 非终态 Task 重建缺失 job，并对已有 job 保持幂等。
- [x] 自动化实验验证恢复重入队、三次失败重试与最终失败持久化；记录见 [恢复实验](../labs/week1-recovery.md)。

## Day 4-6 学习产出

- [Day 4：Express、Zod 与 API](../knowledge/day4-express-zod-api.md)
- [Day 5：Redis、BullMQ 与 Worker](../knowledge/day5-redis-bullmq.md)
- [Day 6：重试、优雅退出与恢复](../knowledge/day6-failure-recovery.md)
- [面试题](../interview/qa.md) 第 4-6 组
