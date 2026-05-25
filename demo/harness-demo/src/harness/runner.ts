import { Agent, Evaluator, EvaluationResult } from './types';
import { Dataset } from './dataset';

export class HarnessRunner {
  constructor(
    private agent: Agent,
    private dataset: Dataset,
    private evaluators: Evaluator[]
  ) {}

  async runAll(): Promise<EvaluationResult[]> {
    console.log(`\n🚀 开始运行评测任务...`);
    console.log(`🤖 Agent: ${this.agent.name}`);
    console.log(`📊 Dataset: ${this.dataset.name} (${this.dataset.getAll().length} 个用例)`);
    
    const results: EvaluationResult[] = [];
    const cases = this.dataset.getAll();

    for (const testCase of cases) {
      console.log(`\n⏳ 正在测试用例 [${testCase.id}]...`);
      const startTime = Date.now();
      
      try {
        // 1. 运行 Agent 获取输出
        const output = await this.agent.run(testCase.input, testCase.context);
        const latencyMs = Date.now() - startTime;
        
        // 2. 遍历执行所有评估器
        let finalPassed = true;
        let finalScore = 0;
        let reasons: string[] = [];

        for (const evaluator of this.evaluators) {
          const evalResult = await evaluator.evaluate(testCase, output);
          if (!evalResult.passed) {
            finalPassed = false;
          }
          finalScore += evalResult.score;
          reasons.push(`[${evaluator.name}]: ${evalResult.reason}`);
        }
        
        finalScore = finalScore / this.evaluators.length;

        const result: EvaluationResult = {
          testId: testCase.id,
          input: testCase.input,
          output,
          expectedOutput: testCase.expectedOutput,
          passed: finalPassed,
          score: finalScore,
          reason: reasons.join(' | '),
          latencyMs
        };

        results.push(result);
        
        console.log(`✅ 用例 [${testCase.id}] 完成 - 耗时: ${latencyMs}ms, 结果: ${finalPassed ? '通过' : '失败'}`);
        
      } catch (error: any) {
        console.error(`❌ 用例 [${testCase.id}] 报错: ${error.message}`);
        results.push({
          testId: testCase.id,
          input: testCase.input,
          output: '',
          passed: false,
          score: 0,
          reason: `Execution Error: ${error.message}`,
          latencyMs: Date.now() - startTime
        });
      }
    }

    return results;
  }

  generateReport(results: EvaluationResult[]) {
    console.log('\n======================================');
    console.log('📈 评测报告 (Evaluation Report)');
    console.log('======================================');
    
    if (results.length === 0) {
      console.log('没有评测结果。');
      return;
    }

    const total = results.length;
    const passed = results.filter(r => r.passed).length;
    const passRate = ((passed / total) * 100).toFixed(2);
    const avgLatency = (results.reduce((acc, curr) => acc + curr.latencyMs, 0) / total).toFixed(2);
    
    console.log(`总用例数: ${total}`);
    console.log(`通过数: ${passed}`);
    console.log(`失败数: ${total - passed}`);
    console.log(`通过率: ${passRate}%`);
    console.log(`平均延迟: ${avgLatency}ms`);
    console.log('--------------------------------------');
    
    results.forEach(r => {
      console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.testId}`);
      console.log(`  Input : ${r.input}`);
      console.log(`  Output: ${r.output}`);
      console.log(`  Reason: ${r.reason}`);
      console.log(`  Time  : ${r.latencyMs}ms`);
    });
    console.log('======================================\n');
  }
}
