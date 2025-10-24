import React from 'react';
import { Checkbox, Dropdown, Button, Space, Tooltip } from 'antd';
import {
  EyeOutlined, EyeInvisibleOutlined, SettingOutlined,
  DeleteOutlined, MoreOutlined,
  FileImageOutlined, DatabaseOutlined,
  GlobalOutlined, TableOutlined, BgColorsOutlined,
  FontSizeOutlined, ExportOutlined,
  FolderOutlined, FolderOpenOutlined, CaretRightOutlined, CaretDownOutlined
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
import type { Layer } from '../../stores/layerStore';
import { useMapTabsStore } from '../../stores/mapTabsStore';
import { useWindowStore } from '../../stores/windowStore';
import './LayerPanel.css';

interface LayerPanelProps {
  onClose?: () => void;
}

interface SortableLayerItemProps {
  layer: Layer;
  getLayerIcon: (layerType: string, isGroup?: boolean, expanded?: boolean) => React.ReactNode;
  layerMenuItems: (layerId: string) => any[];
  toggleLayerVisibility: (layerId: string) => void;
  toggleGroupExpand?: (groupId: string) => void;
  level?: number;
}

interface LayerItemProps {
  layer: Layer;
  getLayerIcon: (layerType: string, isGroup?: boolean, expanded?: boolean) => React.ReactNode;
  layerMenuItems: (layerId: string) => any[];
  toggleLayerVisibility: (layerId: string) => void;
  toggleGroupExpand?: (groupId: string) => void;
  level: number;
}

const SortableLayerItem: React.FC<SortableLayerItemProps> = ({ 
  layer, 
  getLayerIcon, 
  layerMenuItems,
  toggleLayerVisibility,
  toggleGroupExpand,
  level = 0
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
    <>
      <div 
        ref={setNodeRef} 
        style={{...style, paddingLeft: `${level * 20}px`}}
        className={`layer-list-item ${isDragging ? 'dragging' : ''} ${layer.isGroup ? 'layer-group' : ''}`}
        {...attributes}
        {...listeners}
      >
        {layer.isGroup && (
          <Button
            type="text"
            size="small"
            icon={layer.expanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
            className="layer-expand-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (toggleGroupExpand) {
                toggleGroupExpand(layer.id);
              }
            }}
          />
        )}
        <Checkbox
          checked={layer.visible}
          onChange={(e) => {
            e.stopPropagation();
            toggleLayerVisibility(layer.id);
          }}
          className="layer-checkbox"
          onClick={(e) => e.stopPropagation()}
        />
        {getLayerIcon(layer.type, layer.isGroup, layer.expanded)}
        <span className="layer-name" title={layer.name}>{layer.name}</span>
        <Dropdown 
          menu={{ items: layerMenuItems(layer.id) }} 
          trigger={['click']}
          onOpenChange={(open) => {
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
      {layer.isGroup && layer.expanded && layer.children && layer.children.map((childLayer) => (
        <LayerItem
          key={childLayer.id}
          layer={childLayer}
          getLayerIcon={getLayerIcon}
          layerMenuItems={layerMenuItems}
          toggleLayerVisibility={toggleLayerVisibility}
          toggleGroupExpand={toggleGroupExpand}
          level={level + 1}
        />
      ))}
    </>
  );
};

// 普通图层项组件（用于子图层，不参与拖拽排序）
const LayerItem: React.FC<LayerItemProps> = ({ 
  layer, 
  getLayerIcon, 
  layerMenuItems,
  toggleLayerVisibility,
  toggleGroupExpand,
  level
}) => {
  return (
    <>
      <div 
        style={{paddingLeft: `${level * 20}px`}}
        className={`layer-list-item ${layer.isGroup ? 'layer-group' : ''}`}
      >
        {layer.isGroup && (
          <Button
            type="text"
            size="small"
            icon={layer.expanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
            className="layer-expand-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (toggleGroupExpand) {
                toggleGroupExpand(layer.id);
              }
            }}
          />
        )}
        <Checkbox
          checked={layer.visible}
          onChange={(e) => {
            e.stopPropagation();
            toggleLayerVisibility(layer.id);
          }}
          className="layer-checkbox"
          onClick={(e) => e.stopPropagation()}
        />
        {getLayerIcon(layer.type, layer.isGroup, layer.expanded)}
        <span className="layer-name" title={layer.name}>{layer.name}</span>
        <Dropdown 
          menu={{ items: layerMenuItems(layer.id) }} 
          trigger={['click']}
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
      {layer.isGroup && layer.expanded && layer.children && layer.children.map((childLayer) => (
        <LayerItem
          key={childLayer.id}
          layer={childLayer}
          getLayerIcon={getLayerIcon}
          layerMenuItems={layerMenuItems}
          toggleLayerVisibility={toggleLayerVisibility}
          toggleGroupExpand={toggleGroupExpand}
          level={level + 1}
        />
      ))}
    </>
  );
};

