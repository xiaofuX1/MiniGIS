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
import { useMapTabsStore } from '../../stores/mapTabsStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { useWindowStore } from '../../stores/windowStore';
import { useCRSStore } from '../../stores/crsStore';
import { gdalService } from '../../services/gdalService';
import AboutDialog from '../Dialogs/AboutDialog';
import AddDataDialog from '../Dialogs/AddDataDialog';
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
  const [addDataDialogVisible, setAddDataDialogVisible] = useState(false);
  const mapTabsStore = useMapTabsStore();
  const { clearSelection, setIsSelecting } = useSelectionStore();
  const { showWindow, toggleWindow, updateWindow } = useWindowStore();
  const { currentCRS } = useCRSStore();
  
  const currentTab = mapTabsStore.getCurrentTab();
  const layers = currentTab?.layers || [];
  const selectedLayer = currentTab?.selectedLayer || null;
  
  const addLayer = (layer: any) => mapTabsStore.addLayerToCurrentTab(layer);
  const removeLayer = (layerId: string) => mapTabsStore.removeLayerFromCurrentTab(layerId);
  const selectLayer = (layer: any) => mapTabsStore.setCurrentTabSelectedLayer(layer);
  const addAttributeTableLayer = (layerId: string) => mapTabsStore.addAttributeTableLayerToCurrentTab(layerId);

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

  // 打开GDB数据库
  const handleOpenGDB = async () => {
    try {
      const selected = await open({
        multiple: false,
        directory: true,
        title: '选择GDB数据库文件夹'
      });
      
      if (selected) {
        // 检查是否是GDB文件夹
        if (!selected.toLowerCase().endsWith('.gdb')) {
          message.warning('请选择.gdb格式的数据库文件夹');
          return;
        }
        
        message.loading('正在读取GDB数据库...', 0);
        
        try {
          const multiLayerInfo: any = await invoke('gdal_open_multi_layer_vector', { path: selected });
          console.log(`[GDB数据库] 检测到 ${multiLayerInfo.layer_count} 个图层`);
          
          if (multiLayerInfo.layer_count === 0) {
            message.warning('GDB数据库不包含任何图层');
            message.destroy();
            return;
          }
          
          const sourceCrs = multiLayerInfo.projection || 'EPSG:4326';
          const fileName = selected.split(/[\\/]/).pop()?.replace(/\.gdb$/i, '') || 'GDB图层';
          
          // 按要素集分组图层
          const featureDatasets = new Map<string, any[]>();
          const standaloneFeatureLayers: any[] = [];
          
          multiLayerInfo.layers.forEach((layerInfo: any) => {
            if (layerInfo.feature_dataset) {
              // 属于要素集的图层
              if (!featureDatasets.has(layerInfo.feature_dataset)) {
                featureDatasets.set(layerInfo.feature_dataset, []);
              }
              featureDatasets.get(layerInfo.feature_dataset)!.push(layerInfo);
            } else {
              // 独立的要素类
              standaloneFeatureLayers.push(layerInfo);
            }
          });
          
          // 显示图层选择对话框
          showGDBLayerSelectModal(selected, fileName, sourceCrs, featureDatasets, standaloneFeatureLayers);
          message.destroy();
        } catch (error) {
          message.destroy();
          console.error('读取GDB失败:', error);
          const errorMsg = error instanceof Error ? error.message : String(error);
          message.error(`读取GDB失败: ${errorMsg}`);
        }
      }
    } catch (error) {
      console.error('打开GDB详细错误:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      message.error(`打开GDB失败: ${errorMsg}`);
    }
  };

  // GDB图层选择组件
  const GDBLayerSelector: React.FC<{
    featureDatasets: Map<string, any[]>;
    standaloneFeatureLayers: any[];
    selectedLayersRef: React.MutableRefObject<Set<number>>;
  }> = ({ featureDatasets, standaloneFeatureLayers, selectedLayersRef }) => {
    const [selectedLayers, setSelectedLayers] = useState<Set<number>>(new Set());

    const toggleLayer = (index: number) => {
      const newSelected = new Set(selectedLayers);
      if (newSelected.has(index)) {
        newSelected.delete(index);
      } else {
        newSelected.add(index);
      }
      setSelectedLayers(newSelected);
      selectedLayersRef.current = newSelected;
    };

    return (
      <div style={{ maxHeight: '450px', overflowY: 'auto' }}>
        <div style={{ marginBottom: 8, color: '#666', fontSize: 13 }}>请选择要添加的图层：</div>
        
        {/* 要素集 */}
        {Array.from(featureDatasets.entries()).map(([datasetName, layers]) => (
          <div key={datasetName} style={{ marginBottom: 12 }}>
            <div style={{ 
              fontWeight: 600, 
              fontSize: 13, 
              marginBottom: 4,
              padding: '2px 6px',
              background: '#e6f7ff',
              borderLeft: '3px solid #1890ff'
            }}>
              📁 {datasetName}
            </div>
            {layers.map((layerInfo: any) => (
              <div
                key={layerInfo.index}
                style={{
                  padding: '4px 8px 4px 20px',
                  margin: '2px 0',
                  background: selectedLayers.has(layerInfo.index) ? '#e6f7ff' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                  fontSize: 13
                }}
                onClick={() => toggleLayer(layerInfo.index)}
              >
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={selectedLayers.has(layerInfo.index)}
                    onChange={() => {}}
                    style={{ marginRight: 6 }}
                  />
                  <span style={{ fontWeight: 500 }}>{layerInfo.name}</span>
                  <span style={{ color: '#999', marginLeft: 6, fontSize: 12 }}>
                    ({layerInfo.geometry_type}, {layerInfo.feature_count}要素)
                  </span>
                </label>
              </div>
            ))}
          </div>
        ))}
        
        {/* 独立要素类 */}
        {standaloneFeatureLayers.length > 0 && (
          <div>
            {featureDatasets.size > 0 && (
              <div style={{ 
                fontWeight: 600, 
                fontSize: 13, 
                marginBottom: 4,
                marginTop: 8,
                padding: '2px 6px',
                background: '#f0f0f0',
                borderLeft: '3px solid #999'
              }}>
                📄 独立要素类
              </div>
            )}
            {standaloneFeatureLayers.map((layerInfo: any) => (
              <div
                key={layerInfo.index}
                style={{
                  padding: '4px 8px',
                  margin: '2px 0',
                  background: selectedLayers.has(layerInfo.index) ? '#e6f7ff' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                  fontSize: 13
                }}
                onClick={() => toggleLayer(layerInfo.index)}
              >
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={selectedLayers.has(layerInfo.index)}
                    onChange={() => {}}
                    style={{ marginRight: 6 }}
                  />
                  <span style={{ fontWeight: 500 }}>{layerInfo.name}</span>
                  <span style={{ color: '#999', marginLeft: 6, fontSize: 12 }}>
                    ({layerInfo.geometry_type}, {layerInfo.feature_count}要素)
                  </span>
                </label>
              </div>
            ))}
          </div>
        )}
        
        <div style={{ marginTop: 12, padding: 8, background: '#f5f5f5', borderRadius: 4, fontSize: 12, color: '#666' }}>
          已选择 {selectedLayers.size} 个图层
        </div>
      </div>
    );
  };

  // 显示GDB图层选择对话框
  const showGDBLayerSelectModal = (
    gdbPath: string,
    gdbName: string,
    sourceCrs: string,
    featureDatasets: Map<string, any[]>,
    standaloneFeatureLayers: any[]
  ) => {
    const selectedLayersRef = React.createRef<Set<number>>() as React.MutableRefObject<Set<number>>;
    selectedLayersRef.current = new Set();
    
    Modal.confirm({
      title: `选择图层 - ${gdbName}`,
      width: 580,
      content: (
        <GDBLayerSelector
          featureDatasets={featureDatasets}
          standaloneFeatureLayers={standaloneFeatureLayers}
          selectedLayersRef={selectedLayersRef}
        />
      ),
      icon: null,
      okText: '添加选中图层',
      cancelText: '取消',
      onOk: async () => {
        const selectedIndexes = selectedLayersRef.current;
        
        if (selectedIndexes.size === 0) {
          message.warning('请至少选择一个图层');
          return Promise.reject();
        }
        
        message.loading(`正在加载 ${selectedIndexes.size} 个图层...`, 0);
        
        try {
          // 获取所有图层信息
          const allLayers = [
            ...Array.from(featureDatasets.values()).flat(),
            ...standaloneFeatureLayers
          ];
          
          // 加载选中的图层（优化：延迟加载GeoJSON）
          for (const layerIndex of selectedIndexes) {
            const layerInfo = allLayers.find((l: any) => l.index === layerIndex);
            if (!layerInfo) continue;
            
            const extent = {
              minX: layerInfo.extent.min_x,
              minY: layerInfo.extent.min_y,
              maxX: layerInfo.extent.max_x,
              maxY: layerInfo.extent.max_y,
            };
            
            // 只在要素数量较少时预加载GeoJSON，否则按需加载
            let geojson = undefined;
            if (layerInfo.feature_count < 1000) {
              geojson = await invoke('gdal_get_layer_geojson', { path: gdbPath, layerIndex });
            }
            
            await addLayer({
              id: `${Date.now()}_${layerIndex}`,
              name: layerInfo.name,
              type: 'vector',
              source: { 
                type: 'geo_json' as any, 
                path: gdbPath,
                layerIndex: layerIndex  // 关键：保存layerIndex用于属性表
              },
              visible: true,
              opacity: 1,
              projection: sourceCrs,
              extent: extent,
              geojson: geojson,
            });
          }
          
          message.destroy();
          message.success(`成功加载 ${selectedIndexes.size} 个图层`);
        } catch (error) {
          message.destroy();
          console.error('加载图层失败:', error);
          const errorMsg = error instanceof Error ? error.message : String(error);
          message.error(`加载图层失败: ${errorMsg}`);
          return Promise.reject();
        }
      },
    });
  };

  // 打开矢量文件（支持 Shapefile、GeoJSON、KML、KMZ、GPKG、GDB 等多种格式）
  const handleOpenVectorFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        directory: false,
        filters: [{
          name: '矢量文件',
          extensions: ['shp', 'gpkg', 'geojson', 'json', 'kml', 'kmz', 'tab', 'gml']
        }]
      });
      
      if (selected) {
        // 检查是否是GDB文件夹（用户可能手动输入路径）
        if (selected.toLowerCase().endsWith('.gdb')) {
          handleOpenGDB();
          return;
        }
        
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
        const fileName = selected.split(/[\\/]/).pop() || '矢量图层';
        const layerName = fileName.replace(/\.(shp|gpkg|geojson|json|kml|kmz|tab|gml)$/i, '');
        
        await addLayer({
          id: Date.now().toString(),
          name: layerName,
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
    // 触发当前标签页地图工具栏的选择按钮
    window.dispatchEvent(new CustomEvent('mapToolClick', { 
      detail: { 
        tabId: currentTab?.id,
        tool: 'select' 
      } 
    }));
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
    window.dispatchEvent(new CustomEvent('clearSelection', {
      detail: { tabId: currentTab?.id }
    }));
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
    window.dispatchEvent(new CustomEvent('mapToolClick', { 
      detail: { 
        tabId: currentTab?.id,
        tool 
      } 
    }));
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

  // 新建地图功能
  const handleNewMap = () => {
    const newTabId = mapTabsStore.addTab();
    message.success('已创建新地图');
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

  // 打开添加数据对话框
  const handleOpenAddDataDialog = () => {
    setAddDataDialogVisible(true);
  };

  // 去除文件扩展名的辅助函数
  const removeFileExtension = (fileName: string): string => {
    return fileName.replace(/\.(shp|gpkg|geojson|json|kml|kmz|tab|gml)$/i, '');
  };

  // 处理添加数据对话框选择的文件
  const handleAddDataConfirm = async (files: any[]) => {
    message.loading(`正在加载 ${files.length} 个数据源...`, 0);
    
    try {
      for (const file of files) {
        if (file.type === 'gdb-layer') {
          // GDB图层 - 直接加载指定的图层
          const gdbPath = file.parentGdbPath;
          const layerIndex = file.layerIndex;
          
          try {
            const multiLayerInfo: any = await invoke('gdal_open_multi_layer_vector', { path: gdbPath });
            const layerInfo = multiLayerInfo.layers.find((l: any) => l.index === layerIndex);
            
            if (!layerInfo) {
              console.error('未找到图层:', layerIndex);
              continue;
            }
            
            const sourceCrs = multiLayerInfo.projection || 'EPSG:4326';
            const extent = {
              minX: layerInfo.extent.min_x,
              minY: layerInfo.extent.min_y,
              maxX: layerInfo.extent.max_x,
              maxY: layerInfo.extent.max_y,
            };
            
            // 只在要素数量较少时预加载GeoJSON
            let geojson = undefined;
            if (layerInfo.feature_count < 1000) {
              geojson = await invoke('gdal_get_layer_geojson', { path: gdbPath, layerIndex });
            }
            
            await addLayer({
              id: `${Date.now()}_${layerIndex}`,
              name: layerInfo.name,
              type: 'vector',
              source: { 
                type: 'geo_json' as any, 
                path: gdbPath,
                layerIndex: layerIndex
              },
              visible: true,
              opacity: 1,
              projection: sourceCrs,
              extent: extent,
              geojson: geojson,
            });
          } catch (error) {
            console.error('加载GDB图层失败:', error);
            message.error(`加载图层 ${file.name} 失败`);
          }
        } else if (file.type === 'gdb') {
          // GDB数据库 - 显示图层选择
          const multiLayerInfo: any = await invoke('gdal_open_multi_layer_vector', { path: file.path });
          
          const sourceCrs = multiLayerInfo.projection || 'EPSG:4326';
          const fileName = file.name.replace(/\.gdb$/i, '');
          
          // 按要素集分组
          const featureDatasets = new Map<string, any[]>();
          const standaloneFeatureLayers: any[] = [];
          
          multiLayerInfo.layers.forEach((layerInfo: any) => {
            if (layerInfo.feature_dataset) {
              if (!featureDatasets.has(layerInfo.feature_dataset)) {
                featureDatasets.set(layerInfo.feature_dataset, []);
              }
              featureDatasets.get(layerInfo.feature_dataset)!.push(layerInfo);
            } else {
              standaloneFeatureLayers.push(layerInfo);
            }
          });
          
          message.destroy();
          showGDBLayerSelectModal(file.path, fileName, sourceCrs, featureDatasets, standaloneFeatureLayers);
          return; // 等待用户在GDB对话框中选择
        } else if (file.type === 'file') {
          // 普通矢量文件
          const ext = file.extension?.toLowerCase();
          const isKmlFile = ext === 'kml' || ext === 'kmz';
          
          if (isKmlFile) {
            // KML可能有多图层
            const multiLayerInfo: any = await invoke('gdal_open_multi_layer_vector', { path: file.path });
            
            if (multiLayerInfo.layer_count > 1) {
              // 多图层KML
              const sourceCrs = multiLayerInfo.projection || 'EPSG:4326';
              for (let i = 0; i < multiLayerInfo.layers.length; i++) {
                const layerInfo = multiLayerInfo.layers[i];
                const geojson = await invoke('gdal_get_layer_geojson', { path: file.path, layerIndex: i });
                
                await addLayer({
                  id: `${Date.now()}_${i}`,
                  name: `${removeFileExtension(file.name)} - ${layerInfo.name}`,
                  type: 'vector',
                  source: { type: 'geo_json' as any, path: file.path, layerIndex: i },
                  visible: true,
                  opacity: 1,
                  projection: sourceCrs,
                  extent: {
                    minX: layerInfo.extent.min_x,
                    minY: layerInfo.extent.min_y,
                    maxX: layerInfo.extent.max_x,
                    maxY: layerInfo.extent.max_y,
                  },
                  geojson,
                });
              }
            } else {
              // 单图层KML
              const vectorInfo: any = await invoke('gdal_open_vector', { path: file.path });
              const geojson = await invoke('gdal_get_geojson', { path: file.path });
              
              await addLayer({
                id: `${Date.now()}`,
                name: removeFileExtension(file.name),
                type: 'vector',
                source: { type: 'geo_json' as any, path: file.path },
                visible: true,
                opacity: 1,
                projection: vectorInfo.projection || 'EPSG:4326',
                extent: {
                  minX: vectorInfo.extent.min_x,
                  minY: vectorInfo.extent.min_y,
                  maxX: vectorInfo.extent.max_x,
                  maxY: vectorInfo.extent.max_y,
                },
                geojson,
              });
            }
          } else {
            // 其他矢量文件
            const vectorInfo: any = await invoke('gdal_open_vector', { path: file.path });
            const geojson = await invoke('gdal_get_geojson', { path: file.path });
            
            // 根据文件扩展名确定source type
            const getSourceType = (ext?: string): string => {
              switch (ext) {
                case 'shp': return 'shapefile';
                case 'gpkg': return 'geo_json';
                case 'geojson':
                case 'json': return 'geo_json';
                case 'kml':
                case 'kmz': return 'geo_json';
                case 'tab': return 'geo_json';
                case 'gml': return 'geo_json';
                default: return 'geo_json';
              }
            };
            
            console.log('[添加数据] 添加文件:', {
              name: file.name,
              path: file.path,
              extension: file.extension,
              sourceType: getSourceType(file.extension)
            });
            
            await addLayer({
              id: `${Date.now()}`,
              name: removeFileExtension(file.name),
              type: 'vector',
              source: { 
                type: getSourceType(file.extension) as any, 
                path: file.path 
              },
              visible: true,
              opacity: 1,
              projection: vectorInfo.projection || 'EPSG:4326',
              extent: {
                minX: vectorInfo.extent.min_x,
                minY: vectorInfo.extent.min_y,
                maxX: vectorInfo.extent.max_x,
                maxY: vectorInfo.extent.max_y,
              },
              geojson,
            });
          }
        }
      }
      
      message.destroy();
      message.success(`成功加载 ${files.length} 个数据源`);
    } catch (error) {
      message.destroy();
      console.error('加载数据失败:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      message.error(`加载数据失败: ${errorMsg}`);
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
            { key: 'add-data', label: '添加数据', icon: <PlusOutlined />, onClick: handleOpenAddDataDialog },
            { key: 'basemap', label: '底图', icon: <GlobalOutlined />, dropdown: basemapMenuItems },
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
      key: 'insert',
      label: '插入',
      groups: [
        {
          key: 'map',
          label: '地图',
          items: [
            { key: 'new-map', label: '新建地图', icon: <PlusOutlined />, onClick: handleNewMap },
          ]
        },
      ]
    },
    {
      key: 'analysis',
      label: '工具',
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

  const currentTabGroups = tabs.find((tab) => tab.key === activeTab)?.groups || [];

  return (
    <div className="ribbon-menu">
      {aboutDialogVisible && (
        <AboutDialog
          visible={aboutDialogVisible}
          onClose={() => setAboutDialogVisible(false)}
        />
      )}
      
      {addDataDialogVisible && (
        <AddDataDialog
          visible={addDataDialogVisible}
          onClose={() => setAddDataDialogVisible(false)}
          onAdd={handleAddDataConfirm}
        />
      )}
      
      <div className="ribbon-tabs">
        {tabs.map((tab) => (
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
