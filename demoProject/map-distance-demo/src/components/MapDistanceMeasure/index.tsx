/**
 * MapDistanceMeasure/index.tsx
 *
 * 地图选点测距 + 多边形面积测量演示（百度地图 BMapGL 版）
 * - 多段折线：左击逐点添加，相邻点连线并标注真实距离
 * - 闭合多边形：光标靠近首点（≤10px）时点击闭合，生成蒙层和面积标签
 * - 多个多边形：闭合后会自动归档，按颜色顺序为下一段绘制分配新色，历史图形持续保留在地图上
 * - 橡皮筋：未闭合时光标与最后一个点保持实时连线 + 距离
 * - 右键：当前正在绘制 → 仅取消当前草稿；空闲 → 清空全部历史
 */
import React from 'react';
import { useSelector } from 'react-redux';
import { Button, Card, Tag, Tooltip, Spin, Typography, Space, Divider } from 'antd';
import {
  AimOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  EnvironmentOutlined,
  BorderOutlined,
} from '@ant-design/icons';

import type { RootState } from '../../store';
import { useMapDistance, formatDistance, formatArea } from '../../hooks/useMapDistance';

import styles from './index.module.scss';

const { Text } = Typography;

const MAP_ID = 'bmap-distance-demo';

const MapDistanceMeasure: React.FC = () => {
  // ---- Redux State ----
  const {
    points,
    totalDistance,
    cursorDistance,
    nearFirstPoint,
    currentColor,
    completedShapes,
    measuring,
    loading,
    error,
  } = useSelector((state: RootState) => state.mapDistance);

  // ---- 百度地图核心 Hook ----
  const { clearCurrent, clearAll, ready } = useMapDistance({
    mapTargetId: MAP_ID,
    center: [116.4074, 39.9042],
    zoom: 13,
  });

  const firstPoint = points[0];
  const hasHistory = completedShapes.length > 0;

  return (
    <Card
      title={
        <Space>
          <AimOutlined />
          <span>地图多边形测量（百度地图 BMapGL）</span>
          <Tooltip title="左击逐点添加；回到首点附近点击闭合；闭合后可继续画下一个多边形，历史图形按颜色区分保留">
            <InfoCircleOutlined style={{ color: '#8c8c8c', cursor: 'pointer' }} />
          </Tooltip>
        </Space>
      }
      extra={
        <Space>
          <Button
            icon={<CloseCircleOutlined />}
            size="small"
            disabled={!measuring}
            onClick={clearCurrent}
            data-testid="btn-cancel-current"
          >
            取消当前
          </Button>
          <Button
            icon={<DeleteOutlined />}
            size="small"
            danger
            disabled={!measuring && !hasHistory}
            onClick={clearAll}
            data-testid="btn-clear-all"
          >
            清空全部
          </Button>
        </Space>
      }
      className={styles.card}
      data-testid="map-distance-card"
    >
      {/* ---- 状态信息栏 ---- */}
      <div className={styles.statusBar} data-testid="status-bar">
        {!measuring && !hasHistory && !error && (
          <Text type="secondary">
            <EnvironmentOutlined /> 请单击地图开始绘制；闭合后可继续画下一个多边形（自动用新颜色）
          </Text>
        )}
        {!measuring && !hasHistory && error && <Tag color="error">{error}</Tag>}

        {/* 正在绘制的当前段信息 */}
        {measuring && firstPoint && (
          <Space wrap>
            <Tag
              color="processing"
              icon={
                <span
                  className={styles.colorDot}
                  style={{ background: currentColor || '#1677ff' }}
                />
              }
              data-testid="tag-current-color"
            >
              当前绘制 · 已选 {points.length} 点
            </Tag>
            <Tag color="red" data-testid="tag-start">
              首点：{firstPoint.lng.toFixed(5)}, {firstPoint.lat.toFixed(5)}
            </Tag>
            {totalDistance > 0 && (
              <Tag color="blue" data-testid="tag-total">
                已绘距离：{formatDistance(totalDistance)}
              </Tag>
            )}
            {cursorDistance !== null && (
              <Tag color={nearFirstPoint ? 'volcano' : 'cyan'} data-testid="tag-cursor">
                {nearFirstPoint ? '靠近首点（点击闭合）' : '橡皮筋'}：{formatDistance(cursorDistance)}
              </Tag>
            )}
            {loading && <Spin size="small" />}
            {error && <Tag color="error">{error}</Tag>}
          </Space>
        )}

        {/* 历史归档列表 */}
        {hasHistory && (
          <>
            {measuring && <Divider type="vertical" />}
            <Space wrap data-testid="history-list">
              <Text strong style={{ fontSize: 12 }}>
                已完成多边形 {completedShapes.length} 个：
              </Text>
              {completedShapes.map((s) => (
                <Tag
                  key={s.id}
                  icon={<BorderOutlined />}
                  data-testid={`tag-shape-${s.id}`}
                  style={{
                    borderColor: s.color,
                    color: s.color,
                    background: `${s.color}1a`, // 末尾 1a ≈ 10% alpha
                  }}
                >
                  #{s.id} · {formatArea(s.area)} / 周长 {formatDistance(s.perimeter)}
                </Tag>
              ))}
            </Space>
          </>
        )}
      </div>

      {/* ---- 地图容器 ---- */}
      <Spin spinning={!ready && !error} tip={error ? '百度地图 SDK 加载失败' : '百度地图 SDK 加载中...'}>
        <div
          id={MAP_ID}
          className={styles.mapContainer}
          data-testid="bmap-map"
          style={error ? { display: 'flex', alignItems: 'center', justifyContent: 'center' } : undefined}
        >
          {error && (
            <Text type="secondary" style={{ padding: 12, textAlign: 'center' }}>
              请在 public/index.html 配置可用的百度地图 AK，并在 Referer 白名单中加入当前开发端口（例如 http://localhost:3002/*）。
            </Text>
          )}
        </div>
      </Spin>

      {/* ---- 操作说明 ---- */}
      <div className={styles.hint}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          提示：左击 = 添加点 &nbsp;|&nbsp; 光标靠近首点（≤10px）再左击 = 闭合 &nbsp;|&nbsp; 闭合后继续左击 = 开始下一个多边形 &nbsp;|&nbsp; 右键 = 取消当前/清空全部
        </Text>
      </div>
    </Card>
  );
};

export default MapDistanceMeasure;