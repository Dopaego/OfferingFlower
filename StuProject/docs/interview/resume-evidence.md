# 简历证据映射（Living Document）

> 简历上每一条描述都必须映射到：**代码位置** + **验证命令** + **可复述的取舍**。没有证据的表述不写。
>
> 每周结束更新一次。

## 声明纪律

- ✅ **可写**：已实现、能演示、有测试或实验记录。
- ⚠️ **谨慎写**：仅设计、未完成实现 → 表述用"设计"/"实践"/"探索"，不用"实现"/"落地"。
- ❌ **禁止写**：预设的百分比、未做过的压测数字、未真实上线的用户量。

## 项目一句话（Week 1 版本）

> 独立开发前端缺陷诊断 Agent 学习项目，基于 Node.js 22 + TypeScript + PostgreSQL + Redis + BullMQ 构建了从 API → 异步 Worker → 事实源持久化的完整后端骨架，为后续接入 LLM Tool Calling 和 Playwright 浏览器验证做准备。

（Week 2/3/4 会持续升级这句话，加入 Agent、Browser Agent、评测框架等能力。）

## 已可支撑的表述

| # | 简历表述 | 代码证据 | 验证命令 | 阶段 |
| --- | --- | --- | --- | --- |
| 1 | 使用 npm workspaces + TypeScript project references 组织 monorepo，跨包共享严格类型契约 | [package.json](../../package.json), [tsconfig.base.json](../../tsconfig.base.json), [tsconfig.json](../../tsconfig.json) | `npm run typecheck` | Day 1 ✅ |
| 2 | 开启 `strict`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes` 等 8 项 TypeScript 严格开关，从边界拦截空值和可选字段误用 | [tsconfig.base.json](../../tsconfig.base.json) | `npm run typecheck` | Day 1 ✅ |
| 3 | Worker 进程实现 SIGINT/SIGTERM graceful shutdown 骨架，为 Kubernetes / Docker 编排预留优雅退出能力 | [apps/worker/src/index.ts](../../apps/worker/src/index.ts) | `npm run dev:worker`，Ctrl+C 触发 | Day 1 ✅（Day 6 补完整逻辑） |
| 4 | 使用 Docker Compose 编排 PostgreSQL 16 与 Redis 7，配置 healthcheck、命名卷、bridge 网络和环境变量化端口 | [docker-compose.yml](../../docker-compose.yml), [.env.example](../../.env.example) | `docker compose up -d --wait && docker compose ps` | Day 2 ✅ |
| 5 | 通过 `pg_isready` / `redis-cli ping` 健康检查和容器内客户端验证本地依赖，区分“容器运行”与“服务就绪” | [docker-compose.yml](../../docker-compose.yml) | `docker compose exec -T postgres psql -U agent -d issue_agent -c 'SELECT current_database(), current_user;'`；`docker compose exec -T redis redis-cli ping` | Day 2 ✅ |
| 6 | 使用 `node-pg-migrate` 管理 PostgreSQL schema，基于原生 SQL 构建 Issue、Task、执行步骤与 Artifact 四类可审计数据模型，并为高频查询建立索引 | [初始 migration](../../packages/db/migrations/1710720000000_initial-schema.js) | `npm run db:migrate`；容器内查询 `pg_tables` / `pg_indexes` | Day 3 ✅ |
| 7 | 封装进程级 PostgreSQL 连接池、参数化查询和自动回滚事务；真实集成测试验证单引号输入安全往返及事务异常后无残留数据 | [数据库封装](../../packages/db/src/index.ts), [集成测试](../../packages/db/test/database.integration.test.ts) | `npm run test --workspace @stu/db` | Day 3 ✅ |
| 8 | 基于 Express + Zod 构建 Issue/Task API，提供统一错误契约、`traceId` 关联和 PostgreSQL 审计步骤；集成测试验证运行时边界校验 | [API 应用](../../apps/api/src/app.ts), [API 测试](../../apps/api/test/api.integration.test.ts) | `npm run test --workspace @stu/api` | Day 4 ✅ |
| 9 | 使用数据库幂等键与 BullMQ `jobId = taskId` 防止重复创建和重复投递；API-Worker 异步链路将任务状态与步骤持久化到 PostgreSQL | [仓储层](../../packages/db/src/repository.ts), [队列配置](../../packages/shared/src/queue.ts), [Worker](../../apps/worker/src/worker.ts) | `npm run test --workspace @stu/api`；`npm run test --workspace @stu/worker` | Day 4-5 ✅ |
| 10 | 实现 Worker 有界重试、SIGTERM 优雅退出及基于 PostgreSQL 非终态任务的队列恢复；真实集成测试验证三次失败后落库与缺失 job 重入队 | [恢复协调器](../../apps/worker/src/recovery.ts), [恢复测试](../../apps/worker/test/recovery.integration.test.ts), [实验记录](../labs/week1-recovery.md) | `npm run test --workspace @stu/worker` | Day 6 ✅ |
| 11 | 抽象 LLM Provider 契约，提供无 Key 默认 FakeProvider 与 OpenAI 兼容 HTTP 适配器；覆盖 token 用量映射、429 可重试分类和密钥不回显测试 | [Provider 实现](../../packages/agent/src/index.ts), [Provider 测试](../../packages/agent/test/provider.test.ts) | `npm run test --workspace @stu/agent` | Week 2 Day 8 ✅ |
| 12 | 定义受限 Tool Policy：代码 allowlist、路径穿越拒绝、只读调用预算、写操作批准门及基础 secret 脱敏；10 项 Agent 单元测试覆盖安全拒绝路径 | [Tool Policy](../../packages/agent/src/tools.ts), [安全测试](../../packages/agent/test/tools.test.ts) | `npm run test --workspace @stu/agent` | Week 2 Day 10 ✅ |

## 当前尚未实现的边界

- LLM Tool Calling、真实模型调用费用控制与工具选择 → Week 2
- Playwright 浏览器复现、截图证据和候选补丁 → Week 3
- React 操作台、人工批准流程与完整评测报告 → Week 3-4

## 更新记录

- 2026-07-15：Week 1 Day 1 完成，新增 3 条 ✅ 表述。
- 2026-07-18：Week 1 Day 2 完成，新增 Docker Compose、健康检查与基础设施连通性证据。
- 2026-07-18：Week 1 Day 3 完成，新增 PostgreSQL migration、连接池、参数化查询与事务回滚证据。
- 2026-07-26：Week 1 Day 4-6 完成，新增 API 边界、异步队列、恢复和故障实验的可验证证据。
- 2026-07-29：Week 1 Day 7 复盘完成；Week 2 Day 8 完成 Provider 抽象与 FakeProvider。
- 2026-07-29：Week 2 Day 9 完成 Planner/Orchestrator 编码，等待 Docker 依赖恢复后复验 Worker 集成链路；Day 10 Tool Policy 与安全单元测试完成。
