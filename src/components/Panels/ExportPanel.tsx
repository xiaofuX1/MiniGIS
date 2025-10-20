import React, { useState } from 'react';
import { Form, Select, Button, App, Space, Typography, Divider } from 'antd';
import { ExportOutlined, FileOutlined } from '@ant-design/icons';
import { useLayerStore } from '../../stores/layerStore';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import './SymbologyPanel.css';

const { Text } = Typography;

interface ExportPanelProps {
  onClose?: () => void;
}

const ExportPanel: React.FC<ExportPanelProps> = ({ onClose }) => {
  const { message } = App.useApp();
  const { layers } = useLayerStore();
  const [form] = Form.useForm();
  const [exporting, setExporting] = useState(false);

  // 获取所有矢量图层（包括分组图层的子图层）
  const getAllVectorLayers = () => {
    const result: typeof layers = [];
    
    const processLayer = (layer: typeof layers[0]) => {
      // 如果是分组图层，处理其子图层
      if (layer.isGroup && layer.children) {
        layer.children.forEach(child => {
          if (child.type === 'vector' && child.source?.path) {
            result.push(child);
          }
        });
      } else if (layer.type === 'vector' && layer.source?.path) {
        // 普通矢量图层
        result.push(layer);
      }
    };
    
    layers.forEach(processLayer);
    return result;
  };
  
  const vectorLayers = getAllVectorLayers();

  // 导出格式选项
  const formatOptions = [
    { label: 'KML', value: 'KML', extension: 'kml' },
    { label: 'KMZ (压缩KML)', value: 'KMZ', extension: 'kmz' },
    { label: 'GeoJSON', value: 'GEOJSON', extension: 'geojson' },
    { label: 'Shapefile', value: 'SHAPEFILE', extension: 'shp' },
    { label: 'GeoPackage', value: 'GPKG', extension: 'gpkg' },
  ];

  // 执行导出
  const handleExport = async () => {
    try {
      const values = await form.validateFields();
      const { layerId, format } = values;

      // 获取选中的图层（包括子图层）
      const layer = vectorLayers.find(l => l.id === layerId);
      if (!layer || !layer.source?.path) {
        message.error('无法找到图层源文件');
        return;
      }

      // 获取导出格式对应的扩展名
      const formatOption = formatOptions.find(f => f.value === format);
      if (!formatOption) {
        message.error('不支持的导出格式');
        return;
      }

      // 打开保存对话框
      const outputPath = await save({
        defaultPath: `${layer.name}_export.${formatOption.extension}`,
        filters: [{
          name: formatOption.label,
          extensions: [formatOption.extension]
        }]
      });

      if (!outputPath) {
        return; // 用户取消
      }

      // 执行导出
      setExporting(true);
      message.loading({ content: '正在导出...', key: 'export', duration: 0 });

      // 构建导出参数，如果是子图层则传递layerIndex
      const exportParams: any = {
        inputPath: layer.source.path,
        outputPath: outputPath,
        format: format,
      };
      
      // 如果图层有layerIndex（KML/GDB等多图层文件的子图层），则传递索引
      if (layer.source.layerIndex !== undefined) {
        exportParams.layerIndex = layer.source.layerIndex;
      }

      await invoke('gdal_export_vector', exportParams);

      message.success({ content: `导出成功: ${outputPath}`, key: 'export', duration: 3 });
      
    } catch (error) {
      console.error('导出失败详细信息:', error);
      let errorMsg = '未知错误';
      
      if (error && typeof error === 'object') {
        // Tauri错误对象可能有不同的结构
        if ('message' in error) {
          errorMsg = String(error.message);
        } else if ('error' in error) {
          errorMsg = String(error.error);
        } else {
          errorMsg = JSON.stringify(error);
        }
      } else if (error) {
        errorMsg = String(error);
      }
      
      console.error('错误消息:', errorMsg);
      message.error({ content: `导出失败: ${errorMsg}`, key: 'export', duration: 5 });
    } finally {
      setExporting(false);
    }
  };

  if (vectorLayers.length === 0) {
    return (
      <div className="symbology-panel">
        <div className="symbology-header" style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#262626' }}>
            <FileOutlined style={{ marginRight: 8 }} />
            导出数据
          </div>
          <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>将矢量图层导出为其他格式</div>
        </div>
        <div className="symbology-content" style={{ padding: '16px' }}>
          <p style={{ textAlign: 'center', color: '#8c8c8c', padding: '40px 20px', fontSize: '13px' }}>
            没有可导出的矢量图层
          </p>
          <p style={{ textAlign: 'center', color: '#8c8c8c', padding: '0 20px', fontSize: '12px' }}>
            请先添加矢量图层数据
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="symbology-panel">
      <div className="symbology-header" style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#262626' }}>
          <FileOutlined style={{ marginRight: 8 }} />
          导出数据
        </div>
        <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>将矢量图层导出为其他格式</div>
      </div>

      <div className="symbology-content" style={{ padding: '16px' }}>
        <Form
          form={form}
          layout="vertical"
          size="small"
        >
          <Form.Item
            name="layerId"
            label="选择图层"
            rules={[{ required: true, message: '请选择要导出的图层' }]}
            style={{ marginBottom: 16 }}
          >
            <Select placeholder="选择要导出的图层" size="middle">
              {vectorLayers.map((layer) => (
                <Select.Option key={layer.id} value={layer.id}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{layer.name}</span>
                    <span style={{ fontSize: 11, color: '#999', marginLeft: 8 }}>
                      {layer.geojson?.features?.length || 0} 要素
                    </span>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="format"
            label="导出格式"
            rules={[{ required: true, message: '请选择导出格式' }]}
            style={{ marginBottom: 16 }}
            initialValue="KML"
          >
            <Select placeholder="选择导出格式" size="middle">
              {formatOptions.map((option) => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Divider style={{ margin: '16px 0' }} />

          <div style={{ marginBottom: 16 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <strong>说明：</strong>
            </Text>
            <ul style={{ fontSize: 12, color: '#8c8c8c', marginTop: 8, paddingLeft: 20 }}>
              <li>KML：Google Earth标准格式</li>
              <li>KMZ：压缩的KML文件</li>
              <li>GeoJSON：Web应用常用格式</li>
              <li>Shapefile：GIS标准格式</li>
              <li>GeoPackage：现代GIS交换格式</li>
            </ul>
          </div>

          <Space style={{ width: '100%' }} direction="vertical" size="small">
            <Button
              type="primary"
              icon={<ExportOutlined />}
              onClick={handleExport}
              loading={exporting}
              block
              size="middle"
            >
              导出
            </Button>
          </Space>
        </Form>
      </div>
    </div>
  );
};

export default ExportPanel;
