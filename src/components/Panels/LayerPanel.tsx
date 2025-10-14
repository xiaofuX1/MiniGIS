import React from 'react';
import { Checkbox, Dropdown, Button, Space, Tooltip } from 'antd';
import {
  EyeOutlined, EyeInvisibleOutlined, SettingOutlined,
  DeleteOutlined, MoreOutlined,
  FileImageOutlined, DatabaseOutlined,
  GlobalOutlined, TableOutlined, BgColorsOutlined,
  FontSizeOutlined
} from '@ant-design/icons';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLayerStore, Layer } from '../../stores/layerStore';
import { useUiStore } from '../../stores/uiStore';
import './LayerPanel.css';

interface LayerPanelProps {
  onClose?: () => void;
}

interface SortableLayerItemProps {
  layer: Layer;
  getLayerIcon: (layerType: string) => React.ReactNode;
  layerMenuItems: (layerId: string) => any[];
  toggleLayerVisibility: (layerId: string) => void;
}

const SortableLayerItem: React.FC<SortableLayerItemProps> = ({ 
  layer, 
  getLayerIcon, 
  layerMenuItems,
  toggleLayerVisibility 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: layer.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`layer-list-item ${isDragging ? 'dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <Checkbox
        checked={layer.visible}
        onChange={(e) => {
          e.stopPropagation();
          toggleLayerVisibility(layer.id);
        }}
        className="layer-checkbox"
        onClick={(e) => e.stopPropagation()}
      />
      {getLayerIcon(layer.type)}
      <span className="layer-name" title={layer.name}>{layer.name}</span>
      <Dropdown 
        menu={{ items: layerMenuItems(layer.id) }} 
        trigger={['click']}
        onOpenChange={(open) => {
          // 阻止拖拽事件
          if (open) {
            document.body.style.userSelect = 'none';
          } else {
            document.body.style.userSelect = '';
          }
        }}
      >
        <Button
          type="text"
          size="small"
          icon={<MoreOutlined />}
          className="layer-menu-btn"
          onClick={(e) => e.stopPropagation()}
        />
      </Dropdown>
    </div>
  );
};

const LayerPanel: React.FC<LayerPanelProps> = ({ onClose }) => {
  const { layers, toggleLayerVisibility, removeLayer, clearLayers, reorderLayers, setAttributeTableLayer, attributeTableLayerId } = useLayerStore();
  const { openSymbologyPanel, openLabelPanel } = useUiStore();
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 200,  // 长按200毫秒后才能拖拽
        tolerance: 5,  // 移动5px内不会取消拖拽
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getLayerIcon = (layerType: string) => {
    switch (layerType) {
      case 'vector':
        return <DatabaseOutlined className="layer-type-icon" />;
      case 'raster':
        return <FileImageOutlined className="layer-type-icon" />;
      case 'basemap':
        return <GlobalOutlined className="layer-type-icon" />;
      default:
        return <FileImageOutlined className="layer-type-icon" />;
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = layers.findIndex((layer) => layer.id === active.id);
      const newIndex = layers.findIndex((layer) => layer.id === over.id);
      const newLayers = arrayMove(layers, oldIndex, newIndex);
      reorderLayers(newLayers);
    }
  };

  const handleLayerAction = (action: string, layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    
    switch (action) {
      case 'delete':
        removeLayer(layerId);
        // 如果删除的图层正在显示属性表，关闭属性表
        if (attributeTableLayerId === layerId) {
          setAttributeTableLayer(null);
        }
        break;
      case 'properties':
        break;
      case 'symbology':
        openSymbologyPanel(layerId);
        break;
      case 'zoom':
        if (layer && layer.extent) {
          // 发送缩放事件给地图
          window.dispatchEvent(new CustomEvent('zoomToLayer', { 
            detail: { extent: layer.extent } 
          }));
        }
        break;
      case 'attributeTable':
        // 切换属性表显示状态
        if (attributeTableLayerId === layerId) {
          setAttributeTableLayer(null);
        } else {
          setAttributeTableLayer(layerId);
        }
        break;
      case 'label':
        // 打开标注配置面板
        if (layer) {
          openLabelPanel(layer.id);
        }
        break;
      default:
        break;
    }
  };

  const layerMenuItems = (layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    const isVectorLayer = layer?.type === 'vector';
    const isAttributeTableOpen = attributeTableLayerId === layerId;
    
    const items: any[] = [
      {
        key: 'zoom',
        label: '缩放至图层',
        icon: <EyeOutlined />,
        onClick: () => handleLayerAction('zoom', layerId),
      },
    ];
    
    // 只有矢量图层才显示属性表和标注选项
    if (isVectorLayer) {
      items.push(
        {
          key: 'attributeTable',
          label: isAttributeTableOpen ? '关闭属性表' : '打开属性表',
          icon: <TableOutlined />,
          onClick: () => handleLayerAction('attributeTable', layerId),
        },
        {
          key: 'label',
          label: '标注',
          icon: <FontSizeOutlined />,
          onClick: () => handleLayerAction('label', layerId),
        }
      );
    }
    
    items.push(
      {
        key: 'symbology',
        label: '符号设置',
        icon: <BgColorsOutlined />,
        onClick: () => handleLayerAction('symbology', layerId),
      },
      {
        key: 'properties',
        label: '属性',
        icon: <SettingOutlined />,
        onClick: () => handleLayerAction('properties', layerId),
      },
      {
        key: 'divider',
        type: 'divider' as const,
      },
      {
        key: 'delete',
        label: '删除',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => handleLayerAction('delete', layerId),
      }
    );
    
    return items;
  };

  const handleShowAll = () => {
    layers.forEach(layer => {
      if (!layer.visible) {
        toggleLayerVisibility(layer.id);
      }
    });
  };

  const handleHideAll = () => {
    layers.forEach(layer => {
      if (layer.visible) {
        toggleLayerVisibility(layer.id);
      }
    });
  };

  return (
    <div className="layer-panel">
        <div className="panel-header">
          <span>图层管理</span>
          {onClose && (
            <button onClick={onClose} className="panel-close-btn">
              ✕
            </button>
          )}
        </div>
      
      <div className="layer-panel-content">
        {layers.length === 0 ? (
          <div className="empty-state">
            <FileImageOutlined style={{ fontSize: 48, color: '#ccc' }} />
            <p>暂无图层</p>
            <p className="text-xs text-gray-500">点击"添加数据"按钮添加图层</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={layers.map(layer => layer.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="layer-list">
                {layers.map((layer) => (
                  <SortableLayerItem
                    key={layer.id}
                    layer={layer}
                    getLayerIcon={getLayerIcon}
                    layerMenuItems={layerMenuItems}
                    toggleLayerVisibility={toggleLayerVisibility}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div className="layer-panel-footer">
        <Space>
          <Tooltip title="全部显示">
            <Button size="small" icon={<EyeOutlined />} onClick={handleShowAll} />
          </Tooltip>
          <Tooltip title="全部隐藏">
            <Button size="small" icon={<EyeInvisibleOutlined />} onClick={handleHideAll} />
          </Tooltip>
          <Tooltip title="删除所有">
            <Button size="small" icon={<DeleteOutlined />} danger onClick={clearLayers} />
          </Tooltip>
        </Space>
      </div>
    </div>
  );
};

export default LayerPanel;
