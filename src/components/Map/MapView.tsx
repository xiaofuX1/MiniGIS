import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useMapStore } from "../../stores/mapStore";
import { useLayerStore } from "../../stores/layerStore";
import { useSelectionStore } from "../../stores/selectionStore";
import { useUiStore } from "../../stores/uiStore";
import type { Layer } from "../../stores/layerStore";
import { symbolizerToMapLibrePaints } from "../../utils/symbolRenderer";
import HistoryImageControl from "./HistoryImageControl";
import NorthArrow from "./NorthArrow";
import "./MapView.css";
import * as turf from "@turf/turf";

const MapView: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const isInternalUpdate = useRef(false);
  const layerRefs = useRef<Map<string, { sourceId: string; layerIds: string[]; type: "raster" | "vector" }>>(new Map());
  const layerDataRefs = useRef<Map<string, any>>(new Map());
  const previousLayerIds = useRef<Set<string>>(new Set());
  const previousLayerOrder = useRef<string[]>([]); // 存储之前的图层顺序
  const HIGHLIGHT_SOURCE_ID = "selected-highlight-source";
  const HIGHLIGHT_LAYER_IDS = [
    "selected-highlight-fill",
    "selected-highlight-line"
  ];
  const interactiveLayerIdsRef = useRef<Set<string>>(new Set());
  const sourceToLayerIdRef = useRef<Map<string, string>>(new Map());
  const mapLoadedRef = useRef(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const isSelectModeRef = useRef(false);
  const [measureExpanded, setMeasureExpanded] = useState(false);
  const [measureMode, setMeasureMode] = useState<'distance' | 'area' | 'coordinate' | null>(null);
  const measureModeRef = useRef<'distance' | 'area' | 'coordinate' | null>(null);
  const measurePointsRef = useRef<[number, number][]>([]); // 当前测量的点
  const allMeasureFeaturesRef = useRef<any[]>([]); // 所有测量的features（累积）
  const measureMarkersRef = useRef<maplibregl.Marker[]>([]); // 存储已完成测量的标签 Marker
  const currentMeasureMarkersRef = useRef<maplibregl.Marker[]>([]); // 存储当前测量的临时标签 Marker
  const measureSourceId = 'measure-source';
  const measureLayerIds = {
    line: 'measure-line',
    points: 'measure-points',
    polygon: 'measure-polygon',
  };
  const { center, zoom, setCenter, setZoom } = useMapStore();
  const { layers, selectLayer, setAttributeTableLayer } = useLayerStore();
  const layersRef = useRef(layers); // 保存 layers 的最新引用
  const {
    setSelectedFeatures,
    clearSelection,
    setIsSelecting,
    setInspectedFeature,
    setSelectedFeatureId,
    selectedFeatures,
  } = useSelectionStore();
  const { rightPanelCollapsed, setRightPanelCollapsed, setRightPanelType, setMapHintText, setIsSelectMode: setUiIsSelectMode, setMeasureMode: setUiMeasureMode } = useUiStore();

  // 辅助：更新/清空高亮源数据
  const setHighlightData = (feature: any | null) => {
    const map = mapInstance.current;
    if (!map) return;
    
    const src = map.getSource(HIGHLIGHT_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!src) return;
    
    if (feature) {
      try {
        src.setData({
          type: "FeatureCollection",
          features: [feature],
        });
        
        // 确保高亮图层在最上层（在所有图层之上）
        HIGHLIGHT_LAYER_IDS.forEach((layerId) => {
          if (map.getLayer(layerId)) {
            try {
              map.setLayoutProperty(layerId, 'visibility', 'visible');
              map.moveLayer(layerId);
            } catch (error) {
              console.error('移动高亮图层失败:', layerId, error);
            }
          }
        });
      } catch (error) {
        console.error('更新高亮数据失败:', error);
      }
    } else {
      src.setData({ type: "FeatureCollection", features: [] });
      
      // 隐藏高亮图层
      HIGHLIGHT_LAYER_IDS.forEach(layerId => {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', 'none');
        }
      });
    }
  };

  // 给 GeoJSON 添加 _index 属性，便于与属性表索引一致
  const prepareGeojsonWithIndex = (geojson: any) => {
    try {
      if (!geojson) return geojson;
      if (geojson.type === "FeatureCollection") {
        let idx = 0;
        const features = geojson.features.map((f: any) => ({
          ...f,
          properties: { ...(f.properties || {}), _index: idx++ },
        }));
        return { ...geojson, features };
      } else if (geojson.type === "Feature") {
        return { ...geojson, properties: { ...(geojson.properties || {}), _index: 0 } };
      }
    } catch {}
    return geojson;
  };

  // 闪烁效果
  const flashFeature = (feature: any, callback?: () => void) => {
    const map = mapInstance.current;
    if (!map) return;
    setHighlightData(feature);
    let flashCount = 0;
    const maxFlashes = 3;
    let visible = true;
    const toggle = (v: boolean) => {
      // 检查地图和图层是否仍然存在
      const currentMap = mapInstance.current;
      if (!currentMap) return;
      for (const lid of HIGHLIGHT_LAYER_IDS) {
        if (currentMap.getLayer(lid)) {
          currentMap.setLayoutProperty(lid, "visibility", v ? "visible" : "none");
        }
      }
    };
    toggle(true);
    const timer = setInterval(() => {
      if (flashCount >= maxFlashes) {
        clearInterval(timer);
        setHighlightData(null);
        if (callback) callback();
        return;
      }
      toggle(!visible);
      visible = !visible;
      if (!visible) flashCount++;
    }, 200);
  };

  // 处理要素选择（选择模式）
  const handleFeatureSelect = (
    feature: any,
    layer: Layer,
    index?: number,
  ) => {
    // 高亮
    try {
      setHighlightData(feature);
    } catch (error) {
      console.error('设置高亮失败:', error);
    }
    
    // 更新选择
    setSelectedFeatures([feature]);
    
    // 生成要素ID
    let featureId;
    if (feature.id !== undefined && feature.id !== null) {
      featureId = String(feature.id);
    } else if (
      feature.properties?.id !== undefined &&
      feature.properties?.id !== null
    ) {
      featureId = String(feature.properties.id);
    } else if (index !== undefined) {
      featureId = String(index);
    } else {
      featureId = "";
    }
    setSelectedFeatureId(featureId);
    
    // 选择图层
    selectLayer(layer);
  };

  // 处理要素浏览（浏览模式）
  const handleFeatureInspect = (
    feature: any,
    layer: Layer,
  ) => {
    // 更新浏览的要素信息
    setInspectedFeature(feature);

    // 选择包含该要素的图层
    selectLayer(layer);

    // 设置右侧面板类型为要素信息
    setRightPanelType('feature');
    
    // 如果右边侧边栏已关闭，自动打开以显示要素浏览信息
    if (rightPanelCollapsed) {
      setRightPanelCollapsed(false);
    }

    // 添加闪烁效果
    flashFeature(feature);
  };

  // 处理工具栏按钮点击
  const handleToolClick = (tool: string) => {
    switch (tool) {
      case "zoomIn":
        if (mapInstance.current) mapInstance.current.zoomIn();
        break;
      case "zoomOut":
        if (mapInstance.current) mapInstance.current.zoomOut();
        break;
      case "pan":
        // 退出选择模式，恢复平移
        setIsSelectMode(false);
        setIsSelecting(false);
        // 地图拖拽始终启用，不需要手动控制
        break;
      case "fullExtent":
        if (mapInstance.current && layers.length > 0) {
          const vectorLayers = layers.filter((l) => l.type !== "basemap" && l.extent);
          if (vectorLayers.length > 0) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            vectorLayers.forEach((layer) => {
              if (layer.extent) {
                minX = Math.min(minX, layer.extent.minX);
                minY = Math.min(minY, layer.extent.minY);
                maxX = Math.max(maxX, layer.extent.maxX);
                maxY = Math.max(maxY, layer.extent.maxY);
              }
            });
            const b: [number, number, number, number] = [minX, minY, maxX, maxY];
            isInternalUpdate.current = true;
            mapInstance.current.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 50 });
          }
        }
        break;
      case "select":
        // 切换选择模式
        const newSelectMode = !isSelectMode;
        setIsSelectMode(newSelectMode);
        setUiIsSelectMode(newSelectMode);
        setIsSelecting(newSelectMode);
        if (isSelectMode) {
          // 退出选择模式，清除高亮
          clearSelection();
          setHighlightData(null);
        }
        break;
      case "clearSelection":
        clearSelection();
        setHighlightData(null);
        break;
      case "measure":
        // 切换测量面板
        const newExpanded = !measureExpanded;
        setMeasureExpanded(newExpanded);
        if (!newExpanded) {
          // 收回时清除测量
          console.log('收回测量面板，清除所有测量数据');
          clearMeasure();
        } else {
          console.log('展开测量面板');
        }
        break;
    }
  };

  // 清除测量数据（关闭测量面板时调用）
  const clearMeasure = () => {
    setMeasureMode(null);
    setUiMeasureMode(null);
    measurePointsRef.current = [];
    allMeasureFeaturesRef.current = [];
    
    // 清除所有 Marker（已完成的和当前的）
    measureMarkersRef.current.forEach(marker => marker.remove());
    measureMarkersRef.current = [];
    currentMeasureMarkersRef.current.forEach(marker => marker.remove());
    currentMeasureMarkersRef.current = [];
    
    const map = mapInstance.current;
    if (!map) return;
    
    const source = map.getSource(measureSourceId) as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: [],
      } as any);
    }
  };

  // 处理测量工具点击
  const handleMeasureToolClick = (tool: 'distance' | 'area' | 'coordinate') => {
    console.log('测量工具点击:', tool, '当前模式:', measureMode, '当前点数:', measurePointsRef.current.length);
    
    // 如果当前有测量点，先完成并保存当前测量
    if (measurePointsRef.current.length > 0) {
      // 将当前测量添加到累积的features中
      const map = mapInstance.current;
      if (map) {
        const source = map.getSource(measureSourceId) as maplibregl.GeoJSONSource | undefined;
        if (source) {
          const currentData = source._data as any;
          if (currentData && currentData.features) {
            // 保存当前所有显示的features（累积 + 当前）
            allMeasureFeaturesRef.current = currentData.features;
            console.log('保存当前测量，累积features数:', allMeasureFeaturesRef.current.length);
          }
        }
      }
      
      // 将当前测量的临时Marker移到已完成的Marker数组
      measureMarkersRef.current.push(...currentMeasureMarkersRef.current);
      currentMeasureMarkersRef.current = [];
      console.log('已完成Marker数:', measureMarkersRef.current.length);
    }
    
    if (measureMode === tool) {
      // 如果已经是当前模式，完成当前测量并开始新的测量
      console.log('完成当前测量，开始新的测量');
      measurePointsRef.current = []; // 开始新的测量
    } else {
      // 切换到新模式 - 保留之前的测量结果
      console.log('切换到新测量模式:', tool, '保留之前的测量结果');
      measurePointsRef.current = []; // 清空当前点数组以开始新测量
      
      setMeasureMode(tool);
      setUiMeasureMode(tool);
      
      console.log('measureMode 已设置为:', tool);
      // 退出选择模式
      setIsSelectMode(false);
      setUiIsSelectMode(false);
      setIsSelecting(false);
    }
  };

  // 更新测量显示
  const updateMeasureDisplay = (points: [number, number][]) => {
    console.log('updateMeasureDisplay 调用', 'points:', points);
    const map = mapInstance.current;
    if (!map) {
      console.log('地图未加载');
      return;
    }

    const source = map.getSource(measureSourceId) as maplibregl.GeoJSONSource | undefined;
    if (!source) {
      console.log('测量数据源未找到');
      return;
    }

    // 清除当前测量的临时Marker（不清除已完成的Marker）
    currentMeasureMarkersRef.current.forEach(marker => marker.remove());
    currentMeasureMarkersRef.current = [];

    // 当前测量的features
    const currentFeatures: any[] = [];
    console.log('当前测量模式:', measureModeRef.current, '点数:', points.length);

    if (points.length === 0) {
      // 如果当前没有点，只显示之前累积的测量结果
      source.setData({
        type: 'FeatureCollection',
        features: allMeasureFeaturesRef.current,
      } as any);
      return;
    }

    if (measureModeRef.current === 'coordinate') {
      // 坐标测量：显示所有点和坐标标签
      points.forEach((pt, idx) => {
        currentFeatures.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: pt,
          },
          properties: { index: idx },
        });

        // 使用 Marker 显示坐标标签
        const coordText = `经度: ${pt[0].toFixed(6)}<br/>纬度: ${pt[1].toFixed(6)}`;
        const el = document.createElement('div');
        el.className = 'measure-label';
        el.innerHTML = coordText;
        el.style.cssText = 'background: rgba(255,255,255,0.95); padding: 4px 8px; border-radius: 4px; color: #0080ff; font-size: 12px; font-weight: 500; box-shadow: 0 2px 4px rgba(0,0,0,0.2); white-space: nowrap;';
        
        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, -10] })
          .setLngLat([pt[0], pt[1]])
          .addTo(map);
        currentMeasureMarkersRef.current.push(marker);
      });
    } else if (measureModeRef.current === 'distance' && points.length >= 1) {
      // 距离测量：绘制线和点
      
      // 添加点
      points.forEach((pt, idx) => {
        currentFeatures.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: pt,
          },
          properties: { index: idx },
        });
      });

      // 如果有2个或更多点，绘制线和距离标签
      if (points.length >= 2) {
        currentFeatures.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: points,
          },
          properties: {},
        });

        // 计算总距离
        const line = turf.lineString(points);
        const length = turf.length(line, { units: 'meters' });
        
        // 在最后一个点显示距离标签（使用 Marker）
        const lastPoint = points[points.length - 1];
        let distanceText = '';
        if (length >= 1000) {
          distanceText = `${(length / 1000).toFixed(2)} km`;
        } else {
          distanceText = `${length.toFixed(2)} m`;
        }
        
        const el = document.createElement('div');
        el.className = 'measure-label';
        el.textContent = distanceText;
        el.style.cssText = 'background: rgba(255,255,255,0.95); padding: 4px 8px; border-radius: 4px; color: #0080ff; font-size: 14px; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.2);';
        
        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, -10] })
          .setLngLat([lastPoint[0], lastPoint[1]])
          .addTo(map);
        currentMeasureMarkersRef.current.push(marker);
      }
    } else if (measureModeRef.current === 'area' && points.length >= 1) {
      // 面积测量：绘制点和多边形
      
      // 添加点
      points.forEach((pt, idx) => {
        currentFeatures.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: pt,
          },
          properties: { index: idx },
        });
      });

      // 如果有2个点，绘制线段
      if (points.length === 2) {
        currentFeatures.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: points,
          },
          properties: {},
        });
      }

      // 如果有3个或更多点，绘制多边形、边框和面积标签
      if (points.length >= 3) {
        const closedPoints = [...points, points[0]];
        // 添加多边形填充
        currentFeatures.push({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [closedPoints],
          },
          properties: {},
        });
        // 添加多边形边框（作为LineString）
        currentFeatures.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: closedPoints,
          },
          properties: { isPolygonBorder: true },
        });

        // 计算面积
        const polygon = turf.polygon([closedPoints]);
        const area = turf.area(polygon);
        
        // 计算质心用于显示标签（使用 Marker）
        const centroid = turf.centroid(polygon);
        const centroidCoords = centroid.geometry.coordinates as [number, number];
        
        let areaText = '';
        if (area >= 1000000) {
          areaText = `${(area / 1000000).toFixed(2)} km²`;
        } else {
          areaText = `${area.toFixed(2)} m²`;
        }
        
        const el = document.createElement('div');
        el.className = 'measure-label';
        el.textContent = areaText;
        el.style.cssText = 'background: rgba(255,255,255,0.95); padding: 4px 8px; border-radius: 4px; color: #0080ff; font-size: 14px; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.2);';
        
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat(centroidCoords)
          .addTo(map);
        currentMeasureMarkersRef.current.push(marker);
      }
    }

    // 合并当前features和之前累积的features
    const allFeatures = [...allMeasureFeaturesRef.current, ...currentFeatures];
    
    console.log('设置测量features', allFeatures.length, '个要素（累积:', allMeasureFeaturesRef.current.length, '+ 当前:', currentFeatures.length, ')');
    source.setData({
      type: 'FeatureCollection',
      features: allFeatures,
    } as any);
    console.log('测量数据已更新到地图');
    
    // 检查图层可见性
    const layerIds = [measureLayerIds.polygon, measureLayerIds.line, measureLayerIds.points];
    layerIds.forEach(layerId => {
      if (map.getLayer(layerId)) {
        const visibility = map.getLayoutProperty(layerId, 'visibility');
        console.log(`图层 ${layerId} 可见性:`, visibility);
      } else {
        console.warn(`图层 ${layerId} 不存在`);
      }
    });
    console.log('当前测量Marker数:', currentMeasureMarkersRef.current.length, '已完成Marker数:', measureMarkersRef.current.length);
  };

  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    // 初始化 MapLibre 地图
    mapInstance.current = new maplibregl.Map({
      container: mapContainer.current,
      style: { 
        version: 8, 
        sources: {}, 
        layers: [],
        glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf"
      },
      center: [center[1], center[0]],
      zoom: zoom,
      attributionControl: false,
      // 禁用3D和旋转功能，保持纯2D模式
      pitch: 0,  // 设置倾斜角度为0（2D视角）
      bearing: 0,  // 设置旋转角度为0
      pitchWithRotate: false,  // 禁用倾斜
      dragRotate: false,  // 禁用右键拖拽旋转
      touchPitch: false,  // 禁用触摸倾斜
    });

    // 禁用旋转和倾斜的交互控制
    mapInstance.current.dragRotate.disable();
    mapInstance.current.touchZoomRotate.disableRotation();

    // 监听地图事件 - 使用延迟来防止快速连续更新
    let moveTimer: NodeJS.Timeout;
    mapInstance.current.on("moveend", () => {
      const map = mapInstance.current!;
      if (map && !isInternalUpdate.current) {
        clearTimeout(moveTimer);
        moveTimer = setTimeout(() => {
          const c = map.getCenter();
          setCenter([c.lat, c.lng]);
        }, 200);
      }
      isInternalUpdate.current = false;
    });

    mapInstance.current.on("zoomend", () => {
      const map = mapInstance.current!;
      if (map && !isInternalUpdate.current) {
        setZoom(map.getZoom());
      }
      isInternalUpdate.current = false;
    });

    // 地图加载完成后创建高亮源/图层与全局点击
    mapInstance.current.on("load", () => {
      const map = mapInstance.current!;
      mapLoadedRef.current = true;
      setMapLoaded(true);

      // 高亮源
      map.addSource(HIGHLIGHT_SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] } as any,
      });

      // 测量源
      map.addSource(measureSourceId, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] } as any,
      });
      console.log('测量数据源已创建:', measureSourceId);
      
      // 高亮图层（面填充、线）- 使用更明显的颜色
      if (!map.getLayer(HIGHLIGHT_LAYER_IDS[0])) {
        map.addLayer({
          id: HIGHLIGHT_LAYER_IDS[0],
          type: "fill",
          source: HIGHLIGHT_SOURCE_ID,
          paint: { 
            "fill-color": "#ffff00",
            "fill-opacity": 0.6
          },
        });
      }
      if (!map.getLayer(HIGHLIGHT_LAYER_IDS[1])) {
        map.addLayer({
          id: HIGHLIGHT_LAYER_IDS[1],
          type: "line",
          source: HIGHLIGHT_SOURCE_ID,
          paint: { 
            "line-color": "#ff0000",
            "line-width": 4,
            "line-opacity": 1 
          },
        });
      }

      // 测量图层 - 只显示 Polygon 类型
      if (!map.getLayer(measureLayerIds.polygon)) {
        map.addLayer({
          id: measureLayerIds.polygon,
          type: 'fill',
          source: measureSourceId,
          layout: {
            'visibility': 'visible'
          },
          paint: {
            'fill-color': '#0080ff',
            'fill-opacity': 0.3,
          },
          filter: ['==', ['geometry-type'], 'Polygon'],
        });
        console.log('创建测量多边形图层');
      }

      if (!map.getLayer(measureLayerIds.line)) {
        map.addLayer({
          id: measureLayerIds.line,
          type: 'line',
          source: measureSourceId,
          layout: {
            'visibility': 'visible'
          },
          paint: {
            'line-color': [
              'case',
              ['has', 'isPolygonBorder'],
              '#0080ff', // 多边形边框颜色
              '#0080ff'  // 普通线颜色
            ],
            'line-width': [
              'case',
              ['has', 'isPolygonBorder'],
              2, // 多边形边框宽度
              3  // 普通线宽度
            ],
          },
          filter: ['==', ['geometry-type'], 'LineString'],
        });
        console.log('创建测量线图层');
      }

      if (!map.getLayer(measureLayerIds.points)) {
        map.addLayer({
          id: measureLayerIds.points,
          type: 'circle',
          source: measureSourceId,
          layout: {
            'visibility': 'visible'
          },
          paint: {
            'circle-radius': 5,
            'circle-color': '#ffffff',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#0080ff',
          },
          filter: ['all', ['==', ['geometry-type'], 'Point'], ['has', 'index']],
        });
        console.log('创建测量点图层');
      }

      // 不再需要 symbol 标签图层，使用 Marker 代替
      console.log('测量图层已创建:', Object.values(measureLayerIds));

      // 双击事件：完成当前测量
      map.on("dblclick", (e) => {
        if (measureModeRef.current && measurePointsRef.current.length > 0) {
          console.log('双击完成当前测量，点数:', measurePointsRef.current.length);
          e.preventDefault(); // 阻止默认的双击放大
          
          // 保存当前测量结果
          const source = map.getSource(measureSourceId) as maplibregl.GeoJSONSource | undefined;
          if (source) {
            const currentData = source._data as any;
            if (currentData && currentData.features) {
              allMeasureFeaturesRef.current = currentData.features;
              console.log('保存当前测量，累积features数:', allMeasureFeaturesRef.current.length);
            }
          }
          
          // 将当前测量的临时Marker移到已完成的Marker数组
          measureMarkersRef.current.push(...currentMeasureMarkersRef.current);
          currentMeasureMarkersRef.current = [];
          console.log('已完成Marker数:', measureMarkersRef.current.length);
          
          // 清空当前点数组，开始新的测量
          measurePointsRef.current = [];
          updateMeasureDisplay(measurePointsRef.current);
          return false;
        }
      });

      // 全局点击：在所有可交互图层上拾取要素
      map.on("click", (e) => {
        console.log('地图点击事件触发', 'measureMode:', measureModeRef.current, 'lngLat:', e.lngLat, '当前点数:', measurePointsRef.current.length);
        
        // 如果在测量模式，处理测量点击
        if (measureModeRef.current) {
          console.log('进入测量模式处理，点击前点数:', measurePointsRef.current.length);
          const lngLat = e.lngLat;
          // 所有测量模式都累加点
          measurePointsRef.current.push([lngLat.lng, lngLat.lat]);
          console.log('添加新点，现在共', measurePointsRef.current.length, '个点');
          console.log('测量点数组:', measurePointsRef.current);
          updateMeasureDisplay(measurePointsRef.current);
          return;
        }

        const layerIds = Array.from(interactiveLayerIdsRef.current);
        if (!layerIds.length) return;
        
        const feats = map.queryRenderedFeatures(e.point, { layers: layerIds });
        if (!feats.length) return;
        
        const f: any = feats[0];
        const sourceId: string = (f.source as any) as string;
        const lId = sourceToLayerIdRef.current.get(sourceId);
        
        if (!lId) return;
        
        // 使用 layersRef 获取最新的 layers 数组
        const currentLayers = layersRef.current;
        const layer = currentLayers.find((l) => l.id === lId);
        
        if (!layer) return;
        
        const feature = {
          type: "Feature",
          geometry: f.geometry,
          properties: { ...(f.properties || {}) },
        } as any;
        
        const idx = feature.properties?._index;
        
        if (isSelectModeRef.current) {
          handleFeatureSelect(feature, layer, typeof idx === "number" ? idx : undefined);
        } else {
          handleFeatureInspect(feature, layer);
        }
      });

      // 鼠标悬停时改变光标为指针
      map.on("mousemove", (e) => {
        // 测量模式下使用十字光标
        if (measureModeRef.current) {
          map.getCanvas().style.cursor = 'crosshair';
          return;
        }

        const layerIds = Array.from(interactiveLayerIdsRef.current);
        if (!layerIds.length) {
          map.getCanvas().style.cursor = '';
          return;
        }
        
        const feats = map.queryRenderedFeatures(e.point, { layers: layerIds });
        
        // 当鼠标悬停在可交互要素上时，改变光标为指针
        map.getCanvas().style.cursor = feats.length > 0 ? 'pointer' : '';
      });

      // 鼠标离开地图时恢复光标
      map.on("mouseleave", () => {
        map.getCanvas().style.cursor = '';
      });
    });

    // 监听属性表双击缩放事件
    const handleZoomToFeature = (event: any) => {
      if (mapInstance.current && event.detail?.bounds) {
        const b = event.detail.bounds; // [minX, minY, maxX, maxY]
        if (Array.isArray(b) && b.length === 4) {
          isInternalUpdate.current = true;
          mapInstance.current.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 50 });
        }
        if (event.detail?.feature) {
          setHighlightData(event.detail.feature);
        }
      }
    };

    // 监听清除选择事件
    const handleClearSelection = () => {
      setHighlightData(null);
      clearSelection();
    };

    // 监听面板大小变化事件
    const handlePanelResize = () => {
      if (mapInstance.current) {
        mapInstance.current.resize();
      }
    };

    // 监听来自Ribbon的地图工具点击事件
    const handleMapToolClickFromRibbon = (event: any) => {
      if (event.detail?.tool) {
        handleToolClick(event.detail.tool);
      }
    };

    // 监听缩放到图层事件
    const handleZoomToLayer = (event: any) => {
      if (mapInstance.current && event.detail?.extent) {
        const { minX, minY, maxX, maxY } = event.detail.extent;
        isInternalUpdate.current = true;
        mapInstance.current.fitBounds([[minX, minY], [maxX, maxY]], { padding: 50 });
      }
    };

    // 监听刷新地图事件 - 强制重新渲染所有图层
    const handleRefreshMap = () => {
      if (!mapInstance.current) return;
      
      const map = mapInstance.current;
      
      // 1. 调整地图容器大小
      map.resize();
      
      // 2. 强制重新渲染所有矢量图层的数据源
      layerRefs.current.forEach((info, layerId) => {
        if (info.type === 'vector') {
          const layer = layersRef.current.find(l => l.id === layerId);
          if (layer && layer.geojson) {
            const source = map.getSource(info.sourceId) as maplibregl.GeoJSONSource | undefined;
            if (source) {
              // 重新设置 GeoJSON 数据，强制刷新
              const data = prepareGeojsonWithIndex(layer.geojson);
              source.setData(data as any);
            }
          }
        }
      });
      
      // 3. 触发地图重绘
      map.triggerRepaint();
      
      console.log('地图已刷新，重新渲染了所有图层');
    };

    window.addEventListener("zoomToFeature", handleZoomToFeature);
    window.addEventListener("clearSelection", handleClearSelection);
    window.addEventListener("panelResize", handlePanelResize);
    window.addEventListener("mapToolClick", handleMapToolClickFromRibbon);
    window.addEventListener("zoomToLayer", handleZoomToLayer);
    window.addEventListener("refreshMap", handleRefreshMap);

    return () => {
      window.removeEventListener("zoomToFeature", handleZoomToFeature);
      window.removeEventListener("clearSelection", handleClearSelection);
      window.removeEventListener("panelResize", handlePanelResize);
      window.removeEventListener("mapToolClick", handleMapToolClickFromRibbon);
      window.removeEventListener("zoomToLayer", handleZoomToLayer);
      window.removeEventListener("refreshMap", handleRefreshMap);
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []); // 仅在组件挂载时初始化一次

  // 注释掉自动同步，避免循环更新
  // 只在特定操作（如"全图"按钮）时手动调用setView
  /*
  useEffect(() => {
    if (!mapInstance.current) return;

    // 检查是否需要更新地图视图
    const currentCenter = mapInstance.current.getCenter();
    const currentZoom = mapInstance.current.getZoom();

    if (Math.abs(currentCenter.lat - center[0]) > 0.0001 ||
        Math.abs(currentCenter.lng - center[1]) > 0.0001 ||
        currentZoom !== zoom) {
      isInternalUpdate.current = true;
      mapInstance.current.setView(center as L.LatLngTuple, zoom);
    }
  }, [center, zoom]);
  */

  useEffect(() => {
    if (!mapInstance.current || !mapLoadedRef.current) return;
    const map = mapInstance.current;

    const currentLayerIds = new Set(layers.map((l) => l.id));
    const currentLayerOrder = layers.map((l) => l.id);

    // 移除已不存在的图层（sources/layers）
    layerRefs.current.forEach((info, layerId) => {
      if (!currentLayerIds.has(layerId)) {
        info.layerIds.forEach((lid) => {
          if (map.getLayer(lid)) map.removeLayer(lid);
          interactiveLayerIdsRef.current.delete(lid);
        });
        if (map.getSource(info.sourceId)) map.removeSource(info.sourceId);
        sourceToLayerIdRef.current.delete(info.sourceId);
        layerRefs.current.delete(layerId);
        layerDataRefs.current.delete(layerId);
      }
    });

    const newlyAddedLayers: Layer[] = [];

    // 创建或更新图层
    layers.forEach((layer) => {
      const existing = layerRefs.current.get(layer.id);
      const cachedGeojson = layerDataRefs.current.get(layer.id);
      const shouldRecreate = !!layer.geojson && layer.geojson !== cachedGeojson && existing?.type === "vector";

      if (shouldRecreate && existing) {
        existing.layerIds.forEach((lid) => {
          if (map.getLayer(lid)) map.removeLayer(lid);
          interactiveLayerIdsRef.current.delete(lid);
        });
        if (map.getSource(existing.sourceId)) map.removeSource(existing.sourceId);
        sourceToLayerIdRef.current.delete(existing.sourceId);
        layerRefs.current.delete(layer.id);
      }

      let info = layerRefs.current.get(layer.id);

      if (!info) {
        // 新建
        if ((layer.type === "basemap" || layer.source.type === "xyz" || layer.source.type === "wms") && layer.source.url) {
          const sourceId = `src-${layer.id}`;
          if (!map.getSource(sourceId)) {
            const url = layer.source.url;
            let tiles: string[];
            if (url.includes("{s}")) {
              // 天地图使用 0-7，谷歌使用 0-3
              const subdomains = url.includes("google") 
                ? ["0","1","2","3"]
                : ["0","1","2","3","4","5","6","7"];
              tiles = subdomains.map(s => url.replace("{s}", s));
            } else {
              tiles = [url];
            }
            map.addSource(sourceId, { type: "raster", tiles, tileSize: 256 });
          }
          const rasterLayerId = `layer-${layer.id}-raster`;
          if (!map.getLayer(rasterLayerId)) {
            map.addLayer({ id: rasterLayerId, type: "raster", source: sourceId, paint: { "raster-opacity": layer.opacity } });
          }
          info = { sourceId, layerIds: [rasterLayerId], type: "raster" };
          layerRefs.current.set(layer.id, info);
          sourceToLayerIdRef.current.set(sourceId, layer.id);
          map.setLayoutProperty(rasterLayerId, "visibility", layer.visible ? "visible" : "none");
        } else if (layer.geojson) {
          const sourceId = `src-${layer.id}`;
          const data = prepareGeojsonWithIndex(layer.geojson);
          
          if (!map.getSource(sourceId)) {
            map.addSource(sourceId, { type: "geojson", data });
          }
          
          layerDataRefs.current.set(layer.id, layer.geojson);
          sourceToLayerIdRef.current.set(sourceId, layer.id);

          const paints = symbolizerToMapLibrePaints(layer.style?.symbolizer, layer.opacity);
          const createdIds: string[] = [];
          
          // 判断几何类型，避免为多边形添加顶点圆圈
          let isPoint = false;
          if (layer.geojson && layer.geojson.features && layer.geojson.features.length > 0) {
            const firstGeomType = layer.geojson.features[0]?.geometry?.type?.toLowerCase() || '';
            isPoint = firstGeomType.includes('point');
          }
          
          if (paints.fillPaint) {
            const id = `layer-${layer.id}-fill`;
            if (!map.getLayer(id)) {
              map.addLayer({ id, type: "fill", source: sourceId, paint: paints.fillPaint });
            }
            createdIds.push(id);
            interactiveLayerIdsRef.current.add(id);
          }
          if (paints.linePaint) {
            const id = `layer-${layer.id}-line`;
            if (!map.getLayer(id)) {
              map.addLayer({ id, type: "line", source: sourceId, paint: paints.linePaint });
            }
            createdIds.push(id);
            interactiveLayerIdsRef.current.add(id);
          }
          // 只为点图层添加 circle 图层，避免在多边形/线上显示顶点
          if (paints.circlePaint && isPoint) {
            const id = `layer-${layer.id}-circle`;
            if (!map.getLayer(id)) {
              map.addLayer({ id, type: "circle", source: sourceId, paint: paints.circlePaint });
            }
            createdIds.push(id);
            interactiveLayerIdsRef.current.add(id);
          }

          // 添加标注图层
          if (layer.labelConfig && layer.labelConfig.enabled && layer.labelConfig.field) {
            const labelId = `layer-${layer.id}-label`;
            if (!map.getLayer(labelId)) {
              const config = layer.labelConfig;
              // 基本的字体堆栈，所有字体都使用MapLibre支持的字体
              const fontStack = config.fontWeight === 'bold' 
                ? ["Open Sans Bold", "Arial Unicode MS Bold"]
                : ["Open Sans Regular", "Arial Unicode MS Regular"];
              map.addLayer({
                id: labelId,
                type: "symbol",
                source: sourceId,
                layout: {
                  "text-field": ["to-string", ["get", config.field]],
                  "text-font": fontStack,
                  "text-size": config.fontSize || 12,
                  "text-anchor": config.anchor || "center",
                  "text-offset": config.offset || [0, 0],
                  "text-allow-overlap": true,
                  "text-optional": true,
                },
                paint: {
                  "text-color": config.fontColor || "#000000",
                  "text-halo-color": config.haloColor || "#ffffff",
                  "text-halo-width": config.haloWidth || 1,
                },
              });
            }
            createdIds.push(labelId);
          }

          createdIds.forEach((id) => map.setLayoutProperty(id, "visibility", layer.visible ? "visible" : "none"));
          info = { sourceId, layerIds: createdIds, type: "vector" };
          layerRefs.current.set(layer.id, info);
          newlyAddedLayers.push(layer);
        }
      } else {
        // 更新
        if (info.type === "raster") {
          const rid = info.layerIds[0];
          if (map.getLayer(rid)) {
            map.setPaintProperty(rid, "raster-opacity", layer.opacity);
            map.setLayoutProperty(rid, "visibility", layer.visible ? "visible" : "none");
          }
        } else if (info.type === "vector") {
          // 样式更新
          const paints = symbolizerToMapLibrePaints(layer.style?.symbolizer, layer.opacity);
          for (const id of info.layerIds) {
            if (!map.getLayer(id)) continue;
            if (id.endsWith("-fill") && paints.fillPaint) {
              for (const k of Object.keys(paints.fillPaint)) {
                map.setPaintProperty(id, k, paints.fillPaint[k]);
              }
            }
            if (id.endsWith("-line") && paints.linePaint) {
              for (const k of Object.keys(paints.linePaint)) {
                map.setPaintProperty(id, k, paints.linePaint[k]);
              }
            }
            if (id.endsWith("-circle") && paints.circlePaint) {
              for (const k of Object.keys(paints.circlePaint)) {
                map.setPaintProperty(id, k, paints.circlePaint[k]);
              }
            }
            map.setLayoutProperty(id, "visibility", layer.visible ? "visible" : "none");
          }

          // 更新或添加/删除标注图层
          const labelId = `layer-${layer.id}-label`;
          const hasLabelLayer = info.layerIds.includes(labelId);
          const shouldHaveLabel = layer.labelConfig && layer.labelConfig.enabled && layer.labelConfig.field;

          if (shouldHaveLabel && !hasLabelLayer) {
            // 需要添加标注图层
            const config = layer.labelConfig!;
            if (!map.getLayer(labelId)) {
              // 基本的字体堆栈
              const fontStack = config.fontWeight === 'bold'
                ? ["Open Sans Bold", "Arial Unicode MS Bold"]
                : ["Open Sans Regular", "Arial Unicode MS Regular"];
              map.addLayer({
                id: labelId,
                type: "symbol",
                source: info.sourceId,
                layout: {
                  "text-field": ["to-string", ["get", config.field]],
                  "text-font": fontStack,
                  "text-size": config.fontSize || 12,
                  "text-anchor": config.anchor || "center",
                  "text-offset": config.offset || [0, 0],
                  "text-allow-overlap": true,
                  "text-optional": true,
                },
                paint: {
                  "text-color": config.fontColor || "#000000",
                  "text-halo-color": config.haloColor || "#ffffff",
                  "text-halo-width": config.haloWidth || 1,
                },
              });
            }
            info.layerIds.push(labelId);
            map.setLayoutProperty(labelId, "visibility", layer.visible ? "visible" : "none");
          } else if (shouldHaveLabel && hasLabelLayer) {
            // 更新标注图层
            const config = layer.labelConfig!;
            if (map.getLayer(labelId)) {
              const fontStack = config.fontWeight === 'bold'
                ? ["Open Sans Bold", "Arial Unicode MS Bold"]
                : ["Open Sans Regular", "Arial Unicode MS Regular"];
              map.setLayoutProperty(labelId, "text-field", ["to-string", ["get", config.field]]);
              map.setLayoutProperty(labelId, "text-font", fontStack);
              map.setLayoutProperty(labelId, "text-size", config.fontSize || 12);
              map.setLayoutProperty(labelId, "text-anchor", config.anchor || "center");
              map.setLayoutProperty(labelId, "text-offset", config.offset || [0, 0]);
              map.setPaintProperty(labelId, "text-color", config.fontColor || "#000000");
              map.setPaintProperty(labelId, "text-halo-color", config.haloColor || "#ffffff");
              map.setPaintProperty(labelId, "text-halo-width", config.haloWidth || 1);
              map.setLayoutProperty(labelId, "visibility", layer.visible ? "visible" : "none");
            }
          } else if (!shouldHaveLabel && hasLabelLayer) {
            // 需要删除标注图层
            if (map.getLayer(labelId)) {
              map.removeLayer(labelId);
            }
            info.layerIds = info.layerIds.filter(id => id !== labelId);
          }

          if (layer.geojson && layer.geojson !== cachedGeojson) {
            const src = map.getSource(info.sourceId) as maplibregl.GeoJSONSource | undefined;
            if (src) src.setData(prepareGeojsonWithIndex(layer.geojson) as any);
            layerDataRefs.current.set(layer.id, layer.geojson);
          }
        }
      }
    });

    // 依据 store 顺序重排图层：layers[0] 在顶部（符合 GIS 惯例）
    const allGroupIds: string[][] = layers
      .map((l) => layerRefs.current.get(l.id)?.layerIds || [])
      .filter((arr) => arr.length > 0) as string[][];
    // 从 layers 底部（面板底部）开始，依次移到最顶部，最终 layers[0]（面板顶部）在地图最上层
    for (let gi = allGroupIds.length - 1; gi >= 0; gi--) {
      const group = allGroupIds[gi];
      // 将当前组的所有图层移到最顶部，保持组内顺序（fill->line->circle）
      for (const lid of group) {
        if (map.getLayer(lid)) {
          map.moveLayer(lid); // 无 beforeId 参数，移到最顶部
        }
      }
    }

    // 标注图层放在最上层（在高亮图层之下）
    const labelLayerIds: string[] = [];
    layerRefs.current.forEach((info, layerId) => {
      info.layerIds.forEach(lid => {
        if (lid.endsWith('-label') && map.getLayer(lid)) {
          labelLayerIds.push(lid);
        }
      });
    });
    labelLayerIds.forEach(lid => {
      if (map.getLayer(lid)) map.moveLayer(lid);
    });

    // 高亮图层永远置顶
    for (const lid of HIGHLIGHT_LAYER_IDS) {
      if (map.getLayer(lid)) map.moveLayer(lid);
    }

    // 测量图层在高亮图层之上（Marker自动在最上层，不需要调整）
    const measureLayerIdsList = [
      measureLayerIds.polygon,
      measureLayerIds.line,
      measureLayerIds.points
    ];
    measureLayerIdsList.forEach(lid => {
      if (map.getLayer(lid)) map.moveLayer(lid);
    });

    // 对新添加的矢量图层执行缩放
    newlyAddedLayers.forEach((layer) => {
      if (layer.type !== "basemap" && layer.extent) {
        const { minX, minY, maxX, maxY } = layer.extent;
        isInternalUpdate.current = true;
        map.fitBounds([[minX, minY], [maxX, maxY]], { padding: 50 });
      }
    });

    previousLayerIds.current = currentLayerIds;
    previousLayerOrder.current = currentLayerOrder;
  }, [layers, mapLoaded]);

  useEffect(() => {
    isSelectModeRef.current = isSelectMode;
  }, [isSelectMode]);

  useEffect(() => {
    measureModeRef.current = measureMode;
  }, [measureMode]);

  // 同步提示文本到store
  useEffect(() => {
    if (measureMode === 'distance') {
      setMapHintText('距离测量：点击添加测量点，双击完成当前测量');
    } else if (measureMode === 'area') {
      setMapHintText('面积测量：点击添加测量点（至少3个），双击完成当前测量');
    } else if (measureMode === 'coordinate') {
      setMapHintText('坐标测量：点击地图获取坐标');
    } else if (isSelectMode) {
      setMapHintText('选择模式：点击要素进行选择');
    } else {
      setMapHintText('平移模式：拖拽地图浏览');
    }
  }, [measureMode, isSelectMode, setMapHintText]);

  // 同步 layers 引用
  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  return (
    <div className="map-wrapper">
      <div ref={mapContainer} className="map-container" />
      <HistoryImageControl />
      <NorthArrow />
      <div className="map-toolbar">
        <button
          className="map-tool"
          title="放大"
          onClick={() => handleToolClick("zoomIn")}
        >
          <span>🔍+</span>
        </button>
        <button
          className="map-tool"
          title="缩小"
          onClick={() => handleToolClick("zoomOut")}
        >
          <span>🔍-</span>
        </button>
        <button
          className="map-tool"
          title="平移"
          onClick={() => handleToolClick("pan")}
          style={{ backgroundColor: !isSelectMode ? "#e0e0e0" : "transparent" }}
        >
          <span>✋</span>
        </button>
        <button
          className="map-tool"
          title="全图"
          onClick={() => handleToolClick("fullExtent")}
        >
          <span>🌍</span>
        </button>
        <button
          className={`map-tool ${isSelectMode ? "active" : ""}`}
          title={isSelectMode ? "选择模式（点击退出）" : "选择模式"}
          onClick={() => handleToolClick("select")}
          style={{
            backgroundColor: isSelectMode ? "#007bff" : "transparent",
            color: isSelectMode ? "white" : "inherit",
          }}
        >
          <span>⬚</span>
        </button>
        {selectedFeatures.length > 0 && (
          <button
            className="map-tool"
            title="清除选择"
            onClick={() => handleToolClick("clearSelection")}
            style={{ backgroundColor: "#ff4d4f", color: "white" }}
          >
            <span>✕</span>
          </button>
        )}
        <button 
          className={`map-tool ${measureExpanded ? "active" : ""}`}
          title="测量"
          onClick={() => handleToolClick("measure")}
          style={{
            backgroundColor: measureExpanded ? "#007bff" : "transparent",
            color: measureExpanded ? "white" : "inherit",
          }}
        >
          <span>📏</span>
        </button>
        {measureExpanded && (
          <>
            <button
              className={`map-tool ${measureMode === 'distance' ? "active" : ""}`}
              title="距离测量"
              onClick={() => handleMeasureToolClick('distance')}
              style={{
                backgroundColor: measureMode === 'distance' ? "#28a745" : "transparent",
                color: measureMode === 'distance' ? "white" : "inherit",
              }}
            >
              <span>📐</span>
            </button>
            <button
              className={`map-tool ${measureMode === 'area' ? "active" : ""}`}
              title="面积测量"
              onClick={() => handleMeasureToolClick('area')}
              style={{
                backgroundColor: measureMode === 'area' ? "#28a745" : "transparent",
                color: measureMode === 'area' ? "white" : "inherit",
              }}
            >
              <span>⬛</span>
            </button>
            <button
              className={`map-tool ${measureMode === 'coordinate' ? "active" : ""}`}
              title="坐标测量"
              onClick={() => handleMeasureToolClick('coordinate')}
              style={{
                backgroundColor: measureMode === 'coordinate' ? "#28a745" : "transparent",
                color: measureMode === 'coordinate' ? "white" : "inherit",
              }}
            >
              <span>📍</span>
            </button>
            {measureMode && (
              <button
                className="map-tool"
                title="清除测量"
                onClick={clearMeasure}
                style={{ backgroundColor: "#ff4d4f", color: "white" }}
              >
                <span>🗑️</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MapView;
