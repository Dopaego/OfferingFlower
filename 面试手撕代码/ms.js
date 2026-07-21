// 给定一个候选人编号的集合 candidates 和一个目标数 target ，找出 candidates 中所有可以使数字和为 target 的组合。
// candidates 中的每个数字在每个组合中只能使用 一次 。
// 注意：解集不能包含重复的组合。

// 示例 1:
 
// 输入: candidates = [10,1,2,7,6,1,5], target = 8,输出:[
// [1,1,6],
// [1,2,5],
// [1,7],
// [2,6]
// ]
 
// 示例 2:
 
// 输入: candidates = [2,5,2,1,2], target = 5,输出:[
// [1,2,2],
// [5]
// ]
// 提示:
 
// 1 <= candidates.length <= 100
// 1 <= candidates[i] <= 50
// 1 <= target <= 30
const findSum = (candidates, target) => {
    const res = [], path = [];
    const backtrack = (curSum, index) => {
        console.log('curSum', curSum, 'index', index, path);
        if (index > candidates.length) return;
        if (curSum === target) {
            res.push([...path]);
            return;
        } else if (curSum > target) {
            return;
        }
        for(let i = index; i < candidates.length; i++) {
            path.push(candidates[i]);
            curSum += candidates[i]
            backtrack(curSum, i + 1);
            curSum -= candidates[i];
            path.pop();
        }
    }
    backtrack(0, 0);
    return res;
}

console.log(findSum([10,1,2,7,6,1,5], 8));

