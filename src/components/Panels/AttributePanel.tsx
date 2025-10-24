import React, { useState, useEffect, useMemo } from "react";
import { Table, Input, Button, Space, message, Tooltip, Tabs } from "antd";
import {
  SearchOutlined,
  ExportOutlined,
  ReloadOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import { invoke } from "@tauri-apps/api/core";
import { useMapTabsStore } from "../../stores/mapTabsStore";
import { useSelectionStore } from "../../stores/selectionStore";
import { bbox as turfBBox } from "@turf/turf";
import "./AttributePanel.css";

interface AttributePanelProps {
  onClose?: () => void;
}

// 单个属性表组件
const SingleAttributeTable: React.FC<{ layerId: string }> = ({ layerId }) => {
  const mapTabsStore = useMapTabsStore();
  const { selectedFeatureId, setSelectedFeatureId, setSelectedFeatures } =
    useSelectionStore();
  
  const currentTab = mapTabsStore.getCurrentTab();
  const layers = currentTab?.layers || [];
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [allFeatures, setAllFeatures] = useState<any[]>([]);
  const [tableHeight, setTableHeight] = useState(400);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const tableBodyRef = React.useRef<HTMLDivElement>(null);

  // 获取当前显示的图层（递归查找，支持子图层）
  const currentLayer = useMemo(() => {
    const findLayerById = (layers: any[], id: string): any => {
      for (const layer of layers) {
        if (layer.id === id) return layer;
        if (layer.children) {
          const found = findLayerById(layer.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    return findLayerById(layers, layerId);
  }, [layers, layerId]);

  // 仅在图层ID或路径变化时重新加载数据
  const currentLayerPath = currentLayer?.source?.path;
  const currentLayerId = currentLayer?.id;

  useEffect(() => {
    console.log('[属性表] 图层信息检查:', {
      layerId,
      currentLayer,
      hasSource: !!currentLayer?.source,
      sourcePath: currentLayer?.source?.path,
      sourceType: currentLayer?.source?.type,
      currentLayerPath
    });
    
    if (currentLayerPath) {
      loadAttributeData();
    } else {
      console.warn('[属性表] 路径为空，无法加载数据', {
        layerId,
        currentLayer,
        reason: !currentLayer ? '图层不存在' : !currentLayer.source ? '图层没有source' : '图层source没有path'
      });
      setData([]);
      setColumns([]);
      setTotalCount(0);
    }
  }, [currentLayerId, currentLayerPath]);

  // 使用 ResizeObserver 监听容器大小变化
  useEffect(() => {
    if (!contentRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        // 减去底部空间，确保横向滚动条可见
        const newHeight = Math.max(200, height - 40);
        setTableHeight(newHeight);
      }
    });

    resizeObserver.observe(contentRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [layerId]);

  // 当选中的要素ID改变时，自动滚动到对应行
  useEffect(() => {
    if (!selectedFeatureId || data.length === 0) return;

    // 延迟执行以确保DOM已更新
    const timer = setTimeout(() => {
      const tableBody = document.querySelector(
        '.attribute-table .ant-table-body'
      ) as HTMLElement;
      
      if (!tableBody) return;

      // 查找选中的行
      const selectedRow = tableBody.querySelector(
        '.row-selected'
      ) as HTMLElement;

      if (selectedRow) {
        // 计算滚动位置
        const rowTop = selectedRow.offsetTop;
        const rowHeight = selectedRow.offsetHeight;
        const scrollTop = tableBody.scrollTop;
        const containerHeight = tableBody.clientHeight;

        // 如果行不在可见区域，则滚动到该行
        if (rowTop < scrollTop || rowTop + rowHeight > scrollTop + containerHeight) {
          // 滚动到行的中间位置
          tableBody.scrollTop = rowTop - containerHeight / 2 + rowHeight / 2;
        }
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [selectedFeatureId, data]);

  const loadAttributeData = async () => {
    if (!currentLayerPath) {
      console.warn('[属性表] currentLayerPath为空');
      return;
    }

    console.log('[属性表] 开始加载数据:', {
      layerId,
      layerPath: currentLayerPath,
      layerIndex: currentLayer?.source?.layerIndex,
      currentLayer: currentLayer
    });

    setLoading(true);
    try {
      let result: any;
      
      // 如果是多图层文件（如KML），使用图层索引读取
      if (currentLayer?.source?.layerIndex !== undefined) {
        console.log('[属性表] 使用图层索引读取:', currentLayer.source.layerIndex);
        const geojson = await invoke<any>("gdal_get_layer_geojson", {
          path: currentLayerPath,
          layerIndex: currentLayer.source.layerIndex,
        });
        
        console.log('[属性表] GeoJSON读取成功:', geojson.features?.length, '个要素');
        
        // 转换GeoJSON格式为属性表格式
        result = {
          features: geojson.features || [],
          total: geojson.features?.length || 0
        };
      } else {
        console.log('[属性表] 使用标准API读取');
        // 使用 GDAL API 读取属性表
        result = await invoke<any>("gdal_get_attribute_table", {
          path: currentLayerPath,
          offset: 0,
          limit: 100000, // 加载所有数据
        });
      }

      // 构建列定义
      if (result.features && result.features.length > 0) {
        const firstFeature = result.features[0];

        // 序号列
        const indexColumn = {
          title: "#",
          key: "_index",
          dataIndex: "_index",
          width: 50,
          fixed: "left" as const,
          align: "center" as const,
          render: (value: number) => (
            <span style={{ color: "#999", fontWeight: 500, fontSize: "11px" }}>{value}</span>
          ),
        };

        // 从第一个要素的 properties 中获取字段
        const cols = Object.keys(firstFeature.properties || {}).map((key) => ({
          title: key,
          dataIndex: key,
          key: key,
          ellipsis: {
            showTitle: false,
          },
          width: 100,
          minWidth: 60,
          sorter: (a: any, b: any) => {
            const aVal = a[key];
            const bVal = b[key];
            if (typeof aVal === "number" && typeof bVal === "number") {
              return aVal - bVal;
            }
            return String(aVal).localeCompare(String(bVal));
          },
          render: (value: any) => {
            if (value === null || value === undefined) {
              return <span style={{ color: "#ccc", fontSize: "11px" }}>NULL</span>;
            }
            const displayValue = String(value);
            return (
              <Tooltip placement="topLeft" title={displayValue}>
                <span style={{ fontSize: "11px" }}>{displayValue}</span>
              </Tooltip>
            );
          },
        }));

        setColumns([indexColumn, ...cols]);

        // 构建行数据
        const rows = result.features.map((feature: any, index: number) => {
          // 使用和 MapView 完全一致的 ID 生成逻辑
          let featureId;
          if (feature.id !== undefined && feature.id !== null) {
            featureId = String(feature.id);
          } else if (
            feature.properties?.id !== undefined &&
            feature.properties?.id !== null
          ) {
            featureId = String(feature.properties.id);
          } else {
            featureId = String(index);
          }

          return {
            key: featureId,
            _featureId: featureId,
            _index: index + 1,
            ...(feature.properties || {}),
          };
        });

        setData(rows);
        setTotalCount(result.total || rows.length);
        
        // 保存完整的要素数据（包含几何）
        const fullFeatures = result.features.map((f: any) => ({
          type: "Feature",
          id: f.id,
          properties: f.properties,
          geometry: f.geometry
        }));
        setAllFeatures(fullFeatures);
      }
    } catch (error) {
      console.error('[属性表] 加载失败:', {
        error,
        layerId,
        layerPath: currentLayerPath,
        layerIndex: currentLayer?.source?.layerIndex,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      message.error(`加载属性表失败: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  // 处理行双击 - 缩放到对应图斑并选中
  const handleRowDoubleClick = (record: any) => {
    const index = record._index - 1; // 转换为0基索引
    if (index >= 0 && index < allFeatures.length) {
      const feature = allFeatures[index];

      // 设置选中状态
      setSelectedFeatureId(record._featureId);
      setSelectedFeatures([feature]);

      // 计算要素边界并缩放
      if (feature && feature.geometry) {
        try {
          // 确保feature是完整的GeoJSON Feature格式
          const geoJsonFeature = {
            type: "Feature" as const,
            geometry: feature.geometry,
            properties: feature.properties || {},
          };

          const [minX, minY, maxX, maxY] = turfBBox(geoJsonFeature as any);
          // 发送缩放和高亮事件给当前标签页的地图（添加 tabId 确保只控制当前地图）
          window.dispatchEvent(
            new CustomEvent("zoomToFeature", {
              detail: { 
                tabId: currentTab?.id,  // 指定目标地图标签页ID
                bounds: [minX, minY, maxX, maxY], 
                feature: geoJsonFeature 
              },
            }),
          );
        } catch (error) {
          console.error("缩放到要素失败:", error);
          message.error("无法缩放到该要素");
        }
      } else {
        message.warning("该要素没有几何信息");
      }
    }
  };

  const handleSearch = () => {
    // TODO: 实现搜索功能
    message.info("搜索功能开发中...");
  };

  const handleExport = () => {
    // TODO: 实现导出功能
    message.info("导出功能开发中...");
  };

  const handleClearSelection = () => {
    setSelectedFeatureId(null);
    setSelectedFeatures([]);
    // 发送清除高亮事件给当前标签页的地图
    window.dispatchEvent(new CustomEvent("clearSelection", {
      detail: { tabId: currentTab?.id }
    }));
  };

  if (!currentLayer) {
    return (
      <div className="attribute-panel">
        <div className="attribute-panel-content empty">
          <p>图层不存在</p>
        </div>
      </div>
    );
  }

  return (
    <div className="attribute-panel">
      <div className="attribute-panel-toolbar">
        <Space size="small" style={{ flex: 1 }}>
          <span className="toolbar-info">
            {totalCount} 条记录
            {selectedFeatureId && (
              <span className="toolbar-selected">
                · 已选中第 {data.find((row) => row._featureId === selectedFeatureId)?._index || "?"} 行
              </span>
            )}
          </span>
        </Space>
        <Space size="small">
          <Input
            placeholder="搜索..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={handleSearch}
            size="small"
            style={{ width: 140 }}
            allowClear
          />
          {selectedFeatureId && (
            <Button
              size="small"
              icon={<ClearOutlined />}
              onClick={handleClearSelection}
              type="primary"
              danger
            >
              清除选择
            </Button>
          )}
          <Button
            size="small"
            icon={<ExportOutlined />}
            onClick={handleExport}
          />
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={loadAttributeData}
          />
        </Space>
      </div>

      <div className="attribute-panel-content" ref={contentRef}>
        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          pagination={false}
          size="small"
          scroll={{ x: 'max-content', y: tableHeight }}
          virtual
          className="attribute-table"
          bordered
          showSorterTooltip={false}
          rowClassName={(record) => {
            const isSelected = record._featureId === selectedFeatureId;
            if (isSelected) {
              console.log('🔵 高亮行:', record._index, 'featureId:', record._featureId);
            }
            return isSelected ? "row-selected" : "";
          }}
          onRow={(record) => ({
            onDoubleClick: () => handleRowDoubleClick(record),
          })}
        />
      </div>
    </div>
  );
};

// 主属性表面板组件（支持多标签页）
const AttributePanel: React.FC<AttributePanelProps> = ({ onClose }) => {
  const mapTabsStore = useMapTabsStore();
  
  const currentTab = mapTabsStore.getCurrentTab();
  const layers = currentTab?.layers || [];
  const attributeTableLayerIds = currentTab?.attributeTableLayerIds || [];
  const activeAttributeTableLayerId = currentTab?.activeAttributeTableLayerId || null;
  
  const setActiveAttributeTableLayer = (layerId: string | null) => 
    mapTabsStore.setActiveAttributeTableLayerInCurrentTab(layerId);
  const removeAttributeTableLayer = (layerId: string) => 
    mapTabsStore.removeAttributeTableLayerFromCurrentTab(layerId);

  console.log('[属性表面板] 渲染:', {
    attributeTableLayerIds,
    layerCount: layers.length,
    activeAttributeTableLayerId
  });

  if (attributeTableLayerIds.length === 0) {
    console.warn('[属性表面板] 没有要显示的图层');
    return (
      <div className="attribute-panel">
        <div className="attribute-panel-content empty">
          <p>请选择一个图层查看属性表</p>
        </div>
      </div>
    );
  }

  const items = attributeTableLayerIds.map(layerId => {
    const layer = layers.find(l => l.id === layerId);
    return {
      key: layerId,
      label: layer?.name || layerId,
      children: <SingleAttributeTable layerId={layerId} />,
      closable: true,
    };
  });

  return (
    <div className="attribute-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Tabs
        type="editable-card"
        activeKey={activeAttributeTableLayerId || undefined}
        onChange={(key) => setActiveAttributeTableLayer(key)}
        onEdit={(targetKey, action) => {
          if (action === 'remove' && typeof targetKey === 'string') {
            removeAttributeTableLayer(targetKey);
          }
        }}
        items={items}
        hideAdd
        style={{ flex: 1, overflow: 'hidden' }}
        tabBarStyle={{ marginBottom: 0, paddingLeft: 8, paddingRight: 8 }}
      />
    </div>
  );
};

export default AttributePanel;
