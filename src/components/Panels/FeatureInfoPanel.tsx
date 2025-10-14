import React from 'react';
import { Descriptions, Empty } from 'antd';
import { useSelectionStore } from '../../stores/selectionStore';
import { useLayerStore } from '../../stores/layerStore';
import './FeatureInfoPanel.css';

interface FeatureInfoPanelProps {
  onClose?: () => void;
}

const FeatureInfoPanel: React.FC<FeatureInfoPanelProps> = ({ onClose }) => {
  const { selectedFeatures, inspectedFeature, isSelecting } = useSelectionStore();
  const { selectedLayer } = useLayerStore();

  // 选择模式显示选中要素，浏览模式显示检查要素
  const displayFeature = isSelecting 
    ? (selectedFeatures.length > 0 ? selectedFeatures[0] : null)
    : inspectedFeature;

  if (!displayFeature) {
    return (
      <div className="feature-info-content">
        <Empty 
          description={isSelecting ? '请点击地图选择要素' : '请点击地图浏览要素'} 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    );
  }

  const properties = displayFeature.properties || {};
  
  // 过滤掉内部属性（以 _ 开头的属性）
  const filteredProperties = Object.entries(properties).filter(
    ([key]) => !key.startsWith('_')
  );

  return (
    <div className="feature-info-content">
      <div className="feature-info-title">
        {selectedLayer?.name || '未知图层'}
      </div>
      <Descriptions 
        column={1} 
        size="small" 
        bordered
        className="feature-properties"
      >
        {filteredProperties.length > 0 ? (
          filteredProperties.map(([key, value]) => (
            <Descriptions.Item key={key} label={key}>
              {value !== null && value !== undefined ? String(value) : '-'}
            </Descriptions.Item>
          ))
        ) : (
          <Descriptions.Item label="提示">
            该要素没有属性数据
          </Descriptions.Item>
        )}
      </Descriptions>
    </div>
  );
};

export default FeatureInfoPanel;
