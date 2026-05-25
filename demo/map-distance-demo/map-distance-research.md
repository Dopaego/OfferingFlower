# 地图选点光标实时测距功能 — 技术可行性调研报告（百度地图 BMapGL 专版）

> 版本：v2.0 | 日期：2026-05-14 | 作者：前端地图开发工程师  
> 技术栈：百度地图 JSAPI GL（BMapGL，WebGL v1.0）

---

## 一、需求概述

本功能旨在实现如下交互流程：

1. 用户在地图上 **单击选点**，系统记录该点为"起始点"并在地图上渲染标记（Marker）。
2. 用户 **移动鼠标光标**（无需再次点击），光标位置持续变化。
3. 在光标移动过程中，**实时计算并展示**"起始点"与"当前光标位置"之间的**真实地理距离**（单位：米 / 千米），并在地图上动态渲染连线及距离标签。

该功能不涉及路径规划或轨迹回放，仅限于"选点 + 光标实时直线测距"场景。项目已使用 **百度地图 JSAPI GL（BMapGL）** 作为地图引擎，本文档聚焦于 BMapGL 的具体实现方案。

---

## 二、可行性结论

**结论：完全可实现，BMapGL 原生具备所需全部能力，无需引入第三方库。**

### 实现原理概述

百度地图 JSAPI GL（BMapGL）提供了以下关键能力，可直接组合完成该功能：

1. **`map.addEventListener('mousemove', cb)`**：原生鼠标移动事件，回调 `e.latlng` / `e.point` 直接携带百度坐标系（BD-09）经纬度，无需任何投影换算。
2. **`map.getDistance(pointA, pointB)`**：BMapGL.Map 实例方法，直接计算两点间球面距离（米），内部基于 WGS-84 椭球面公式。
3. **`BMapGL.Polyline` + `setPath()`**：原生支持动态更新折线坐标，可原地修改无需重建覆盖物。
4. **`BMapGL.Label`**：原生支持悬浮文本标签，可通过 `setPosition()` 动态更新位置和 `setContent()` 更新文本。

> 百度地图官方还内置了 **`DistanceTool`**（依赖 `BMapGLLib.DistanceTool`）一键测距工具；但该工具是"先点击、再点击、再点击"的多段折线模式，无法满足"单击 + 光标实时跟随"的交互，故本方案选择手动组合原子 API。

---

## 三、实现原理与核心算法

### 3.1 屏幕坐标 → 地理坐标

在 BMapGL 中，`mousemove` / `click` 事件回调对象 `e` 同时携带：

```javascript
map.addEventListener('mousemove', (e) => {
  // e.point  : BMapGL.Point，已是 BD-09 经纬度（lng, lat）
  // e.latlng : 与 e.point 等价（兼容字段）
  // e.pixel  : 屏幕像素坐标 { x, y }
  console.log(e.point.lng, e.point.lat);
});
```

> **关键差异**：与 OpenLayers 不同，**BMapGL 事件回调直接给出经纬度（BD-09）**，不需要 `toLonLat / fromLonLat` 之类的投影转换，可直接传给 `getDistance()` 计算。

如需将屏幕像素反向换算为经纬度，可使用：

```javascript
// 屏幕像素 → 经纬度
const point = map.pixelToPoint(new BMapGL.Pixel(px, py));
// 经纬度 → 屏幕像素
const pixel = map.pointToPixel(point);
```

