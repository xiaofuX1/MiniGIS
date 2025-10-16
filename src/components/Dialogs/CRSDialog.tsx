import React, { useState, useMemo } from 'react';
import { Drawer, Input, Tree, Space, Tag, Typography, message, Button, Divider, Alert } from 'antd';
import { SearchOutlined, GlobalOutlined, CheckOutlined } from '@ant-design/icons';
import { useCRSStore, ALL_CRS_LIST, CRSInfo } from '../../stores/crsStore';
import type { DataNode } from 'antd/es/tree';

const { TextArea } = Input;
const { Text } = Typography;

interface CRSDialogProps {
  open: boolean;
  onClose: () => void;
}

const CRSDialog: React.FC<CRSDialogProps> = ({ open, onClose }) => {
  const { currentCRS, setCRS } = useCRSStore();
  const [searchText, setSearchText] = useState('');
  const [selectedCRS, setSelectedCRS] = useState<CRSInfo>(currentCRS);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>(['geographic', 'projected']);

  // 构建树形数据结构
  const treeData = useMemo(() => {
    const filterCRS = (crs: CRSInfo) => {
      if (!searchText) return true;
      const search = searchText.toLowerCase();
      return crs.name.toLowerCase().includes(search) || 
             crs.code.toLowerCase().includes(search);
    };

    // 地理坐标系
    const geographicNodes: DataNode[] = ALL_CRS_LIST
      .filter(crs => crs.type === 'geographic' && filterCRS(crs))
      .map(crs => ({
        key: crs.code,
        title: (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Space size={4}>
              {selectedCRS.code === crs.code && <CheckOutlined style={{ color: '#1890ff' }} />}
              <span>{crs.name}</span>
            </Space>
            <Text type="secondary" style={{ fontSize: 11 }}>{crs.code}</Text>
          </div>
        ),
        isLeaf: true,
        data: crs,
      }));

    // 投影坐标系 - CGCS2000
    const cgcs2000Projected = ALL_CRS_LIST.filter(crs => 
      crs.type === 'projected' && crs.code.startsWith('EPSG:4') && filterCRS(crs)
    );

    // 3度带（带号）
    const zone3DegreeNodes: DataNode[] = cgcs2000Projected
      .filter(crs => {
        const code = parseInt(crs.code.replace('EPSG:', ''));
        return code >= 4513 && code <= 4533;
      })
      .map(crs => ({
        key: crs.code,
        title: (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Space size={4}>
              {selectedCRS.code === crs.code && <CheckOutlined style={{ color: '#1890ff' }} />}
              <span>{crs.name}</span>
            </Space>
            <Text type="secondary" style={{ fontSize: 11 }}>{crs.code}</Text>
          </div>
        ),
        isLeaf: true,
        data: crs,
      }));

    // 3度带（中央经线）
    const zone3DegreeCMNodes: DataNode[] = cgcs2000Projected
      .filter(crs => {
        const code = parseInt(crs.code.replace('EPSG:', ''));
        return code >= 4534 && code <= 4554;
      })
      .map(crs => ({
        key: crs.code,
        title: (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Space size={4}>
              {selectedCRS.code === crs.code && <CheckOutlined style={{ color: '#1890ff' }} />}
              <span>{crs.name}</span>
            </Space>
            <Text type="secondary" style={{ fontSize: 11 }}>{crs.code}</Text>
          </div>
        ),
        isLeaf: true,
        data: crs,
      }));

    const projectedChildren: DataNode[] = [];
    
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

    const tree: DataNode[] = [];

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
  }, [searchText, selectedCRS.code]);

  const handleApply = () => {
    // 检查是否为投影坐标系
    if (selectedCRS.type === 'projected') {
      message.warning('投影坐标系功能待完善，暂时仅支持地理坐标系');
      return;
    }
    
    setCRS(selectedCRS);
    message.success(`已切换到坐标系: ${selectedCRS.name}`);
    onClose();
  };

  const handleSelect = (selectedKeys: React.Key[], info: any) => {
    const node = info.node;
    if (node.isLeaf && node.data) {
      setSelectedCRS(node.data);
    }
  };

  return (
    <Drawer
      title={
        <Space>
          <GlobalOutlined />
          <span>坐标系统设置</span>
        </Space>
      }
      placement="right"
      width={500}
      open={open}
      onClose={onClose}
      extra={
        <Button 
          type="primary" 
          onClick={handleApply} 
          icon={<CheckOutlined />}
          disabled={selectedCRS.type === 'projected'}
          title={selectedCRS.type === 'projected' ? '投影坐标系功能待完善' : '应用坐标系'}
        >
          应用
        </Button>
      }
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {/* 搜索框 */}
        <Input
          placeholder="搜索坐标系名称或代码..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          size="large"
        />

        {/* 树形结构 */}
        <div style={{ 
          border: '1px solid #d9d9d9',
          borderRadius: 4,
          padding: 8,
          maxHeight: 'calc(100vh - 280px)',
          overflowY: 'auto'
        }}>
          <Tree
            showIcon
            expandedKeys={expandedKeys}
            onExpand={setExpandedKeys}
            selectedKeys={[selectedCRS.code]}
            onSelect={handleSelect}
            treeData={treeData}
            blockNode
            style={{ fontSize: 13 }}
          />
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* 投影坐标系警告 */}
        {selectedCRS.type === 'projected' && (
          <Alert 
            message="投影坐标系功能待完善" 
            description="当前仅支持地理坐标系（CGCS2000、WGS84），投影坐标系功能正在开发中。"
            type="warning" 
            showIcon
            closable
          />
        )}

        {/* 当前选择的坐标系信息 */}
        <div style={{ 
          background: '#f5f5f5', 
          padding: 14, 
          borderRadius: 6,
          border: '1px solid #d9d9d9'
        }}>
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            <div>
              <Text strong style={{ fontSize: 12, color: '#666' }}>当前选择</Text>
              <div style={{ marginTop: 8 }}>
                <Tag color={selectedCRS.type === 'geographic' ? 'blue' : 'green'}>
                  {selectedCRS.type === 'geographic' ? '地理坐标系' : '投影坐标系'}
                </Tag>
              </div>
              <Text strong style={{ fontSize: 14 }}>{selectedCRS.name}</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 11 }}>{selectedCRS.code}</Text>
            </div>
            
            <div>
              <Text strong style={{ fontSize: 12, color: '#666' }}>WKT定义</Text>
              <TextArea
                value={selectedCRS.wkt}
                readOnly
                autoSize={{ minRows: 3, maxRows: 5 }}
                style={{ 
                  marginTop: 6,
                  fontSize: 10,
                  fontFamily: 'Consolas, Monaco, monospace',
                  background: '#fff',
                  lineHeight: 1.4
                }}
              />
            </div>
          </Space>
        </div>
      </Space>
    </Drawer>
  );
};

export default CRSDialog;
