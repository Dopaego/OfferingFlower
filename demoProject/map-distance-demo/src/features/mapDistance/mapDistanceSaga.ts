/**
 * mapDistanceSaga.ts
 *
 * 当前 demo 已改造为"多段折线 + 多边形面积"纯前端交互，
 * 所有距离/面积均在客户端用 Haversine / 球面 Shoelace 计算，无须异步接口。
 * 此 Saga 保留为空骨架，便于后续接入服务端路径距离 API 时扩展。
 */
import { all } from 'redux-saga/effects';

/** Root Saga：当前无 worker，可后续在此挂载 takeLatest */
export function* mapDistanceSaga() {
  yield all([]);
}