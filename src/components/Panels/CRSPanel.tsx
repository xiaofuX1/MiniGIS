import React, { useState, useMemo } from 'react';
import { Input, Tree, Space, Tag, Typography, message, Button, Divider, Card, Alert } from 'antd';
import { SearchOutlined, GlobalOutlined, CheckOutlined, ApartmentOutlined } from '@ant-design/icons';
import { useCRSStore, ALL_CRS_LIST, CRSInfo, CRSUtils } from '../../stores/crsStore';
import { useLayerStore } from '../../stores/layerStore';
import type { DataNode } from 'antd/es/tree';
import './CRSPanel.css';

// 扩展DataNode以包含data属性
interface CRSDataNode extends DataNode {
  data?: CRSInfo;
}

const { TextArea } = Input;
const { Text } = Typography;

const CRSPanel: React.FC = () => {
  const { currentCRS, setCRS, getCRSByCode } = useCRSStore();
  const { selectedLayer } = useLayerStore();
  const [searchText, setSearchText] = useState('');
  const [selectedCRS, setSelectedCRS] = useState<CRSInfo>(currentCRS);
  const [selectedKey, setSelectedKey] = useState<string>(currentCRS.code);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>(['geographic', 'projected']);

  // 解析WKT字符串，提取EPSG代码或关键信息
  const parseProjectionWKT = (wkt: string): CRSInfo | null => {
    console.log('[CRS] 解析WKT:', wkt.substring(0, 200));
    
    // 如果已经是EPSG代码格式，直接查找
    if (wkt.startsWith('EPSG:')) {
      return getCRSByCode(wkt) || null;
    }
    
    // 解析CGCS2000 3度带 zone
    const zone3Match = wkt.match(/CGCS2000_3_Degree_GK_Zone_(\d+)/i);
    if (zone3Match) {
      const zone = parseInt(zone3Match[1]);
      const epsgCode = CRSUtils.getEPSGFrom3DegreeZone(zone);
      if (epsgCode) {
        console.log('[CRS] 识别为CGCS2000 3度带 zone', zone, '对应', epsgCode);
        const crs = getCRSByCode(epsgCode);
        if (crs) return crs;
      }
    }
    
    // 解析CGCS2000 6度带 zone
    const zone6Match = wkt.match(/CGCS2000_6_Degree_GK_Zone_(\d+)/i);
    if (zone6Match) {
      const zone = parseInt(zone6Match[1]);
      const epsgCode = CRSUtils.getEPSGFrom6DegreeZone(zone);
      if (epsgCode) {
        console.log('[CRS] 识别为CGCS2000 6度带 zone', zone, '对应', epsgCode);
        const crs = getCRSByCode(epsgCode);
        if (crs) return crs;
      }
    }
    
    // 从中央经线匹配CGCS2000 3度带 CM版本
    const cmMatch = wkt.match(/central_meridian[",\s]+(\d+)/i);
    if (cmMatch && wkt.includes('CGCS2000')) {
      const cm = parseInt(cmMatch[1]);
      // 3度带CM：75, 78, 81, ..., 135 (EPSG:4534-4554)
      if (cm >= 75 && cm <= 135 && (cm - 75) % 3 === 0) {
        const epsgCode = `EPSG:${4534 + (cm - 75) / 3}`;
        console.log('[CRS] 从中央经线', cm, '识别为CGCS2000 3度带CM，对应', epsgCode);
        const crs = getCRSByCode(epsgCode);
        if (crs) return crs;
      }
      // 6度带CM：75, 81, 87, ..., 135 (EPSG:4502-4512)
      if (cm >= 75 && cm <= 135 && (cm - 75) % 6 === 0) {
        const epsgCode = `EPSG:${4502 + (cm - 75) / 6}`;
        console.log('[CRS] 从中央经线', cm, '识别为CGCS2000 6度带CM，对应', epsgCode);
        const crs = getCRSByCode(epsgCode);
        if (crs) return crs;
      }
    }
    
    // 创建临时CRS对象
    console.warn('[CRS] 无法匹配标准坐标系，创建临时对象');
    return {
      code: 'CUSTOM',
      name: selectedLayer?.name ? `${selectedLayer.name}` : '自定义坐标系',
      type: wkt.includes('PROJCS') ? 'projected' : 'geographic',
      wkt: wkt
    };
  };

  // 获取当前图层的坐标系（从图层的projection字段，这是后端返回的源坐标系）
  const layerCRS = useMemo(() => {
    if (!selectedLayer || !selectedLayer.projection) {
      return null;
    }
    
    return parseProjectionWKT(selectedLayer.projection);
  }, [selectedLayer?.id, selectedLayer?.projection, getCRSByCode]);

  // 构建树形数据结构
  const treeData = useMemo(() => {
    const filterCRS = (crs: CRSInfo) => {
      if (!searchText) return true;
      const search = searchText.toLowerCase();
      return crs.name.toLowerCase().includes(search) || 
             crs.code.toLowerCase().includes(search);
    };

    // 地理坐标系
    const geographicNodes: CRSDataNode[] = ALL_CRS_LIST
      .filter(crs => crs.type === 'geographic' && filterCRS(crs))
      .map(crs => ({
        key: crs.code,
        title: (
          <div className="crs-tree-item">
            <Space size={4}>
              {selectedCRS.code === crs.code && <CheckOutlined style={{ color: '#1890ff' }} />}
              <span>{crs.name}</span>
            </Space>
            <Text type="secondary" className="crs-code">{crs.code}</Text>
          </div>
        ),
        isLeaf: true,
        data: crs,
      }));

    // 投影坐标系 - CGCS2000
    const cgcs2000Projected = ALL_CRS_LIST.filter(crs => 
      crs.type === 'projected' && crs.code.startsWith('EPSG:4') && filterCRS(crs)
    );

    // 创建树节点的辅助函数
    const createCRSNode = (crs: CRSInfo): CRSDataNode => ({
      key: crs.code,
      title: (
        <div className="crs-tree-item">
          <Space size={4}>
            {selectedCRS.code === crs.code && <CheckOutlined style={{ color: '#1890ff' }} />}
            {layerCRS && layerCRS.code === crs.code && <ApartmentOutlined style={{ color: '#ff8c00', fontSize: 12 }} />}
            <span>{crs.name}</span>
          </Space>
          <Text type="secondary" className="crs-code">{crs.code}</Text>
        </div>
      ),
      isLeaf: true,
      data: crs,
    });

    // 3度带（带号）zone 25-45
    const zone3DegreeNodes = cgcs2000Projected
      .filter(crs => {
        const code = parseInt(crs.code.replace('EPSG:', ''));
        return code >= 4513 && code <= 4533;
      })
      .map(createCRSNode);

    // 3度带（中央经线）CM
    const zone3DegreeCMNodes = cgcs2000Projected
      .filter(crs => {
        const code = parseInt(crs.code.replace('EPSG:', ''));
        return code >= 4534 && code <= 4554;
      })
      .map(createCRSNode);

    // 6度带（带号）zone 13-23
    const zone6DegreeNodes = cgcs2000Projected
      .filter(crs => {
        const code = parseInt(crs.code.replace('EPSG:', ''));
        return code >= 4491 && code <= 4501;
      })
      .map(createCRSNode);

    // 6度带（中央经线）CM
    const zone6DegreeCMNodes = cgcs2000Projected
      .filter(crs => {
        const code = parseInt(crs.code.replace('EPSG:', ''));
        return code >= 4502 && code <= 4512;
      })
      .map(createCRSNode);

    const projectedChildren: CRSDataNode[] = [];
    
    if (zone3DegreeNodes.length > 0) {
      projectedChildren.push({
        key: 'cgcs2000-3degree-zone',
        title: 'CGCS2000 3度带（带号）',
        children: zone3DegreeNodes,
      });
    }

    if (zone3DegreeCMNodes.length > 0) {
      projectedChildren.push({
        key: 'cgcs2000-3degree-cm',
        title: 'CGCS2000 3度带（中央经线）',
        children: zone3DegreeCMNodes,
      });
    }

    if (zone6DegreeNodes.length > 0) {
      projectedChildren.push({
        key: 'cgcs2000-6degree-zone',
        title: 'CGCS2000 6度带（带号）',
        children: zone6DegreeNodes,
      });
    }

    if (zone6DegreeCMNodes.length > 0) {
      projectedChildren.push({
        key: 'cgcs2000-6degree-cm',
        title: 'CGCS2000 6度带（中央经线）',
        children: zone6DegreeCMNodes,
      });
    }

    const tree: CRSDataNode[] = [];

    // 如果有图层坐标系，添加到树顶部
    if (layerCRS && selectedLayer) {
      const layerNodeKey = `layer-${selectedLayer.id}-${layerCRS.code}`;
      const layerNode: CRSDataNode = {
        key: layerNodeKey,
        title: (
          <div className="crs-tree-item">
            <Space size={4}>
              {selectedCRS.code === layerCRS.code && <CheckOutlined style={{ color: '#1890ff' }} />}
              <span style={{ fontWeight: 500 }}>{selectedLayer.name}</span>
            </Space>
            <Text type="secondary" className="crs-code">{layerCRS.code}</Text>
          </div>
        ),
        isLeaf: true,
        data: layerCRS,
      };

      tree.push({
        key: 'layer-crs',
        title: '当前图层坐标系',
        icon: <ApartmentOutlined style={{ color: '#ff8c00' }} />,
        children: [layerNode],
      });
    }

    if (geographicNodes.length > 0) {
      tree.push({
        key: 'geographic',
        title: '地理坐标系',
        icon: <GlobalOutlined />,
        children: geographicNodes,
      });
    }

    if (projectedChildren.length > 0) {
      tree.push({
        key: 'projected',
        title: '投影坐标系',
        icon: <GlobalOutlined />,
        children: projectedChildren,
      });
    }

    return tree;
  }, [searchText, selectedCRS.code, layerCRS, selectedLayer?.name]);

  const handleApply = () => {
    // 检查是否为投影坐标系
    if (selectedCRS.type === 'projected') {
      message.warning('投影坐标系功能待完善，暂时仅支持地理坐标系');
      return;
    }
    
    setCRS(selectedCRS);
    message.success(`已切换到坐标系: ${selectedCRS.name}`);
  };

  const handleSelect = (selectedKeys: React.Key[], info: any) => {
    const node = info.node;
    console.log('[CRS] 选择节点:', node);
    console.log('[CRS] 节点data:', node.data);
    console.log('[CRS] 节点key:', node.key);
    
    if (node.isLeaf && node.data) {
      console.log('[CRS] 设置选中坐标系:', node.data);
      setSelectedCRS(node.data);
      setSelectedKey(node.key);
    } else {
      console.warn('[CRS] 节点没有data属性或不是叶子节点');
    }
  };

  return (
    <div className="crs-panel">
      {/* 当前坐标系状态 */}
      <div className="current-crs-compact">
        <div className="crs-header">
          <GlobalOutlined style={{ fontSize: 12, marginRight: 4 }} />
          <Text strong style={{ fontSize: 11 }}>当前:</Text>
        </div>
        <Space size={4}>
          <Tag 
            color={currentCRS.type === 'geographic' ? 'blue' : 'green'}
            style={{ fontSize: 10, padding: '0 4px', margin: 0 }}
          >
            {currentCRS.type === 'geographic' ? '地理' : '投影'}
          </Tag>
          <Text strong style={{ fontSize: 11 }}>{currentCRS.name}</Text>
          <Text type="secondary" style={{ fontSize: 10 }}>({currentCRS.code})</Text>
        </Space>
      </div>

      <Divider style={{ margin: '6px 0' }} />

      {/* 搜索框 */}
      <Input
        placeholder="搜索坐标系..."
        prefix={<SearchOutlined />}
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        allowClear
        size="small"
        style={{ marginBottom: 8 }}
      />

      {/* 树形结构 */}
      <div className="crs-tree-container">
        <Tree
          showIcon
          expandedKeys={expandedKeys}
          onExpand={setExpandedKeys}
          selectedKeys={[selectedKey]}
          onSelect={handleSelect}
          treeData={treeData}
          blockNode
          style={{ fontSize: 12 }}
        />
      </div>

      <Divider style={{ margin: '6px 0' }} />

      {/* 选择的坐标系信息 */}
      <div className="selected-crs-info">
        <div style={{ marginBottom: 4 }}>
          <Text strong style={{ fontSize: 10, color: '#666' }}>选择:</Text>
          <Space size={4} style={{ marginLeft: 4 }}>
            <Tag 
              color={selectedCRS.type === 'geographic' ? 'blue' : 'green'}
              style={{ fontSize: 10, padding: '0 4px', margin: 0 }}
            >
              {selectedCRS.type === 'geographic' ? '地理' : '投影'}
            </Tag>
            <Text strong style={{ fontSize: 11 }}>{selectedCRS.name}</Text>
          </Space>
        </div>
        <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 4 }}>
          {selectedCRS.code}
        </Text>
        <TextArea
          value={selectedCRS.wkt}
          readOnly
          autoSize={{ minRows: 4, maxRows: 6 }}
          style={{ 
            fontSize: 9,
            fontFamily: 'Consolas, Monaco, monospace',
            background: '#fafafa',
            lineHeight: 1.3
          }}
        />
      </div>

      {/* 应用按钮 */}
      <div className="crs-actions">
        <Button 
          type="primary" 
          block 
          size="small"
          onClick={handleApply}
          icon={<CheckOutlined />}
          disabled={selectedCRS.code === currentCRS.code || selectedCRS.type === 'projected'}
          title={
            selectedCRS.type === 'projected' 
              ? '投影坐标系功能待完善，暂时仅支持地理坐标系'
              : selectedCRS.code === currentCRS.code 
                ? '已是当前坐标系' 
                : `应用 ${selectedCRS.name}`
          }
        >
          应用坐标系
        </Button>
        {selectedCRS.type === 'projected' && (
          <Alert 
            message="投影坐标系功能待完善" 
            description="当前仅支持地理坐标系（CGCS2000、WGS84），投影坐标系功能正在开发中。"
            type="warning" 
            showIcon
            style={{ marginTop: 8, fontSize: 10 }}
          />
        )}
        {selectedCRS.code !== currentCRS.code && selectedCRS.type === 'geographic' && (
          <div style={{ marginTop: 4, fontSize: 10, color: '#666', textAlign: 'center' }}>
            将切换到: {selectedCRS.name}
          </div>
        )}
      </div>
    </div>
  );
};

export default CRSPanel;
