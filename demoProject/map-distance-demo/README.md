# 地图测距 Demo（百度地图 BMapGL 版）

基于项目真实技术栈实现的地图选点实时测距演示。

## 技术栈

| 技术 | 版本 | 用途 |
|---|---|---|
| 百度地图 JSAPI GL | WebGL v1.0 | 地图渲染、覆盖物、`map.getDistance` 球面测距 |
| Redux Toolkit | 1.8.x | 状态管理（slice / selector） |
| Redux-Saga | 1.1.x | 异步副作用（模拟后端距离 API） |
| AntD | 5.28 | UI 组件（Card / Button / Tag / Spin） |
| qiankun | 2.10 | 子应用生命周期适配 |
| Playwright | 1.57 | E2E 自动化测试 |
| React | 18.x | 视图层 |
| TypeScript | 4.7 | 类型安全 |
| SCSS Modules | — | 组件样式隔离 |

## 准备工作：申请百度地图 AK

1. 进入 [百度地图开放平台 - 应用管理](https://lbsyun.baidu.com/apiconsole/key) 申请 **JSAPI（含 GL）** 类型的 AK。
2. 打开 [`public/index.html`](public/index.html)，将 `YOUR_BAIDU_AK` 替换为真实 key：
   ```html
   <script src="https://api.map.baidu.com/api?type=webgl&v=1.0&ak=YOUR_BAIDU_AK&callback=initBMap"></script>
   ```
3. 在百度控制台为 AK 配置允许的 Referer 白名单（开发期可加 `http://localhost:3001/*`）。

> **注意**：必须使用 `type=webgl`（对应 `BMapGL` 全局对象），不可使用旧版 2D（`BMap`）。

## 目录结构

```
map-distance-demo/
├── public/
│   └── index.html                   # 通过 <script async> 加载百度地图 JSAPI GL
├── src/
│   ├── features/
│   │   └── mapDistance/
│   │       ├── mapDistanceSlice.ts   # RTK slice：状态定义 + reducers
│   │       └── mapDistanceSaga.ts    # Saga：模拟后端距离接口
│   ├── store/
│   │   └── index.ts                 # configureStore + rootSaga
│   ├── hooks/
│   │   └── useMapDistance.ts        # BMapGL 地图核心 Hook（含节流 + waitForBMapGL）
│   ├── components/
│   │   └── MapDistanceMeasure/
│   │       ├── index.tsx            # 主 UI 组件（AntD）
│   │       └── index.module.scss    # 样式（SCSS Modules）
│   ├── App.tsx                      # Demo 入口，Provider 包裹
│   └── qiankun.ts                   # qiankun 子应用生命周期导出
└── e2e/
    └── mapDistance.spec.ts          # Playwright E2E 测试（5 个用例）
```

## 核心交互流程

```
SDK 加载（异步）
  → public/index.html 加载 BMapGL → callback=initBMap → 派发 'bmap-loaded' 事件
  → useMapDistance 内的 waitForBMapGL Promise resolve
  → 创建 BMapGL.Map 实例 + setReady(true)

用户单击地图
  → click 事件 → e.point 即 BD-09 经纬度
  → dispatch(setStartPoint)
  → 添加起点 Marker / Polyline（两端重叠）/ Label 三个覆盖物

用户移动鼠标
  → mousemove 事件（16ms 节流）
  → polyline.setPath([startPoint, e.point]) 原地更新连线
  → map.getDistance(startPoint, e.point) 计算距离（米，前端纯几何运算）
  → label.setPosition(e.point) + label.setContent(formatDistance(dist))
  → dispatch(updateCursor) → Redux Store 更新
  → React re-render → Tag 文本刷新

用户右键 / 点击重置
  → rightclick 事件 / 点击重置按钮
  → dispatch(resetMeasure) → map.removeOverlay 清除全部覆盖物
```

## 关键设计决策

### 1. SDK 异步加载
百度地图 JSAPI 通过 `<script>` 注入到全局，必须等 `window.BMapGL` 就绪后才能初始化地图：
```ts
function waitForBMapGL(): Promise<typeof window.BMapGL> {
  return new Promise((resolve) => {
    if (window.BMapGL) return resolve(window.BMapGL);
    window.addEventListener('bmap-loaded', () => resolve(window.BMapGL!), { once: true });
  });
}
```

### 2. `mousemove` 节流
```ts
const now = performance.now();
if (now - lastMoveTimeRef.current < 16) return;
```
16ms ≈ 60fps，避免每帧重复 `setPath / getDistance / dispatch`。

### 3. 覆盖物原地更新（不重建）
```ts
// ✅ 正确：原地修改路径 / 位置 / 文本
polyline.setPath([startPoint, curPoint]);
label.setPosition(curPoint);
label.setContent(formatDistance(dist));

// ❌ 错误：每次 removeOverlay + new Polyline
```

### 4. 坐标系：BD-09 直通
百度地图事件回调 `e.point` 已是 BD-09 经纬度，`map.getDistance()` 直接返回米数。
**整条链路无需任何投影 / 坐标系转换**，比 OpenLayers 实现更简洁。

> 若数据源是 WGS-84（GPS）或 GCJ-02（高德），需先用 `BMapGL.Convertor.translate()` 转换为 BD-09 后再使用。

### 5. Redux-Saga 的职责边界
- **同步路径**（高频 mousemove）：直接 dispatch RTK action，不走 Saga
- **异步路径**（如需后端路径距离 API）：dispatch `fetchDistanceRequest` → Saga 处理

## 快速启动

```bash
# 安装依赖（在 demo/map-distance-demo 目录下）
npm install

# 配置 AK：编辑 public/index.html，替换 YOUR_BAIDU_AK

# 启动开发服务（端口 3001）
npm start

# 运行 E2E 测试（需先启动服务）
npm run test:e2e
```

## E2E 测试用例

| 用例 | 标签 | 验证点 |
|---|---|---|
| TC01 页面初始渲染 | @critical | bmap canvas 可见、提示文字、重置按钮禁用 |
| TC02 单击设置起点 | @critical | 起点 Tag 出现、重置按钮启用 |
| TC03 鼠标移动显示距离 | @critical | 距离 Tag 出现且匹配正则 `\d+\s*(m\|km)` |
| TC04 重置按钮 | @critical | 恢复初始状态 |
| TC05 右键取消 | @critical | 恢复初始状态 |