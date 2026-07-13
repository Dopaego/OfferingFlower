const assert = require('node:assert/strict');
const test = require('node:test');
const { Dataset } = require('../src/harness/dataset');
const { IncludesEvaluator, ExactMatchEvaluator } = require('../src/harness/evaluator');
const { SimpleMathAgent } = require('../src/agent');

test('Dataset stores and returns test cases', () => {
  const dataset = new Dataset('regression');
  dataset.addCase({ id: 'case-1', input: 'question', expectedOutput: 'answer' });
  assert.deepEqual(dataset.getAll(), [{ id: 'case-1', input: 'question', expectedOutput: 'answer' }]);
});

test('evaluators preserve matching behavior', async () => {
  const testCase = { id: 'case-1', input: 'question', expectedOutput: 'answer' };
  assert.equal((await new IncludesEvaluator().evaluate(testCase, 'an answer')).passed, true);
  assert.equal((await new ExactMatchEvaluator().evaluate(testCase, 'answer')).score, 1);
});

test('SimpleMathAgent answers the supported math prompt', async () => {
  assert.equal(await new SimpleMathAgent().run('What is 1 + 1?'), '1+1等于2');
});
