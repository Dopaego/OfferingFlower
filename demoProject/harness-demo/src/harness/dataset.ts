import { TestCase } from './types';

export class Dataset {
  private cases: TestCase[] = [];

  constructor(public name: string) {}

  addCase(testCase: TestCase) {
    this.cases.push(testCase);
  }

  loadFromArray(testCases: TestCase[]) {
    this.cases.push(...testCases);
  }

  getAll(): TestCase[] {
    return this.cases;
  }
}
