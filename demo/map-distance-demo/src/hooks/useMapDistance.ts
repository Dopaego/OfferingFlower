/**
 * useMapDistance.ts
 *
 * 百度地图 BMapGL —— 多段折线测距 + 闭合多边形面积测量 核心 Hook。
 *
 * 交互流程：
 *  1) 用户左击地图：
 *     - 若尚未开始 → 记录首点。
 *     - 若已开始未闭合 → 追加点，绘制相邻两点连线 + 距离标签。
 *     - 若已 ≥3 点且当前光标处于"首点像素阈值"内 → 完成闭合，生成多边形 + 面积标签。
 *     - 若已闭合 → 重置，开启新一轮测量。
 *  2) 用户移动鼠标（已设置至少一个点且未闭合）：
 *     - 橡皮筋虚线：最后一个点 ↔ 当前光标，并显示实时距离。
 *     - 当 ≥3 点且光标像素距离首点 ≤ 阈值时：橡皮筋吸附到首点，首点高亮放大。
 *  3) 右键：清空全部测量。
 *
 * 距离计算：Haversine 球面公式（BD-09 与 WGS-84 在测距尺度下偏移可忽略）。
 * 面积计算：球面多边形面积（Shoelace on a sphere），单位 m²。
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';

import {
  setError,
  appendPoint,
  updateCursor,
  finishShape,
  cancelCurrent,
  resetMeasure,
  Coordinate,
} from '../features/mapDistance/mapDistanceSlice';

/* ---------- BMapGL 全局声明 ---------- */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BMapGLNS = any;
declare global {
  interface Window {
    BMapGL?: BMapGLNS;
    initBMap?: () => void;
    __BMAP_LOADED__?: boolean;
  }
}

/** 闭合吸附像素阈值 */
const SNAP_PIXEL_THRESHOLD = 10;

/**
 * 多边形配色调色板（HSL 取色，确保饱和度/亮度一致，颜色彼此区分明显）。
 * 第 N 个完成的多边形使用 PALETTE[N % PALETTE.length] 的颜色。
 */
const PALETTE: string[] = [
  '#1677ff', // 蓝
  '#fa8c16', // 橙
  '#52c41a', // 绿
  '#722ed1', // 紫
  '#eb2f96', // 粉
  '#13c2c2', // 青
  '#faad14', // 金
  '#f5222d', // 赤
  '#2f54eb', // 靛
  '#a0d911', // 黄绿
];

/** 根据已完成的形状数量取下一个颜色 */
function pickColorByIndex(index: number): string {
  return PALETTE[index % PALETTE.length];
}

/* ===================== 工具函数 ===================== */

function getBMapGLReady(): BMapGLNS | null {
  if (typeof window === 'undefined') return null;
  const B = window.BMapGL;
  if (!B || typeof B.Map !== 'function' || typeof B.Point !== 'function') return null;
  return B;
}

function normalizeErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err) return err;
  return '百度地图 SDK 初始化失败';
}

function waitForBMapGL(timeoutMs = 15000): Promise<BMapGLNS> {
  return new Promise((resolve, reject) => {
    const ready = getBMapGLReady();
    if (ready) return resolve(ready);
    let settled = false;
    const cleanup = () => {
      settled = true;
      window.clearTimeout(timer);
      window.clearInterval(poller);
      window.removeEventListener('bmap-loaded', handler);
    };
    const handler = () => {
      if (settled) return;
      const r = getBMapGLReady();
      if (r) { cleanup(); resolve(r); }
    };
    window.addEventListener('bmap-loaded', handler);
    const poller = window.setInterval(() => {
      if (settled) return;
      if (window.__BMAP_LOADED__ || getBMapGLReady()) handler();
    }, 50);
    const timer = window.setTimeout(() => {
      if (settled) return;
      cleanup();
      reject(new Error('百度地图 SDK 加载超时：请检查网络，或在 public/index.html 配置可用的 AK'));
    }, timeoutMs);
  });
}

