# AI Agent 评估工程 (Harness) Demo 🚀

本项目是一个专为前端/全栈实习求职者打造的 **AI Agent 评估工程 (Harness)** 演示项目。通过阅读和运行本项目，你不仅能掌握大模型 Agent 的评测原理，还能积累丰富的前端工程化、设计模式以及异步编程的面试谈资（八股文考点）。

## 1. 什么是 Harness？
在软件工程中，**Test Harness（测试工具集/测试脚手架）** 是指用于自动化运行测试用例并监控其行为的一套软件和测试数据。
在 AI/大模型领域，Harness（如开源的 `lm-evaluation-harness` 或 `promptfoo`）专门用于**批量评测 AI Agent 的表现**。它会给 Agent 注入大量上下文和提示词 (Prompt)，获取大模型的输出，并使用各种评估器 (Evaluators) 来给回答打分。

## 2. 核心模块解析与代码导读

本项目包含以下三个核心组件，这正是构建一个 AI Harness 系统的黄金三角：

### 2.1 Dataset (数据集)
- **文件位置**: `src/harness/dataset.ts`
- **职责**: 负责加载和管理所有的测试用例 (Test Cases)。每个用例包含 `input`（问题）和 `expectedOutput`（预期答案）。
- **面试考点**: 在实际工程中，数据集往往非常庞大（几万条），这里常考 **内存管理与流式读取 (Stream)**。面试官可能会问：“如果测试集有 10GB 怎么读取？” 答：Node.js 中使用 `fs.createReadStream` 结合按行解析，避免内存 OOM。

### 2.2 Evaluator (评估器)
- **文件位置**: `src/harness/evaluator.ts`
- **职责**: 负责判断 Agent 的回答是否正确。本项目实现了两种评估器：
  1. `IncludesEvaluator`: 传统字符串包含匹配 (启发式)。
  2. `LLMJudgeEvaluator`: 模拟 **LLM-as-a-judge (让大模型做裁判)**。
- **面试考点 (高频设计模式)**: 这里使用了 **策略模式 (Strategy Pattern)**。不同的评估规则被封装在实现了统一 `Evaluator` 接口的独立类中，Runner 不需要知道具体的评估逻辑，极大地提升了系统的可扩展性 (Open-Closed Principle)。

### 2.3 Runner (执行引擎)
- **文件位置**: `src/harness/runner.ts`
- **职责**: 调度器。负责遍历 Dataset，将数据喂给 Agent，拿到结果后分发给 Evaluators，最后汇总分数生成 Report。
- **面试考点 (高频异步编程)**: 
  - 本项目使用了 `for...of` 进行**串行执行**。
  - **面试官常问**：“如果我想提升评测速度，改为并行执行怎么做？” 答：使用 `Promise.all`。
  - **面试官追问**：“如果并行数太多，导致 OpenAI API 触发 Rate Limit 怎么办？” 答：需要实现一个**并发控制器**，可以借助 `p-limit` 库，或者手写基于 Promise 的令牌桶/并发池（**高频手写代码题**）。

## 3. 如何运行本项目？

本项目基于 Node.js 和 TypeScript 开发。

### 3.1 环境安装
请确保你安装了 Node.js，然后在项目根目录下执行：
```bash
npm install
```

### 3.2 运行评测
执行以下命令，即可看到 Harness Runner 自动驱动 Agent 完成所有测试用例，并输出漂亮的评测报告：
```bash
npx ts-node src/index.ts
```

运行后你将看到如下输出格式：
```text
🚀 开始运行评测任务...
🤖 Agent: SimpleMathAgent (Mock)
...
[PASS] test-math-01
  Input : 请问 1+1 等于几？
  Output: 1+1等于2
...
```

## 4. 前端校招/实习 面试高频应用场景 (简历谈资)

如果你将类似的项目写进简历，可以按照以下话术与面试官交流：

1. **“我在项目中搭建了简易的 AI 评测脚手架 (Harness)。”**
   - **话术**: 为了量化我们开发的 AI Agent 的准确率，我用 TypeScript 实现了一个 Harness 工具。它解耦了数据加载、Agent调用和指标评估（支持启发式正则匹配和 LLM-as-a-judge），帮助团队将 Agent 的答复准确率用数据面板直观展示出来。
2. **“我深入处理了 Node.js 中的异步并发控制。”**
   - **话术**: 在批量跑成百上千个测试用例时，如果同时发起请求会导致模型 API 并发超限。我通过手写基于 Promise 的并发控制队列，将并发请求数稳定控制在 10 以内，保证了评测的稳定性，同时也收集了每个接口的 Latency（延迟）指标用于性能分析。

## 5. 下一步进阶建议
- **接入真实的 LLM**: 目前项目中的 Agent 和 LLMJudge 是 Mock（模拟）的。你可以尝试安装 `openai` 官方 SDK，将其替换为真实的 API 调用。如果你需要这方面的指导，随时告诉我！