const LayerPanel: React.FC<LayerPanelProps> = ({ onClose }) => {
  const mapTabsStore = useMapTabsStore();
  const { showWindow } = useWindowStore();
  
  const currentTab = mapTabsStore.getCurrentTab();
  const layers = currentTab?.layers || [];
  const attributeTableLayerIds = currentTab?.attributeTableLayerIds || [];
  
  const toggleLayerVisibility = (layerId: string) => mapTabsStore.toggleLayerVisibilityInCurrentTab(layerId);
  const removeLayer = (layerId: string) => mapTabsStore.removeLayerFromCurrentTab(layerId);
  const clearLayers = () => mapTabsStore.clearLayersInCurrentTab();
  const reorderLayers = (newLayers: Layer[]) => mapTabsStore.reorderLayersInCurrentTab(newLayers);
  const updateLayer = (layerId: string, updates: Partial<Layer>) => mapTabsStore.updateLayerInCurrentTab(layerId, updates);
  const addAttributeTableLayer = (layerId: string) => mapTabsStore.addAttributeTableLayerToCurrentTab(layerId);
  const removeAttributeTableLayer = (layerId: string) => mapTabsStore.removeAttributeTableLayerFromCurrentTab(layerId);
  
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

  const getLayerIcon = (layerType: string, isGroup?: boolean, expanded?: boolean) => {
    if (isGroup) {
      return expanded ? 
        <FolderOpenOutlined className="layer-type-icon" /> : 
        <FolderOutlined className="layer-type-icon" />;
    }
    
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

  const toggleGroupExpand = (groupId: string) => {
    const group = layers.find(l => l.id === groupId);
    if (group && group.isGroup) {
      updateLayer(groupId, { expanded: !group.expanded });
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
    // 查找图层，包括分组中的子图层
    const findLayer = (layers: Layer[]): Layer | undefined => {
      for (const layer of layers) {
        if (layer.id === layerId) return layer;
        if (layer.children) {
          const found = findLayer(layer.children);
          if (found) return found;
        }
      }
      return undefined;
    };
    const layer = findLayer(layers);
    
    switch (action) {
      case 'delete':
        removeLayer(layerId);
        // 如果删除的图层正在显示属性表，关闭该标签页
        if (attributeTableLayerIds.includes(layerId)) {
          removeAttributeTableLayer(layerId);
        }
        break;
      case 'properties':
        break;
      case 'symbology':
        showWindow('symbology', { layerId });
        break;
      case 'zoom':
        if (layer && layer.extent) {
          // 发送缩放事件给当前标签页的地图
          window.dispatchEvent(new CustomEvent('zoomToLayer', { 
            detail: { 
              tabId: currentTab?.id,  // 指定目标地图标签页ID
              extent: layer.extent 
            } 
          }));
        }
        break;
      case 'attributeTable':
        // 打开属性表窗口
        console.log('[图层菜单] 打开属性表:', {
          layerId,
          layer: layers.find(l => l.id === layerId)
        });
        addAttributeTableLayer(layerId);
        showWindow('attribute-table', { layerId });
        break;
      case 'label':
        // 打开标注配置面板
        if (layer) {
          showWindow('label', { layerId: layer.id });
        }
        break;
      case 'export':
        // 打开导出工具
        showWindow('export-tool');
        break;
      default:
        break;
    }
  };

  const layerMenuItems = (layerId: string) => {
    // 查找图层，包括分组中的子图层
    const findLayer = (layers: Layer[]): Layer | undefined => {
      for (const layer of layers) {
        if (layer.id === layerId) return layer;
        if (layer.children) {
          const found = findLayer(layer.children);
          if (found) return found;
        }
      }
      return undefined;
    };
    const layer = findLayer(layers);
    const isVectorLayer = layer?.type === 'vector' && !layer?.isGroup;
    
    console.log('[图层菜单] 生成菜单:', {
      layerId,
      layer,
      type: layer?.type,
      isGroup: layer?.isGroup,
      isVectorLayer,
      hasSource: !!layer?.source,
      sourcePath: layer?.source?.path
    });
    
    const items: any[] = [
      {
        key: 'zoom',
        label: '缩放至图层',
        icon: <EyeOutlined />,
        onClick: () => handleLayerAction('zoom', layerId),
      },
    ];
    
    // 只有矢量图层才显示属性表、标注和导出选项
    if (isVectorLayer) {
      items.push(
        {
          key: 'attributeTable',
          label: '属性表',
          icon: <TableOutlined />,
          onClick: () => handleLayerAction('attributeTable', layerId),
        },
        {
          key: 'label',
          label: '标注',
          icon: <FontSizeOutlined />,
          onClick: () => handleLayerAction('label', layerId),
        },
        {
          key: 'export',
          label: '导出数据',
          icon: <ExportOutlined />,
          onClick: () => handleLayerAction('export', layerId),
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
                    toggleGroupExpand={toggleGroupExpand}
                    level={0}
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
