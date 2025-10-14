import React, { useState, useEffect } from 'react';
import { Form, Select, InputNumber, ColorPicker, Switch, Space } from 'antd';
import type { Layer, LabelConfig } from '../../stores/layerStore';
import { useLayerStore } from '../../stores/layerStore';
import './SymbologyPanel.css';

interface LabelPanelProps {
  layer: Layer;
  onClose?: () => void;
}

const LabelPanel: React.FC<LabelPanelProps> = ({ layer, onClose }) => {
  const { updateLayer } = useLayerStore();
  const [form] = Form.useForm();
  const [fields, setFields] = useState<string[]>([]);

  // 获取图层的字段列表
  useEffect(() => {
    if (layer && layer.geojson && layer.geojson.features && layer.geojson.features.length > 0) {
      const firstFeature = layer.geojson.features[0];
      const fieldNames = Object.keys(firstFeature.properties || {});
      setFields(fieldNames.filter(f => f !== '_index')); // 过滤掉内部字段
    } else {
      setFields([]);
    }
  }, [layer]);

  // 初始化表单
  useEffect(() => {
    if (layer) {
      const currentConfig = layer.labelConfig || {
        enabled: false,
        field: fields[0] || '',
        fontSize: 12,
        fontColor: '#000000',
        fontWeight: 'normal',
        haloColor: '#ffffff',
        haloWidth: 1,
        offset: [0, 0],
        anchor: 'center',
      };
      
      form.setFieldsValue({
        enabled: currentConfig.enabled,
        field: currentConfig.field,
        fontSize: currentConfig.fontSize || 12,
        fontColor: currentConfig.fontColor || '#000000',
        fontWeight: currentConfig.fontWeight || 'normal',
        haloColor: currentConfig.haloColor || '#ffffff',
        haloWidth: currentConfig.haloWidth || 1,
        offsetX: currentConfig.offset?.[0] || 0,
        offsetY: -(currentConfig.offset?.[1] || 0), // Y轴取反显示
        anchor: currentConfig.anchor || 'center',
      });
    }
  }, [layer, fields, form]);

  // 实时更新标注配置
  const handleValueChange = (changedValues: any, allValues: any) => {
    const config: LabelConfig = {
      enabled: allValues.enabled,
      field: allValues.field,
      fontSize: allValues.fontSize,
      fontColor: typeof allValues.fontColor === 'string' ? allValues.fontColor : allValues.fontColor?.toHexString?.() || '#000000',
      fontWeight: allValues.fontWeight || 'normal',
      haloColor: typeof allValues.haloColor === 'string' ? allValues.haloColor : allValues.haloColor?.toHexString?.() || '#ffffff',
      haloWidth: allValues.haloWidth,
      offset: [allValues.offsetX, -allValues.offsetY], // Y轴取反，因为MapLibre坐标系与UI相反
      anchor: allValues.anchor,
    };
    
    updateLayer(layer.id, { labelConfig: config });
  };

  if (!layer || layer.type !== 'vector') {
    return (
      <div className="symbology-panel">
        <div className="symbology-content" style={{ padding: '16px' }}>
          <p style={{ textAlign: 'center', color: '#8c8c8c', padding: '40px 20px', fontSize: '13px' }}>
            只有矢量图层支持标注
          </p>
        </div>
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div className="symbology-panel">
        <div className="symbology-content" style={{ padding: '16px' }}>
          <p style={{ textAlign: 'center', color: '#8c8c8c', padding: '40px 20px', fontSize: '13px' }}>
            该图层没有可用字段
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="symbology-panel">
      <div className="symbology-header" style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#262626' }}>{layer.name}</div>
        <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '4px' }}>标注设置</div>
      </div>

      <div className="symbology-content" style={{ padding: '16px' }}>
        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleValueChange}
          size="small"
          initialValues={{
            enabled: false,
            fontSize: 12,
            fontColor: '#000000',
            fontWeight: 'normal',
            haloColor: '#ffffff',
            haloWidth: 1,
            offsetX: 0,
            offsetY: 0,
            anchor: 'center',
          }}
        >
          <Form.Item
            name="enabled"
            label="启用标注"
            valuePropName="checked"
            style={{ marginBottom: 12 }}
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="field"
            label="标注字段"
            rules={[{ required: true, message: '请选择标注字段' }]}
            style={{ marginBottom: 12 }}
          >
            <Select placeholder="选择要显示的字段" size="small">
              {fields.map((field) => (
                <Select.Option key={field} value={field}>
                  {field}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Space style={{ width: '100%', marginBottom: 12 }} size="small">
            <Form.Item
              name="fontSize"
              label="字体大小"
              style={{ marginBottom: 0, flex: 1 }}
            >
              <InputNumber min={8} max={48} size="small" style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="fontWeight"
              label="字体粗细"
              style={{ marginBottom: 0, flex: 1 }}
            >
              <Select size="small" style={{ width: '100%' }}>
                <Select.Option value="normal">正常</Select.Option>
                <Select.Option value="bold">加粗</Select.Option>
              </Select>
            </Form.Item>
          </Space>

          <Space style={{ width: '100%', marginBottom: 12 }} size="small">
            <Form.Item
              name="fontColor"
              label="字体颜色"
              style={{ marginBottom: 0, flex: 1 }}
            >
              <ColorPicker showText format="hex" size="small" style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="haloColor"
              label="光晕颜色"
              style={{ marginBottom: 0, flex: 1 }}
            >
              <ColorPicker showText format="hex" size="small" style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Form.Item
            name="haloWidth"
            label="光晕宽度"
            style={{ marginBottom: 12 }}
          >
            <InputNumber min={0} max={5} step={0.5} size="small" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="anchor"
            label="标注位置"
            style={{ marginBottom: 12 }}
          >
            <Select size="small" style={{ width: '100%' }}>
              <Select.Option value="center">中心</Select.Option>
              <Select.Option value="top">上方</Select.Option>
              <Select.Option value="bottom">下方</Select.Option>
              <Select.Option value="left">左侧</Select.Option>
              <Select.Option value="right">右侧</Select.Option>
              <Select.Option value="top-left">左上</Select.Option>
              <Select.Option value="top-right">右上</Select.Option>
              <Select.Option value="bottom-left">左下</Select.Option>
              <Select.Option value="bottom-right">右下</Select.Option>
            </Select>
          </Form.Item>

          <Space style={{ width: '100%' }} size="small">
            <Form.Item
              name="offsetX"
              label="X偏移"
              style={{ marginBottom: 0, flex: 1 }}
            >
              <InputNumber size="small" style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="offsetY"
              label="Y偏移"
              style={{ marginBottom: 0, flex: 1 }}
              tooltip="正值向上，负值向下"
            >
              <InputNumber size="small" style={{ width: '100%' }} />
            </Form.Item>
          </Space>
        </Form>
      </div>
    </div>
  );
};

export default LabelPanel;
