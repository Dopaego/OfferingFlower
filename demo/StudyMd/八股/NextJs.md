### 2.Next.js 
React 量身打造的“全栈框架”。如果说 React 负责构建用户界面，那 Next.js 就是给这个界面加上了服务端能力（如 SSR）、文件路由和众多开箱即用的性能优化

#### 2.1 SSR、SSG、ISR、CSR的区别、使用场景
- CSR: 客户端渲染 HTML生成是在浏览器运行[浏览器下载空的HTML和JS，JS解析出来页面内容渲染到HTML中]时，SEO差，因为爬虫获取到的数据由于HTML未完整生产所以SEO不准确，首屏加载速度慢，因为需要在浏览器构建HTML，数据实时性高，因为每次数据更新会重新构建HTML。对服务器无额外压力。 这些特点决定了CSR适用于： 后台管理系统、内部工具——不需要 SEO，纯交互应用
- SSR：服务端渲染 HTML生成是在服务端渲染，每次请求时会构建好新的HTML，因此SEO比较好，首屏加载速度也快，数据实时性高，但对服务器压力较大。
- SSG（Static Site Generation）： 静态生成，在项目构建时就一次性生成好所有静态 HTML 页面。所有用户请求直接返回这份静态文件，速度极快。适合内容固定不变的页面。
- ISR（Incremental Static Regeneration）：增量静态再生，既有 SSG 的静态文件速度，又能设置一个更新间隔时间（如60秒），到期后后台会自动生成新页面替换旧缓存，实现内容更新。适合大部分内容展示类页面（如电商商品详情页）。对服务器的压力比较小。

ISR：如何做到“更新但不阻塞请求”：
stale-while-revalidate缓存策略： 当首次请求后，会将返回的结果缓存为静态文件，并设置一个revalidate时间窗口。
允许页面在 首次访问后生成静态缓存，并设置一个过期时间（revalidate）。过期后，下一次访问仍然返回旧页面（保证响应速度），同时在 后台重新生成新页面，下次访问时就能看到更新。
**不阻塞请求** ： 即使后台在重新生成，但也会返回旧内容，不至于什么都看不到。而且已生成且未过期的页面会被持久化到CDN，后续请求直接走静态文件，性能接近纯静态。

实战中的使用攻略：在 App Router 里，你可以利用 Server Component 和 Client Component 的组合来实现混用
Server Component：代码运行在服务端的组件，
渲染策略 (何时生成 HTML)
├── SSG (构建时)        ——→ 由 Server Component 在构建时执行
├── ISR (构建时 + 定时)  ——→ 由 Server Component 在构建时及后台执行
└── SSR (每次请求)       ——→ 由 Server Component 在每次请求时执行

组件模型 (在哪里运行)
├── Server Component     → 只在服务器运行，是上面三种策略的执行者
└── Client Component     → 在浏览器运行，独立于上面三种策略
                          （但可被嵌入任何一种策略生成的页面中）



#### 2.2 水合指的是什么Hydration

Hydration 是**客户端将服务端渲染出的静态 HTML 与 React 组件的事件处理程序绑定的过程**。

**工作流程**：
1. 服务端生成完整 HTML 返回浏览器。
2. 用户立刻看到页面内容（但此时按钮点击不了）。
3. 浏览器下载并执行 JS 文件。
4. React 遍历已有的 DOM 树，将事件监听器“附加”上去，让页面变成可交互的。
5. 这个过程完成后，页面就“活”了。

**加分回答点**：“面试官可能会追问水合不匹配（Hydration Mismatch）——当服务端生成的 HTML 和客户端渲染的结果不一致时，React 会报错。常见原因：用了 `typeof window` 做条件判断、渲染了 `Date.now()`、或者用了浏览器专有 API。”

**水合不匹配的情况以及怎么解决**：
水合不匹配： 服务端渲染的HTML与客户端React尝试渲染的内容不匹配，比如使用了浏览器专用的API，或者基于客户端特定条件的渲染逻辑。

