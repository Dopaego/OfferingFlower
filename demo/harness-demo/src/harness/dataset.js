"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dataset = void 0;
class Dataset {
    name;
    cases = [];
    constructor(name) {
        this.name = name;
    }
    addCase(testCase) {
        this.cases.push(testCase);
    }
    loadFromArray(testCases) {
        this.cases.push(...testCases);
    }
    getAll() {
        return this.cases;
    }
}
exports.Dataset = Dataset;