/**
 * 归一化 BMapGL 事件坐标 → BD-09 经纬度。
 * 兼容 v1.0 WebGL 在部分管线下 e.point 返回墨卡托米坐标的问题。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeEventPoint(map: any, e: any): { lng: number; lat: number } {
  const ep = e?.point;
  const lng = ep?.lng;
  const lat = ep?.lat;
  if (typeof lng === 'number' && typeof lat === 'number' &&
      Math.abs(lng) <= 180 && Math.abs(lat) <= 90) {
    return { lng, lat };
  }
  if (e?.pixel && typeof map.pixelToPoint === 'function') {
    try {
      const p = map.pixelToPoint(e.pixel);
      if (p && Math.abs(p.lng) <= 180 && Math.abs(p.lat) <= 90) {
        return { lng: p.lng, lat: p.lat };
      }
    } catch { /* ignore */ }
  }
  if (typeof lng === 'number' && typeof lat === 'number') {
    const R = 6378137;
    const llng = (lng / R) * (180 / Math.PI);
    const llat = (Math.atan(Math.exp(lat / R)) * 2 - Math.PI / 2) * (180 / Math.PI);
    if (Math.abs(llng) <= 180 && Math.abs(llat) <= 90) return { lng: llng, lat: llat };
  }
  return { lng: 0, lat: 0 };
}

/** Haversine 距离（米） */
function haversineDistance(a: Coordinate, b: Coordinate): number {
  const R = 6378137;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/**
 * 球面多边形面积（米²），使用经典 spherical excess 公式：
 *   A = | Σ (λ_{i+1} - λ_i) · (2 + sinφ_i + sinφ_{i+1}) | · R² / 2
 * 适用于 BD-09 / WGS-84 在常见缩放级别下的精度需求。
 */
function sphericalPolygonArea(points: Coordinate[]): number {
  if (points.length < 3) return 0;
  const R = 6378137;
  const toRad = (d: number) => (d * Math.PI) / 180;
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    total += (toRad(p2.lng) - toRad(p1.lng)) *
             (2 + Math.sin(toRad(p1.lat)) + Math.sin(toRad(p2.lat)));
  }
  return Math.abs(total * R * R / 2);
}

/** 简单几何中心（经纬度平面下平均），用作面积标签位置 */
function centroid(points: Coordinate[]): Coordinate {
  const n = points.length;
  let lng = 0, lat = 0;
  for (const p of points) { lng += p.lng; lat += p.lat; }
  return { lng: lng / n, lat: lat / n };
}

