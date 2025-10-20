import React, { useState } from 'react';
import { 
  PlusOutlined, DeleteOutlined, SettingOutlined,
  SelectOutlined, DragOutlined, ZoomInOutlined, ZoomOutOutlined,
  TableOutlined, BarChartOutlined, HeatMapOutlined,
  EnvironmentOutlined, LineChartOutlined,
  GlobalOutlined, FolderOpenOutlined, InfoCircleOutlined,
  FullscreenOutlined, BgColorsOutlined, FolderViewOutlined,
  EyeOutlined, FontSizeOutlined, AimOutlined, QuestionCircleOutlined,
  ExportOutlined
} from '@ant-design/icons';
import { Tooltip, Dropdown, message, Modal } from 'antd';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useLayerStore } from '../../stores/layerStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { useWindowStore } from '../../stores/windowStore';
import { useCRSStore } from '../../stores/crsStore';
import { gdalService } from '../../services/gdalService';
import AboutDialog from '../Dialogs/AboutDialog';
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
  const [aboutDialogVisible, setAboutDialogVisible] = useState(false);
  const { addLayer, layers, removeLayer, selectedLayer, addAttributeTableLayer, selectLayer } = useLayerStore();
  const { clearSelection, setIsSelecting } = useSelectionStore();
  const { showWindow, toggleWindow, updateWindow } = useWindowStore();
  const { currentCRS } = useCRSStore();

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

  // 打开矢量文件（支持 Shapefile、GeoJSON、KML、KMZ、GPKG 等多种格式）
  const handleOpenVectorFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: '矢量文件',
          extensions: ['shp', 'gpkg', 'geojson', 'json', 'kml', 'kmz', 'tab', 'gml']
        }]
      });
      
      if (selected) {
        message.loading('正在加载文件...', 0);
        
        // 获取文件扩展名
        const ext = selected.split('.').pop()?.toLowerCase() || '';
        const isKmlFile = ext === 'kml' || ext === 'kmz';
        
        // KML/KMZ文件可能包含多个图层，使用专用API
        if (isKmlFile) {
          try {
            const multiLayerInfo: any = await invoke('gdal_open_multi_layer_vector', { path: selected });
            console.log(`[KML文件] 检测到 ${multiLayerInfo.layer_count} 个图层`);
            
            if (multiLayerInfo.layer_count === 0) {
              message.warning('KML文件不包含任何图层');
              message.destroy();
              return;
            }
            
            const sourceCrs = multiLayerInfo.projection || 'EPSG:4326';
            const fileName = selected.split(/[\\/]/).pop()?.replace(/\.[^/.]+$/, '') || 'KML图层';
            
            if (multiLayerInfo.layer_count === 1) {
              // 单图层，直接添加
              const layerInfo = multiLayerInfo.layers[0];
              const geojson = await invoke('gdal_get_layer_geojson', { path: selected, layerIndex: 0 });
              
              const extent = {
                minX: layerInfo.extent.min_x,
                minY: layerInfo.extent.min_y,
                maxX: layerInfo.extent.max_x,
                maxY: layerInfo.extent.max_y,
              };
              
              await addLayer({
                id: Date.now().toString(),
                name: layerInfo.name || fileName,
                type: 'vector',
                source: { type: 'geo_json' as any, path: selected },
                visible: true,
                opacity: 1,
                projection: sourceCrs,
                extent: extent,
                geojson: geojson,
              });
              
              message.success(`成功加载KML图层: ${layerInfo.name}`);
            } else {
              // 多图层，创建分组
              const groupId = `group_${Date.now()}`;
              const groupLayer: any = {
                id: groupId,
                name: fileName,
                type: 'vector',
                source: { type: 'geo_json' as any, path: selected },
                visible: true,
                opacity: 1,
                isGroup: true,
                expanded: true,
                children: []
              };
              
              // 添加所有子图层
              for (let i = 0; i < multiLayerInfo.layers.length; i++) {
                const layerInfo = multiLayerInfo.layers[i];
                const geojson = await invoke('gdal_get_layer_geojson', { path: selected, layerIndex: i });
                
                const extent = {
                  minX: layerInfo.extent.min_x,
                  minY: layerInfo.extent.min_y,
                  maxX: layerInfo.extent.max_x,
                  maxY: layerInfo.extent.max_y,
                };
                
                const childLayer: any = {
                  id: `${groupId}_layer_${i}`,
                  name: layerInfo.name,
                  type: 'vector',
                  source: { 
                    type: 'geo_json' as any, 
                    path: selected,
                    layerIndex: i  // 记录图层索引，用于读取正确的数据
                  },
                  visible: true,
                  opacity: 1,
                  projection: sourceCrs,
                  extent: extent,
                  geojson: geojson,
                  groupId: groupId,
                };
                
                groupLayer.children.push(childLayer);
              }
              
              // 添加分组图层
              await addLayer(groupLayer);
              message.success(`成功加载KML文件: ${fileName} (${multiLayerInfo.layer_count}个图层)`);
            }
            
            message.destroy();
            return;
          } catch (kmlError) {
            console.warn('多图层API失败，回退到单图层模式:', kmlError);
            // 如果多图层API失败，回退到原来的单图层处理
          }
        }
        
        // 非KML文件或KML回退模式：使用原有的单图层处理
        const info: any = await invoke('gdal_open_vector', { path: selected });
        
        // 获取数据的原始坐标系
        const sourceCrs = info.projection || 'EPSG:4326';
        console.log(`[文件加载] 数据坐标系: ${sourceCrs}, 地图坐标系: ${currentCRS.code}`);
        
        // 使用 GDAL 获取 GeoJSON 数据（保持原始坐标系）
        const geojson = await invoke('gdal_get_geojson', { path: selected });
        
        // 不再手动投影，OpenLayers会根据layer.projection自动投影
        console.log(`[文件加载] 使用OpenLayers动态投影: ${sourceCrs} -> ${currentCRS.code}`);
        message.success(`成功打开文件: ${selected}`);
        message.info(`数据坐标系: ${sourceCrs}，将自动投影到地图坐标系: ${currentCRS.code}`, 2);
        
        // 映射后端的 snake_case 到前端的 camelCase
        const extent = info.extent ? {
          minX: info.extent.min_x,
          minY: info.extent.min_y,
          maxX: info.extent.max_x,
          maxY: info.extent.max_y,
        } : undefined;
        
        // 映射文件扩展名到后端支持的source type
        const getSourceType = (extension: string): string => {
          switch (extension) {
            case 'shp':
              return 'shapefile';
            case 'kml':
            case 'kmz':
            case 'geojson':
            case 'json':
              return 'geo_json';
            case 'gpkg':
              return 'geo_json';
            default:
              return 'geo_json';
          }
        };
        
        // 添加图层
        await addLayer({
          id: Date.now().toString(),
          name: selected.split(/[\\/]/).pop()?.replace(/\.[^/.]+$/, '') || '矢量图层',
          type: 'vector',
          source: { type: getSourceType(ext) as any, path: selected },
          visible: true,
          opacity: 1,
          projection: sourceCrs,
          extent: extent,
          geojson: geojson,
        });
        
        message.destroy();
      }
    } catch (error) {
      message.destroy();
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

  // 导航菜单项（需要在 handleSelect 之后定义）
  const navigationMenuItems = [
    { key: 'explore', label: '浏览', icon: <EyeOutlined />, onClick: () => handleMapTool('pan') },
    { key: 'full-extent', label: '完全', icon: <FullscreenOutlined />, onClick: () => handleMapTool('fullExtent') },
    { key: 'zoom-in', label: '放大', icon: <ZoomInOutlined />, onClick: () => handleMapTool('zoomIn') },
    { key: 'zoom-out', label: '缩小', icon: <ZoomOutOutlined />, onClick: () => handleMapTool('zoomOut') },
    { key: 'divider', type: 'divider' as const },
    { key: 'select', label: '选择', icon: <SelectOutlined />, onClick: handleSelect },
  ];

  // 处理清除选择
  const handleClearSelection = () => {
    clearSelection();
    window.dispatchEvent(new CustomEvent('clearSelection'));
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
  const handleTogglePanel = (panel: 'catalog' | 'properties' | 'table' | 'symbology' | 'label') => {
    switch (panel) {
      case 'catalog':
        // 图层管理
        toggleWindow('layer-panel');
        break;
      case 'properties':
        // 要素信息
        if (selectedLayer) {
          showWindow('feature-info');
        } else {
          handleLayerSelection('properties');
        }
        break;
      case 'symbology':
        // 符号系统 - 需要选择矢量图层
        if (selectedLayer && selectedLayer.type === 'vector') {
          updateWindow('symbology', {
            title: `符号设置 - ${selectedLayer.name}`,
            metadata: { layerId: selectedLayer.id }
          });
          showWindow('symbology', { layerId: selectedLayer.id });
        } else {
          handleLayerSelection('symbology');
        }
        break;
      case 'label':
        // 标注 - 需要选择矢量图层
        if (selectedLayer && selectedLayer.type === 'vector') {
          updateWindow('label', {
            title: `标注设置 - ${selectedLayer.name}`,
            metadata: { layerId: selectedLayer.id }
          });
          showWindow('label', { layerId: selectedLayer.id });
        } else {
          handleLayerSelection('label');
        }
        break;
      case 'table':
        // 属性表 - 需要矢量图层
        if (selectedLayer && selectedLayer.type === 'vector') {
          addAttributeTableLayer(selectedLayer.id);
          showWindow('attribute-table', { layerId: selectedLayer.id });
        } else {
          handleLayerSelection('table');
        }
        break;
    }
  };

  // 智能处理图层选择：只有一个矢量图层直接使用，多个才弹窗
  const handleLayerSelection = (action: 'properties' | 'symbology' | 'table' | 'label') => {
    const vectorLayers = layers.filter(l => l.type === 'vector');
    
    if (vectorLayers.length === 0) {
      message.warning('没有可用的矢量图层');
      return;
    }
    
    if (vectorLayers.length === 1) {
      // 只有一个矢量图层，直接使用
      const layer = vectorLayers[0];
      selectLayer(layer);
      
      if (action === 'table') {
        addAttributeTableLayer(layer.id);
        showWindow('attribute-table', { layerId: layer.id});
      } else if (action === 'properties') {
        showWindow('feature-info');
      } else if (action === 'symbology') {
        updateWindow('symbology', {
          title: `符号设置 - ${layer.name}`,
          metadata: { layerId: layer.id }
        });
        showWindow('symbology', { layerId: layer.id });
      } else if (action === 'label') {
        updateWindow('label', {
          title: `标注设置 - ${layer.name}`,
          metadata: { layerId: layer.id }
        });
        showWindow('label', { layerId: layer.id });
      }
    } else {
      // 多个矢量图层，弹窗选择
      showLayerSelectModal(action);
    }
  };

  // 显示图层选择对话框
  const showLayerSelectModal = (action: 'properties' | 'symbology' | 'table' | 'label') => {
    const vectorLayers = layers.filter(l => l.type === 'vector');
    
    if (vectorLayers.length === 0) {
      message.warning('没有可用的矢量图层');
      return;
    }

    const actionNames = {
      properties: '查看要素信息',
      symbology: '设置符号系统',
      table: '打开属性表',
      label: '设置标注'
    };

    Modal.confirm({
      title: `选择图层 - ${actionNames[action]}`,
      content: (
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          <div style={{ marginBottom: 12, color: '#666' }}>请选择要操作的图层：</div>
          {vectorLayers.map(layer => (
            <div
              key={layer.id}
              style={{
                padding: '8px 12px',
                margin: '4px 0',
                background: '#f5f5f5',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#e6f7ff'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#f5f5f5'}
              onClick={() => {
                selectLayer(layer);
                Modal.destroyAll();
                setTimeout(() => {
                  if (action === 'table') {
                    addAttributeTableLayer(layer.id);
                    showWindow('attribute-table', { layerId: layer.id });
                  } else if (action === 'properties') {
                    showWindow('feature-info');
                  } else if (action === 'symbology') {
                    updateWindow('symbology', {
                      title: `符号设置 - ${layer.name}`,
                      metadata: { layerId: layer.id }
                    });
                    showWindow('symbology', { layerId: layer.id });
                  } else if (action === 'label') {
                    updateWindow('label', {
                      title: `标注设置 - ${layer.name}`,
                      metadata: { layerId: layer.id }
                    });
                    showWindow('label', { layerId: layer.id });
                  }
                }, 100);
              }}
            >
              <div style={{ fontWeight: 500 }}>{layer.name}</div>
              <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                ID: {layer.id}
              </div>
            </div>
          ))}
        </div>
      ),
      icon: null,
      okButtonProps: { style: { display: 'none' } },
      cancelText: '取消',
      width: 480,
    });
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
            { key: 'add-data', label: '添加数据', icon: <PlusOutlined />, onClick: handleOpenVectorFile },
            { key: 'basemap', label: '底图', icon: <GlobalOutlined />, dropdown: basemapMenuItems },
            { key: 'crs', label: '坐标系', icon: <AimOutlined />, onClick: () => showWindow('crs-settings') },
          ]
        },
        {
          key: 'navigate',
          label: '导航',
          items: [
            { key: 'navigation', label: '导航', icon: <DragOutlined />, dropdown: navigationMenuItems },
            { key: 'clear', label: '清除', icon: <DeleteOutlined />, onClick: handleClearSelection },
          ]
        },
        {
          key: 'windows',
          label: '窗口',
          items: [
            { key: 'attributes', label: '属性表', icon: <TableOutlined />, onClick: () => handleTogglePanel('table') },
            { key: 'catalog', label: '图层管理', icon: <FolderViewOutlined />, onClick: () => handleTogglePanel('catalog') },
            { key: 'properties', label: '要素信息', icon: <InfoCircleOutlined />, onClick: () => handleTogglePanel('properties') },
            { key: 'symbology', label: '符号系统', icon: <BgColorsOutlined />, onClick: () => handleTogglePanel('symbology') },
            { key: 'label', label: '标注', icon: <FontSizeOutlined />, onClick: () => handleTogglePanel('label') },
          ]
        },
      ]
    },
    {
      key: 'analysis',
      label: '分析',
      groups: [
        {
          key: 'export',
          label: '导出',
          items: [
            { key: 'export-tool', label: '导出', icon: <ExportOutlined />, onClick: () => showWindow('export-tool') },
          ]
        },
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
      key: 'other',
      label: '其他',
      groups: [
        {
          key: 'info',
          label: '信息',
          items: [
            { 
              key: 'about', 
              label: '关于', 
              icon: <QuestionCircleOutlined />, 
              onClick: () => setAboutDialogVisible(true) 
            },
          ]
        },
      ]
    },
  ];

  const currentTabGroups = tabs.find(tab => tab.key === activeTab)?.groups || [];

  return (
    <>
      <AboutDialog 
        visible={aboutDialogVisible} 
        onClose={() => setAboutDialogVisible(false)} 
      />
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
    </>
  );
};

export default RibbonMenu;
