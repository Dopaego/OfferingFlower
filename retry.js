// 请求失败自动重试，最多 retry 次
async function requestWithRetry(fn, retry) {
    let curCount = 0;
    while (curCount < retry) {
        const res = await fn();
        if (res.success) {
            return res;
        } else {
            curCount++;
        }
        // catch 
    }
    return new Promise((resolve, reject) => {
        reject(new Error('fail'));
    })
}