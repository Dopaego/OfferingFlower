// [1, 2, 4, 6, 7, 9] ->  [4, 6, 7, 9, 1, 2] target 5;
const findRes = (nums, target) => {
    const len = nums.length;
    const midFind = (start, end) => {
        if (start > end) return -1;
        const mid = Math.floor((end - start) / 2) + start;
        if (target === nums[mid]) return mid;
        if (target > nums[start] && nums[mid] < target) {
            midFind(start, mid - 1);
        } else if (target < nums[end] && nums[mid] > target) {
            midFind(mid + 1, end);
        } else {
            return -1;
        }
    }
    return midFind(0, len - 1);
}


// case1: return -1 in orderList;
console.log(findRes([4, 6, 7, 9, 1, 2], 5))

// case2: return -1 in disorderList;
console.log(findRes([4, 6, 7, 9, 1, 2], 8))

// case3: return index in orderList;
console.log(findRes([4, 6, 7, 9, 1, 2], 4))

// case4: return index in disorderList
console.log(findRes([4, 6, 7, 9, 1, 2], 9))

// case5: nums不做处理没有乱序，后续普通二分查找。