参考：[BMapGL.Map API](https://lbsyun.baidu.com/index.php?title=jspopularGL/guide/class)

### 3.2 真实地理距离计算方法

#### 3.2.1 `map.getDistance(pointA, pointB)`（**项目推荐方案**）

BMapGL.Map 实例直接提供球面距离计算函数，参数为两个 `BMapGL.Point`，返回单位为**米**：

```javascript
const start = new BMapGL.Point(116.4074, 39.9042); // 北京
const end   = new BMapGL.Point(121.4737, 31.2304); // 上海
const meters = map.getDistance(start, end);
// 返回约 1068km 对应的米数
```

参考：[BMapGL.Map.getDistance 方法](https://lbsyun.baidu.com/index.php?title=jspopularGL/guide/class)

#### 3.2.2 `BMapGLLib.GeoUtils.getDistance()`（备用，含更多几何工具）

如果需要更多几何能力（点是否在多边形内、折线长度等），可引入官方扩展工具库 [BMapGLLib](https://github.com/huiyan-fe/BMapGLLib)：

```html
<script src="https://mapopen.bj.bcebos.com/github/BMapGLLib/GeoUtils/src/GeoUtils.min.js"></script>
```

```javascript
const dist = BMapGLLib.GeoUtils.getDistance(pointA, pointB); // 米
```

> 对于"两点直线距离"这一单一需求，**直接使用 `map.getDistance()` 已足够**，无需引入扩展库。

#### 3.2.3 Haversine 公式（备用/手动实现）

若不依赖 BMapGL 实例（例如纯工具函数），也可自行实现 Haversine 公式：

```javascript
function haversineDistance(lng1, lat1, lng2, lat2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
```

> **注意坐标系误差**：BMapGL 使用 BD-09 坐标系（在 GCJ-02 上再做了一次偏移）。Haversine 输入若是 BD-09，结果距离与实际地表距离最大可能存在百米级误差。若需高精度，应：
> - 推荐：调用 `map.getDistance()`（百度内部自动按 BD-09 计算地表距离）
> - 备选：先 `BMapGL.Convertor` 转回 WGS-84 再用 Haversine

参考：[百度坐标系说明](https://lbsyun.baidu.com/index.php?title=coordinate)

#### 3.2.4 地图比例尺、缩放级别、坐标系的影响

| 因素 | 对 BMapGL 的影响说明 |
|---|---|
| **缩放级别（zoom）** | 不影响 `getDistance()` 计算结果；zoom 越大，`mousemove` 每触发一次对应的地理移动越小，实时精度越高 |
| **坐标系（BD-09）** | BMapGL 内部已按 BD-09 处理，`map.getDistance()` 返回的就是真实地表米数；无需手动转换 |
| **AK 配额** | `map.getDistance()` 是纯前端几何计算，**不消耗 AK 配额**，可高频调用 |
| **地图比例尺** | 仅影响视觉显示，`getDistance()` 基于经纬度计算，与比例尺无关 |

> **结论**：在 BMapGL 中，鼠标事件回调直接给经纬度，`map.getDistance()` 直接给米数，整条链路无需任何投影/坐标系转换，比 OpenLayers 实现更简洁。

---

## 四、BMapGL 实现方案详解

### 4.1 核心 API 一览

| 功能 | BMapGL API | 说明 |
|---|---|---|
| 监听鼠标移动 | `map.addEventListener('mousemove', cb)` | 触发频率约 60Hz，回调 `e.point` 为 BD-09 经纬度 |
| 监听单击 | `map.addEventListener('click', cb)` | 单击事件，`e.point` 为命中位置 |
| 监听右键 | `map.addEventListener('rightclick', cb)` | 用于"取消测距"交互 |
| 计算球面距离 | `map.getDistance(pointA, pointB)` | 返回米，内部按 BD-09 椭球面计算 |
| 起点标记 | `BMapGL.Marker(point, opts)` + `map.addOverlay()` | 默认蓝色水滴标记，可换 `Icon` 自定义 |
| 动态连线 | `BMapGL.Polyline([pA, pB], opts)` + `polyline.setPath()` | `setPath` 原地更新坐标 |
| 距离标签 | `BMapGL.Label(content, { position, offset })` + `setPosition / setContent` | 悬浮文本 DOM |
| 创建坐标点 | `new BMapGL.Point(lng, lat)` | BD-09 经纬度 |
| 像素 ↔ 经纬度 | `map.pointToPixel()` / `map.pixelToPoint()` | 屏幕坐标互转 |

参考：[百度地图 JSAPI GL 类参考](https://lbsyun.baidu.com/index.php?title=jspopularGL/guide/class)

### 4.2 与其他 SDK 的关键差异

| 对比项 | 百度 BMapGL | OpenLayers | 高德 / Leaflet |
|---|---|---|---|
| 命名空间 | 全局 `BMapGL` | ES Module 按需 import | `AMap` / `L` |
| 鼠标移动事件名 | `mousemove` | `pointermove`（兼容触摸） | `mousemove` |
| 坐标系 | **BD-09**（百度专用） | 默认 EPSG:3857 投影 | GCJ-02 / WGS-84 |
| 事件回调坐标格式 | `e.point.lng / e.point.lat`（已是经纬度） | `e.coordinate`（投影坐标，需 `toLonLat`） | 经纬度 |
| 测距 API | `map.getDistance(pA, pB)` 实例方法 | `ol/sphere.getDistance()` | 高德需手动 Haversine；Leaflet `latlng.distanceTo()` |
| 起点 / 连线 / 标签 | `Marker` / `Polyline` / `Label`，`addOverlay` 添加 | `Feature` + `VectorLayer` | `Marker` / `Polyline` / `Text` |
| 加载方式 | `<script>` 异步注入 + AK 鉴权 | npm 包 ES Module | `<script>` 或 `@amap/amap-jsapi-loader` |

---

## 五、关键代码示例

### 5.1 加载 SDK（HTML 异步注入）

```html
<!-- 在 index.html 中加入 -->
<script>
  window.initBMap = function () {
    // SDK 加载完成后触发的回调（在 React 初始化前/后均可）
    window.dispatchEvent(new Event('bmap-loaded'));
  };
</script>
<script
  type="text/javascript"
  src="https://api.map.baidu.com/api?type=webgl&v=1.0&ak=YOUR_AK&callback=initBMap"
></script>
```

> **AK 申请**：[百度地图开放平台 - 应用管理](https://lbsyun.baidu.com/apiconsole/key)。`type=webgl` 必填，对应 `BMapGL` 全局对象；不能用 2D 版（`BMap`）。

### 5.2 工具函数

```javascript
/**
 * 格式化距离显示
 * @param {number} meters
 * @returns {string}
 */
export function formatDistance(meters) {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(2)} km`
    : `${Math.round(meters)} m`;
}

/**
 * 等待 BMapGL SDK 异步加载完成
 * @returns {Promise<typeof window.BMapGL>}
 */
export function waitForBMapGL() {
  return new Promise((resolve) => {
    if (window.BMapGL) return resolve(window.BMapGL);
    window.addEventListener('bmap-loaded', () => resolve(window.BMapGL), { once: true });
  });
}
```

### 5.3 完整实现示例（原生 JS 版）

```javascript
// ---- 1. 等待 SDK，初始化地图 ----
const BMapGL = await waitForBMapGL();
const map = new BMapGL.Map('map');
map.centerAndZoom(new BMapGL.Point(116.4074, 39.9042), 13);
map.enableScrollWheelZoom(true);

// ---- 2. 状态变量 ----
let startPoint = null;       // BMapGL.Point 起点
let startMarker = null;      // 起点 Marker 覆盖物
let polyline = null;         // 连线 Polyline 覆盖物
let label = null;            // 距离 Label 覆盖物
let lastMoveTime = 0;        // pointermove 节流时间戳

// ---- 3. 单击：设置起始点 ----
map.addEventListener('click', (e) => {
  // 重置旧状态
  if (startMarker) map.removeOverlay(startMarker);
  if (polyline) map.removeOverlay(polyline);
  if (label) map.removeOverlay(label);

  startPoint = e.point; // BD-09 经纬度

  // 起点 Marker
  startMarker = new BMapGL.Marker(startPoint);
  map.addOverlay(startMarker);

  // 连线 Polyline（两端先重叠）
  polyline = new BMapGL.Polyline(
    [startPoint, startPoint],
    { strokeColor: '#1677ff', strokeWeight: 3, strokeOpacity: 0.8, strokeStyle: 'dashed' },
  );
  map.addOverlay(polyline);

  // 距离 Label
  label = new BMapGL.Label('0 m', {
    position: startPoint,
    offset: new BMapGL.Size(14, -10),
  });
  label.setStyle({
    background: 'rgba(22,119,255,0.85)',
    color: '#fff',
    border: 'none',
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '500',
    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
  });
  map.addOverlay(label);
});

// ---- 4. 鼠标移动（节流 16ms）：更新连线和距离 ----
map.addEventListener('mousemove', (e) => {
  if (!startPoint) return;

  const now = performance.now();
  if (now - lastMoveTime < 16) return; // 节流：≈60fps
  lastMoveTime = now;

  const cur = e.point;

  // 4.1 原地更新连线坐标
  polyline.setPath([startPoint, cur]);

  // 4.2 计算球面距离（BMapGL 实例方法，返回米）
  const dist = map.getDistance(startPoint, cur);

  // 4.3 更新距离标签
  label.setContent(formatDistance(dist));
  label.setPosition(cur);
});

// ---- 5. 右键取消测距 ----
map.addEventListener('rightclick', () => {
  if (startMarker) { map.removeOverlay(startMarker); startMarker = null; }
  if (polyline)    { map.removeOverlay(polyline);    polyline = null; }
  if (label)       { map.removeOverlay(label);       label = null; }
  startPoint = null;
});

// ---- 工具函数 ----
function formatDistance(meters) {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(2)} km`
    : `${Math.round(meters)} m`;
}
```

### 5.4 覆盖物原地更新 vs 重建（性能关键）

```javascript
// ✅ 推荐：原地修改 Polyline 路径，避免反复 add/remove
polyline.setPath([startPoint, curPoint]);
label.setPosition(curPoint);
label.setContent(formatDistance(dist));

// ❌ 不推荐：每次 mousemove 都 removeOverlay + new Polyline + addOverlay
map.removeOverlay(polyline);
polyline = new BMapGL.Polyline([startPoint, curPoint], {...});
map.addOverlay(polyline);
```

参考：[BMapGL.Polyline.setPath](https://lbsyun.baidu.com/index.php?title=jspopularGL/guide/class)

### 5.5 坐标系（BD-09）使用注意事项

```javascript
// 直接构造 BD-09 经纬度
const p = new BMapGL.Point(116.4074, 39.9042);

// WGS-84 / GCJ-02 → BD-09 转换（需调用百度坐标转换接口）
const convertor = new BMapGL.Convertor();
convertor.translate([wgsPoint], 1, 5, (data) => {
  if (data.status === 0) {
    const bdPoint = data.points[0]; // BD-09
  }
});
```

| 来源坐标系 | from 参数 |
|---|---|
| GPS / WGS-84 | 1 |
| 国测局 / GCJ-02 | 3 |
| 百度 / BD-09 | 5（目标） |

参考：[BMapGL.Convertor 坐标转换](https://lbsyun.baidu.com/index.php?title=jspopularGL/guide/coordinate)

> **常见错误**：从其他平台（Google、高德）拿到的经纬度直接当作 BD-09 用，会导致点位偏移 50–500 米。务必先转换。

---

## 五·补充：实战避坑指南（2026-05-14 落地修复总结）

> 本节为实际接入 BMapGL v1.0（`type=webgl&v=1.0`）测距功能时遇到的真实问题及解决方案。**强烈建议接入前完整阅读**，可少走 2~3 小时的弯路。

### ⚠️ 坑 1：事件回调 `e.point` 可能不是经纬度，而是百度墨卡托（BD-MC）米单位坐标

**现象**：直接使用 `e.point.lng / e.point.lat` 计算距离时，数值异常巨大（如 3562223 米 / 1182279 米），且任意改用 `map.getDistance()`、`BMapGL.GeoUtils.getDistance()`、自写 Haversine 三种方式结果都错。

**调试日志示例**（错误状态）：
```js
[distance][click] set start point
  rawEventPoint: { lng: 12953625.49, lat: 4825818.65 }   // ← 异常大！
  spLng: 12953625.49
  spLat: 4825818.65
  mapZoom: 13

[distance][haversine]
  p1: { lng: 12953625.49, lat: 4825818.65 }
  dLatDeg: 3104, dLngDeg: -192        // ← 纬度差 3104°，明显不合理
  distMeters: 1182279.46              // ← 当成经纬度算出来的伪距离
```

**根因**：BMapGL v1.0 WebGL 在某些渲染管线下，`click` / `mousemove` 事件回调返回的 `e.point` 直接是**百度墨卡托投影坐标（单位：米，量级 1e7）**，而非 BD-09 经纬度（量级 1e2）。此时无论调用 `map.getDistance()` 还是 Haversine，都会把"米"当成"度"处理，结果全部错误。

**官方文档未明示这一点**，因此必须在业务代码中做坐标归一化。

**解决方案 — 事件坐标归一化函数**：

```typescript
/**
 * 将 BMapGL 事件对象归一化为 BD-09 经纬度
 * 适用版本：BMapGL v1.0 WebGL
 */
function normalizeEventPoint(BMapGL, map, e) {
  const ep = e?.point;
  const lng = ep?.lng;
  const lat = ep?.lat;

  // 情形 1：已经是经纬度（|lng|≤180 && |lat|≤90）→ 直接返回
  if (
    typeof lng === 'number' && typeof lat === 'number' &&
    Math.abs(lng) <= 180 && Math.abs(lat) <= 90
  ) {
    return { lng, lat };
  }

  // 情形 2：e.point 是墨卡托米坐标 → 优先用像素回推（最准、无精度损失）
  if (e?.pixel && typeof map.pixelToPoint === 'function') {
    try {
      const p = map.pixelToPoint(e.pixel);
      if (p && Math.abs(p.lng) <= 180 && Math.abs(p.lat) <= 90) {
        return { lng: p.lng, lat: p.lat };
      }
    } catch { /* ignore */ }
  }

  // 情形 3：墨卡托 inverse 公式（兜底）
  if (typeof lng === 'number' && typeof lat === 'number') {
    const R = 6378137;
    const llng = (lng / R) * (180 / Math.PI);
    const llat = (Math.atan(Math.exp(lat / R)) * 2 - Math.PI / 2) * (180 / Math.PI);
    if (Math.abs(llng) <= 180 && Math.abs(llat) <= 90) {
      return { lng: llng, lat: llat };
    }
  }

  return { lng: 0, lat: 0 };
}
```

**在 click / mousemove 中统一使用**：
```typescript
map.addEventListener('click', (e) => {
  const ll = normalizeEventPoint(BMapGL, map, e);
  const sp = new BMapGL.Point(ll.lng, ll.lat);   // 此时 sp 必为 BD-09 经纬度
  // ...
});

map.addEventListener('mousemove', (e) => {
  const ll = normalizeEventPoint(BMapGL, map, e);
  const cur = new BMapGL.Point(ll.lng, ll.lat);
  const dist = map.getDistance(sp, cur);         // 单位：米，正确
});
```

**判别口径**：
| 坐标量级 | 含义 | 处理方式 |
|---|---|---|
| `|lng|≤180, |lat|≤90` | BD-09 经纬度 | 直接使用 |
| `|lng|或|lat| > 180` (典型 1e7 量级) | 墨卡托米坐标 | 用 `pixelToPoint(e.pixel)` 或 inverse 公式反算 |

---

### ⚠️ 坑 2：Polyline.setPath 在部分 v1.0 小版本下静默失效

**现象**：`mousemove` 中调用 `polyline.setPath([sp, cur])` 不报错，但视觉上看不到连线变化（预览线缺失）。

**解决方案 — setPath 优先 + 失败重建双轨策略**：

```typescript
let updated = false;
if (typeof polylineRef.current.setPath === 'function') {
  try {
    polylineRef.current.setPath([sp, cur]);
    updated = true;
  } catch {
    updated = false;
  }
}
if (!updated) {
  // 兜底：移除旧 overlay + 重建
  map.removeOverlay(polylineRef.current);
  const newLine = new BMapGL.Polyline([sp, cur], {
    strokeColor: '#1677ff',
    strokeWeight: 3,
    strokeOpacity: 0.7,
    strokeStyle: 'dashed',
  });
  polylineRef.current = newLine;
  map.addOverlay(newLine);
}
```

**预览线样式建议**：使用 `strokeStyle: 'dashed'` + `strokeOpacity: 0.7`，在视觉上与"已确认路径"做区分。

---

### ⚠️ 坑 3：距离计算优先级

**强烈推荐优先级**（从高到低）：

1. **`map.getDistance(pA, pB)`** — BMapGL 官方 API，按 BD-09 球面计算，**结果与百度官方测距工具一致**，不消耗 AK 配额。
2. **`BMapGL.GeoUtils.getDistance(pA, pB)`** — 工具类（部分版本缺失，需做空判）。
3. **自写 Haversine（兜底）** — 仅当上述两者不可用时使用；注意输入必须是经纬度（情形 1），不能是墨卡托米。

**重要提醒**：
- 自写 Haversine 公式输入 BD-09 经纬度时，与真实地表距离仅在百米尺度内偏差可忽略；跨公里以上场景应优先使用 `map.getDistance`。
- 切勿把 Haversine 直接套在墨卡托米坐标上（坑 1 的现象就是这样产生的）。

---

### ⚠️ 坑 4：调试日志建议

接入测距功能时，建议在开发期临时加入对比日志，三种 API 同时计算并打印，便于快速定位偏差源：

```typescript
console.log('[distance][mousemove]', {
  startPoint: { lng: sp.lng, lat: sp.lat },
  cursorPoint: { lng: cur.lng, lat: cur.lat },
  results: {
    'map.getDistance(m)': mapApiDist,
    'GeoUtils.getDistance(m)': geoUtilsDist,
    'haversine(m)': haversineDist,
  },
  picked: used,
  finalDistMeters: dist,
});
```

判断依据：
- 若起点坐标量级 > 1e6 → **坑 1**（坐标系问题），用 `normalizeEventPoint`
- 若三种 API 数值都接近、但与百度官方测距工具差异大 → 起点位置本身定位错误，检查 click 事件
- 若 `map.getDistance` 与 Haversine 数值差异 > 5% → 选用 `map.getDistance` 为准

---

### ⚠️ 坑 5：建议改用官方 DistanceTool（如交互可调整）

若产品交互可改为"多次点击 + 双击结束"模式，强烈建议直接使用百度官方 `BMapGLLib.DistanceTool`，可一次性规避坑 1~4：

```html
<script src="https://mapopen.bj.bcebos.com/github/BMapGLLib/DistanceTool/src/DistanceTool_min.js"></script>
```

```typescript
const tool = new BMapGLLib.DistanceTool(map, {
  lineStroke: 3,
  lineColor: '#1677ff',
  lineOpacity: 0.8,
});
tool.open();   // 进入测距模式
// tool.close(); // 退出
```

但 `DistanceTool` 不支持"单击 + 鼠标实时跟随"交互，若必须保留该交互，仍需采用本节自实现方案。

---

## 六、性能优化建议

### 6.1 `mousemove` 节流（最关键）

`mousemove` 事件每秒可触发 60+ 次，必须加节流，避免过度渲染：

```javascript
// 方案 1：时间戳节流（推荐，16ms ≈ 60fps）
let lastMoveTime = 0;
map.addEventListener('mousemove', (e) => {
  const now = performance.now();
  if (now - lastMoveTime < 16) return;
  lastMoveTime = now;
  // ... 执行更新逻辑
});

// 方案 2：requestAnimationFrame 节流
let ticking = false;
map.addEventListener('mousemove', (e) => {
  if (ticking) return;
  requestAnimationFrame(() => {
    // ... 执行更新逻辑
    ticking = false;
  });
  ticking = true;
});
```

### 6.2 避免覆盖物重建

- 始终通过 `polyline.setPath()` 原地更新连线坐标，而非 `removeOverlay` + `new Polyline`。
- `label.setPosition()` / `label.setContent()` 更新位置和文本，无需重建。

### 6.3 关闭不必要的交互

```javascript
// 测距期间禁止地图惯性拖拽，避免误操作
map.disableInertialDragging();
```

### 6.4 鼠标移出地图清理

百度地图未提供 `pointerout` 等价事件。可在地图容器 DOM 上监听：

```javascript
map.getContainer().addEventListener('mouseleave', () => {
  if (label) label.setPosition(new BMapGL.Point(0, 0)); // 移到不可见区域
});
```

或在状态层判定 `cur` 是否在地图视口内。

### 6.5 移动端适配

百度地图 JSAPI GL 在移动端将 `mousemove` 等价为 `touchmove`，但实时测距在触摸屏上体验较差，建议改为 **"两次单击"** 模式（`click` × 2）：

- 第一次 `click`：设置起点
- 第二次 `click`：设置终点并固定显示距离

---

## 七、推荐方案与实施步骤

### 7.1 推荐方案

**推荐方案：BMapGL 原生 API 全量实现，无需第三方库**

| 模块 | 使用的 BMapGL API |
|---|---|
| SDK 加载 | `<script>` + `callback` 异步注入 |
| 鼠标事件 | `map.addEventListener('click' \| 'mousemove' \| 'rightclick')` |
| 距离计算 | `map.getDistance(pointA, pointB)` |
| 连线渲染 | `BMapGL.Polyline` + `setPath()` |
| 起点标记 | `BMapGL.Marker` |
| 距离标签 | `BMapGL.Label` + `setStyle / setPosition / setContent` |
| 节流 | `performance.now()` 时间戳手动节流 |

**理由：**
- `map.getDistance()` 直接返回米数，**前端纯几何计算，不消耗 AK 配额**，可高频调用
- 无投影坐标转换开销，事件回调直接给 BD-09 经纬度
- `Polyline.setPath` / `Label.setPosition` 原地更新机制性能优秀，mousemove 高频触发下不卡顿
- 全部使用 BMapGL 原生 API，与现有项目技术栈完全一致，无额外依赖

### 7.2 实施步骤

1. **加载 SDK**：在 `public/index.html` 中通过 `<script async>` 注入百度 JSAPI GL，配置 `callback=initBMap` 回调。
2. **等待 SDK 就绪**：在 React Hook 中通过 Promise 等待全局 `window.BMapGL` 出现。
3. **初始化地图**：`new BMapGL.Map(containerId)` + `map.centerAndZoom()`，`enableScrollWheelZoom`。
4. **绑定 `click` 事件**：
   - 清除旧覆盖物（`removeOverlay` 起点 Marker、连线、标签）
   - 记录 `e.point` 为起点
   - 创建并 `addOverlay` 起点 Marker、Polyline（两端重叠）、Label
5. **绑定 `mousemove`（加 16ms 节流）**：
   - `polyline.setPath([startPoint, e.point])` 更新连线
   - `map.getDistance(startPoint, e.point)` 计算距离
   - `label.setPosition(e.point)` + `label.setContent(formatDistance(dist))`
6. **绑定 `rightclick`**：清空所有状态，移除全部覆盖物
7. **绑定容器 `mouseleave`**：可选，鼠标离开地图时隐藏 Label
8. **性能验收**：确认 mousemove 节流生效，页面帧率稳定在 60fps

---

## 八、参考资料

| 序号 | 资源名称　　　　　　　　　　　　　　 | 链接　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　 |
| ------| --------------------------------------| --------------------------------------------------------------------------|
| 1　　| 百度地图 JSAPI GL 入门指南　　　　　 | https://lbsyun.baidu.com/index.php?title=jspopularGL　　　　　　　　　　 |
| 2　　| BMapGL.Map 类参考（事件 / 方法）　　 | https://lbsyun.baidu.com/index.php?title=jspopularGL/guide/class　　　　 |
| 3　　| BMapGL.Map.getDistance — 球面距离　　| https://lbsyun.baidu.com/index.php?title=jspopularGL/guide/class　　　　 |
| 4　　| BMapGL.Polyline — 折线覆盖物　　　　 | https://lbsyun.baidu.com/index.php?title=jspopularGL/guide/class　　　　 |
| 5　　| BMapGL.Marker — 点标注覆盖物　　　　 | https://lbsyun.baidu.com/index.php?title=jspopularGL/guide/class　　　　 |
| 6　　| BMapGL.Label — 文本标签　　　　　　　| https://lbsyun.baidu.com/index.php?title=jspopularGL/guide/class　　　　 |
| 7　　| BMapGL.Convertor — 坐标转换　　　　　| https://lbsyun.baidu.com/index.php?title=jspopularGL/guide/coordinate　　|
| 8　　| 百度地图坐标系（BD-09）说明　　　　　| https://lbsyun.baidu.com/index.php?title=coordinate　　　　　　　　　　　|
| 9　　| 百度 AK 申请控制台　　　　　　　　　 | https://lbsyun.baidu.com/apiconsole/key　　　　　　　　　　　　　　　　　|
| 10　 | BMapGLLib 开源工具库（GeoUtils 等）　| https://github.com/huiyan-fe/BMapGLLib　　　　　　　　　　　　　　　　　 |
| 11　 | 百度地图官方测距示例（DistanceTool） | https://lbsyun.baidu.com/jsdemo.htm#a4_4　　　　　　　　　　　　　　　　 |
| 12　 | Haversine 公式原理　　　　　　　　　 | https://www.movable-type.co.uk/scripts/latlong.html　　　　　　　　　　　|
| 13　 | MDN — mousemove 事件　　　　　　　　 | https://developer.mozilla.org/zh-CN/docs/Web/API/Element/mousemove_event |
| 14　 | WebGIS 距离测量原理　　　　　　　　　| https://www.osgeo.cn/gis-booklet/webgis-lxh-17.html　　　　　　　　　　　|

## 九、代理问题学习

### 正向代理
  正向代理指的是**客户端**的代理，比如【科学上网】，在此种情况下，服务端无法判断真实客户端的身份。
  客户端通过代理服务器访问外部资源。
  客户端 → [正向代理服务器] → 目标服务器 ***(客户端知道代理存在，服务器不知道真实客户端)***

### 反向代理
  反向代理指的是**服务端**的代理，比如【使用Nignx实现负载均衡】【CDN节点】，客户端此时不知道真实的后端服务器。
  客户端 → [反向代理服务器] → 后端服务器集群 (客户端不知道后端服务器存在)

### Nignx学习

  nignx常用于作为静态资源服务器、反向代理、负载均衡等场景，下面是有关的实现操作和原理

#### 静态资源服务器
  用户访问图片、js、css等静态资源，可以直接保存在Nignx所在的服务器硬盘，而不需要保存在业务方的服务器，减缓了服务器的接口压力，在开发时，build后得到的dist文件夹下就是交给Nignx然后直接返回给浏览器，同时这些静态资源【不经常会变动的资源】通常会被设置为强制缓存【max-age： 316000?】，优化用户的使用体验

#### 反向代理
  隐藏了服务端的真实端口-当客户端访问动态的API请求时，此时Nignx无法处理，则会转发给业务方的服务器，隐藏了真实的服务端IP，解决跨域问题的同时还能提升后端安全性。

#### 负载均衡
  可以设置轮询/权重，避免一个服务器的任务过重。

#### nignx应用过程实际配置项

1. worker_processes n; # 有n个nignx服务器工作
2. events { worker_connections 1024 }
3. http {
    #server
    server {
      listen 80;
      server_name jianshu.com;
      location / {
        root /var/www/html;
        index index.html;
      }
      location /api {
        proxy_pass http://127.0.0.1.3000;
      }
    }
  }

#### 常考面试题
1. 正向代理和反向代理的区别：
- **代理对象不同，客户端服务端的感知度不同**
- 正向代理代理的是 ***客户端***，比如我们用的 VPN（科学上网），服务器不知道真实的客户端是谁，它以为是代理服务器在访问它。
  反向代理代理的是 ***服务端*** ，比如 Nginx。客户端不知道真实的后端服务器在哪，它以为 Nginx 就是真实的服务器。一句话总结：正向代理帮客户端隐藏身份，反向代理帮服务端隐藏身份

2. 前端在本地开发用 Webpack proxy 解决跨域，那上线后怎么解决跨域
- **同源部署、反向代理转发**。
- “上线后通常使用 Nginx 反向代理来解决。我们会把前端页面和 Nginx 部署在同一个域名下。当浏览器请求 API 时，比如请求 www.xxx.com/api/xxx ，这个请求先打到 Nginx，因为域名同源，浏览器不会报跨域。然后 Nginx 在内部通过 proxy_pass 把请求转发给真实的后端服务器。因为 服务器之间通信是不受浏览器同源策略限制的 ，从而完美解决跨域。”

3. React 部署后，刷新页面出现 404 是怎么回事？怎么解决？（极高频🔥）
- **单页应用 (SPA)、History 路由、 try_files** 。
- 这是因为我们前端目前多采用 History 路由模式。当我们直接刷新 /user 这个路径时，Nginx 会真的去服务器的硬盘里找一个叫 user 的文件夹或文件，找不到就会报 404。 解决办法 是在 Nginx 的 location / 配置中加上 try_files $uri $uri/ /index.html; 。它的作用是：找不到对应的文件时，强制把请求重定向给 index.html ，把路由接管权交还给前端框架的 React-Router 或 Vue-Router 去处理。

4. Nginx 负载均衡有哪些常见的策略？
- “主要有四种：第一种是 轮询（默认） ，请求按顺序轮流分配；第二种是 权重（weight） ，给性能好的服务器分配更高的权重；第三种是 IP Hash ，根据客户端 IP 算出一个哈希值固定分配给一台机器，这通常用来解决用户 Session 登录状态丢失的问题[具体如何解决？？？]；第四种是 最少连接数 ，谁当前的连接数最少就分配给谁。”

5. 为什么 Nginx 能处理百万级的高并发？
- **异步非阻塞、事件驱动、epoll 模型**。
- “传统服务器（如早期 Apache）是一个请求对应一个线程，并发一高，线程切换开销极大。而 Nginx 采用的是 异步非阻塞的事件驱动模型（epoll 模型） 。它只需要极少的线程（Worker 进程），当一个请求在等待网络 I/O 时，Worker 不会傻等，而是立刻去处理下一个请求。只有当数据准备好了，系统才会通知 Worker 去处理。[这就像餐厅服务员点完菜后，不会傻站在厨房等菜，而是立刻去服务下一桌，所以极少的服务员就能应对成百上千的顾客]

## 十、TypeScript
### 常考面试题
1. 说说你对 TypeScript 的理解？它和 JavaScript 有什么区别？
  TS是JS的超集，所有的JS代码都是ts代码，并在js的基础上添加了静态类型系统。
  js是动态弱类型语言，在运行时才会暴露错误，而ts是静态强类型语言，可以在编译阶段发现潜在的类型错误。ts提供了Interface, 泛型等面向对象的特性，更适合大型复杂项目的开发和维护，能提供更好的代码提示，ts会被编译成js代码运行在浏览器中

2. type （类型别名）和 interface （接口）有什么区别？什么时候用哪个？
  它们都能用来定义对象或者函数的类型，但是细节上存在区别：
- 扩展方式不同：interface通过extends关键字实现继承，type通过交叉类型（&）实现扩展
- 同名合并行为不同：如果定义两个同名的 interface ，它们会自动合并（Declaration Merging），这在扩展第三方库声明时非常有用；而定义两个同名的 type 会直接报错。
- 使用范围不同：type 可以用来声明基本类型别名、联合类型、元组等，而 interface 只能用来声明对象形状。 
总结场景 ：
- 在开发第三方库的 API 或定义对象结构时，优先使用 interface （方便别人扩展）；
- 在定义联合类型（如 type Status = 'success' | 'fail' ）、
        元组（如type Point3D = [number, number, number] ）或 
        复杂类型推导（如 type AsyncFunctionResult<T> = T extends () => Promise<infer U> ? U : never ）时，使用type。

3. 什么是泛型？有什么作用？
实现了**类型的参数化、复用性**。
泛型实现了类型的参数化，比如 function identity<T>(arg: T): T,比直接写any要安全得多。提高了代码的复用性和灵活性，定义函数、接口或者类时不预先指定具体类型，在使用的时候再指定类型。

4. any、unknown、never的区别
- any： 使用any定义，TS会放弃对实例的类型检查，尽量避免使用
- unknown： 任何值可以赋给unknown，但unknown类型的值不能直接去调用方法或者赋值给其他类型，必须先进行类型断言或者类型收窄后才能使用。
- never：表示永远不会有值的类型。通常用在抛出异常的函数返回值、死循环函数或者在联合类型中作为兜底。

5. 常用的TS内置工具
- Partial<T> ：将类型 T 的所有属性变为 可选
- Required<T> ：将类型 T 的所有属性变为 必选
- Pick<T, K> ：从类型 T 中 挑选 出指定的属性 K ，组成一个新的类型。
- Omit<T, K> ：和 Pick 相反，从类型 T 中 剔除 指定的属性 K。
Partial 的底层实现其实就是用 keyof 遍历出所有的键，然后加上 ? 操作符，即 type Partial<T> = { [P in keyof T]?: T[P] }; 
// 手写实现Pick/Omit

## 十一、Agent相关
### Harness工程

## 十二、框架相关
### React
#### 1. React 中的Diff算法
Diff算法常用于 尽量少次数的操作更新真实DOM，使真实DOM渲染出的页面是新的虚拟DOM树对应的页面，状态变化时，React会创建一颗新的虚拟DOM树，会与旧的虚拟DOM树进行对比，找出最小的变更合集，再批量更新到真实DOM上。避免了重排重绘阻塞主线程导致用户使用体验变差。

React中的Diff算法主要的三大策略：1. 同级元素比较 2. 类型不同的元素直接替换 3.通过key识别稳定节点
##### 执行流程
1. 同层元素比较Tree Diff： 同层比较，深度优先
只比较同一父节点下的子节点，DFS，如果某个节点出现了跨层级移动，那么会直接删除该节点以及该节点下的子树，创建新节点
2. 类型不同直接替换Component Diff： 类型不同，直接替换
对于组件间的比较，只要类型不同，那么会直接替换整个组件树，即使新旧组件内容一致，比如div -> p，也会销毁旧组件、创建新组件
3. 通过Key识别稳定节点Element Diff： 通过key判断节点能否复用
同一层级的子节点，可以通过key来识别节点能否稳定复用，key相同直接复用。

```
第一轮循环：新旧节点同位置对比
  ├── 找到第一个无法复用的节点 → 记录基准位置 → 跳出
  └── 三种结果：
        ├── 新节点遍历完 → 删除剩余老节点 ✓
        ├── 老节点遍历完 → 创建剩余新节点 ✓
        └── 都未遍历完 → 进入第二轮循环 ↓

第二轮循环：遍历剩余新节点
  ├── 将剩余老节点放入 Map（key → fiber）
  ├── 新节点从 Map 中查找可复用的老节点（key + type 都相同）
  ├── 能找到 → 复用，判断是否需要移动
  └── 找不到 → 新建
```

#### 2. Fiber架构解析
##### 2.1 基本概念
是react中可中断、优先级调度的增量渲染模型，在每个react元素内部都对应了一个Fiber节点对象。
而Fiber节点其实是链表的一个节点，因为链表的遍历可以中断，防止停不下来导致了阻塞主线程进而影响用户的使用体验
Fiber节点的常见属性
```
Fiber 节点简化结构

const fiberNode = {
  // === 节点标识 ===
  type: 'div',              // 节点类型（函数组件/类组件/DOM元素）
  key: 'unique-key',        // diff 复用依据
  tag: HostComponent,       // 节点类型标记

  // === 实例引用 ===
  stateNode: domElement,    // 对应的真实 DOM 或组件实例

  // === 链表结构（关键！可中断遍历的基础） ===
  return: parentFiber,      // 指向父节点
  child: firstChildFiber,   // 指向第一个子节点
  sibling: nextSibling,     // 指向下一个兄弟节点

  // === 双缓冲 ===
  alternate: oldFiber,      // 指向上一次渲染的 Fiber，新旧对比用

  // === 副作用标记 ===
  flags: Placement,         // 标记需要执行的操作（插入/更新/删除）
  subtreeFlags: ...,        // 子树副作用标记

  // === 调度优先级 ===
  lanes: ...,               // 位掩码表示的优先级

  // === 状态 & 更新队列 ===
  memoizedState: ...,       // 当前状态（Hooks 链表挂载于此）
  updateQueue: ...,         // 更新队列（setState 产生的更新）
};
```

##### 2.2 双缓冲机制
React同时维护两棵Fiber树：

- currentFiber： 当前屏幕上显示对应的Fiber树
- workInProgress Fiber： 正在内存中构建的新的Fiber树

两棵树的节点通过 alternate 属性互相指向，当WIP树构建完成，React在Commit阶段，直接切换指针，使WIP树变为current树，实现一次性切换

##### 2.3 时间切片与优先级调度（Lanes 模型）

**时间切片**：Fiber 的工作循环在浏览器每帧的空闲时间执行单元任务：
在Fiber 工作循环中，只有当 有剩余时间才继续实现fiber树的更新，没有空闲时间就不继续，保证了不阻塞优先级比较高的事件执行

**Lanes 优先级模型**：使用**位掩码**表示多个优先级，可以合并和判断：
- 高优先级：用户输入、点击事件、动画
- 低优先级：数据预加载、非关键渲染
- 使用 `useTransition` 可将更新标记为低优先级

react 在diff时 ，分为了两个阶段
- Render阶段：遍历所有 Fiber节点，可以被中断
- Commit阶段： 开始进行DOM变更，不可以被中断

#### 3. React中的性能优化
##### 3.1 渲染层面的优化

| 优化手段 | 作用 | 适用场景 |
|---------|------|---------|
| **React.memo** | 对 props 浅比较，props 不变则跳过渲染 | 纯展示组件，props 变化不频繁 |
| **useMemo** | 缓存计算结果，依赖不变不重新计算 | 复杂计算（排序、过滤大数组） |
| **useCallback** | 缓存函数引用，避免子组件因函数引用变化而重渲染 | 传递给 memo 子组件的回调函数 |
| **状态下放** | 将状态放到最小的使用组件中，减少父组件重渲染波及范围 | 状态仅被部分子树使用 |
| **Context 拆分** | 将不同维度的状态放到不同 Context，避免"全局一起刷新" | 全局状态较多 |

#### 4. React中的Hooks

##### 4.1 React中常见的Hooks
- useState： 让组件拥有状态，状态更新时，组件重新渲染，更新时，必须使用setState，而且在react18后，如果一个事件处理函数中多次调用setState，会合并成一次渲染，尽可能减少重排重绘
- useEffect： 用于副作用处理，在浏览器绘制后异步执行。依赖数组通常分为三种情况：1. [] 2. [state] 3. 不传。对应的情况： 1.[] 只在首次渲染后调用useEffect中传入的副作用函数 2. state更新后执行函数 3. 每次渲染后都要执行。
- useContext: 可以跨组件层级传递数据，无需手动层层传递props。但是当Context的value发生变化后，会引起所有用到该Context的组件重新渲染，所以必要时可以用useMemo包裹Context Value
- useRef：返回一个 可变的引用对象，修改该对象不会导致组件的重渲染，常用于获取DOM节点，保存任意的可变值。如果一个变量需要跨渲染周期保持，但又不需要驱动UI变动，此时可以使用useRef引用
- useMemo： 缓存值，只有当依赖值变了才重新计算，避免了组件内部进行无意义的重计算。不然每次重渲染后都会重新计算某个值，但该值可能并没有发生变化。
- useCallback： 缓存函数，如果父组件传给子组件一个函数，当父组件重新渲染时，函数也会重新渲染，函数引用变化也会导致被传入到的子组件也会发生不必要的重新渲染。此种情况下，可以将函数用useCallback包裹。子组件配合着export default React.memo(Child)
- useReducer： 管理复杂状态，在实际的组件文件可以只进行dispatch选择对应的操作和传参，具体的执行函数放到专门的reducer函数中。如果一个对象的不同字段互相影响，会导致使用setState需要重复在很多地方复写很多相同的函数，但是使用useReducer可以都归纳到reducer中。

##### 4.2 Hooks的实现原理
Hooks数据保存在Fiber节点的memorizedState属性中，每个react组件对应了一个FiberNode
Fiber.memoizedState 是Hook链表的入口，每个 Hook 节点通过 next 指针形成单向链表，顺序就是在组件里写 Hooks 的顺序。也正因此 Hooks不可以被写在条件中/循环中，因为是这里的Hooks是单向链表。

#### 5. react中的状态管理与通信

##### 5.1 Redux三大特性
1. 单一数据源： 整个应用的状态被存在一颗对象树中，并且只存在于唯一一个Store中
2. State是只读的：修改一个Store的唯一方式是 dispatch一个Action，这样所有的状态可以被记录和追溯
3. 使用reducer来执行修改：reducer接受旧的State和Action，返回新的State。

数据流：view进行了操作 -> dispatch（action） -> store调用reducer接收（state， action） -> reducer返回新的 state -> store 更新state -> view重新渲染，。
可以看出来数据流是单向流动的，视图组件都无法直接修改state。保证了所有状态变更都有记录。

>Action、Reducer、Store 分别是什么？它们是怎么配合的？

难度 ⭐ | 频率 高

- **Action**：一个普通 JS 对象，必须有一个 `type` 字段描述“发生了什么事”，可选 `payload` 携带数据。
- **Reducer**：一个**纯函数**，签名 `(state, action) => newState`，根据 action.type 决定如何更新状态。
- **Store**：全局唯一的数据仓库，提供 `getState()`、`dispatch(action)`、`subscribe(listener)` 方法。

##### 5.2 React组件间通信方式
1. 父 -> 子：通过props
2. 子 -> 父： 父组件通过props传递回调函数
3. 兄弟组件： 状态提升到共同父组件，或者使用Context/Redux
4. 深层嵌套：Context API 或者状态管理库(Redux)

#### 6. 组件与生命周期

##### 6.1 类组件与函数组件的区别

- 类组件：使用class定义，有生命周期和状态。内部可以保存state
- 函数组件： Hooks出现前，没有状态，后面通过Hooks实现状态和生命周期逻辑。

对于类组件来说，存在生命周期：
1. 挂载阶段： consturctor -> render -> componentDidMount
2. 更新阶段： shouldComponentUpdate -> render -> componentDidUpdate
3. 卸载阶段： componentWillUnmount

类组件功能最为完备和强大，某些**特殊用途**(如错误边界)组件只能写成类式组件。函数组件没有this困扰且代码简洁，大部分的普通组件都可以写成函数组件

##### 6.2 受控组件和非受控组件

- 受控组件： 表单值由React状态控制（value 绑定 state），state发生变化，视图重新渲染。
- 非受控组件： 表单数据由 DOM 自身管理。React 不设置 value 属性，而是通过 ref 在需要时（如提交时）直接从 DOM 获取当前值。用户交互不会触发表单组件的重新渲染。

**“表单” 这个词是泛指所有可供用户输入或选择数据的交互元素**

// 受控组件
<input value={text} onChange={e => setText(e.target.value)} />

// 非受控组件
<input ref={inputRef} defaultValue="hello" />

##### 6.3 setState 是同步还是异步？
首先 setState后做的工作：
调用 setState 函数之后，React 会**将传入的参数对象与组件当前状态**合并，然后触发调和过程，经过调和过程，React 会以相对高效的方式，根据新的状态构建 React 元素树并重新渲染整个 UI 界面
在 React 得到元素树之后， React 会自动计算出新旧树节点的差异，根据差异对界面进行最小化重新渲染，React 的差异算法能相对精确得知发生改变的节点，保证按需更新

关于同步异步：
- react18 之前： 
  在 setTimeout、原生 DOM 事件、Promise 回调中，setState 是同步更新。setTimeout、原生事件（addEventListener）、Promise.then 等回调不在 React 的调用栈内，执行时 React 已经退出自己的上下文，isBatchingUpdates 默认为 false。此时每个 setState 调用都会立即触发一次重新渲染（同步更新）。
  在其他情况下都是异步更新【组件生命周期或 React 合成事件】

- react18 之后：
  都改成了自动批处理
React 18 通过引入全局调度器（Scheduler）和并发模式，将所有 setState 调用统一视为可调度的更新任务，不再依赖调用栈中的 isBatchingUpdates 标志。这样，即使在 setTimeout、Promise、原生事件回调中，多个 setState 也会被自动合并成一次批处理更新。

异步更新的意义：如果是同步更新，那么会导致的结果是每调用一次setState会导致页面的重渲染，造成较大性能压力，因此会多次收集setState，一次性更新dom

异步在这里的意思是：不会立即同步执行渲染，而是将更新放入队列，在事件循环的某个阶段统一处理。状态本身在调用 setState 后就已经标记为“待更新”，但组件不会立刻重新渲染。



### Vue

#### 1.状态管理 Pinia/Vuex
状态管理主要是为了**跨组件共享数据、响应式更新、调试追踪**

vuex和pinia的区别
- vuex是单一状态store树，不同类型的状态要通过module来嵌套。当我们修改state时，通过mutations来同步修改，如果异步修改，需要通过actions内部调用mutations。getter来获得访问state

- pinia是vue3官方推荐的状态管理，可以存在多个store，同时删除了mutation【Pinia 可以移除 mutations：因为 Vuex 中的 mutation 本质是为了记录同步变更，而 Vue 2 的响应式系统无法精准追踪 action 中的多次修改；到了 Vue 3，Proxy + 响应式系统可以自动捕获任何变化】，不管是同步/异步操作都可以通过action进行。同时还原生支持composition API和ts。



#### 1.1 Pinia的底层原理
Pinia 本质是一个 **Vue 插件**，在 `install` 时通过 `provide` 注入一个全局 `pinia` 实例。
每个 `defineStore` 返回一个 **useStore** 函数，调用时会从 `pinia` 实例的 `_s` (stores map) 中获取或创建一个 **reactive** 对象（store）。
**state** 通过 `ref` 或 `reactive` 变成响应式，**getters** 是 `computed`【缓存结果，防止每次getter都要重新计算state的值】，**actions** 就是普通函数【但是修改state会引起computed重新计算，保证依赖的追踪】。

#### 1.2 Vuex的底层原理
Vuex 本质是一个响应式对象（state），通过 commit 触发 mutation 同步修改 state，action 处理异步后提交 mutation，getter 基于 computed 实现派生缓存，通过模块树组织状态。

##### 5.1 底层原理

## 十三、全栈相关

### 1. Node.js 

#### 1.1 Node中的事件循环机制

Node.js中的事件循环基于**libuv库**实现，让Node在单线程下也能执行非阻塞的I/O操作。【如果Nodejs亲自执行I/O操作，那么由于js的单线程特性，会导致代码执行的阻塞，因此node可以把此类阻塞操作，委派给libuv库，从而实现了非阻塞的I/O操作】

##### 事件循环的6个阶段

1. **Timers（定时器阶段）** ：执行 `setTimeout`、`setInterval` 的回调。
2. **Pending callbacks（挂起回调阶段）** ：执行延迟到下一轮迭代的 I/O 回调（比如某些系统操作错误）。
3. **Idle / Prepare（空闲/准备阶段）** ：仅内部使用，开发者不感知。
4.  **Poll（轮询阶段）** ：**核心阶段**，获取新的 I/O 事件，执行 I/O 相关回调。
- 如果 poll 阶段队列为空且有 `setImmediate` 回调，会跳转到 check 阶段，如果没有`setImmediate` 回调，则会在此等待新的回调加入队列，直到超时。
- 如果poll 队列不为空，会同步执行队列中的回调，直到队列为空或达到系统限制。
5. **Check（检查阶段）** ：执行 `setImmediate()` 的回调。
6. **Close callbacks（关闭回调阶段）** ：执行 `socket.on('close')` 等清理操作。

`process.nextTick` 和 `Promise.then` 属于**微任务**，不在事件循环的任何阶段中——它们在**每个阶段切换之间**立即清空。

**setTimeout** 最快也要 1ms 后才进入 timers 队列，而 **setImmediate** 在本次事件循环的 check 阶段就会执行。

##### 浏览器的事件循环和Node.js的事件循环的区别

**① 架构层面不同**

浏览器事件循环由 **HTML5 标准** 定义，包含渲染管线；Node.js 事件循环由 **libuv** 实现，不涉及 UI 渲染。

**② 宏任务来源不同**

- **浏览器宏任务**：`setTimeout`、`setInterval`、`MessageChannel`、`I/O`、UI 渲染。
- **Node.js 宏任务**：`setTimeout`、`setInterval`、`setImmediate`（Node 专有）、`I/O` 操作。

**③ 微任务执行时机不同**

- **浏览器**：**一个宏任务执行完后，立刻清空整个微任务队列**，然后进行 UI 渲染。
- **Node.js**：微任务在**每个阶段切换之间执行**，而不是等整个事件循环完成一轮。

**④ process.nextTick 是 Node 独有的**

它在微任务队列中优先级最高，**比 Promise.then 还先执行**。

**一句话总结**：浏览器的事件循环服务于“渲染页面”，Node.js 的事件循环服务于“处理 I/O”。

在浏览器里，`requestAnimationFrame` 是在渲染前执行的，Node 里没这个概念。反过来 Node 里的 `setImmediate`，浏览器也没有。

##### `setTimeout(fn, 0)`、`setImmediate(fn)` 和 `process.nextTick(fn)` 的执行顺序？

`process.nextTick` > `Promise.then` > `setTimeout` ≈ `setImmediate`（谁先谁后取决于调用环境）。

**执行顺序解析**：
1. 同步代码全部执行完毕。
2. 进入微任务阶段：`process.nextTick` 最先执行，然后是 `Promise.then`。
3. 进入宏任务阶段：按事件循环的六个阶段顺序执行。

**关于 setTimeout(fn, 0) vs setImmediate：**
- 如果两者都在**主模块**中调用，执行顺序**不确定**，取决于 Node 的启动时间和系统性能。
- 如果两者都在**同一个 I/O 回调**中调用，`setImmediate` **总是先执行**，因为 I/O 回调完成后事件循环进入 poll 阶段，紧接着就是 check 阶段。

process.nextTick 的递归调用会**饿死事件循环**”——因为这会让 nextTick 队列永远清不完，timers 和 I/O 阶段永远得不到执行



### 2.Next.js 
React 量身打造的“全栈框架”。如果说 React 负责构建用户界面，那 Next.js 就是给这个界面加上了服务端能力（如 SSR）、文件路由和众多开箱即用的性能优化

#### 2.1 SSR、SSG、ISR、CSR的区别、使用场景
- CSR: 客户端渲染 HTML生成是在浏览器运行[浏览器下载空的HTML和JS，JS解析出来页面内容渲染到HTML中]时，SEO差，因为爬虫获取到的数据由于HTML未完整生产所以SEO不准确，首屏加载速度慢，因为需要在浏览器构建HTML，数据实时性高，因为每次数据更新会重新构建HTML。对服务器无格外压力。 这些特点决定了CSR适用于： 后台管理系统、内部工具——不需要 SEO，纯交互应用
- SSR：服务端渲染 HTML生成是在服务端渲染，每次请求时会构建好新的HTML，因此SEO比较好，首屏加载速度也快，数据实时性高，但对服务器压力较大。
- SSG（Static Site Generation）： 静态生成，在项目构建时就一次性生成好所有静态 HTML 页面。所有用户请求直接返回这份静态文件，速度极快。适合内容固定不变的页面。
- ISR（Incremental Static Regeneration）：增量静态再生，既有 SSG 的静态文件速度，又能设置一个更新间隔时间（如60秒），到期后后台会自动生成新页面替换旧缓存，实现内容更新。适合大部分内容展示类页面（如电商商品详情页）。对服务器的压力比较小。

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

**一句话理解**：“Hydration 就是把服务端渲染的‘静态骨架’变成‘可交互的活页面’。”

**加分回答点**：“面试官可能会追问水合不匹配（Hydration Mismatch）——当服务端生成的 HTML 和客户端渲染的结果不一致时，React 会报错。常见原因：用了 `typeof window` 做条件判断、渲染了 `Date.now()`、或者用了浏览器专有 API。”

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

### 4. Agent相关的后端知识SSE
SSE 一般指Server-Sent Events 服务器推送事件，是基于HTTP连接的服务器推送技术。允许服务器向客户端单向流式发送数据。AI对话流输出、实时日志、通知推送【增量输出的场景】非常适用。

#### 4.1 特点
- 基于http1.1 / http2，轻量且不需要ws那样复杂的协议升级
- 只能由服务器向客户端单向发送数据，可以满足文本流场景
- 自动重连，支持自定义事件类型

#### 4.2 使用
##### 前端问题
前端使用的时候，使用eventSource获取对象，使用onmessage监听接收到的数据 onerror可以加埋点报错数据等，监听progress也可以获取数据。{{ 心跳是什么？ 意义在哪里 }}
- 把 EventSource 创建放到一个可复用的 hook/composable： useSSE(url, { onMessage, onEventMap, onError })
- 页面卸载时 close() ，避免后台页面占连接
- 收到 progress / done / error 事件驱动 UI 状态机（loading → streaming → done/failed）
典型追问：为什么不用 axios？

- 因为 SSE 是持续的 event stream，不是一次性响应；axios 主要是 request/response 模型，不适合事件流分发。

##### 后端问题
后端：发送数据时应该定义 Content-Type为 text/event-stream且设置cache-control为no-cache，Connection为keep-alive定义长连接。

##### 可靠性：断线重连、去重、不丢消息怎么保证

要先区分这个流是否具备可恢复语义，再决定重连策略：如果是通知流可以直接重连
- 浏览器会自动重连，这是eventSource自带的特性
- 在设计数据结构时，应该给服务端每条消息携带id，
- 断线后，客户端发送最后一次接受的id，服务端据此补发。同时 客户端也可以根据id去重。

但如果是AI对话流，那要结合会话ID等信息决定要重试整次请求还是恢复已生成内容。

#### 4.3 与ws做对比
- sse单向，ws是双向的
- sse更轻量，ws的协议会更复杂一些
- sse更适合AI输出流，ws由于是全双工通信，更适合协同编辑那种多人实时互动的场景。

#### 4.4 流式输出的实现

后端： 调用模型的流式接口，按chunk读取增量内容，最后把内容包装成SSE消息返回给前端，最后发送done/error事件

前端： fetch+ReadableStream 或 EventSource读取响应，TextDecoder解码字节流再按SSE协议边界解析事件，最后根据不同类型的消息进行渲染 更新UI。

##### 常见问题
1. 每个chunk都是完整的JSON吗：
不一定。底层网络传输时是按字节流切分，一个chunk可能是一条消息的一部分，所以不能把底层chunk直接当成完整JSON解析。
所以应该先做流式解码，再按SSE消息边界拆分，对完整的data做JSON parse

2. 中断SSE
如果是fetch + ReadableStream，一般配合AbortController，如果是EventSource，可以调用Close（）。

3. 如何实现打字机效果：
如果追求最低延迟，可以按 流 的到达速度直接渲染，如果有更平滑的打字机效果，可以加一层buffer，把内容先缓存，在用setInterval或者raf来渲染。把模型返回节奏和ui渲染节奏解耦。

4. 心跳的意义：
心跳指的是 服务器定时向客户端发送消息，防止中间件超时断开空闲连接。
- 防止浏览器或网络中间件（代理、负载均衡、Nginx）断开空闲连接
    很多网络设备或服务器（如 Nginx、AWS ALB）对 HTTP 长连接有 空闲超时 设置（默认 60-120 秒）。
    如果 SSE 长时间不发送任何数据，中间件会认为连接已“死掉”，主动断开。
    心跳通过定期发送一条小数据（比如每隔 30 秒），让连接始终有流量，从而保持长连接。

- 检测客户端是否意外断开（客户端重连机制）
    浏览器原生 EventSource 会在连接异常断开后自动尝试重连。
    但如果服务端不知道客户端已断开（比如客户端网络闪断），服务端可能还在持续往一个死连接上写数据，造成资源浪费。
    通过心跳，服务端可以定期检查写入是否失败（如 res.write 报错），一旦失败就停止发送数据并清理资源。

- 提供一种“连接存活”的证据，便于监控
    有些业务场景需要知道当前在线客户端数量。心跳消息可以用来统计活跃连接。
    如果服务端超过 N 个心跳周期没收到客户端任何反馈（SSE 是单向的，但可以通过另外的 HTTP 请求上报客户端时间戳），可以判定客户端已失联。

常见的设置30s，不能超过网关的超时时间。

### 5. 中间件机制
中间件的本质是 一组按顺序执行的函数，它可以在请求到达服务端前和客户端接收到最终响应前执行一些操作，使之可以进行一些通用的操作，比如说修改响应，修改请求，处理错误，日志记录等操作。每个中间件都有机会查看或修改传入的请求对象以及传出的响应对象。
中间件的创建方式主要有两种：
- 在 main.ts 中使用 app.use 创建一个函数中间件，作用全局，但不支持依赖注入；
- 使用命令创建中间件类，在模块中调用，可以设置应用范围，更灵活，且支持依赖注入。

在编写中间件时，运行到了next（）就会执行下一个中间件，这里的「下一个」指的是**按照注册顺序紧邻的下一个函数**

而且在使用时，我们可以配置路由/controller，特定路由/controller下的请求/响应走中间件 实现特定的中间件编写。

## 十四、前端相关

### 1. 微前端 和 模块联邦
- 微前端 指的是 将一个巨石项目拆分成一个主项目和多个子项目，各个子项目的开发过程其实是独立的，互不干扰的。在发布部署时，也应该是独立互不干扰的的，而**如何实现独立，其实也是微前端最大的挑战。**
- 模块联邦更多的是，项目B想用到项目A中的一个 组件【模块】，不去通过拷贝A的源码到B的项目，而是直接共享项目A的模块使各个项目可以一起使用的一种技术手段。而也由此，模块联邦其实并没有微前端那种强隔离的特性，因为对于A的模块被B使用时，要保证依赖版本是不冲突的，尽可能减少上下文差异造成的问题

#### 1.1 微前端 如何保证子应用的互不干扰
这里最重要的就是做到 **沙箱隔离** 有JS隔离、css隔离、dom隔离、路由隔离。重点介绍JS/CSS的隔离

1. JS隔离：

- 快照沙箱：激活子应用时记录当前 window 所有属性，卸载时恢复。很显然 无法同时激活多个子应用。
- 代理沙箱：利用了ES6的proxy特性。为每个子应用创建一个 fakeWindow，用 Proxy 拦截对 window 的读写。子应用实际读写的是 fakeWindow。
- iframe：作为HTML元素有独立的window、文档流，完全隔离，但也因此，带来了很大的通信困难，每个iframe都是独立的上下文，可能还会带来性能开销，同时样式融合困难，比如弹窗无法跳出iframe边界。

2. CSS隔离：
- 动态样式表：加载子应用时将其 CSS 文本插入到 `<style>` 标签，卸载时移除。 /qiankun采用的方案
- shadow DOM： 将子应用挂载在一个 Shadow Root 内，内部样式完全隔离，但外部样式也难以侵入
- CSS Module / Scoped CSS： 由构建工具为每个类名添加唯一前缀（如 `_app123__btn`）

**shadowDOM**
是 Web Components 规范的核心技术之一，它允许你将一个隐藏的、独立的 DOM 树附加到一个常规 DOM 元素上，这颗隐藏的 DOM 树与主文档的 DOM 树相互隔离，内部的样式、脚本、结构不会影响到外部，外部的样式也默认无法穿透到内部。
比如我们使用input，它其实有内部的很多样式，我们无法直接访问到内部的滑块等相关样式就是浏览器用shadowDOM实现了这些细节。

shadowDOM和css隔离的关系： 微前端框架将子应用封装到shadowDOM中，因此外部无法访问【外部 CSS 选择器无法影响 Shadow DOM 内部的元素】，子应用间也不会影响。除非使用shadowRoot访问/修改。 [wujie的CSS隔离使用的方案。]

#### 1.2 wujie / qiankun
wujie： wujie的核心技术是iframe + proxy 【JS隔离】 和 Shadow Dom【CSS隔离】
qiankun： 基于single-spa，采用proxy【JS隔离】和scoped css【CSS隔离】。这里single-spa起到了监听路由，调度生命周期的统筹功能。

JS隔离具体实现
[wujie] 利用了iframe的原生JS隔离能力。而对dom的操作，又通过proxy代理到了shadow DOM中。{{ 如何解决iframe的通信缺陷？/ EventBus + props，子主应用可以通信？？ }}
通过 Proxy 将 iframe 内的 DOM 操作代理到主应用的 Shadow DOM 上，实现 UI 的同步渲染。
[qiankun]： 在多实例模式下 -- 利用proxy代理，实现了代理沙箱，可以隔离JS执行的上下文，创建了fakeWindow进行代理。 单实例模式下 -- 直接使用了快照沙箱。 

CSS隔离具体实现
[wujie]: 通过shadowDOM， 子应用的样式不会受到外部CSS选择器的影响
[qiankun]: 通过 scopedcss + 动态样式【默认】。子应用的样式只会在当前的子应用生效，不会影响到其他的应用。scopedcss和shadowDOM都可选但需要自主配置。

通信机制
[wujie] {{ 如何解决iframe的通信缺陷？/ EventBus + props，子主应用可以双向通信 }}
[qiankun] 通过 props 和 全局状态（initGlobalState）。qiankun的子应用通信其实是需要通过自建总线 / 主应用中转。

**选择 Qiankun 的场景**

umi 项目，需要深度集成
团队熟悉 single-spa 生态
对隔离要求不极致，接受 Proxy 方案
需要成熟稳定的解决方案
子应用可以配合改造

**选择 Wujie 的场景**

需要极致的 JS 隔离能力
子应用改造成本要求低
需要保活模式（频繁切换场景）
需要丰富的插件扩展能力
需要路由同步到 URL


#### 1.2 模块联邦通常可以如何使用

是 Webpack 5 引入的一种运行时模块共享机制，它允许多个独立构建的应用在浏览器中动态加载对方暴露的模块，实现真正的去中心化共享‘
> 模块联邦是 Webpack 5 的运行时模块共享机制。提供方通过 exposes 暴露模块并生成 remoteEntry.js；消费方通过 remotes 配置远程地址，并用动态 import 加载。双方通过 shared 共享公共依赖，避免重复打包和版本冲突。

提供方需要在webpack配置中主动暴露出来要共享的模块
使用方需要配置好 要使用的模块远程地址。在代码中实现动态导入。

### 2. 
