# Frontend Issue Agent

面向 AI 全栈 Agent 岗位求职的**学习作品 + 面试证据库**。

四周内构建一个可完整运行、可解释、可被追问的前端缺陷诊断 Agent。它的能力边界受控：只在临时仓库副本内工作，所有修改都需要人工审批，所有指标都来自真实评测报告。

## 技术栈

| 层 | 选型 | 引入时间 |
| --- | --- | --- |
| 语言 | TypeScript 5（严格模式，`noUncheckedIndexedAccess`） | Day 1 |
| 包管理 | npm workspaces + TypeScript project references | Day 1 |
| API | Node.js 22 + Express + Zod + Pino | Day 4 |
| Worker | BullMQ | Day 5 |
| 持久化 | PostgreSQL 16（原生 SQL + `node-pg-migrate`，不用 ORM） | Day 3 |
| 缓存 / 队列 / Blackboard | Redis 7 | Day 5 |
| 基础设施 | Docker Compose | Day 2 |
| LLM | OpenAI 兼容接口（可 fallback FakeProvider） | Week 2 |
| 浏览器验证 | Playwright | Week 3 |
| 前端操作台 | React + Vite | Week 3 |

## 目录结构（Week 1）

```
StuProject/
├── package.json           # npm workspaces 根
├── tsconfig.base.json     # 所有 workspace 共享的 strict 配置
├── tsconfig.json          # 项目引用图，tsc --build 从这里入口
├── apps/
│   ├── api/               # Express HTTP 服务（Day 4）
│   └── worker/            # BullMQ 消费者（Day 5）
├── packages/
│   ├── shared/            # 跨 workspace 的类型 / Zod schema
│   └── db/                # PostgreSQL 连接池与 migration（Day 3）
└── docs/
    ├── roadmap/           # 四周关卡与每日验收
    ├── knowledge/         # 每日讲义（Node / SQL / Redis / Docker / Agent ...）
    ├── interview/         # 面试题、STAR 场景、简历证据映射
    └── labs/              # 故障复现实验记录
```

## 快速开始（Day 2 版）

```bash
cd StuProject
nvm use            # 使用 Node 22（.nvmrc）
npm install
npm run typecheck  # tsc --build，全绿即通过 Day 1 验收
npm run dev:api    # 应看到 "boot placeholder" 打印
npm run dev:worker # 应看到 "worker placeholder" 打印，Ctrl+C 会走 graceful shutdown
```

启动本地基础设施：

```bash
docker compose up -d --wait
docker compose ps

# 预期：两个容器都是 healthy
docker compose exec -T postgres \
    psql -U agent -d issue_agent -c 'SELECT current_database(), current_user;'
docker compose exec -T redis redis-cli ping
```

日常停止服务但保留数据：

```bash
docker compose down
```

仅在想删除 PostgreSQL 和 Redis 的本地数据、回到全新环境时执行：

```bash
docker compose down -v
```

> `.env` 中的 `PG_*`、`REDIS_*` 变量会覆盖 Compose 默认值。不要把真实密码提交到 Git。

## 学习方法

每一天的关卡都遵循 **概念讲义 → 最小实现 → 故障实验 → 面试追问 → 证据登记** 闭环：

- 讲义在 `docs/knowledge/`
- 代码留下可讲解的提交节奏
- 故障实验记录到 `docs/labs/`
- 面试题增补到 `docs/interview/qa.md`
- 简历表述必须对应可指到的文件与命令 → `docs/interview/resume-evidence.md`
