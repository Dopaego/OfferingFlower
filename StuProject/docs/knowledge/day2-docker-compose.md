# Day 2｜Docker Compose + PostgreSQL + Redis 本地基础设施

> 目标：不只是“把容器跑起来”，而是能解释 Docker Compose 如何为 Agent 项目提供可复现的 PostgreSQL 与 Redis 环境，并能区分“容器运行”和“服务真正就绪”。

## 一、为什么开发环境也要使用 Docker Compose

### 问题

后续项目需要 PostgreSQL 保存 Issue、Task 和审计日志，也需要 Redis 支持 BullMQ 队列、缓存和 Blackboard。直接安装在 macOS 上会遇到三个问题：

1. 不同机器的 PostgreSQL、Redis 版本与配置不一致。
2. 手动启动、停止、清理服务麻烦，且容易残留数据。
3. 新同学不知道项目依赖哪些服务、端口、账号与初始化方式。

Docker Compose 把这些“运行环境约定”写成 [docker-compose.yml](../../docker-compose.yml)，仓库里任何人都能用一条命令创建一致的本地依赖。

### 本项目的选择

```text
宿主机（macOS）
  ├── Node.js API / Worker（Day 3-5 先直接在本机运行）
  │     ├── 127.0.0.1:5432 → PostgreSQL 容器
  │     └── 127.0.0.1:6379 → Redis 容器
  │
  └── Docker Compose
        └── issue-agent-network（bridge 网络）
              ├── issue-agent-postgres（postgres:16-alpine）
              │     └── issue-agent-postgres-data（命名卷）
              └── issue-agent-redis（redis:7-alpine）
                    └── issue-agent-redis-data（命名卷）
```

选择 PostgreSQL 16 是因为它支持可靠的关系数据、事务、JSONB 和索引；选择 Redis 7 是因为 BullMQ 依赖 Redis，后续还要用它保存短期状态和缓存。`alpine` 镜像体积相对小，适合本地开发。

## 二、Compose 文件逐段阅读

### 1. 服务、镜像与容器名

[docker-compose.yml](../../docker-compose.yml) 定义两个 service：

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: issue-agent-postgres
  redis:
    image: redis:7-alpine
    container_name: issue-agent-redis
```

| 概念 | 例子 | 解释 |
| --- | --- | --- |
| 镜像（Image） | `postgres:16-alpine` | 只读、可分发的运行模板；包含 PostgreSQL 程序与默认运行环境。 |
| 容器（Container） | `issue-agent-postgres` | 基于镜像启动的运行实例；可停止、删除、重建。 |
| 服务（Service） | `postgres` | Compose 的逻辑名字；同网络中的其他容器可通过这个名字发现它。 |

**不要混淆**：镜像不是正在运行的服务；容器也不是永久的数据存储。删除容器可以保留镜像，但容器可写层的数据不应被视为可靠存储。

### 2. 环境变量与端口映射

```yaml
environment:
  POSTGRES_USER: ${PG_USER:-agent}
  POSTGRES_PASSWORD: ${PG_PASSWORD:-agent_dev_pw}
  POSTGRES_DB: ${PG_DATABASE:-issue_agent}
ports:
  - "${PG_PORT:-5432}:5432"
```

`${变量:-默认值}` 的含义是：优先读取环境变量或 `.env` 文件中的值，没有时使用默认值。项目把变量样例放在 [.env.example](../../.env.example)，真实 `.env` 被 [.gitignore](../../.gitignore) 忽略，避免提交密码。

端口格式为 `宿主机端口:容器端口`：

- 本机 Node.js 进程通过 `127.0.0.1:5432` 访问 PostgreSQL。
- PostgreSQL 在容器内仍监听 `5432`。
- Redis 同理：本机 `127.0.0.1:6379` 映射到容器 `6379`。

**面试追问**：API 后续也装进 Docker 后，是否还应连接 `127.0.0.1:5432`？

不应该。容器中的 `127.0.0.1` 是它自己，不是宿主机。API 容器应在同一 Compose 网络中使用 `postgres:5432` 与 `redis:6379`，其中 `postgres`、`redis` 是 Compose 提供的服务 DNS 名。

### 3. 命名卷：数据库为什么不能只存在容器里

```yaml
volumes:
  - postgres-data:/var/lib/postgresql/data
```

PostgreSQL 默认将数据写入 `/var/lib/postgresql/data`。若不挂载卷，删除或重建容器就会一起删除数据。这里的 `postgres-data` 是 Docker 管理的**命名卷**，生命周期独立于容器。

本项目有两个命名卷：

| 命名卷 | 挂载位置 | 用途 |
| --- | --- | --- |
| `issue-agent-postgres-data` | `/var/lib/postgresql/data` | 长期保存 Issue、Task、步骤审计等事实数据。 |
| `issue-agent-redis-data` | `/data` | 保存 Redis AOF 数据，方便本地重启后恢复队列与热状态。 |

Redis 同时开启了 AOF：

```yaml
command: ["redis-server", "--appendonly", "yes"]
```

AOF 会记录写操作，重启时可回放数据。它**不代表** Redis 变成事实源：Day 5 以后 PostgreSQL 仍保存 Task 和 `task_steps` 的可恢复事实，Redis 清空后系统要能从 PostgreSQL 的 checkpoint 重建必要状态。

### 4. `down` 与 `down -v`

```bash
# 删除容器和网络，保留命名卷：日常停止用它
docker compose down

