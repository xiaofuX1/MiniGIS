import React, { useEffect, useRef, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import { defaults as defaultControls } from "ol/control";
import { defaults as defaultInteractions, DragRotate, PinchRotate } from "ol/interaction";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import { XYZ, Vector as VectorSource } from "ol/source";
import { GeoJSON } from "ol/format";
import { Style, Fill, Stroke, Circle, Text } from "ol/style";
import { Overlay } from "ol";
import type { Feature } from "ol";
import type { Geometry } from "ol/geom";
import type { Coordinate } from "ol/coordinate";
import { getCenter } from "ol/extent";
import type { MapBrowserEvent } from "ol";
import "ol/ol.css";
import { useMapStore } from "../../stores/mapStore";
import { useLayerStore } from "../../stores/layerStore";
import { useSelectionStore } from "../../stores/selectionStore";
import { useWindowStore } from "../../stores/windowStore";
import type { Layer } from "../../stores/layerStore";
import { symbolizerToOLStyle, createTextStyle } from "../../utils/symbolRenderer";
import { latLngToOL, olToLatLng, geoJsonExtentToOL, createXYZUrl } from "../../utils/olHelpers";
import HistoryImageControl from "./HistoryImageControl";
import NorthArrow from "./NorthArrow";
import "./MapView.css";
import * as turf from "@turf/turf";

const MapView: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<Map | null>(null);
  const isInternalUpdate = useRef(false);
  
  // 图层引用 - 存储每个图层的OpenLayers layer对象
  const layerRefs = useRef<globalThis.Map<string, any>>(new globalThis.Map());
  const layerDataRefs = useRef<globalThis.Map<string, any>>(new globalThis.Map());
  const previousLayerIds = useRef<Set<string>>(new Set());
  
  // 高亮图层
  const highlightLayerRef = useRef<any>(null);
  const highlightSourceRef = useRef<any>(null);
  
  // 测量相关
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const isSelectModeRef = useRef(false);
  const [measureExpanded, setMeasureExpanded] = useState(false);
  const [measureMode, setMeasureMode] = useState<'distance' | 'area' | 'coordinate' | null>(null);
  const measureModeRef = useRef<'distance' | 'area' | 'coordinate' | null>(null);
  const measurePointsRef = useRef<[number, number][]>([]);
  const allMeasureFeaturesRef = useRef<any[]>([]);
  const measureOverlaysRef = useRef<Overlay[]>([]);
  const currentMeasureOverlaysRef = useRef<Overlay[]>([]);
  const measureLayerRef = useRef<any>(null);
  const measureSourceRef = useRef<any>(null);
  
  const { center, zoom, setCenter, setZoom } = useMapStore();
  const { layers, selectLayer } = useLayerStore();
  const layersRef = useRef(layers);
  const {
    setSelectedFeatures,
    clearSelection,
    setIsSelecting,
    setInspectedFeature,
    setSelectedFeatureId,
    selectedFeatures,
  } = useSelectionStore();
  const { getWindowsInDock, dockSizes } = useWindowStore();

  // 设置高亮数据
  const setHighlightData = (feature: any | null) => {
    const source = highlightSourceRef.current;
    if (!source) return;
    
    if (feature) {
      try {
        const format = new GeoJSON();
        const olFeature = format.readFeature({
          type: "Feature",
          geometry: feature.geometry,
          properties: feature.properties || {},
        }, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857',
        });
        source.clear();
        source.addFeature(olFeature);
        
        // 确保高亮图层可见
        if (highlightLayerRef.current) {
          highlightLayerRef.current.setVisible(true);
        }
      } catch (error) {
        console.error('更新高亮数据失败:', error);
      }
    } else {
      source.clear();
      if (highlightLayerRef.current) {
        highlightLayerRef.current.setVisible(false);
      }
    }
  };

  // 给 GeoJSON 添加 _index 属性
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
    if (!highlightLayerRef.current) return;
    
    setHighlightData(feature);
    let flashCount = 0;
    const maxFlashes = 3;
    let visible = true;
    
    const timer = setInterval(() => {
      if (flashCount >= maxFlashes) {
        clearInterval(timer);
        setHighlightData(null);
        if (callback) callback();
        return;
      }
      if (highlightLayerRef.current) {
        highlightLayerRef.current.setVisible(!visible);
      }
      visible = !visible;
      if (!visible) flashCount++;
    }, 200);
  };

  // 处理要素选择
  const handleFeatureSelect = (
    feature: any,
    layer: Layer,
    index?: number,
  ) => {
    try {
      setHighlightData(feature);
    } catch (error) {
      console.error('设置高亮失败:', error);
    }
    
    setSelectedFeatures([feature]);
    
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
    selectLayer(layer);
  };

  // 处理要素浏览
  const handleFeatureInspect = (
    feature: any,
    layer: Layer,
  ) => {
    setInspectedFeature(feature);
    selectLayer(layer);
    useWindowStore.getState().showWindow('feature-info');
    flashFeature(feature);
  };

  // 处理工具栏按钮点击
  const handleToolClick = (tool: string) => {
    const map = mapInstance.current;
    if (!map) return;
    
    const view = map.getView();
    
    switch (tool) {
      case "zoomIn":
        view.animate({ zoom: view.getZoom()! + 1, duration: 250 });
        break;
      case "zoomOut":
        view.animate({ zoom: view.getZoom()! - 1, duration: 250 });
        break;
      case "pan":
        setIsSelectMode(false);
        setIsSelecting(false);
        break;
      case "fullExtent":
        if (layers.length > 0) {
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
            const extent = geoJsonExtentToOL({ minX, minY, maxX, maxY });
            isInternalUpdate.current = true;
            view.fit(extent, { padding: [50, 50, 50, 50], duration: 500 });
          }
        }
        break;
      case "select":
        const newSelectMode = !isSelectMode;
        setIsSelectMode(newSelectMode);
        setIsSelecting(newSelectMode);
        if (isSelectMode) {
          clearSelection();
          setHighlightData(null);
        }
        break;
      case "clearSelection":
        clearSelection();
        setHighlightData(null);
        break;
      case "measure":
        const newExpanded = !measureExpanded;
        setMeasureExpanded(newExpanded);
        if (!newExpanded) {
          console.log('收回测量面板，清除所有测量数据');
          clearMeasure();
        } else {
          console.log('展开测量面板');
        }
        break;
    }
  };

  // 清除测量数据
  const clearMeasure = () => {
    setMeasureMode(null);
    measurePointsRef.current = [];
    allMeasureFeaturesRef.current = [];
    
    // 清除所有 Overlay
    measureOverlaysRef.current.forEach(overlay => {
      if (mapInstance.current) {
        mapInstance.current.removeOverlay(overlay);
      }
    });
    measureOverlaysRef.current = [];
    
    currentMeasureOverlaysRef.current.forEach(overlay => {
      if (mapInstance.current) {
        mapInstance.current.removeOverlay(overlay);
      }
    });
    currentMeasureOverlaysRef.current = [];
    
    const source = measureSourceRef.current;
    if (source) {
      source.clear();
    }
  };

  // 处理测量工具点击
  const handleMeasureToolClick = (tool: 'distance' | 'area' | 'coordinate') => {
    console.log('测量工具点击:', tool, '当前模式:', measureMode, '当前点数:', measurePointsRef.current.length);
    
    if (measurePointsRef.current.length > 0) {
      // 保存当前测量的Overlay
      measureOverlaysRef.current.push(...currentMeasureOverlaysRef.current);
      currentMeasureOverlaysRef.current = [];
      console.log('已完成Overlay数:', measureOverlaysRef.current.length);
    }
    
    if (measureMode === tool) {
      console.log('完成当前测量，开始新的测量');
      measurePointsRef.current = [];
    } else {
      console.log('切换到新测量模式:', tool);
      measurePointsRef.current = [];
      setMeasureMode(tool);
      setIsSelectMode(false);
      setIsSelecting(false);
    }
  };

  // 更新测量显示
  const updateMeasureDisplay = (points: [number, number][]) => {
    console.log('updateMeasureDisplay 调用', 'points:', points);
    const map = mapInstance.current;
    const source = measureSourceRef.current;
    if (!map || !source) {
      console.log('地图或数据源未加载');
      return;
    }

    // 清除当前测量的临时Overlay
    currentMeasureOverlaysRef.current.forEach(overlay => map.removeOverlay(overlay));
    currentMeasureOverlaysRef.current = [];

    const format = new GeoJSON();
    const currentFeatures: Feature<Geometry>[] = [];

    if (points.length === 0) {
      source.clear();
      return;
    }

    if (measureModeRef.current === 'coordinate') {
      // 坐标测量：显示所有点和坐标标签
      points.forEach((pt) => {
        const olCoord = latLngToOL([pt[1], pt[0]]);
        const pointFeature = format.readFeature({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [pt[0], pt[1]] },
          properties: {}
        }, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857'
        });
        currentFeatures.push(pointFeature as Feature<Geometry>);

        // 创建标签Overlay
        const coordText = `经度: ${pt[0].toFixed(6)}<br/>纬度: ${pt[1].toFixed(6)}`;
        const el = document.createElement('div');
        el.className = 'measure-label';
        el.innerHTML = coordText;
        el.style.cssText = 'background: rgba(255,255,255,0.95); padding: 4px 8px; border-radius: 4px; color: #0080ff; font-size: 12px; font-weight: 500; box-shadow: 0 2px 4px rgba(0,0,0,0.2); white-space: nowrap;';
        
        const overlay = new Overlay({
          element: el,
          positioning: 'bottom-center',
          offset: [0, -10],
          stopEvent: false
        });
        overlay.setPosition(olCoord);
        map.addOverlay(overlay);
        currentMeasureOverlaysRef.current.push(overlay);
      });
    } else if (measureModeRef.current === 'distance' && points.length >= 1) {
      // 距离测量
      points.forEach((pt) => {
        const pointFeature = format.readFeature({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [pt[0], pt[1]] },
          properties: {}
        }, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857'
        });
        currentFeatures.push(pointFeature as Feature<Geometry>);
      });

      if (points.length >= 2) {
        const lineFeature = format.readFeature({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: points },
          properties: {}
        }, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857'
        });
        currentFeatures.push(lineFeature as Feature<Geometry>);

        // 计算距离
        const line = turf.lineString(points);
        const length = turf.length(line, { units: 'meters' });
        
        const lastPoint = points[points.length - 1];
        const olCoord = latLngToOL([lastPoint[1], lastPoint[0]]);
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
        
        const overlay = new Overlay({
          element: el,
          positioning: 'bottom-center',
          offset: [0, -10],
          stopEvent: false
        });
        overlay.setPosition(olCoord);
        map.addOverlay(overlay);
        currentMeasureOverlaysRef.current.push(overlay);
      }
    } else if (measureModeRef.current === 'area' && points.length >= 1) {
      // 面积测量
      points.forEach((pt) => {
        const pointFeature = format.readFeature({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [pt[0], pt[1]] },
          properties: {}
        }, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857'
        });
        currentFeatures.push(pointFeature as Feature<Geometry>);
      });

      if (points.length === 2) {
        const lineFeature = format.readFeature({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: points },
          properties: {}
        }, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857'
        });
        currentFeatures.push(lineFeature as Feature<Geometry>);
      }

      if (points.length >= 3) {
        const closedPoints = [...points, points[0]];
        const polygonFeature = format.readFeature({
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [closedPoints] },
          properties: {}
        }, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857'
        });
        currentFeatures.push(polygonFeature as Feature<Geometry>);

        // 计算面积
        const polygon = turf.polygon([closedPoints]);
        const area = turf.area(polygon);
        
        const centroid = turf.centroid(polygon);
        const centroidCoords = centroid.geometry.coordinates as [number, number];
        const olCoord = latLngToOL([centroidCoords[1], centroidCoords[0]]);
        
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
        
        const overlay = new Overlay({
          element: el,
          positioning: 'center-center',
          stopEvent: false
        });
        overlay.setPosition(olCoord);
        map.addOverlay(overlay);
        currentMeasureOverlaysRef.current.push(overlay);
      }
    }

    // 更新数据源
    source.clear();
    source.addFeatures(currentFeatures);
    console.log('测量数据已更新到地图，共', currentFeatures.length, '个要素');
  };

  // 地图初始化 useEffect
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    // 创建OpenLayers地图
    const initialView = new View({
      center: latLngToOL(center),
      zoom: zoom,
      constrainRotation: false, // 禁用旋转
      enableRotation: false,
      // 性能优化：限制缩放范围
      minZoom: 2,
      maxZoom: 20,
      smoothResolutionConstraint: false, // 禁用平滑约束，提升性能
      smoothExtentConstraint: false, // 禁用范围平滑
    });

    // 移除旋转交互 - 性能优化配置
    const interactions = defaultInteractions({
      altShiftDragRotate: false,
      pinchRotate: false,
      shiftDragZoom: true,
      doubleClickZoom: true,
      keyboard: false, // 禁用键盘导航，减少事件监听
      mouseWheelZoom: true,
      dragPan: true,
    });

    const map = new Map({
      target: mapContainer.current,
      view: initialView,
      controls: defaultControls({ attribution: false, rotate: false, zoom: false }),
      interactions: interactions,
      // 性能优化配置
      pixelRatio: 1, // 固定像素比，避免高分屏性能损耗
    });

    mapInstance.current = map;

    // 监听视图变化 - 添加防抖优化
    let moveTimer: NodeJS.Timeout;
    let zoomTimer: NodeJS.Timeout;
    
    map.on('moveend', () => {
      if (!isInternalUpdate.current) {
        clearTimeout(moveTimer);
        moveTimer = setTimeout(() => {
          const view = map.getView();
          const center = view.getCenter();
          if (center) {
            const latLng = olToLatLng(center);
            setCenter(latLng);
          }
        }, 200);
      }
      isInternalUpdate.current = false;
    });

    // 使用moveend代替change:resolution，减少触发频率
    map.on('moveend', () => {
      if (!isInternalUpdate.current) {
        clearTimeout(zoomTimer);
        zoomTimer = setTimeout(() => {
          const view = map.getView();
          const zoom = view.getZoom();
          if (zoom !== undefined) {
            setZoom(zoom);
          }
        }, 100);
      }
    });

    // 创建高亮图层
    const highlightSource = new VectorSource();
    highlightSourceRef.current = highlightSource;
    
    const highlightLayer = new VectorLayer({
      source: highlightSource,
      style: new Style({
        fill: new Fill({
          color: 'rgba(255, 255, 0, 0.6)',
        }),
        stroke: new Stroke({
          color: '#ff0000',
          width: 4,
        }),
      }),
      zIndex: 9998,
      updateWhileAnimating: true,
      updateWhileInteracting: true,
      renderBuffer: 100, // 减少渲染缓冲区
    });
    highlightLayer.setVisible(false);
    highlightLayerRef.current = highlightLayer;
    map.addLayer(highlightLayer);

    // 创建测量图层
    const measureSource = new VectorSource();
    measureSourceRef.current = measureSource;
    
    const measureLayer = new VectorLayer({
      source: measureSource,
      updateWhileAnimating: true,
      updateWhileInteracting: true,
      renderBuffer: 100, // 减少渲染缓冲区
      style: (feature) => {
        const geomType = feature.getGeometry()?.getType();
        if (geomType === 'Point') {
          return new Style({
            image: new Circle({
              radius: 5,
              fill: new Fill({ color: '#ffffff' }),
              stroke: new Stroke({ color: '#0080ff', width: 2 }),
            }),
          });
        } else if (geomType === 'LineString') {
          return new Style({
            stroke: new Stroke({
              color: '#0080ff',
              width: 3,
            }),
          });
        } else if (geomType === 'Polygon') {
          return new Style({
            fill: new Fill({
              color: 'rgba(0, 128, 255, 0.3)',
            }),
            stroke: new Stroke({
              color: '#0080ff',
              width: 2,
            }),
          });
        }
        return new Style();
      },
      zIndex: 9999,
    });
    measureLayerRef.current = measureLayer;
    map.addLayer(measureLayer);

    setMapLoaded(true);

    // 双击事件：完成当前测量
    map.on('dblclick', (e: MapBrowserEvent<any>) => {
      if (measureModeRef.current && measurePointsRef.current.length > 0) {
        console.log('双击完成当前测量，点数:', measurePointsRef.current.length);
        e.preventDefault();
        
        // 保存当前测量
        measureOverlaysRef.current.push(...currentMeasureOverlaysRef.current);
        currentMeasureOverlaysRef.current = [];
        
        measurePointsRef.current = [];
        updateMeasureDisplay(measurePointsRef.current);
        return false;
      }
    });

    // 点击事件：测量或要素选择
    map.on('click', (e: MapBrowserEvent<any>) => {
      console.log('地图点击事件触发', 'measureMode:', measureModeRef.current);
      
      // 测量模式
      if (measureModeRef.current) {
        const coord = e.coordinate;
        const latLng = olToLatLng(coord);
        measurePointsRef.current.push([latLng[1], latLng[0]]);
        console.log('添加新点，现在共', measurePointsRef.current.length, '个点');
        updateMeasureDisplay(measurePointsRef.current);
        return;
      }

      // 要素选择/浏览模式
      const pixel = e.pixel;
      let foundFeature = false;
      
      map.forEachFeatureAtPixel(pixel, (feature, layer) => {
        if (foundFeature) return;
        if (!layer || layer === highlightLayerRef.current || layer === measureLayerRef.current) return;
        
        // 查找对应的业务图层
        let targetLayer: Layer | null = null;
        layerRefs.current.forEach((olLayer, layerId) => {
          if (olLayer === layer) {
            targetLayer = layersRef.current.find(l => l.id === layerId) || null;
          }
        });
        
        if (!targetLayer) return;
        
        // 转换为GeoJSON格式
        const format = new GeoJSON();
        const geojsonFeature = format.writeFeatureObject(feature as Feature<Geometry>, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857',
        });
        
        const idx = feature.get('_index');
        
        if (isSelectModeRef.current) {
          handleFeatureSelect(geojsonFeature, targetLayer, typeof idx === 'number' ? idx : undefined);
        } else {
          handleFeatureInspect(geojsonFeature, targetLayer);
        }
        
        foundFeature = true;
      });
    });

    // 鼠标移动：改变光标
    map.on('pointermove', (e: MapBrowserEvent<any>) => {
      if (measureModeRef.current) {
        map.getTargetElement().style.cursor = 'crosshair';
        return;
      }
      
      const pixel = e.pixel;
      const hit = map.forEachFeatureAtPixel(pixel, (feature, layer) => {
        if (layer === highlightLayerRef.current || layer === measureLayerRef.current) return false;
        return true;
      });
      
      map.getTargetElement().style.cursor = hit ? 'pointer' : '';
    });

    // 监听事件
    const handleZoomToFeature = (event: any) => {
      if (event.detail?.bounds) {
        const b = event.detail.bounds;
        if (Array.isArray(b) && b.length === 4) {
          const extent = geoJsonExtentToOL({ minX: b[0], minY: b[1], maxX: b[2], maxY: b[3] });
          isInternalUpdate.current = true;
          map.getView().fit(extent, { padding: [50, 50, 50, 50], duration: 500 });
        }
        if (event.detail?.feature) {
          setHighlightData(event.detail.feature);
        }
      }
    };

    const handleClearSelection = () => {
      setHighlightData(null);
      clearSelection();
    };

    const handlePanelResize = () => {
      map.updateSize();
    };

    const handleMapToolClickFromRibbon = (event: any) => {
      if (event.detail?.tool) {
        handleToolClick(event.detail.tool);
      }
    };

    const handleZoomToLayer = (event: any) => {
      if (event.detail?.extent) {
        const { minX, minY, maxX, maxY } = event.detail.extent;
        const extent = geoJsonExtentToOL({ minX, minY, maxX, maxY });
        isInternalUpdate.current = true;
        map.getView().fit(extent, { padding: [50, 50, 50, 50], duration: 500 });
      }
    };

    const handleRefreshMap = () => {
      map.updateSize();
      map.render();
      console.log('地图已刷新');
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
      
      map.setTarget(undefined);
    };
  }, []);

  // 图层管理 useEffect
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !mapLoaded) return;

    const currentLayerIds = new Set(layers.map((l) => l.id));

    // 移除已不存在的图层
    layerRefs.current.forEach((olLayer, layerId) => {
      if (!currentLayerIds.has(layerId)) {
        map.removeLayer(olLayer);
        layerRefs.current.delete(layerId);
        layerDataRefs.current.delete(layerId);
      }
    });

    const newlyAddedLayers: Layer[] = [];

    // 创建或更新图层
    layers.forEach((layer, index) => {
      const existing = layerRefs.current.get(layer.id);
      const cachedGeojson = layerDataRefs.current.get(layer.id);
      const shouldRecreate = !!layer.geojson && layer.geojson !== cachedGeojson && existing;

      if (shouldRecreate && existing) {
        map.removeLayer(existing);
        layerRefs.current.delete(layer.id);
      }

      let olLayer = layerRefs.current.get(layer.id);

      if (!olLayer) {
        // 新建图层
        if ((layer.type === "basemap" || layer.source.type === "xyz" || layer.source.type === "wms") && layer.source.url) {
          const url = createXYZUrl(layer.source.url);
          const tileLayer = new TileLayer({
            source: new XYZ({ 
              url,
              transition: 0, // 禁用瓦片淡入动画，提升性能
            }),
            opacity: layer.opacity,
            visible: layer.visible,
            zIndex: layers.length - index, // 图层顺序：panel顶部在地图最上层
            preload: 0, // 预加载瓦片层级
          });
          
          map.addLayer(tileLayer);
          layerRefs.current.set(layer.id, tileLayer);
        } else if (layer.geojson) {
          // 矢量图层
          const format = new GeoJSON();
          const data = prepareGeojsonWithIndex(layer.geojson);
          
          const features = format.readFeatures(data, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857',
          });
          
          const source = new VectorSource({ 
            features,
            wrapX: false, // 禁用X轴包裹，提升性能
          });
          
          // 创建样式 - 使用缓存优化
          const baseStyle = symbolizerToOLStyle(layer.style?.symbolizer, layer.opacity);
          
          // 样式缓存：如果没有标注，直接使用静态样式
          if (!layer.labelConfig || !layer.labelConfig.enabled) {
            // 无标注 - 使用静态样式（性能最优）
            const vectorLayer = new VectorLayer({
              source,
              style: baseStyle,
              opacity: layer.opacity,
              visible: layer.visible,
              zIndex: layers.length - index + 100,
              updateWhileAnimating: true,
              updateWhileInteracting: true,
              declutter: false, // 无标注时禁用
              renderBuffer: 100,
            });
            
            map.addLayer(vectorLayer);
            layerRefs.current.set(layer.id, vectorLayer);
            layerDataRefs.current.set(layer.id, layer.geojson);
            newlyAddedLayers.push(layer);
            return; // 跳过后续处理
          }
          
          // 有标注 - 使用样式缓存
          const styleCache = new globalThis.Map<string, Style[]>();
          
          const styleFunction = (feature: any) => {
            const fieldValue = feature.get(layer.labelConfig!.field);
            const cacheKey = String(fieldValue ?? '');
            
            // 检查缓存
            let cachedStyle = styleCache.get(cacheKey);
            if (cachedStyle) {
              return cachedStyle;
            }
            
            // 创建新样式
            const styles: Style[] = [baseStyle as Style];
            
            if (fieldValue !== undefined && fieldValue !== null) {
              const textStyle = new Style({
                text: new Text({
                  text: String(fieldValue),
                  font: `${layer.labelConfig!.fontWeight || 'normal'} ${layer.labelConfig!.fontSize || 12}px sans-serif`,
                  fill: new Fill({ color: layer.labelConfig!.fontColor || '#000000' }),
                  stroke: new Stroke({
                    color: layer.labelConfig!.haloColor || '#ffffff',
                    width: layer.labelConfig!.haloWidth || 1,
                  }),
                  offsetX: layer.labelConfig!.offset?.[0] || 0,
                  offsetY: layer.labelConfig!.offset?.[1] || 0,
                  textAlign: mapAnchorToOL(layer.labelConfig!.anchor).textAlign,
                  textBaseline: mapAnchorToOL(layer.labelConfig!.anchor).textBaseline,
                }),
              });
              styles.push(textStyle);
            }
            
            // 存入缓存
            styleCache.set(cacheKey, styles);
            return styles;
          };
          
          const vectorLayer = new VectorLayer({
            source,
            style: styleFunction,
            opacity: layer.opacity,
            visible: layer.visible,
            zIndex: layers.length - index + 100, // 矢量图层在瓦片图层之上
            // 性能优化配置
            updateWhileAnimating: true, // 动画时更新（缩放流畅）
            updateWhileInteracting: true, // 交互时更新（平移流畅）
            declutter: true, // 避免标注重叠，优化渲染
          });
          
          map.addLayer(vectorLayer);
          layerRefs.current.set(layer.id, vectorLayer);
          layerDataRefs.current.set(layer.id, layer.geojson);
          newlyAddedLayers.push(layer);
        }
      } else {
        // 更新现有图层
        if (olLayer instanceof TileLayer) {
          olLayer.setOpacity(layer.opacity);
          olLayer.setVisible(layer.visible);
          olLayer.setZIndex(layers.length - index);
        } else if (olLayer instanceof VectorLayer) {
          // 更新样式
          const baseStyle = symbolizerToOLStyle(layer.style?.symbolizer, layer.opacity);
          
          const styleFunction = (feature: any) => {
            const styles: Style[] = [];
            styles.push(baseStyle as Style);
            
            if (layer.labelConfig && layer.labelConfig.enabled && layer.labelConfig.field) {
              const fieldValue = feature.get(layer.labelConfig.field);
              if (fieldValue !== undefined && fieldValue !== null) {
                const textStyle = new Style({
                  text: new Text({
                    text: String(fieldValue),
                    font: `${layer.labelConfig.fontWeight || 'normal'} ${layer.labelConfig.fontSize || 12}px sans-serif`,
                    fill: new Fill({ color: layer.labelConfig.fontColor || '#000000' }),
                    stroke: new Stroke({
                      color: layer.labelConfig.haloColor || '#ffffff',
                      width: layer.labelConfig.haloWidth || 1,
                    }),
                    offsetX: layer.labelConfig.offset?.[0] || 0,
                    offsetY: layer.labelConfig.offset?.[1] || 0,
                    textAlign: mapAnchorToOL(layer.labelConfig.anchor).textAlign,
                    textBaseline: mapAnchorToOL(layer.labelConfig.anchor).textBaseline,
                  }),
                });
                styles.push(textStyle);
              }
            }
            
            return styles;
          };
          
          olLayer.setStyle(styleFunction);
          olLayer.setOpacity(layer.opacity);
          olLayer.setVisible(layer.visible);
          olLayer.setZIndex(layers.length - index + 100);
          
          // 更新数据
          if (layer.geojson && layer.geojson !== cachedGeojson) {
            const format = new GeoJSON();
            const data = prepareGeojsonWithIndex(layer.geojson);
            const features = format.readFeatures(data, {
              dataProjection: 'EPSG:4326',
              featureProjection: 'EPSG:3857',
            });
            const source = olLayer.getSource();
            if (source) {
              source.clear();
              source.addFeatures(features);
            }
            layerDataRefs.current.set(layer.id, layer.geojson);
          }
        }
      }
    });

    // 自动缩放到新添加的图层
    newlyAddedLayers.forEach((layer) => {
      if (layer.type !== "basemap" && layer.extent) {
        const { minX, minY, maxX, maxY } = layer.extent;
        const extent = geoJsonExtentToOL({ minX, minY, maxX, maxY });
        isInternalUpdate.current = true;
        map.getView().fit(extent, { padding: [50, 50, 50, 50], duration: 500 });
      }
    });

    previousLayerIds.current = currentLayerIds;
  }, [layers, mapLoaded]);

  // 同步选择模式
  useEffect(() => {
    isSelectModeRef.current = isSelectMode;
  }, [isSelectMode]);

  // 同步测量模式
  useEffect(() => {
    measureModeRef.current = measureMode;
  }, [measureMode]);

  // 同步layers引用
  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  // 辅助函数：anchor转换
  const mapAnchorToOL = (anchor?: string): { textAlign: CanvasTextAlign; textBaseline: CanvasTextBaseline } => {
    switch (anchor) {
      case 'left': return { textAlign: 'left', textBaseline: 'middle' };
      case 'right': return { textAlign: 'right', textBaseline: 'middle' };
      case 'top': return { textAlign: 'center', textBaseline: 'top' };
      case 'bottom': return { textAlign: 'center', textBaseline: 'bottom' };
      case 'top-left': return { textAlign: 'left', textBaseline: 'top' };
      case 'top-right': return { textAlign: 'right', textBaseline: 'top' };
      case 'bottom-left': return { textAlign: 'left', textBaseline: 'bottom' };
      case 'bottom-right': return { textAlign: 'right', textBaseline: 'bottom' };
      default: return { textAlign: 'center', textBaseline: 'middle' };
    }
  };

  // 计算控件位置
  const leftWindows = getWindowsInDock('left');
  const rightWindows = getWindowsInDock('right');
  const bottomWindows = getWindowsInDock('bottom');
  const hasLeftPanel = leftWindows.length > 0;
  const hasRightPanel = rightWindows.length > 0;
  const hasBottomPanel = bottomWindows.length > 0;
  
  return (
    <div className="map-wrapper">
      <div ref={mapContainer} className="map-container" />
      <HistoryImageControl 
        leftOffset={hasLeftPanel ? dockSizes.left + 15 : 15}
        bottomOffset={hasBottomPanel ? dockSizes.bottom + 15 : 15}
      />
      <div 
        className="north-arrow-container" 
        style={{ 
          right: hasRightPanel ? `${dockSizes.right + 16}px` : '16px',
          transition: 'right 0.15s ease-out'
        }}
      >
        <NorthArrow />
      </div>
      <div 
        className="map-toolbar"
        style={{
          left: hasLeftPanel ? `${dockSizes.left + 16}px` : '16px',
          transition: 'left 0.15s ease-out'
        }}
      >
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
