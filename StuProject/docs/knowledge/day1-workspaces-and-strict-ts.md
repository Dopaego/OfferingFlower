# Day 1｜npm workspaces + TypeScript 严格模式

> 目标：搭好一个能被面试官指着问细节的 monorepo。不追求功能，只追求"每一行配置都能解释为什么"。

## 一、为什么选 monorepo（npm workspaces）

### 问题

Agent 项目有 4 类代码：HTTP API、异步 Worker、共享类型、数据库层，未来还会加前端。它们必须共享**同一份**类型定义（`TaskStatus`、`ToolCall` 等），否则任何一处修改都会漂移。

三种方案对比：

| 方案 | 优点 | 缺点 | 是否选 |
| --- | --- | --- | --- |
| 每个包独立 repo + npm publish | 版本隔离清晰 | 学生项目改类型要发版，节奏灾难 | ❌ |
| 一个大 `src/` + 按目录分层 | 零配置 | 前端 / 后端 / Worker 打包配置无法隔离，前端会把 Node 类型吃进去 | ❌ |
| **npm workspaces** | 内置支持、零外部工具、软链自动化 | 版本永远绑在一起，不能对外发版 | ✅ |

面试可以直接答："学生项目，业务上没有多版本诉求，用 npm workspaces 比 pnpm/turbo 学习成本低但覆盖 90% 需求。"

### 关键配置

根 `package.json`：

```json
{
  "workspaces": ["apps/*", "packages/*"]
}
```

- `apps/*`：**可执行**的进程（API、Worker、Web）。
- `packages/*`：**被引用**的库（shared、db、agent-core、harness）。

每个子 `package.json` 用 `"name": "@stu/xxx"` 命名，互相引用时写 `"@stu/shared": "*"`，`npm install` 会自动创建软链到 `node_modules/@stu/shared` → `packages/shared`。

### 常见坑

- 子包必须写 `"private": true`，不然 npm 会拒绝顶层安装。
- 子包 `main` 指向编译后的 `dist/index.js`，而不是 `src/index.ts`；否则被引用方拿到 `.ts` 会报错。
- 用 `"exports"` 字段而不是老式 `"main"`，Node 才会正确解析 ESM `.d.ts`。

## 二、TypeScript project references

### 为什么需要

单一 `tsc` 命令覆盖整个 monorepo 有两个问题：

1. 每次都全量编译，慢。
2. 引用方拿不到被引用方的 `.d.ts`，IDE 类型跳转跳到 `.ts` 源文件（还能用，但语义模糊）。

Project references 解决方式：

- 每个包声明自己是"独立编译单元"：`"composite": true`。
- 上游包在 `tsconfig.json` 声明 `"references": [{ "path": "../shared" }]`。
- 根 `tsconfig.json` 只列 `references`，本身不编译。
- 用 `tsc --build`（简称 `tsc -b`）代替 `tsc`，它会：
  - 按依赖图**拓扑排序**编译。
  - 用 `.tsbuildinfo` 缓存，只编译改动过的包。
  - 引用方看到的是 `dist/*.d.ts`，跟真实 npm 包一致。

### 关键 flag（都在 `tsconfig.base.json`）

| flag | 含义 | 为什么开 |
| --- | --- | --- |
| `strict` | 打开所有严格检查 | 面试基本盘 |
| `noUncheckedIndexedAccess` | `arr[0]` 类型是 `T \| undefined` | 强迫处理"数组可能为空" |
| `exactOptionalPropertyTypes` | `foo?: string` 不再允许显式赋 `undefined` | 面试进阶题 |
| `noPropertyAccessFromIndexSignature` | 从索引签名读要用 `obj['x']` 而不是 `obj.x` | 让"来自外部数据"的字段一眼可辨 |
| `useUnknownInCatchVariables` | `catch(e)` 里 `e: unknown` | 逼你判类型再用 |
| `module: NodeNext` + `moduleResolution: NodeNext` | 使用 Node.js 原生 ESM 语义 | 是 Node 22 + `"type": "module"` 的正确搭配 |
| `isolatedModules` | 每个文件必须能独立转译 | 兼容 esbuild / tsx / swc |
| `composite` | 开启 project references | 前置条件 |

## 三、tsx：开发期不编译直接跑 TS

Node 22 原生**只**能跑 `.js`。开发期我们不想每次改 `.ts` 都编译，用 `tsx watch src/index.ts`：

- 底层是 esbuild，速度比 `ts-node` 快一个量级。
- `watch` 模式监听文件变动自动重启。
- 生产 `npm start` 走 `node dist/index.js`，不再需要 tsx。

对比：

| 工具 | 场景 | 备注 |
| --- | --- | --- |
| `tsx` | 开发 / 单文件脚本 | 不做类型检查，快 |
| `tsc --build` | CI / typecheck 门禁 | 慢但严格 |
| `node dist/index.js` | 生产 | 不依赖 TS 工具链 |

**规则**：开发用 tsx，CI 用 tsc，生产用 node。三者职责分开。

## 四、进程优雅退出

`apps/worker/src/index.ts` 里有：

```ts
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
```

面试问："为什么要监听 SIGTERM？"

- `docker stop <container>` 默认发 `SIGTERM`，10 秒后无响应才发 `SIGKILL`。
- Kubernetes rolling update 也是先 SIGTERM 再 SIGKILL。
- 如果不响应 SIGTERM，正在处理的 BullMQ job 会被硬杀，需要靠 stalled 机制重跑，代价高。
- Day 6 会把这里升级为"停止接单 → 等 in-flight job 完成 → 关连接池 → exit(0)"。

## 五、Day 1 面试题（自测）

1. npm workspaces、pnpm workspaces、Turborepo 三者面向的问题各是什么？
2. `tsc` 和 `tsc --build` 有什么区别？为什么 monorepo 里必须用后者？
3. `noUncheckedIndexedAccess` 会在哪种真实 bug 上救你？举一个具体例子。
4. `"type": "module"` 打开后，代码里必须写 `import x from "./foo.js"` 带 `.js` 后缀，即使源文件是 `foo.ts`。为什么？
5. `tsx` 会做类型检查吗？如果不做，为什么还敢在开发期用它？
6. 你的 Worker 收到 SIGTERM 时正在处理任务，正确做法是什么？错误做法会导致什么问题？

参考答案见 [../interview/qa.md](../interview/qa.md) 第 1 组。