解决方案：
可以通过 const isServer = typeof window === ‘undefined’来判断代码的运行环境，必须在客户端执行的代码使用useEffect钩子。完全不能再服务器上运行的代码，使用动态导入 import（‘component’）；


#### 2.3 Pages Router/ App Router

Page Router是App Router出现之前的： 所有组件都是Client Component，即使不需要交互也会打包JS发送到浏览器，影响首屏加载速度，而且页面级数据获取依赖getServerSideProps，与组件分离不够灵活，layout无法在子路径中嵌套独立布局。还是属于一个页面级API

App Router：把React 18的ServerComponents能力集成进框架。所有组件默认使用ServerComponent，服务器构建好HTML返回给客户端，优化seo。只有使用了useEffect等存在交互的组件可以使用ClientComponent，减小水合的开销。在layout方面更加灵活，每个目录可以有自己的layout.js，并且布局会自动嵌套。在ServerComponent中数据获取与组件合为一体。

实战中的使用攻略：在 App Router 里，你可以利用 Server Component 和 Client Component 的组合来实现混用
Server Component：代码运行在服务端的组件，
渲染策略 (何时生成 HTML)
├── SSG (构建时)        ——→ 由 Server Component 在构建时执行
├── ISR (构建时 + 定时)  ——→ 由 Server Component 在构建时及后台执行
└── SSR (每次请求)       ——→ 由 Server Component 在每次请求时执行

组件模型 (在哪里运行)
├── Server Component     → 只在服务器运行，是上面三种策略的执行者
└── Client Component     → 在浏览器运行，独立于上面三种策略
                          （但可被嵌入任何一种策略生成的页面中）

#### 2.4 ServerComponent / ClientComponent

- ServerComponent：只在服务器上执行一次，生成静态的HTML或者动态渲染内容，不发送任何JS代码到浏览器。不可以使用交互特性，他可以直接访问数据库等后端资源，无需额外API。而且由于不需要执行JS，所以可以减小bundle的体积。
- ClientComponent： 服务端生成静态的HTML，与客户端进行水合，使其可以拥有事件处理等交互特性。但是ClientComponent只能通过fetch从API获取数据。

#### 2.5 流式渲染

Next.js中的流式渲染其实是对SSR的优化，SSR往往是将一整个完整的HTML生成后再返回给客户端，如果其中一个异步数据加载得很慢，那么首屏加载速度也会降低。所以AppRouter中出现了流式渲染，允许服务端将页面拆分成多个chunk，边渲染边发送到浏览器，配合Suspense部分，包裹住异步组件部分。让用户快速看到核心内容，慢速组件渐进加载，既提升了首屏性能又避免了白屏等待。
浏览器通过 HTTP/1.1 **分块传输**（chunked response） 或 **HTTP/2** 逐步接收 HTML，并渐进式渲染。

#### 2.6 Next.js中的性能优化

优化首屏加载速度：
基于不同的业务场景搭配使用ISR和SSG，SSR，提前输出HTML。正确地使用ServerComponent，减小JSbundle的体积，降低客户端加载解析js的时间，

#### 2.7 Next.js中的缓存体系

本质是 将 **HTTP缓存策略抽象到服务端数据获取层**，开发者在ServerComponent中通过fetch的cache和next.revalidate选项能够精细控制数据的缓存行为，从而减少重复请求、提升响应速度。同时还能且配合 revalidateTag 和 revalidatePath 实现按需清除缓存。

