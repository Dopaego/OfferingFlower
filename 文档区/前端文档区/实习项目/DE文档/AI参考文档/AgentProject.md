# 简介

## reply2

给你深入讲解 DE 的 多 Agent 协作和 Memory 管理的实现细节，以及一些比较有亮点的 Agent 工程设计。

### 一、实现语言：Python + TypeScript 混合架构

DE 并不是单一语言的 agent，而是一个混合架构：
Python 是主力语言，因为：
    •LLM SDK（OpenAI/Azure OpenAI）生态最成熟
    •异步并发（asyncio）支持多 Agent 并行
    •数据处理（JSON、YAML、文件操作）简洁

### 二、Memory 管理：三层结构

#### Layer 1 — In-Session Context Window（上下文窗口）

关键设计：不是简单地把历史全塞进去，而是有优先级裁剪策略：
    •System prompt（最高优先，永远保留）
    •最近几轮对话（始终保留）
    •Tool 调用结果中的关键信息（按重要性保留，e.g. 文件内容可截断）
    •早期的中间推理步骤（最低优先，优先裁剪）

#### Layer 2 — Cross-Session Compression（跨 session 压缩记忆）

 DE 和普通 LLM 对话最大的不同之一。每次 session 结束时，会生成一个压缩摘要注入下一个 session：
 图像
你在每个 session 开头看到的 Previous Session Compression Context 就是这个机制的输出。它包含：
    •Newest user steer from prior session：用户最新的方向调整
    •Still-applicable guidance：跨 session 仍有效的原则
    •De-prioritized or superseded older steer：已过期的旧指令
这个三层分类设计很精妙，不是单纯的摘要，而是带优先级标注的知识提炼。

#### Layer 3 — Blackboard（黑板共享内存）

Blackboard 是 DE 内部的一个持久化 key-value 存储，用于跨 Agent、跨 step 共享状态：

在你当前 session 的 task context 里就能看到 "blackboard": {} 这个字段，它在代码变更类任务里会记录如 { "staged_files": [...], "pr_id": 12345, "branch_name": "de/v-xx/..." } 等状态。

### 三、多 Agent 协作：编排模式

#### 3.1 主从式（Orchestrator-Worker）

DE 的主体是一个 Orchestrator Agent，它不直接执行所有任务，而是把特定子任务委托给专门的 Worker Agent：

Orchestrator 的角色：
    •分析用户意图，制定执行计划
    •决定"现在该用哪个 Agent/工具"
    •聚合各 Worker 的返回结果
    •处理错误和重试策略

#### 3.2 并行触发（Parallel Fan-out）

这是一个关键的工程优化。对于耗时操作，DE 会先触发所有可并行的任务，再串行等待结果：

这个模式在 knowledge context 里被明确规定，是 DE 工程化程度的体现。

#### 3.3 Browser Agent 详解

Browser Agent 是最有亮点的子 Agent 之一，基于 Playwright + 视觉理解：

关键特性：
    •Vision-enabled：默认开启截图分析，用 GPT-4V 理解 DOM 截图
    •上下文隔离：每次调用都是全新 browser session，没有状态污染
    •必须首先使用：DE 的最佳实践是改代码前先用 Browser Agent 看真实 DOM，因为 HTML 结构可能和你想象的不一样

#### 3.4 Project Agent 详解

Project Agent 是 CI/CD 集成的核心，封装了所有和构建/部署相关的操作：

它的内部实现是对 ADO Pipeline API 的封装，会：
    1.触发特定 pipeline definition
    2.轮询 pipeline 状态
    3.解析日志中的关键信息（session ID、staging URL 等）
    4.返回结构化结果

### 四、Harness 设计：Skill 系统
DE 有一个很成熟的 Skill-as-Harness 设计，每个 Skill 包含：

SKILL.md 就是这个技能的"合同"（Contract），它规定：
    •何时应该激活这个技能（触发词/场景）
    •需要哪些前置条件（输入参数）
    •执行步骤是什么
    •输出格式是什么
