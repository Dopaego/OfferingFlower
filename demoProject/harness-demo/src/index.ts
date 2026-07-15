import { Dataset } from './harness/dataset';
import { IncludesEvaluator, LLMJudgeEvaluator } from './harness/evaluator';
import { HarnessRunner } from './harness/runner';
import { SimpleMathAgent } from './agent/index';

async function main() {
  // 1. 初始化我们要测试的 Agent
  const agent = new SimpleMathAgent();

  // 2. 准备数据集 (Dataset)
  const dataset = new Dataset('前端 & AI 基础知识测试集');
  dataset.loadFromArray([
    {
      id: 'test-math-01',
      input: '请问 1+1 等于几？',
      expectedOutput: '2'
    },
    {
      id: 'test-frontend-01',
      input: '请列举几个常见的前端框架？',
      expectedOutput: 'React'
    },
    {
      id: 'test-harness-01',
      input: '什么是 Harness？',
      expectedOutput: '测试'
    },
    {
      id: 'test-unknown-01',
      input: '今天天气怎么样？',
      expectedOutput: '天气' // Agent 无法回答，预期失败
    }
  ]);

  // 3. 配置评估器 (Evaluators)
  // 我们使用两种评估器：
  // - IncludesEvaluator: 简单的字符串包含匹配 (传统前端单测中常用)
  // - LLMJudgeEvaluator: 模拟通过大模型进行语义判别的评估器 (AI Agent 评测核心)
  const evaluators = [
    new IncludesEvaluator(),
    new LLMJudgeEvaluator()
  ];

  // 4. 组装 Harness Runner 并执行
  const runner = new HarnessRunner(agent, dataset, evaluators);
  
  const results = await runner.runAll();
  
  // 5. 生成评测报告
  runner.generateReport(results);
}

main().catch(console.error);
