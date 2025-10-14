import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ConfigProvider
    locale={zhCN}
    theme={{
      token: {
        colorPrimary: '#0ea5e9',
        borderRadius: 4,
        fontSize: 14,
      },
      components: {
        Button: {
          primaryShadow: 'none',
        },
      },
    }}
  >
    <App />
  </ConfigProvider>
);
