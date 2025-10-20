import React from 'react';
import { Modal, message } from 'antd';
import { GithubOutlined, StarOutlined, HeartOutlined } from '@ant-design/icons';
import { open } from '@tauri-apps/plugin-shell';
import './AboutDialog.css';

interface AboutDialogProps {
  visible: boolean;
  onClose: () => void;
}

const AboutDialog: React.FC<AboutDialogProps> = ({ visible, onClose }) => {
  const handleGithubClick = async () => {
    try {
      await open('https://github.com/xiaofuX1/MiniGIS');
    } catch (error) {
      console.error('打开链接失败:', error);
      message.error('打开链接失败，请手动访问: https://github.com/xiaofuX1/MiniGIS');
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" 
            />
          </svg>
          <span style={{ fontSize: '20px', fontWeight: 600 }}>关于 MiniGIS</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
      className="about-dialog"
    >
      <div className="about-content">
        <div className="about-section">
          <h3 className="about-section-title">
            <HeartOutlined style={{ color: '#ff4d4f', marginRight: '8px' }} />
            开源软件
          </h3>
          <p className="about-text">
            MiniGIS 是一个开源的轻量级 GIS 桌面应用，致力于提供简洁、高效的地理信息处理体验。
          </p>
          <p className="about-text">
            本项目基于 <strong>MIT License</strong> 开源协议，欢迎任何形式的贡献和使用。
          </p>
        </div>

        <div className="about-section">
          <h3 className="about-section-title">
            <StarOutlined style={{ color: '#faad14', marginRight: '8px' }} />
            技术栈
          </h3>
          <div className="tech-stack">
            <div className="tech-item">
              <strong>前端框架：</strong>React + TypeScript + Vite
            </div>
            <div className="tech-item">
              <strong>桌面框架：</strong>Tauri v2
            </div>
            <div className="tech-item">
              <strong>地图引擎：</strong>OpenLayers
            </div>
            <div className="tech-item">
              <strong>空间数据：</strong>GDAL
            </div>
            <div className="tech-item">
              <strong>UI 组件：</strong>Ant Design + Tailwind CSS
            </div>
          </div>
        </div>

        <div className="about-section">
          <h3 className="about-section-title">
            <GithubOutlined style={{ marginRight: '8px' }} />
            参与贡献
          </h3>
          <p className="about-text">
            如果你对本项目感兴趣，欢迎通过以下方式参与：
          </p>
          <ul className="about-list">
            <li>提交 Issue 报告 Bug 或提出新功能建议</li>
            <li>Fork 项目并提交 Pull Request</li>
            <li>为项目添加文档或改进代码</li>
            <li>分享项目，让更多人了解 MiniGIS</li>
          </ul>
        </div>

        <div className="about-footer">
          <button 
            className="github-button"
            onClick={handleGithubClick}
          >
            <GithubOutlined style={{ marginRight: '8px', fontSize: '18px' }} />
            访问 GitHub 仓库
          </button>
          <div className="about-copyright">
            © 2025 MiniGIS. Made with <HeartOutlined style={{ color: '#ff4d4f' }} /> by xiaofuX1
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AboutDialog;
