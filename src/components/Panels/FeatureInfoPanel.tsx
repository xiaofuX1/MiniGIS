import React, { useMemo } from 'react';
import { Descriptions, Empty, Tree } from 'antd';
import { FolderOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useSelectionStore } from '../../stores/selectionStore';
import { useMapTabsStore } from '../../stores/mapTabsStore';
import type { DataNode } from 'antd/es/tree';
import './FeatureInfoPanel.css';

interface FeatureInfoPanelProps {
  onClose?: () => void;
}

const FeatureInfoPanel: React.FC<FeatureInfoPanelProps> = ({ onClose }) => {
  const { 
    selectedFeatures, 
    inspectedFeature, 
    inspectedFeatures,
    currentInspectedIndex,
    isSelecting,
    setCurrentInspectedIndex 
  } = useSelectionStore();
  const mapTabsStore = useMapTabsStore();
  const currentTab = mapTabsStore.getCurrentTab();
  const selectedLayer = currentTab?.selectedLayer || null;
  const selectLayer = (layer: any) => mapTabsStore.setCurrentTabSelectedLayer(layer);

  // 选择模式显示选中要素，浏览模式显示检查要素
  const displayFeature = isSelecting 
    ? (selectedFeatures.length > 0 ? selectedFeatures[0] : null)
    : inspectedFeature;

  // 构建树形数据结构
  const treeData: DataNode[] = useMemo(() => {
    if (isSelecting || inspectedFeatures.length === 0) return [];

    // 按图层分组要素
    const layerMap = new Map<string, typeof inspectedFeatures>();
    inspectedFeatures.forEach(info => {
      const existing = layerMap.get(info.layerId) || [];
      layerMap.set(info.layerId, [...existing, info]);
    });

    // 构建树节点
    const nodes: DataNode[] = [];
    layerMap.forEach((features, layerId) => {
      const layerNode: DataNode = {
        title: `${features[0].layerName} (${features.length})`,
        key: `layer-${layerId}`,
        icon: <FolderOutlined style={{ color: '#1890ff' }} />,
        children: features.map((info, idx) => {
          const globalIndex = inspectedFeatures.indexOf(info);
          const featureId = info.feature.id || info.feature.properties?.id || `要素${globalIndex + 1}`;
          const geomType = info.feature.geometry?.type || '未知类型';
          return {
            title: `${featureId} [${geomType}]`,
            key: `feature-${globalIndex}`,
            icon: <EnvironmentOutlined style={{ color: '#52c41a' }} />,
            isLeaf: true,
          };
        }),
      };
      nodes.push(layerNode);
    });

    return nodes;
  }, [inspectedFeatures, isSelecting]);

  // 处理树节点选择
  const handleTreeSelect = (selectedKeys: React.Key[]) => {
    if (selectedKeys.length === 0) return;
    const key = String(selectedKeys[0]);
    
    // 只处理要素节点的选择
    if (key.startsWith('feature-')) {
      const index = parseInt(key.replace('feature-', ''), 10);
      if (!isNaN(index) && index >= 0 && index < inspectedFeatures.length) {
        setCurrentInspectedIndex(index);
        // 同步选中对应图层
        selectLayer(inspectedFeatures[index].layer);
        
        // 触发闪烁效果（发送给当前标签页的地图）
        window.dispatchEvent(new CustomEvent('flashFeature', {
          detail: { 
            tabId: currentTab?.id,
            feature: inspectedFeatures[index].feature 
          }
        }));
      }
    }
  };

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
      {/* 要素识别树形选择器 - 始终显示 */}
      {!isSelecting && inspectedFeatures.length > 0 && (
        <div className="feature-selector">
          <Tree
            showIcon
            selectedKeys={[`feature-${currentInspectedIndex}`]}
            treeData={treeData}
            onSelect={handleTreeSelect}
            className="feature-tree"
          />
        </div>
      )}

      {/* 要素属性表 */}
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
