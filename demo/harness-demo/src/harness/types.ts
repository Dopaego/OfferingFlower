export interface TestCase {
  id: string;
  input: string;
  expectedOutput?: string;
  context?: any;
}

export interface EvaluationResult {
  testId: string;
  input: string;
  output: string;
  expectedOutput?: string;
  passed: boolean;
  score: number; // 0 to 1
  reason?: string;
  latencyMs: number;
}

export interface Evaluator {
  name: string;
  evaluate(testCase: TestCase, output: string): Promise<{ passed: boolean; score: number; reason?: string }>;
}

export interface Agent {
  name: string;
  run(input: string, context?: any): Promise<string>;
}