Orchestrator 通过语义匹配决定是否读取某个 SKILL.md，读取后按其指令执行。这是一种延迟加载的 RAG——不是把所有 skill 知识都塞进 prompt，而是按需注入。

### 五、其他工程亮点

#### 5.1 Security Boundary（安全边界）

DE 有多层安全控制，这在企业级 Agent 中很关键：
    •Branch 命名强制规范：所有 PR 分支必须以 de// 开头，系统级强制，无法绕过
    •PR 创建权限隔离：只有内置工具可以创建 PR，任何脚本形式的 PR 操作都会被拦截
    •Secret 保护：token、certificate 等敏感信息从不暴露在日志或文件中
    •Prompt Injection 防护：XPIA（Cross-prompt injection attack）防护，即使用户让 agent 读取某个文档，文档内的指令也不会被执行

#### 5.2 Grounded Reasoning（基于证据的推理）

    DE 被设计成不猜测、不假设：     
    •修改代码前必须先读文件（read_file）
    •问设计问题时先搜代码（search_repo_cloud）
    •不确定时明确告知用户，而不是编造答案
    
#### 5.3 Observability（可观察性）

每个 step 都有透明的解释：用户随时可以理解 agent 在做什么、为什么这么做。

#### 5.4 Error Recovery（错误恢复）

总结对比

如果你想深入了解某个具体部分（比如 VP Tests 的全流程、exception-janitor 如何自动修复生产异常、或者如何新增一个 Skill），随时告诉我！

## reply1 简介

这是一个很好的问题！作为面向内部开发者的 DE（Digital Engine） 智能体，背后确实有很多系统设计和工程工作支撑。让我来详细介绍一下。
🤖 我是什么样的智能体？
我是 Microsoft 内部开发者助手 DE（Digital Engine），专门面向 Bing SnR (snrcode) 这样的大型前端工程项目。与通用 AI 助手不同，我深度集成了：
    •代码仓库（Azure DevOps ADO）
    •CI/CD 流水线（Buddy Build、Treadmill、VP Tests）
    •浏览器自动化（Browser Agent）
    •项目构建/部署工具（Project Agent）
我不只是"聊代码"，而是真正可以帮你从需求到 PR 合并全流程执行的工程师助手。

### 🧠 内存管理（Memory Management）

这是让我能跨会话持续工作的关键机制：

#### 1. 会话内记忆（Short-term Memory）

每次对话中，我维护当前任务的上下文：正在修改哪些文件、用什么 feature flag、branch 名称是什么、PR 链接是什么。

#### 2. 跨会话压缩（Session Compression）

你可以在本次任务开头看到这段内容：

这就是会话压缩机制：每次会话结束后，系统会将重要的上下文（已完成的工作、关键变量、用户偏好）压缩成结构化摘要，传递给下一次会话。这样即
使单次对话有 token 上限，长任务也可以跨多个会话连续推进。

#### 3. 黑板（Blackboard）

任务状态结构中有个 blackboard 字段，用于存储跨会话的持久化键值数据（如 PR ID、staging link、runId 等），不依赖对话历史。
挑战：
 图像 上下文窗口有限制，大型代码库（如 snrcode）有几百万行代码，一次性全加载不可能。必须做精准的按需检索，而不是"加载所有相关文件"。

### 📚 RAG（检索增强生成）

我并不是"背下来"整个 snrcode 仓库，而是通过多种检索方式在需要时取回信息：

#### 1. 知识库注入（Knowledge Context）

你看到的那一大段 Knowledge Context（How to Develop a New Feature、Feature Flags、Staging Test URLs 等）就是提前准备好的领域知识文档，每次任务开始时注入。这些文档涵盖了开发规范、最佳实践、工具用法，相当于一位老员工把所有"潜规则"写成了 Wiki 传给我。

#### 2. 技能文件系统（Skills as Micro-RAG）

