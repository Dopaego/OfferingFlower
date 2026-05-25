import { Evaluator, TestCase } from './types';

// 精确匹配评估器
export class ExactMatchEvaluator implements Evaluator {
  name = 'ExactMatch';

  async evaluate(testCase: TestCase, output: string) {
    if (!testCase.expectedOutput) {
      return { passed: false, score: 0, reason: 'No expected output provided' };
    }
    const passed = output.trim() === testCase.expectedOutput.trim();
    return {
      passed,
      score: passed ? 1 : 0,
      reason: passed ? 'Matched exactly' : `Expected "${testCase.expectedOutput}", got "${output}"`
    };
  }
}

// 包含匹配评估器
export class IncludesEvaluator implements Evaluator {
  name = 'IncludesMatch';

  async evaluate(testCase: TestCase, output: string) {
    if (!testCase.expectedOutput) {
      return { passed: false, score: 0, reason: 'No expected output provided' };
    }
    const passed = output.includes(testCase.expectedOutput);
    return {
      passed,
      score: passed ? 1 : 0,
      reason: passed ? 'Output includes expected string' : `Output does not include "${testCase.expectedOutput}"`
    };
  }
}

// 模拟的 LLM-as-a-judge 评估器 (通过大模型判断语义是否一致)
export class LLMJudgeEvaluator implements Evaluator {
  name = 'LLMJudge';

  async evaluate(testCase: TestCase, output: string) {
    // 实际项目中，这里会调用 OpenAI 或其他大模型接口，比如：
    // const result = await openai.chat.completions.create(...)
    
    // 这里做个简单的模拟，模拟判断延迟
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 模拟语义判断，假设如果包含了预期答案的核心词就认为通过
    const expected = testCase.expectedOutput?.toLowerCase() || '';
    const passed = output.toLowerCase().includes(expected);

    return {
      passed,
      score: passed ? 1.0 : 0.0,
      reason: passed ? 'LLM Judge: 语义一致 (Mock)' : 'LLM Judge: 语义不一致 (Mock)'
    };
  }
}
