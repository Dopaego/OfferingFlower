import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Coordinate {
  lng: number;
  lat: number;
}

/** 一个已闭合完成的多边形（用于历史归档） */
export interface CompletedShape {
  /** 自增 ID */
  id: number;
  /** 顶点序列 */
  points: Coordinate[];
  /** 周长（米） */
  perimeter: number;
  /** 面积（米²） */
  area: number;
  /** 该图形的代表色（CSS 颜色字符串） */
  color: string;
}

export interface MapDistanceState {
  /* ============ 当前正在绘制的图形 ============ */
  /** 当前折线 / 多边形的已确认顶点 */
  points: Coordinate[];
  /** 当前每段已确认距离（米） */
  segmentDistances: number[];
  /** 当前已确认周长（米） */
  totalDistance: number;
  /** 橡皮筋：光标位置 */
  currentPoint: Coordinate | null;
  /** 橡皮筋：光标 ↔ 最后一个点的距离（米） */
  cursorDistance: number | null;
  /** 是否处于"光标靠近首点可闭合"提示态 */
  nearFirstPoint: boolean;
  /** 当前正在绘制的图形是否处于绘制中（已有 ≥1 点且未闭合） */
  measuring: boolean;
  /** 当前正在绘制的图形分配到的颜色（点击首个点时确定） */
  currentColor: string | null;

  /* ============ 已完成图形归档 ============ */
  /** 已闭合完成的多边形列表（按完成顺序） */
  completedShapes: CompletedShape[];
  /** 下一个分配的 shape id */
  nextShapeId: number;

  /* ============ 其他 ============ */
  loading: boolean;
  error: string | null;
}

const initialState: MapDistanceState = {
  points: [],
  segmentDistances: [],
  totalDistance: 0,
  currentPoint: null,
  cursorDistance: null,
  nearFirstPoint: false,
  measuring: false,
  currentColor: null,

  completedShapes: [],
  nextShapeId: 1,

  loading: false,
  error: null,
};

/** 内部：把"当前正在绘制"相关字段重置回初值（不影响历史归档） */
function resetCurrent(state: MapDistanceState) {
  state.points = [];
  state.segmentDistances = [];
  state.totalDistance = 0;
  state.currentPoint = null;
  state.cursorDistance = null;
  state.nearFirstPoint = false;
  state.measuring = false;
  state.currentColor = null;
}

const mapDistanceSlice = createSlice({
  name: 'mapDistance',
  initialState,
  reducers: {
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.loading = false;
    },
    /** 追加一个顶点；首点时同时确定本次绘制的代表色 */
    appendPoint(
      state,
      action: PayloadAction<{
        point: Coordinate;
        segmentDistance: number | null;
        /** 仅在首点时传入：本次图形的代表色 */
        colorIfFirst?: string;
      }>,
    ) {
      const { point, segmentDistance, colorIfFirst } = action.payload;
      if (state.points.length === 0 && colorIfFirst) {
        state.currentColor = colorIfFirst;
      }
      state.points.push(point);
      if (segmentDistance !== null) {
        state.segmentDistances.push(segmentDistance);
        state.totalDistance += segmentDistance;
      }
      state.measuring = true;
      state.error = null;
    },
    /** 鼠标移动时更新橡皮筋状态 */
    updateCursor(
      state,
      action: PayloadAction<{
        point: Coordinate;
        distance: number | null;
        nearFirstPoint: boolean;
      }>,
    ) {
      state.currentPoint = action.payload.point;
      state.cursorDistance = action.payload.distance;
      state.nearFirstPoint = action.payload.nearFirstPoint;
    },
    /** 闭合当前图形：归档到 completedShapes，并清空"当前绘制"状态 */
    finishShape(
      state,
      action: PayloadAction<{ closingSegmentDistance: number; area: number }>,
    ) {
      const perimeter = state.totalDistance + action.payload.closingSegmentDistance;
      const color = state.currentColor || '#1677ff';
      state.completedShapes.push({
        id: state.nextShapeId,
        points: [...state.points],
        perimeter,
        area: action.payload.area,
        color,
      });
      state.nextShapeId += 1;
      resetCurrent(state);
    },
    /** 仅清空"当前正在绘制"的草稿，不影响历史归档 */
    cancelCurrent(state) {
      resetCurrent(state);
      state.error = null;
    },
    /** 全部清空（当前 + 历史归档） */
    resetMeasure() {
      return { ...initialState };
    },
  },
});

export const {
  setError,
  appendPoint,
  updateCursor,
  finishShape,
  cancelCurrent,
  resetMeasure,
} = mapDistanceSlice.actions;

export default mapDistanceSlice.reducer;