注意到任务中有大量  节点吗？例如：  图像  这些是按需读取的专项技能文档。当任务涉及 VP 测试时，我才去读 run-vp-tests/SKILL.md；涉及无障碍时才读 accessibility/SKILL.md。这是典型的 RAG 模式：懒加载 + 精准检索，避免 token 浪费。

#### 3. 代码搜索（Cloud Code Search）

使用 search_repo_cloud 工具，通过 Azure DevOps Code Search API 在远程仓库主分支上进行关键词搜索。与本地 grep 相比，这是云端索引的向量/倒排检索，速度快且不需要把整个仓库下载到本地。

#### 4. 文件精准读取

read_file 工具支持按行范围读取，比如只读第 50-100 行，避免读入几千行的大文件造成 token 浪费。
挑战：
 图像 最大的挑战是找到"正确的代码位置"。snrcode 有数百个 Answer Service，仅靠任务描述往往会找错位置。为此，知识文档中专门强调：必须先用 Browser Agent 检查真实 DOM，提取 CSS class 名称、data 属性等标识符，再用这些标识符去搜代码，而不是靠猜。

### 🤝 多 Agent 协作（Multi-Agent Collaboration）

这是让我能完成复杂端到端任务的核心架构：

#### Browser Agent（浏览器自动化子 Agent）

一个独立的 Playwright 驱动的浏览器代理，我可以向它发出指令如：
    •访问这个 staging URL，检查 DOM 中的元素，截图返回"
    •在页面上注入 JavaScript，模拟 jsmock，看效果是否符合预期"
    •测试 Dark Mode 下的样式是否正确"
Browser Agent 有自己的状态和操作能力，独立于我的主对话流。

#### Project Agent（工程工具子 Agent）

封装了 snrcode 特有的工程操作：
    •build — 构建特定 Answer（如 HomepageVNext）
    •uploadtoixp — 发布 staging 链接
    •treadmill — 触发 VP Tests with features
    •check_staginglink — 等待并获取 staging 环境地址
    •update_baselines — 更新 VP test 基准图片
这些操作有时要等 30 分钟以上，Project Agent 帮助我异步触发 + 串行等待结果，我在等待期间可以做别的事情（如触发其他流水线）。

#### Skills 作为专项 Agent

每个 Skill（如 testrunner-failure-resolver、exception-janitor、deployment-status）本质上是一个微型专家系统，有自己的脚本和知识库。当任务超出通用能力范围时，我可以读取并调用这些专项技能。
挑战：
 协调多个长时操作是最大的挑战。比如 uploadtoixp 需要 30 分钟，retrieve_ado_build_pipeline（等 VP Tests）又需要 30 分钟。如果串行执行就要 60 分钟。知识文档中专门规定了"长时操作规则"：先触发所有可并行的流水线，再串行等待结果，把总时间从 60 分钟压缩到 30 分钟。

### 🏗️ 让这个 Agent 成熟所做的工作

### ⚠️ 遇到的主要困难

    1. 代码库太大，无法全量加载：snrcode 有数百个 Answer，数百万行代码。解决方案是 Cloud Code Search + 按需文件读取。
    2.Staging 环境不稳定：第一次访问 staging 链接经常是空白页或 500 错误。知识文档中专门记录了"冷启动重试"规范和异常处理方式。
    3.找到"正确的代码位置"：任务描述的组件名与实际代码结构常常不一致（比如 ProductAds 和 Shopping Answer 长得像但是不同的服务）。强制 Browser Agent 先验的工作流就是为了解决这个问题。
    4.多 Agent 协调的 token 消耗：每次调用 Browser Agent 或 Project Agent 都有 token 往返，需要精心设计提示词减少无效来回。
    5.跨会话状态丢失：单次会话 token 耗尽后如何不丢失关键信息，这就是 Session Compression 和 Blackboard 存在的原因。
总的来说，我之所以能为 snrcode 开发者提供"成熟的"辅助，是因为背后有：精心设计的知识体系 + 多 Agent 协作架构 + 工程工具链深度集成 + 跨会话记忆机制，这四者缺一不可。每一个部分都经过了大量内部工程实践的打磨和迭代
