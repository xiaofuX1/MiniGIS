import React, { useState } from 'react';
import { 
  PlusOutlined, DeleteOutlined, SettingOutlined,
  SelectOutlined, DragOutlined, ZoomInOutlined,
  TableOutlined, BarChartOutlined, HeatMapOutlined,
  EnvironmentOutlined, LineChartOutlined,
  GlobalOutlined, FolderOpenOutlined
} from '@ant-design/icons';
import { Tooltip, Dropdown, message } from 'antd';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useLayerStore } from '../../stores/layerStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { useUiStore } from '../../stores/uiStore';
import './RibbonMenu.css';

interface RibbonTab {
  key: string;
  label: string;
  groups: RibbonGroup[];
}

interface RibbonGroup {
  key: string;
  label: string;
  items: RibbonItem[];
}

interface RibbonItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  dropdown?: any;
}

const RibbonMenu: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');
  const { addLayer, layers, removeLayer, selectedLayer, setAttributeTableLayer } = useLayerStore();
  const { clearSelection, setIsSelecting } = useSelectionStore();
  const { toggleLeftPanel, toggleRightPanel } = useUiStore();

  const handleBasemapChange = (basemapType: string) => {
    // 先检查是否已经是当前底图
    const existingBasemaps = layers.filter(l => l.type === 'basemap');
    const currentBasemapId = existingBasemaps[0]?.id;
    
    if (basemapType !== 'none' && currentBasemapId === `basemap-${basemapType}`) {
      message.info('当前已是该底图');
      return;
    }

    // 移除现有的底图图层（包括天地图的注记层）
    existingBasemaps.forEach(basemap => removeLayer(basemap.id));

    const tdtKey = '285fd5c80869765246eb6c77caaf7bb6';
    const geovisToken = '488fb6d94c9f290d58a855e648fe70d7f02db5ef9e496a07165ecfe3d2ccc4da';
    
    // 添加新的底图
    const basemaps: Record<string, any> = {
      'google-satellite': {
        id: 'basemap-google-satellite',
        name: 'Google 卫星图',
        url: 'https://gac-geo.googlecnapps.club/maps/vt?lyrs=s&x={x}&y={y}&z={z}',
      },
      'geovis-image': {
        id: 'basemap-geovis-image',
        name: '星图地球影像',
        url: `https://tiles.geovisearth.com/base/v1/img/{z}/{x}/{y}?token=${geovisToken}`,
        annotation: {
          id: 'basemap-geovis-image-anno',
          name: '星图地球影像注记',
          url: `https://tiles.geovisearth.com/base/v1/cia/{z}/{x}/{y}?token=${geovisToken}`,
        },
      },
      'geovis-history': {
        id: 'basemap-geovis-history-2021',
        name: '星图地球历史影像',
        url: `https://tiles.geovisearth.com/base/v1/2021/img/{z}/{x}/{y}?format=webp&tmsIds=w&token=${geovisToken}`,
      },
      'geovis-vector': {
        id: 'basemap-geovis-vector',
        name: '星图地球矢量',
        url: `https://tiles.geovisearth.com/base/v1/vec/{z}/{x}/{y}?token=${geovisToken}`,
      },
      'geovis-terrain': {
        id: 'basemap-geovis-terrain',
        name: '星图地球地形',
        url: `https://tiles.geovisearth.com/base/v1/ter/{z}/{x}/{y}?token=${geovisToken}`,
        annotation: {
          id: 'basemap-geovis-terrain-anno',
          name: '星图地球地形注记',
          url: `https://tiles.geovisearth.com/base/v1/cat/{z}/{x}/{y}?token=${geovisToken}`,
        },
      },
      'tianditu-vector': {
        id: 'basemap-tianditu-vector',
        name: '天地图矢量',
        url: `http://t{s}.tianditu.gov.cn/DataServer?T=vec_w&x={x}&y={y}&l={z}&tk=${tdtKey}`,
        annotation: {
          id: 'basemap-tianditu-vector-anno',
          name: '天地图矢量注记',
          url: `http://t{s}.tianditu.gov.cn/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=${tdtKey}`,
        },
      },
      'tianditu-terrain': {
        id: 'basemap-tianditu-terrain',
        name: '天地图地形',
        url: `http://t{s}.tianditu.gov.cn/DataServer?T=ter_w&x={x}&y={y}&l={z}&tk=${tdtKey}`,
        annotation: {
          id: 'basemap-tianditu-terrain-anno',
          name: '天地图地形注记',
          url: `http://t{s}.tianditu.gov.cn/DataServer?T=cta_w&x={x}&y={y}&l={z}&tk=${tdtKey}`,
        },
      },
      'tianditu-image': {
        id: 'basemap-tianditu-image',
        name: '天地图影像',
        url: `http://t{s}.tianditu.gov.cn/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=${tdtKey}`,
        annotation: {
          id: 'basemap-tianditu-image-anno',
          name: '天地图影像注记',
          url: `http://t{s}.tianditu.gov.cn/DataServer?T=cia_w&x={x}&y={y}&l={z}&tk=${tdtKey}`,
        },
      },
      'none': null,
    };

    if (basemapType !== 'none' && basemaps[basemapType]) {
      const basemap = basemaps[basemapType];
      
      // 如果有注记层（天地图），先添加注记层
      if (basemap.annotation) {
        addLayer({
          id: basemap.annotation.id,
          name: basemap.annotation.name,
          type: 'basemap',
          source: {
            type: 'xyz',
            url: basemap.annotation.url,
          },
          visible: true,
          opacity: 1,
        });
      }
      
      // 后添加底图层（作为底层）
      addLayer({
        id: basemap.id,
        name: basemap.name,
        type: 'basemap',
        source: {
          type: 'xyz',
          url: basemap.url,
        },
        visible: true,
        opacity: 1,
      });
      
      message.success(`切换到 ${basemap.name}`);
    } else if (basemapType === 'none') {
      message.info('已移除底图');
    }
  };

  const basemapMenuItems = [
    { key: 'google-satellite', label: 'Google 卫星图', onClick: () => handleBasemapChange('google-satellite') },
    { key: 'geovis-image', label: '星图地球影像', onClick: () => handleBasemapChange('geovis-image') },
    { key: 'geovis-history', label: '星图地球历史影像', onClick: () => handleBasemapChange('geovis-history') },
    { key: 'geovis-vector', label: '星图地球矢量', onClick: () => handleBasemapChange('geovis-vector') },
    { key: 'geovis-terrain', label: '星图地球地形', onClick: () => handleBasemapChange('geovis-terrain') },
    { key: 'tianditu-vector', label: '天地图矢量', onClick: () => handleBasemapChange('tianditu-vector') },
    { key: 'tianditu-terrain', label: '天地图地形', onClick: () => handleBasemapChange('tianditu-terrain') },
    { key: 'tianditu-image', label: '天地图影像', onClick: () => handleBasemapChange('tianditu-image') },
    { key: 'divider', type: 'divider' as const },
    { key: 'none', label: '无底图', onClick: () => handleBasemapChange('none') },
  ];

  const handleOpenShapefile = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: '矢量文件',
          extensions: ['shp', 'gpkg', 'geojson', 'json', 'kml', 'kmz', 'tab', 'gml']
        }]
      });
      
      if (selected) {
        // 使用 GDAL 打开文件
        const info: any = await invoke('gdal_open_vector', { path: selected });
        message.success(`成功打开文件: ${selected}`);
        
        // 使用 GDAL 获取 GeoJSON 数据
        const geojson = await invoke('gdal_get_geojson', { path: selected });
        
        // 映射后端的 snake_case 到前端的 camelCase
        const extent = info.extent ? {
          minX: info.extent.min_x,
          minY: info.extent.min_y,
          maxX: info.extent.max_x,
          maxY: info.extent.max_y,
        } : undefined;
        
        // 获取文件扩展名
        const ext = selected.split('.').pop()?.toLowerCase() || 'vector';
        
        // 添加图层
        await addLayer({
          id: Date.now().toString(),
          name: selected.split(/[\\/]/).pop()?.replace(/\.[^/.]+$/, '') || '矢量图层',
          type: 'vector',
          source: { type: ext === 'shp' ? 'shapefile' : ext as any, path: selected },
          visible: true,
          opacity: 1,
          extent: extent,
          geojson: geojson,
        });
      }
    } catch (error) {
      console.error('打开文件详细错误:', error);
      
      // 调用GDAL诊断获取详细信息
      try {
        const diagnose = await invoke('gdal_diagnose');
        console.error('GDAL诊断信息:', diagnose);
      } catch (diagError) {
        console.error('GDAL诊断失败:', diagError);
      }
      
      const errorMsg = error instanceof Error ? error.message : String(error);
      message.error(`打开文件失败: ${errorMsg}`);
    }
  };

  // 处理选择工具
  const handleSelect = () => {
    // 触发地图工具栏的选择按钮
    window.dispatchEvent(new CustomEvent('mapToolClick', { detail: { tool: 'select' } }));
  };

  // 处理清除选择
  const handleClearSelection = () => {
    clearSelection();
    window.dispatchEvent(new CustomEvent('clearSelection'));
  };

  // 处理打开属性表
  const handleOpenAttributeTable = () => {
    if (selectedLayer && selectedLayer.type === 'vector') {
      setAttributeTableLayer(selectedLayer.id);
    } else {
      message.warning('请先选择一个矢量图层');
    }
  };

  // 处理创建新图层
  const handleCreateLayer = (layerType: 'point' | 'line' | 'polygon') => {
    message.info(`创建${layerType === 'point' ? '点' : layerType === 'line' ? '线' : '面'}图层功能开发中...`);
  };

  // 处理空间分析
  const handleSpatialAnalysis = (analysisType: string) => {
    const typeNames: Record<string, string> = {
      buffer: '缓冲区分析',
      overlay: '叠加分析',
      proximity: '邻近分析',
    };
    message.info(`${typeNames[analysisType] || '该分析'}功能开发中...`);
  };

  // 处理统计分析
  const handleStatistics = (statType: string) => {
    const typeNames: Record<string, string> = {
      chart: '图表',
      summary: '汇总统计',
    };
    message.info(`${typeNames[statType] || '该'}功能开发中...`);
  };

  // 处理地图工具
  const handleMapTool = (tool: string) => {
    window.dispatchEvent(new CustomEvent('mapToolClick', { detail: { tool } }));
  };

  // 处理面板切换
  const handleTogglePanel = (panel: 'catalog' | 'properties' | 'table') => {
    switch (panel) {
      case 'catalog':
        toggleLeftPanel();
        break;
      case 'properties':
        toggleRightPanel();
        break;
      case 'table':
        if (selectedLayer && selectedLayer.type === 'vector') {
          setAttributeTableLayer(selectedLayer.id);
        } else {
          message.warning('请先选择一个矢量图层');
        }
        break;
    }
  };

  const tabs: RibbonTab[] = [
    {
      key: 'home',
      label: '主页',
      groups: [
        {
          key: 'data',
          label: '数据',
          items: [
            { key: 'add-data', label: '添加数据', icon: <PlusOutlined />, onClick: handleOpenShapefile },
          ]
        },
        {
          key: 'selection',
          label: '选择',
          items: [
            { key: 'select', label: '选择', icon: <SelectOutlined />, onClick: handleSelect },
            { key: 'clear', label: '清除', icon: <DeleteOutlined />, onClick: handleClearSelection },
            { key: 'attributes', label: '属性表', icon: <TableOutlined />, onClick: handleOpenAttributeTable },
          ]
        },
      ]
    },
    {
      key: 'insert',
      label: '插入',
      groups: [
        {
          key: 'map',
          label: '地图',
          items: [
            { key: 'basemap', label: '底图', icon: <GlobalOutlined />, dropdown: basemapMenuItems },
          ]
        },
        {
          key: 'layer',
          label: '图层',
          items: [
            { key: 'point', label: '点图层', icon: <EnvironmentOutlined />, onClick: () => handleCreateLayer('point') },
            { key: 'line', label: '线图层', icon: <LineChartOutlined />, onClick: () => handleCreateLayer('line') },
            { key: 'polygon', label: '面图层', icon: <HeatMapOutlined />, onClick: () => handleCreateLayer('polygon') },
          ]
        },
      ]
    },
    {
      key: 'analysis',
      label: '分析',
      groups: [
        {
          key: 'spatial',
          label: '空间分析',
          items: [
            { key: 'buffer', label: '缓冲区', icon: <HeatMapOutlined />, onClick: () => handleSpatialAnalysis('buffer') },
            { key: 'overlay', label: '叠加', icon: <HeatMapOutlined />, onClick: () => handleSpatialAnalysis('overlay') },
            { key: 'proximity', label: '邻近', icon: <HeatMapOutlined />, onClick: () => handleSpatialAnalysis('proximity') },
          ]
        },
        {
          key: 'statistics',
          label: '统计',
          items: [
            { key: 'chart', label: '图表', icon: <BarChartOutlined />, onClick: () => handleStatistics('chart') },
            { key: 'summary', label: '汇总', icon: <TableOutlined />, onClick: () => handleStatistics('summary') },
          ]
        },
      ]
    },
    {
      key: 'view',
      label: '视图',
      groups: [
        {
          key: 'navigate',
          label: '导航',
          items: [
            { key: 'zoom-in', label: '放大', icon: <ZoomInOutlined />, onClick: () => handleMapTool('zoomIn') },
            { key: 'pan', label: '平移', icon: <DragOutlined />, onClick: () => handleMapTool('pan') },
            { key: 'full-extent', label: '全图', icon: <GlobalOutlined />, onClick: () => handleMapTool('fullExtent') },
          ]
        },
        {
          key: 'windows',
          label: '窗口',
          items: [
            { key: 'catalog', label: '目录', icon: <FolderOpenOutlined />, onClick: () => handleTogglePanel('catalog') },
            { key: 'properties', label: '属性', icon: <SettingOutlined />, onClick: () => handleTogglePanel('properties') },
            { key: 'table', label: '表格', icon: <TableOutlined />, onClick: () => handleTogglePanel('table') },
          ]
        },
      ]
    },
  ];

  const currentTabGroups = tabs.find(tab => tab.key === activeTab)?.groups || [];

  return (
    <div className="ribbon-container">
      <div className="ribbon-tabs">
        {tabs.map(tab => (
          <div
            key={tab.key}
            className={`ribbon-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </div>
        ))}
      </div>
      
      <div className="ribbon-content">
        {currentTabGroups.map(group => (
          <div key={group.key} className="ribbon-group">
            <div className="ribbon-group-items">
              {group.items.map(item => (
                <Tooltip key={item.key} title={item.label}>
                  {item.dropdown ? (
                    <Dropdown menu={{ items: item.dropdown }}>
                      <div className="ribbon-item" onClick={item.onClick}>
                        <div className="ribbon-item-icon">{item.icon}</div>
                        <div className="ribbon-item-label">{item.label}</div>
                      </div>
                    </Dropdown>
                  ) : (
                    <div className="ribbon-item" onClick={item.onClick}>
                      <div className="ribbon-item-icon">{item.icon}</div>
                      <div className="ribbon-item-label">{item.label}</div>
                    </div>
                  )}
                </Tooltip>
              ))}
            </div>
            <div className="ribbon-group-label">{group.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RibbonMenu;
