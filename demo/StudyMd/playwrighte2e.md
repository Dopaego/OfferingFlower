# playwright  e2e 学习

1. playwright 是自动化测试框架
2. e2e End to End端到端测试。这里端到端测试就不只是像组件测试/单元测试那样只局限于测试函数写的对不对或者组件渲染+交互对不对。而是注重于整个业务流程能不能跑通。

相当于 借用playwright 去实现整个业务流程自动化的测试，编写playwright的测试用例可以代替人为操作【点击，请求接口，检查页面跳转是否正确】。

##  playwright的框架学习

1. 基础API：
- page： 代表浏览器页面，有page.url()[获取当前地址]等常用api。
- locator： 代表定位到的元素，比起querySelector还支持链式查找。 page.locator('.btn')
- expect： 代表断言，验证测试结果， Playwright 的 expect(locator) 自带等待机制。比如元素晚 1 秒才出现， toBeVisible() 会自动等一会儿，不需要你手写很多 setTimeout 。
- beforeEach 代表每个测试用例执行前都要跑的代码，适合放公共准备逻辑，鉴权/登录/初始化测试数据等
- test.describe： 给测试分组，方便观测结果

2. 选择playwright的原因：
自动等待机制比较成熟，是比较成熟的自动化测试方案。

3. 具体做了什么：