/** 距离格式化 */
export function formatDistance(meters: number): string {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(2)} km`
    : `${Math.round(meters)} m`;
}

/** 面积格式化（自动 m² / km²） */
export function formatArea(squareMeters: number): string {
  if (squareMeters >= 1_000_000) {
    return `${(squareMeters / 1_000_000).toFixed(3)} km²`;
  }
  if (squareMeters >= 10_000) {
    return `${(squareMeters / 10_000).toFixed(2)} 公顷`;
  }
  return `${Math.round(squareMeters)} m²`;
}

/* ===================== Hook ===================== */

interface UseMapDistanceOptions {
  mapTargetId: string;
  center?: [number, number];
  zoom?: number;
  /** 闭合吸附像素阈值，默认 10 */
  snapThreshold?: number;
}

export function useMapDistance({
  mapTargetId,
  center = [116.4074, 39.9042],
  zoom = 13,
  snapThreshold = SNAP_PIXEL_THRESHOLD,
}: UseMapDistanceOptions) {
  const dispatch = useDispatch();

  // ---- 地图与覆盖物引用 ----
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);

  /* ====== 当前正在绘制的草稿覆盖物（每次闭合 / 取消都会清理） ====== */
  // 当前已确认顶点
  const pointsRef = useRef<Coordinate[]>([]);
  // 当前正在绘制的图形分配到的代表色
  const currentColorRef = useRef<string>(PALETTE[0]);
  // 顶点 Marker / 段线 / 段距离标签
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vertexMarkersRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const segmentLinesRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const segmentLabelsRef = useRef<any[]>([]);
  // 橡皮筋虚线 & 距离标签
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rubberLineRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rubberLabelRef = useRef<any>(null);

  /* ====== 历史归档：每个已完成多边形持有自己的一组覆盖物 ====== */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const completedOverlaysRef = useRef<any[][]>([]);
  // 已完成多边形数量（用于分配下一个颜色，独立于 redux 来源以避免闭包过期）
  const completedCountRef = useRef<number>(0);

  // 鼠标移动节流
  const lastMoveTimeRef = useRef<number>(0);

  const [ready, setReady] = useState(false);

  /** 创建顶点 Marker（首点更大、用图形主色；其他点也用主色但更小） */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createVertexMarker = useCallback(
    (BMapGL: any, p: Coordinate, isFirst: boolean, color: string) => {
      const r = isFirst ? 8 : 6;
      const size = r * 2 + 4;
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>
        <circle cx='${size / 2}' cy='${size / 2}' r='${r}' fill='${color}' stroke='#fff' stroke-width='2'/>
      </svg>`;
      const icon = new BMapGL.Icon(
        `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
        new BMapGL.Size(size, size),
        { anchor: new BMapGL.Size(size / 2, size / 2) },
      );
      return new BMapGL.Marker(new BMapGL.Point(p.lng, p.lat), { icon });
    },
    [],
  );

  /**
   * 把 hex 颜色（如 #1677ff）转成 rgba 字符串。
   * 用于多边形标签、蒙层等需要半透明效果的场景。
   */
  const hexToRgba = useCallback((hex: string, alpha: number): string => {
    const m = hex.replace('#', '');
    const full = m.length === 3
      ? m.split('').map((c) => c + c).join('')
      : m;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }, []);

  /** 创建距离/面积/橡皮筋通用样式标签，颜色随 shape 主色 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createInfoLabel = useCallback(
    (
      BMapGL: any,
      p: Coordinate,
      text: string,
      kind: 'distance' | 'rubber' | 'area',
      shapeColor: string,
    ) => {
      const label = new BMapGL.Label(text, {
        position: new BMapGL.Point(p.lng, p.lat),
        offset: new BMapGL.Size(10, -10),
      });
      // 不同种类用不同透明度，但都基于 shape 主色，保证视觉关联
      const bg =
        kind === 'rubber'
          ? 'rgba(0,0,0,0.65)' // 橡皮筋用中性深色，不随主色变化（防止与已有图形混淆）
          : kind === 'area'
            ? hexToRgba(shapeColor, 0.92)
            : hexToRgba(shapeColor, 0.88);
      label.setStyle({
        background: bg,
        color: '#fff',
        border: 'none',
        padding: '3px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '500',
        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      });
      return label;
    },
    [hexToRgba],
  );

  /** 移除橡皮筋（虚线 + 临时距离标签） */
  const removeRubber = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (rubberLineRef.current) { map.removeOverlay(rubberLineRef.current); rubberLineRef.current = null; }
    if (rubberLabelRef.current) { map.removeOverlay(rubberLabelRef.current); rubberLabelRef.current = null; }
  }, []);

  /**
   * 仅清空"当前正在绘制"的草稿覆盖物（顶点、连线、距离标签、橡皮筋）。
   * 不影响已完成的多边形归档。
   */
  const clearCurrent = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    vertexMarkersRef.current.forEach((m) => map.removeOverlay(m));
    segmentLinesRef.current.forEach((l) => map.removeOverlay(l));
    segmentLabelsRef.current.forEach((l) => map.removeOverlay(l));
    removeRubber();

    vertexMarkersRef.current = [];
    segmentLinesRef.current = [];
    segmentLabelsRef.current = [];
    pointsRef.current = [];
    dispatch(cancelCurrent());
  }, [dispatch, removeRubber]);

  /**
   * 清空地图上的全部覆盖物（包括所有已完成的多边形 + 当前草稿）。
   * 同时重置 redux 历史归档。
   */
  const clearAll = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    // 历史归档覆盖物
    completedOverlaysRef.current.forEach((group) => {
      group.forEach((ov) => map.removeOverlay(ov));
    });
    completedOverlaysRef.current = [];
    completedCountRef.current = 0;
    // 当前草稿
    vertexMarkersRef.current.forEach((m) => map.removeOverlay(m));
    segmentLinesRef.current.forEach((l) => map.removeOverlay(l));
    segmentLabelsRef.current.forEach((l) => map.removeOverlay(l));
    removeRubber();
    vertexMarkersRef.current = [];
    segmentLinesRef.current = [];
    segmentLabelsRef.current = [];
    pointsRef.current = [];
    dispatch(resetMeasure());
  }, [dispatch, removeRubber]);

  /** 对外保留旧 API 名（用于现有按钮 onClick），等价于 clearAll */
  const clearMeasure = clearAll;

  /** 首点高亮（吸附态）：替换为更大圆点 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setFirstPointHighlight = useCallback((BMapGL: any, highlight: boolean) => {
    const first = pointsRef.current[0];
    const old = vertexMarkersRef.current[0];
    if (!first || !old) return;
    const desiredRadius = highlight ? 11 : 8;
    if (old.__radius === desiredRadius) return;

    const color = currentColorRef.current;
    const r = desiredRadius;
    const size = r * 2 + 6;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>
      ${highlight ? `<circle cx='${size / 2}' cy='${size / 2}' r='${r + 3}' fill='${color}' fill-opacity='0.25'/>` : ''}
      <circle cx='${size / 2}' cy='${size / 2}' r='${r}' fill='${color}' stroke='#fff' stroke-width='2'/>
    </svg>`;
    const icon = new BMapGL.Icon(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
      new BMapGL.Size(size, size),
      { anchor: new BMapGL.Size(size / 2, size / 2) },
    );
    if (typeof old.setIcon === 'function') {
      old.setIcon(icon);
      old.__radius = desiredRadius;
    }
  }, []);

  /* ===================== 主初始化 ===================== */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        dispatch(setError(null));
        const BMapGL = await waitForBMapGL();
        if (cancelled || mapRef.current) return;

        const map = new BMapGL.Map(mapTargetId);
        map.centerAndZoom(new BMapGL.Point(center[0], center[1]), zoom);
        map.enableScrollWheelZoom(true);
        if (typeof map.setDefaultCursor === 'function') map.setDefaultCursor('crosshair');
        if (typeof map.setDraggingCursor === 'function') map.setDraggingCursor('grabbing');
        mapRef.current = map;
        setReady(true);

        /* 判断光标是否处于"首点吸附"范围（屏幕像素距离 ≤ 阈值） */
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const isNearFirstPoint = (cursorPixel: any): boolean => {
          if (pointsRef.current.length < 3) return false;
          const first = pointsRef.current[0];
          if (typeof map.pointToPixel !== 'function') return false;
          const fp = map.pointToPixel(new BMapGL.Point(first.lng, first.lat));
          if (!fp || !cursorPixel) return false;
          const dx = fp.x - cursorPixel.x;
          const dy = fp.y - cursorPixel.y;
          return Math.sqrt(dx * dx + dy * dy) <= snapThreshold;
        };

        /* 追加一个顶点（含连线、距离标签、redux 同步） */
        const addVertex = (p: Coordinate) => {
          const isFirst = pointsRef.current.length === 0;

          // 首点时为本次绘制分配新颜色（按"已完成数量"递推）
          if (isFirst) {
            currentColorRef.current = pickColorByIndex(completedCountRef.current);
          }
          const color = currentColorRef.current;

          const marker = createVertexMarker(BMapGL, p, isFirst, color);
          if (isFirst) (marker as { __radius?: number }).__radius = 8;
          vertexMarkersRef.current.push(marker);
          map.addOverlay(marker);

          let segmentDistance: number | null = null;
          if (!isFirst) {
            const prev = pointsRef.current[pointsRef.current.length - 1];
            segmentDistance = haversineDistance(prev, p);

            const line = new BMapGL.Polyline(
              [new BMapGL.Point(prev.lng, prev.lat), new BMapGL.Point(p.lng, p.lat)],
              { strokeColor: color, strokeWeight: 4, strokeOpacity: 0.9 },
            );
            segmentLinesRef.current.push(line);
            map.addOverlay(line);

            const mid: Coordinate = {
              lng: (prev.lng + p.lng) / 2,
              lat: (prev.lat + p.lat) / 2,
            };
            const label = createInfoLabel(BMapGL, mid, formatDistance(segmentDistance), 'distance', color);
            segmentLabelsRef.current.push(label);
            map.addOverlay(label);
          }

          pointsRef.current.push(p);
          dispatch(appendPoint({
            point: p,
            segmentDistance,
            colorIfFirst: isFirst ? color : undefined,
          }));
        };

        /*
         * 完成闭合：补闭合线 + 生成多边形蒙层 + 面积标签
         * 完成后把"当前草稿"覆盖物原地"晋升"为历史归档（不重绘，避免闪烁），
         * 然后清空 currentRef 等草稿引用，准备下一次绘制。
         */
        const finishClose = () => {
          if (pointsRef.current.length < 3) return;
          const pts = pointsRef.current;
          const first = pts[0];
          const last = pts[pts.length - 1];
          const color = currentColorRef.current;

          // 1) 闭合线段
          const closingDist = haversineDistance(last, first);
          const closingLine = new BMapGL.Polyline(
            [new BMapGL.Point(last.lng, last.lat), new BMapGL.Point(first.lng, first.lat)],
            { strokeColor: color, strokeWeight: 4, strokeOpacity: 0.9 },
          );
          segmentLinesRef.current.push(closingLine);
          map.addOverlay(closingLine);

          // 2) 闭合段距离标签
          const midC: Coordinate = {
            lng: (last.lng + first.lng) / 2,
            lat: (last.lat + first.lat) / 2,
          };
          const closingLabel = createInfoLabel(BMapGL, midC, formatDistance(closingDist), 'distance', color);
          segmentLabelsRef.current.push(closingLabel);
          map.addOverlay(closingLabel);

          // 3) 多边形蒙层（半透明填充）
          const polygon = new BMapGL.Polygon(
            pts.map((pt) => new BMapGL.Point(pt.lng, pt.lat)),
            {
              strokeColor: color,
              strokeWeight: 2,
              strokeOpacity: 0.9,
              fillColor: color,
              fillOpacity: 0.3,
            },
          );
          map.addOverlay(polygon);

          // 4) 面积 + 质心标签
          const area = sphericalPolygonArea(pts);
          const c = centroid(pts);
          const areaLabel = createInfoLabel(
            BMapGL,
            c,
            `#${completedCountRef.current + 1} · ${formatArea(area)}`,
            'area',
            color,
          );
          map.addOverlay(areaLabel);

          // 5) 移除橡皮筋（不要清掉顶点/段线，它们要归档保留）
          removeRubber();

          // 6) 把"当前草稿"全部覆盖物收编进 completedOverlaysRef，作为本次多边形的归档
          const archived = [
            ...vertexMarkersRef.current,
            ...segmentLinesRef.current,
            ...segmentLabelsRef.current,
            polygon,
            areaLabel,
          ];
          completedOverlaysRef.current.push(archived);
          completedCountRef.current += 1;

          // 7) 清空 current 草稿引用（覆盖物已"过户"到归档，不需要从地图移除）
          vertexMarkersRef.current = [];
          segmentLinesRef.current = [];
          segmentLabelsRef.current = [];
          pointsRef.current = [];

          // 8) 同步 redux：归档当前 shape，状态机回到"待开始下一段"
          dispatch(finishShape({ closingSegmentDistance: closingDist, area }));
        };

        /* ---------- 事件：左击 ---------- */
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.addEventListener('click', (e: any) => {
          const ll = normalizeEventPoint(map, e);

          // ≥3 点 & 光标在首点附近 → 闭合当前图形
          if (pointsRef.current.length >= 3 && isNearFirstPoint(e.pixel)) {
            finishClose();
            return;
          }

          // 否则追加新顶点（如果当前 pointsRef 为空，说明开始新一段绘制）
          addVertex(ll);
        });

        /* ---------- 事件：鼠标移动（橡皮筋 + 闭合提示） ---------- */
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.addEventListener('mousemove', (e: any) => {
          if (pointsRef.current.length === 0) return;

          const now = performance.now();
          if (now - lastMoveTimeRef.current < 16) return;
          lastMoveTimeRef.current = now;

          const ll = normalizeEventPoint(map, e);
          const near = isNearFirstPoint(e.pixel);
          const color = currentColorRef.current;

          const last = pointsRef.current[pointsRef.current.length - 1];
          const first = pointsRef.current[0];
          const target: Coordinate = near ? first : ll;
          const dist = haversineDistance(last, target);

          if (pointsRef.current.length >= 3) {
            setFirstPointHighlight(BMapGL, near);
          }

          const pathPoints = [
            new BMapGL.Point(last.lng, last.lat),
            new BMapGL.Point(target.lng, target.lat),
          ];

          // 更新或重建橡皮筋虚线
          if (rubberLineRef.current) {
            let updated = false;
            if (typeof rubberLineRef.current.setPath === 'function') {
              try { rubberLineRef.current.setPath(pathPoints); updated = true; } catch { updated = false; }
            }
            if (!updated || (rubberLineRef.current.__near !== near)) {
              map.removeOverlay(rubberLineRef.current);
              rubberLineRef.current = null;
            }
          }
          if (!rubberLineRef.current) {
            const line = new BMapGL.Polyline(pathPoints, {
              strokeColor: near ? '#ff4d4f' : color,
              strokeWeight: 3,
              strokeOpacity: 0.85,
              strokeStyle: 'dashed',
            });
            (line as { __near?: boolean }).__near = near;
            rubberLineRef.current = line;
            map.addOverlay(line);
          }

          const text = near ? `点击闭合 · ${formatDistance(dist)}` : formatDistance(dist);
          if (rubberLabelRef.current) {
            rubberLabelRef.current.setPosition(new BMapGL.Point(target.lng, target.lat));
            rubberLabelRef.current.setContent(text);
          } else {
            const label = createInfoLabel(BMapGL, target, text, 'rubber', color);
            rubberLabelRef.current = label;
            map.addOverlay(label);
          }

          dispatch(updateCursor({ point: ll, distance: dist, nearFirstPoint: near }));
        });

        /* ---------- 事件：右键 ---------- */
        // 右键策略：若当前正在绘制 → 仅取消当前草稿；否则 → 清空全部历史
        map.addEventListener('rightclick', () => {
          if (pointsRef.current.length > 0) {
            clearCurrent();
          } else {
            clearAll();
          }
        });

        const container: HTMLElement | null = map.getContainer
          ? map.getContainer()
          : document.getElementById(mapTargetId);
        const onContextMenu = (ev: MouseEvent) => ev.preventDefault();
        container?.addEventListener('contextmenu', onContextMenu);

        (map as { __cleanup?: () => void }).__cleanup = () => {
          container?.removeEventListener('contextmenu', onContextMenu);
        };
      } catch (err) {
        if (cancelled) return;
        dispatch(setError(normalizeErrorMessage(err)));
        setReady(false);
      }
    })();

    return () => {
      cancelled = true;
      const map = mapRef.current;
      if (map) {
        (map as { __cleanup?: () => void }).__cleanup?.();
        map.clearOverlays?.();
      }
      mapRef.current = null;
      vertexMarkersRef.current = [];
      segmentLinesRef.current = [];
      segmentLabelsRef.current = [];
      rubberLineRef.current = null;
      rubberLabelRef.current = null;
      completedOverlaysRef.current = [];
      completedCountRef.current = 0;
      pointsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { clearMeasure, clearCurrent, clearAll, ready };
}
