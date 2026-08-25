# RAG

> 基于 PostgreSQL/pgvector 全文检索与 Codemap 构建 RAG，通过 RRF/Rerank、Commit 版本校验和来源引用控制上下文

## 面试常见问题

### 1. commit版本校验是如何控制上下文的, 具体细节是什么

#### 1.1 commit版本校验是什么

> Commit 版本校验是把任务、检索结果、代码片段、工具结果和测试证据绑定到一个确定的仓库快照，防止模型把不同时间、不同版本的代码混合成一个 Context。

也就是 当前的工作区里的相关内容, 都是同一个时间点的记录, 比如说, Tool 执行前后的工作区代码应该一样, 不然ToolResult就失去了新鲜度, 是过往版本的代码对应的结果, 不一定具有可参考性

#### 1.2 Commit SHA如何标识代码版本的

一个Gitcommit 只想一颗Tree, Tree又递归指向了 目录, 文件路径, 文件模式, Blob对象. 所以CommitSHA就可以标识一次完整的 已提交仓库快照, 当文件改变的时候 Commit SHA也会发生改变, 那么在buildContext的时候发现过往的结果不是最新的, 从而避免了把不同时间不同版本的代码混合成一个Context.

#### 1.3 具体实现的过程

1. 每条代码证据进入模型 Context 前都必须携带版本信息[定义好CodeEvidence的commitSha属性]
2. 做好来源追踪, 每条上下文证据都应该被注入的时候记录下来相应的信息[repository,snapshot,commitsha等]
3. 仓库快照更新时, 主动去判断哪些文件需要更新, 通过文件内容哈希值来判断

#### 1.4 Commit SHA不能表示未提交工作区

CommitSHA代表了, 已提交的文件, git跟踪的内容, commit中记录的子模块引用
Staged但未提交的修改, unstaged修改,untracked 文件都不包括在内. 所以针对于我们的桌面Coding Agent, 除了CommitSHA, 还有WorkspaceSnapshot一同做版本校验: 
 
 Commit Snapshot
    = 已提交仓库快照

Workspace Snapshot
    = Base Commit + 当前工作区覆盖层

#### 1.5 在架构中 版本校验怎么执行:

由Electron Main和Runtime强制执行, Renderer和模型 都不能绕过Main直接读取文件. 

Renderer
   ↓ 类型安全 IPC
Preload
   ↓
Electron Main
   ├── Git Snapshot 校验
   ├── 文件 Hash 校验
   ├── 检索版本过滤
   ├── Tool 权限控制
   └── Patch 前置条件校验

> Commit 版本校验本质上是代码 Context 的一致性和新鲜度控制。任务开始时，Runtime 会固定一个 expected repository snapshot；向量检索、全文检索和 Codemap 都必须按这个 Snapshot 过滤，检索结果还要携带 Commit SHA、文件 Blob OID、内容 Hash 和索引版本。代码片段注入模型前，会从目标 Snapshot 重新读取并验证 Hash，避免 Redis 缓存或旧索引把过期代码混进 Context。如果仓库版本发生变化，相关证据和测试结果会被标记失效并重新构造。由于 Commit SHA 不包含未提交修改，本地 Coding Agent 实际上还要使用 Base Commit 加 staged、unstaged 和 untracked 内容组成 Workspace Snapshot。Executor 写文件前再次比较 expected Snapshot 和文件 Hash，发生冲突就拒绝覆盖；Agent 自己的修改则通过 Operation ID 将状态显式地从 S0 演进到 S1。这样可以保证 Locator、Executor、Reviewer 和 Verifier 使用的是有明确版本边界、可追踪且不会静默混合的上下文。