- fetch在Next.js中的默认缓存行为：AppRouter ServerComponent -> cache: 'force-cache'. 请求结果会被持久化到数据缓存中，同一个fetch在所有用户、所有请求中共享缓存，直到重新验证或者手动清除。
- 常使用的缓存选项：
    - 'force-cache'  类比于长期的强缓存 Cache-Control max-age=31536000
    - 'no-store' 完全不使用缓存 Cache-Control：no-cache, no-store
    - next: { revalidate: 60 } 缓存有效期60s，过期后下次请求触发后台重新验证 Cache-Control max-age=60
    - next: { tags: ['tag] }

- revalidate：next: { revalidate: 60 } 缓存有效期为 60 秒。
    请求第一次到达 → 从真实 API 获取数据并缓存，返回数据。
    60 秒内的后续请求 → 直接返回缓存（无网络请求）。
    60 秒后的第一个请求 → 立即返回旧缓存（stale），并在后台触发重新请求，更新缓存供下次使用。
    这是 stale-while-revalidate 策略在数据层的实现。

#### 2.8 Next.js作为全栈框架意义在哪里

可以作为BFF，轻量级聚合后端各个微服务的数据聚合为一个前端友好的接口，统一处理Cookie.Token的认证逻辑。
前端请求的都是Next.js自己的API路由，不需要关心后端地址、鉴权细节等。
在app/api下的route.js文件中可以直接编写服务端逻辑，同时利用缓存机制，也可以降低下游的压力。

#### 2.9 为什么不使用纯React

- 全栈框架意义[2.8]
- react是单纯的CSR，不支持SSR、ISR、SSG，性能差、seo差
- next.js自动进行代码分割、图片优化，纯react需要webpack和vite的插件配置
- Edge Runtime： Next.js支持在Edge节点运行中间件和API路由，实现低延迟的请求处理。[Vercel特意为Next.js提供的一种轻量级执行环境。类似于CDN。]
- 路由：React需要手动维护router表，管理懒加载，而next.js可以通过pages/[pagerouter] 或者 app/[approuter] 自动生成路由，支持动态路由、嵌套布局，开发效率很高。

#### 2.10 Next.js的部署

官方推荐Vercel作为部署平台，支持EdgeRuntime，优化了首屏性能和全球访问体验，适合对延迟敏感的任务。低延迟，但是指基于Web标准API，没有Node.js原生模块。
或者还可以 next start 启动服务器，再将服务器部署到Docker容器、云服务器

Edge Runtime 和 Node Runtime的区别：
Node Runtime是传统的Node服务器，提供完整能力，适合复杂业务场景。
而Edge Runtime 牺牲了一部分的API，换取了低延迟的使用体验，中间件都会默认边缘，，会部署在全球CDN边缘节点，更靠近用户。有大小限制。

#### 2.11 React Server Component原理

是react 18 引入的新架构，Next.js 13 + AppRouter默认采用。核心原理是Flight协议
RSC会将ServerComponent解析为Flight协议定义的JSON-like数据格式，描述了组件树的结构、props以及ClientComponent的引用位置，Flight流被发送到浏览器后，React客户端会解析该数据流，重建组件树。最后ClientComponent再由客户端水合绑定交互。
**Server Component 不能直接 import Client Component，因为服务端无法执行客户端特定的代码（如 useState、window）；而 Client Component 可以接收 Server Component 作为 children，因为 Server Component 已在服务端渲染完毕，其输出作为静态内容嵌入 Client Component，无需在客户端重新执行。**

#### 2.12 Nodejs和Nextjs的区别是什么，使用过程有什么区别

### 3.BFF（Backend For FrontEnd）

为每种客户端（Web、iOS、Android 等）专门构建一个中间服务层，而不是让前端直接调用通用的微服务 API。
API Routes 和 Server Components 天然都是 BFF 层。
为什么需要 BFF？先看没有 BFF 的痛点
假设你有三个客户端：网页、iOS App、Android App，以及一堆微服务：用户服务、订单服务、商品服务。

没有 BFF 时：

网页首页需要调用 5 个 API，拼出页面数据。

iOS App 首页只需要 3 个 API，但字段不同。

后端的通用 API 为了兼容所有端，设计得臃肿，字段冗余。

客户端需要做大量数据聚合、格式转换工作。

每个端的网络环境不同，移动端需要更激进的数据压缩。

有 BFF 之后：

为每个客户端各建一个 BFF。

Web BFF 直接返回 HTML 所需的完整数据，一次请求搞定。

iOS BFF 返回精简后的 JSON，节省流量。

BFF 负责调用底层微服务、聚合数据、格式化、甚至裁剪字段。

***前端团队的服务器端***