import React from 'react';
import { Tabs } from 'antd';
import { InfoCircleOutlined, BgColorsOutlined, FontSizeOutlined } from '@ant-design/icons';
import FeatureInfoPanel from './FeatureInfoPanel';
import SymbologyPanel from './SymbologyPanel';
import LabelPanel from './LabelPanel';
import { useUiStore } from '../../stores/uiStore';
import { useMapTabsStore } from '../../stores/mapTabsStore';
import './RightPanel.css';

interface RightPanelProps {
  onClose?: () => void;
}

const RightPanel: React.FC<RightPanelProps> = ({ onClose }) => {
  const { rightPanelType, symbologyLayerId, labelLayerId, setRightPanelType, closeSymbologyPanel, closeLabelPanel } = useUiStore();
  const mapTabsStore = useMapTabsStore();
  const currentTab = mapTabsStore.getCurrentTab();
  const layers = currentTab?.layers || [];

  // 递归查找图层（包括分组中的子图层）
  const findLayerById = (layers: any[], id: string): any => {
    for (const layer of layers) {
      if (layer.id === id) return layer;
      if (layer.children) {
        const found = findLayerById(layer.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // 获取当前编辑的符号图层
  const symbologyLayer = symbologyLayerId ? findLayerById(layers, symbologyLayerId) : null;
  const labelLayer = labelLayerId ? findLayerById(layers, labelLayerId) : null;

  const handleCloseSymbology = () => {
    closeSymbologyPanel();
  };

  const handleCloseLabel = () => {
    closeLabelPanel();
  };

  const handleTabChange = (key: string) => {
    if (key === 'feature') {
      setRightPanelType('feature');
    } else if (key === 'symbology') {
      setRightPanelType('symbology');
    } else if (key === 'label') {
      setRightPanelType('label');
    }
  };

  const activeKey = rightPanelType === 'symbology' ? 'symbology' : rightPanelType === 'label' ? 'label' : 'feature';

  const items = [
    {
      key: 'feature',
      label: (
        <span>
          <InfoCircleOutlined />
          <span style={{ marginLeft: 6 }}>要素信息</span>
        </span>
      ),
      children: <FeatureInfoPanel onClose={onClose} />,
    },
    {
      key: 'symbology',
      label: (
        <span>
          <BgColorsOutlined />
          <span style={{ marginLeft: 6 }}>符号设置</span>
        </span>
      ),
      children: symbologyLayer ? (
        <SymbologyPanel 
          layer={symbologyLayer} 
          onClose={handleCloseSymbology} 
        />
      ) : (
        <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
          请在图层面板中选择图层并打开符号设置
        </div>
      ),
      disabled: !symbologyLayer,
    },
    {
      key: 'label',
      label: (
        <span>
          <FontSizeOutlined />
          <span style={{ marginLeft: 6 }}>标注</span>
        </span>
      ),
      children: labelLayer ? (
        <LabelPanel 
          layer={labelLayer} 
          onClose={handleCloseLabel} 
        />
      ) : (
        <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
          请在图层面板中选择图层并打开标注设置
        </div>
      ),
      disabled: !labelLayer,
    },
  ];

  return (
    <div className="right-panel">
      <div className="panel-tabs-container">
        <Tabs 
          activeKey={activeKey}
          onChange={handleTabChange}
          items={items}
          tabPosition="bottom"
          className="right-panel-tabs"
        />
      </div>
    </div>
  );
};

export default RightPanel;
