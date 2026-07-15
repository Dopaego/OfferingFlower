# TypeScript

## 常考面试题

### 1. 说说你对 TypeScript 的理解？它和 JavaScript 有什么区别？

  TS是JS的超集，所有的JS代码都是ts代码，并在js的基础上添加了静态类型系统。
  js是动态弱类型语言，在运行时才会暴露错误，而ts是静态强类型语言，可以在编译阶段发现潜在的类型错误。ts提供了Interface, 泛型等面向对象的特性，更适合大型复杂项目的开发和维护，能提供更好的代码提示，ts会被编译成js代码运行在浏览器中

### 2. type （类型别名）和 interface （接口）有什么区别？什么时候用哪个？

它们都能用来定义对象或者函数的类型，但是细节上存在区别：

- 扩展方式不同：interface通过extends关键字实现继承，type通过交叉类型（&）实现扩展
- 同名合并行为不同：如果定义两个同名的 interface ，它们会自动合并（Declaration Merging），这在扩展第三方库声明时非常有用；而定义两个同名的 type 会直接报错。
- 使用范围不同：type 可以用来声明基本类型别名、联合类型、元组等，而 interface 只能用来声明对象形状。
总结场景 ：
- 在开发第三方库的 API 或定义对象结构时，优先使用 interface （方便别人扩展）；
- 在定义联合类型（如 type Status = 'success' | 'fail' ）、
        元组（如type Point3D = [number, number, number] ）或
        复杂类型推导（如 type AsyncFunctionResult<T> = T extends () => Promise<infer U> ? U : never ）时，使用type。

### 3. 什么是泛型？有什么作用？

实现了**类型的参数化、复用性**。
泛型实现了类型的参数化，比如 function identity<T>(arg: T): T,比直接写any要安全得多。提高了代码的复用性和灵活性，定义函数、接口或者类时不预先指定具体类型，在使用的时候再指定类型。

### 4. any、unknown、never的区别

- any： 使用any定义，TS会放弃对实例的类型检查，尽量避免使用
- unknown： 任何值可以赋给unknown，但unknown类型的值不能直接去调用方法或者赋值给其他类型，必须先进行类型断言或者类型收窄后才能使用。
- never：表示永远不会有值的类型。通常用在抛出异常的函数返回值、死循环函数或者在联合类型中作为兜底。

### 5. 常用的TS内置工具

- Partial<T> ：将类型 T 的所有属性变为 可选
- Required<T> ：将类型 T 的所有属性变为 必选
- Pick<T, K> ：从类型 T 中 挑选 出指定的属性 K ，组成一个新的类型。
- Omit<T, K> ：和 Pick 相反，从类型 T 中 剔除 指定的属性 K。
Partial 的底层实现其实就是用 keyof 遍历出所有的键，然后加上 ? 操作符，即 type Partial<T> = { [P in keyof T]?: T[P] };
// 手写实现Pick/Omit
