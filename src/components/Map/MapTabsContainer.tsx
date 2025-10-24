import React, { useState } from 'react';
import { Tabs, Button, Dropdown, Input, Modal } from 'antd';
import { 
  PlusOutlined, 
  CloseOutlined, 
  EditOutlined
} from '@ant-design/icons';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMapTabsStore } from '../../stores/mapTabsStore';
import { useWindowStore } from '../../stores/windowStore';
import MapView from './MapView';
import './MapTabsContainer.css';

// 可拖拽的标签组件
interface SortableTabLabelProps {
  tabId: string;
  tabName: string;
  canClose: boolean;
  menuItems: any[];
  onRemove: (e: React.MouseEvent) => void;
}

const SortableTabLabel: React.FC<SortableTabLabelProps> = ({ 
  tabId, 
  tabName, 
  canClose, 
  menuItems,
  onRemove 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tabId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(e);
  };

  return (
    <Dropdown
      menu={{ items: menuItems }}
      trigger={['contextMenu']}
    >
      <div 
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="map-tab-label"
      >
        <span className="map-tab-name">{tabName}</span>
        {canClose && (
          <CloseOutlined
            className="map-tab-close-btn"
            onClick={handleCloseClick}
            onPointerDown={(e) => e.stopPropagation()}
          />
        )}
      </div>
    </Dropdown>
  );
};

const MapTabsContainer: React.FC = () => {
  const { tabs, activeTabId, addTab, removeTab, setActiveTab, updateTabName, reorderTabs } = useMapTabsStore();
  const { getWindowsInDock, dockSizes } = useWindowStore();
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);

  // 计算标签页容器的偏移量，避免被侧边栏遮挡
  const leftWindows = getWindowsInDock('left');
  const rightWindows = getWindowsInDock('right');
  const leftOffset = leftWindows.length > 0 ? dockSizes.left : 0;
  const rightOffset = rightWindows.length > 0 ? dockSizes.right : 0;

  // 配置拖拽传感器（长按200ms后激活拖拽）
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    })
  );

  // 新建地图标签
  const handleAddTab = () => {
    addTab();
  };

  // 删除标签页
  const handleRemoveTab = (tabId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (tabs.length <= 1) {
      Modal.warning({
        title: '无法删除',
        content: '至少需要保留一个地图标签页',
      });
      return;
    }
    removeTab(tabId);
  };

  // 切换标签页
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  // 开始重命名
  const handleStartRename = (tabId: string, currentName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingTabId(tabId);
    setEditingName(currentName);
    setIsRenameModalVisible(true);
  };

  // 确认重命名
  const handleConfirmRename = () => {
    if (editingTabId && editingName.trim()) {
      updateTabName(editingTabId, editingName.trim());
    }
    setIsRenameModalVisible(false);
    setEditingTabId(null);
    setEditingName('');
  };

  // 取消重命名
  const handleCancelRename = () => {
    setIsRenameModalVisible(false);
    setEditingTabId(null);
    setEditingName('');
  };

  // 处理拖拽结束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tabs.findIndex((tab) => tab.id === active.id);
      const newIndex = tabs.findIndex((tab) => tab.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newTabs = arrayMove(tabs, oldIndex, newIndex);
        reorderTabs(newTabs);
      }
    }
  };

  // 标签页右键菜单
  const getTabMenuItems = (tabId: string, tabName: string) => [
    {
      key: 'rename',
      label: '重命名',
      icon: <EditOutlined />,
      onClick: (e: any) => handleStartRename(tabId, tabName, e.domEvent),
    },
    {
      key: 'divider',
      type: 'divider' as const,
    },
    {
      key: 'close',
      label: '关闭',
      icon: <CloseOutlined />,
      danger: true,
      disabled: tabs.length <= 1,
      onClick: (e: any) => handleRemoveTab(tabId, e.domEvent),
    },
  ];

  // 转换为 Ant Design Tabs 的格式
  const tabItems = tabs.map((tab) => ({
    key: tab.id,
    label: (
      <SortableTabLabel
        tabId={tab.id}
        tabName={tab.name}
        canClose={tabs.length > 1}
        menuItems={getTabMenuItems(tab.id, tab.name)}
        onRemove={(e) => handleRemoveTab(tab.id, e)}
      />
    ),
    children: (
      <div className="map-tab-content" key={tab.id}>
        <MapView tabId={tab.id} />
      </div>
    ),
  }));

  return (
    <div 
      className="map-tabs-container"
      style={{
        position: 'absolute',
        left: leftOffset,
        right: rightOffset,
        top: 0,
        bottom: 0,
        transition: 'left 0.15s ease-out, right 0.15s ease-out',
      }}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={tabs.map(tab => tab.id)}
          strategy={horizontalListSortingStrategy}
        >
          <Tabs
            type="card"
            activeKey={activeTabId || undefined}
            onChange={handleTabChange}
            items={tabItems}
            tabBarExtraContent={{
              right: (
                <Button
                  type="text"
                  icon={<PlusOutlined />}
                  onClick={handleAddTab}
                  className="map-tab-add-btn"
                  title="新建地图"
                />
              ),
            }}
            className="map-tabs"
          />
        </SortableContext>
      </DndContext>

      {/* 重命名对话框 */}
      <Modal
        title="重命名地图"
        open={isRenameModalVisible}
        onOk={handleConfirmRename}
        onCancel={handleCancelRename}
        okText="确定"
        cancelText="取消"
        width={400}
      >
        <Input
          value={editingName}
          onChange={(e) => setEditingName(e.target.value)}
          onPressEnter={handleConfirmRename}
          placeholder="请输入地图名称"
          autoFocus
        />
      </Modal>
    </div>
  );
};

export default MapTabsContainer;
