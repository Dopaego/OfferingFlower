/**
 * App.tsx —— Demo 入口页
 * 模拟 qiankun 子应用挂载时的 Provider 包裹方式
 */
import React from 'react';
import { Provider } from 'react-redux';
import { ConfigProvider, Layout, Typography } from 'antd';
import zhCN from 'antd/locale/zh_CN';

import { store } from './store';
import MapDistanceMeasure from './components/MapDistanceMeasure';

const { Header, Content } = Layout;
const { Title } = Typography;

const App: React.FC = () => (
  <ConfigProvider locale={zhCN}>
    <Provider store={store}>
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0' }}>
          <Title level={4} style={{ margin: '16px 0', color: '#1677ff' }}>
            地图测距 Demo — 百度地图 BMapGL + Redux Toolkit + AntD 5
          </Title>
        </Header>
        <Content style={{ padding: 24 }}>
          <MapDistanceMeasure />
        </Content>
      </Layout>
    </Provider>
  </ConfigProvider>
);

export default App;