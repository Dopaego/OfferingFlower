/**
 * qiankun.ts —— qiankun 2.10 子应用生命周期适配
 *
 * 在实际项目中，将此文件内容合并到 index.tsx 的入口导出即可。
 * 子应用以 umd 格式打包，主应用通过 registerMicroApps 注册。
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

let root: ReactDOM.Root | null = null;

/** 独立运行（非 qiankun 环境） */
if (!(window as any).__POWERED_BY_QIANKUN__) {
  root = ReactDOM.createRoot(document.getElementById('root')!);
  root.render(<App />);
}

/** qiankun 生命周期 */
export async function bootstrap() {
  console.log('[map-distance-demo] bootstrap');
}

export async function mount(props: { container?: HTMLElement }) {
  const container = props.container
    ? props.container.querySelector('#root')!
    : document.getElementById('root')!;
  root = ReactDOM.createRoot(container);
  root.render(<App />);
}

export async function unmount(props: { container?: HTMLElement }) {
  root?.unmount();
  root = null;
}

/**
 * 主应用注册示例（仅供参考）：
 *
 * import { registerMicroApps, start } from 'qiankun';
 *
 * registerMicroApps([
 *   {
 *     name: 'map-distance-demo',
 *     entry: '//localhost:3001',
 *     container: '#subapp-container',
 *     activeRule: '/map-distance',
 *   },
 * ]);
 *
 * start();
 */