# 删除容器、网络、命名卷：仅用于要清空本地数据的实验
docker compose down -v
```

这不是小区别：Day 3 执行 migration 后，误用 `down -v` 会把数据库整个清空。开发环境当然可以重建，但生产环境绝不能把“删除基础设施”默认等同于“删除数据”。

### 5. Bridge 网络与服务发现

```yaml
networks:
  agent-network:
    name: issue-agent-network
    driver: bridge
```

Bridge 网络让同一网络里的容器相互隔离于宿主机网络，同时提供服务名 DNS。固定容器 IP 是错误做法，因为容器重建后 IP 可能改变；应该使用服务名。

当前 API、Worker 先运行在宿主机，所以暴露了 PostgreSQL / Redis 的端口。Week 4 若将 API 和 Worker 容器化，会重新检查数据库端口是否还需暴露给宿主机。

## 三、Healthcheck：启动不等于就绪

### 为什么 `running` 还不够

一个 PostgreSQL 容器刚启动时，主进程可能已存活，但它仍在初始化数据目录、执行恢复或尚未接受连接。此时 `docker compose ps` 显示 `running`，不意味着 API 可以安全建连接。

本项目给两个依赖都加了 healthcheck：

```yaml
# PostgreSQL
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]

# Redis
healthcheck:
  test: ["CMD", "redis-cli", "ping"]
```

- `pg_isready` 验证 PostgreSQL 是否接受客户端连接。
- `redis-cli ping` 返回 `PONG` 才表示 Redis 可响应命令。
- Compose 中 `$$` 不是笔误：第一个 `$` 用来转义，让 Compose 把 `$POSTGRES_USER` 原样交给容器内 shell 再展开。

### 推荐启动方式

```bash
# 先解析 Compose 和变量，但不创建资源
docker compose config --quiet

# 创建或复用网络、卷、容器，并等待 healthcheck 成功
docker compose up -d --wait

# 查看 health，而不是只看 running
docker compose ps
```

本次真实验收结果：

```text
issue-agent-postgres   running   healthy
issue-agent-redis      running   healthy
```

随后在容器内部执行客户端验证：

```bash
docker compose exec -T postgres \
  psql -U agent -d issue_agent -c 'SELECT current_database(), current_user;'
# 返回：issue_agent | agent

docker compose exec -T redis redis-cli ping
# 返回：PONG
```

这两层验证分别回答两个问题：healthcheck 说明服务的就绪状态；真实 SQL / Redis 命令确认配置的用户、数据库和命令通路确实正确。

## 四、真实排障：Docker Hub 拉取超时

### 现象

首次执行 `docker compose up -d` 时，Redis 镜像已经下载完成，但 `postgres:16-alpine` 停在下载中。本机直接探测 Docker Registry：

```bash
curl --connect-timeout 10 --max-time 20 \
  -sS -o /dev/null -w 'HTTP=%{http_code}\n' \
  https://registry-1.docker.io/v2/
```

第一次返回超时，说明问题在 Docker Hub 网络链路，不是 Compose YAML、镜像名称或 PostgreSQL 配置。

### 处理与验证

在 Docker Desktop 中配置代理后，同一个请求返回：

```text
HTTP=401
```

`401 Unauthorized` 在这里是**正常结果**：Docker Registry 的 `/v2/` 端点在匿名探测时会要求认证，说明请求已经到达 Registry。真正拉取镜像时 Docker 会继续向 token 服务请求临时凭据。

同时可检查 daemon 是否使用代理：

```bash
docker info --format 'Proxies={{json .HTTPProxy}}'
# 本次输出：Proxies="http.docker.internal:3128"
```

最后执行：

```bash
docker compose pull postgres
docker compose up -d --wait
```

PostgreSQL 镜像下载完成，两个服务均通过 healthcheck。

### 排障原则

1. **先分层定位**：先看 daemon 是否可用，再看 registry 网络，再看 Compose 语义，最后看容器日志。
2. **不要把 HTTP 状态码脱离协议解释**：Registry `401` 有时是通了，连接超时才表示不可达。
3. **代理需要进 Docker daemon**：只给终端设置代理变量，不保证 Docker Desktop 的虚拟机也会使用它。

## 五、Day 2 面试题（自测）

1. 镜像、容器、命名卷和 bind mount 分别是什么？这个项目为什么数据库用命名卷？
2. `docker compose down` 和 `docker compose down -v` 的行为差异是什么？什么时候会用后者？
3. 为什么容器显示 `running` 不能说明 PostgreSQL 已可用？`pg_isready` 解决了什么问题？
4. API 未来也容器化后，连接 PostgreSQL 应该写 `127.0.0.1:5432` 还是 `postgres:5432`？为什么？
5. Docker Registry 返回 `401` 是网络问题吗？如何快速区分网络不可达与正常认证挑战？
6. Redis 开启 AOF 后，为什么 PostgreSQL 仍然是 Task 的事实源？
7. 为什么本地 Compose 暴露了 5432/6379，而生产环境可能不应该暴露？

参考答案见 [../interview/qa.md](../interview/qa.md) 第 2 组。
