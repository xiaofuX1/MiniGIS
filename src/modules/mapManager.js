// Map Manager Module
export class MapManager {
    constructor(mapId) {
        this.mapId = mapId;
        this.map = null;
        this.baseLayers = {};
        this.annotationLayers = {};
        this.overlayLayers = {};
        this.currentBaseLayer = null;
        this.currentAnnotationLayer = null;
        this.baseLayerOptions = [];
        this.annotationOptions = [];
        this.currentBaseLayerId = null;
        this.currentAnnotationLayerId = 'none';
        this.baseLayerAliases = {};
        this.baseLayerToAnnotation = {};
        this.selectedLayer = null; // 当前选中的要素图层
        this.initializeMap();
    }
    
    initializeMap() {
        // Initialize Leaflet map
        this.map = L.map(this.mapId, {
            center: [39.9042, 116.4074], // Beijing coordinates as default
            zoom: 10,
            minZoom: 1,
            maxZoom: 24,
            zoomControl: false,
            attributionControl: false
        });
        
        // Add zoom control to top-right
        L.control.zoom({
            position: 'topright'
        }).addTo(this.map);
        
        // Add scale control
        L.control.scale({
            position: 'bottomleft',
            metric: true,
            imperial: false
        }).addTo(this.map);
        
        // 点击地图空白处取消选中
        this.map.on('click', (e) => {
            // 如果点击的不是要素，取消选中
            if (!e.originalEvent.defaultPrevented && this.selectedLayer) {
                this.clearSelection();
            }
        });

        // Initialize base layers
        this.initializeBaseLayers();
        
        // Set default base layer to 天地图影像
        this.setBaseLayer('tiandituImageryW');
        this.setAnnotationLayer('tiandituImageryLabelW');
    }
    
    initializeBaseLayers() {
        // 从localStorage读取天地图密钥，如果没有则使用默认密钥
        const tiandituKey = localStorage.getItem('tiandituApiKey') || '285fd5c80869765246eb6c77caaf7bb6';
        this.tiandituKey = tiandituKey; // 保存到实例中
        
        const tiandituSubdomains = ['0', '1', '2', '3', '4', '5', '6', '7'];
        const createTiandituLayer = (layerType, matrixSet = 'w') => {
            return L.tileLayer(
                `http://t{s}.tianditu.gov.cn/${layerType}_${matrixSet}/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layerType}&STYLE=default&TILEMATRIXSET=${matrixSet}&FORMAT=tiles&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}&tk=${tiandituKey}`,
                {
                    subdomains: tiandituSubdomains,
                    minZoom: 1,
                    maxZoom: 24,
                    attribution: ''
                }
            );
        };

        // Google imagery layer
        this.baseLayers.googleImagery = L.tileLayer('https://gac-geo.googlecnapps.club/maps/vt?lyrs=s&x={x}&y={y}&z={z}', {
            minZoom: 1,
            maxZoom: 24,
            attribution: ''
        });

        // TianDiTu layers
        this.baseLayers.tiandituImageryW = createTiandituLayer('img', 'w');
        this.baseLayers.tiandituImageryC = createTiandituLayer('img', 'c');

        this.baseLayers.tiandituVectorW = createTiandituLayer('vec', 'w');
        this.baseLayers.tiandituVectorC = createTiandituLayer('vec', 'c');

        this.baseLayers.tiandituTerrainW = createTiandituLayer('ter', 'w');
        this.baseLayers.tiandituTerrainC = createTiandituLayer('ter', 'c');

        // TianDiTu annotations
        this.annotationLayers.tiandituImageryLabelW = createTiandituLayer('cia', 'w');
        this.annotationLayers.tiandituImageryLabelC = createTiandituLayer('cia', 'c');

        this.annotationLayers.tiandituVectorLabelW = createTiandituLayer('cva', 'w');
        this.annotationLayers.tiandituVectorLabelC = createTiandituLayer('cva', 'c');

        this.annotationLayers.tiandituTerrainLabelW = createTiandituLayer('cta', 'w');
        this.annotationLayers.tiandituTerrainLabelC = createTiandituLayer('cta', 'c');

        // 统一预览级别和区域 - 显示中国中部区域
        const PREVIEW_ZOOM = 6;  // 统一使用级别6
        const PREVIEW_X = 53;    // 中国中部X坐标
        const PREVIEW_Y = 25;    // 中国中部Y坐标
        
        const previewBaseUrl = (layerType, matrixSet, col, row, zoom) =>
            `http://t0.tianditu.gov.cn/${layerType}_${matrixSet}/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layerType}&STYLE=default&TILEMATRIXSET=${matrixSet}&FORMAT=tiles&TILECOL=${col}&TILEROW=${row}&TILEMATRIX=${zoom}&tk=${tiandituKey}`;

        this.baseLayerAliases = {
            satellite: 'googleImagery',
            imagery: 'tiandituImageryW',
            terrain: 'tiandituTerrainW'
        };

        this.baseLayerOptions = [
            {
                id: 'googleImagery',
                name: '谷歌影像',
                description: '全球高分辨率卫星影像',
                category: '全球底图',
                preview: `https://gac-geo.googlecnapps.club/maps/vt?lyrs=s&x=${PREVIEW_X}&y=${PREVIEW_Y}&z=${PREVIEW_ZOOM}`,
                annotationLayerId: null
            },
            {
                id: 'tiandituVectorW',
                name: '天地图-矢量（球面墨卡托）',
                description: 'EPSG:3857 矢量底图',
                category: '天地图 · 球面墨卡托',
                preview: previewBaseUrl('vec', 'w', PREVIEW_X, PREVIEW_Y, PREVIEW_ZOOM),
                annotationLayerId: 'tiandituVectorLabelW',
                annotationName: '天地图-矢量注记（球面墨卡托）',
                annotationPreview: previewBaseUrl('cva', 'w', PREVIEW_X, PREVIEW_Y, PREVIEW_ZOOM)
            },
            {
                id: 'tiandituVectorC',
                name: '天地图-矢量（CGCS2000）',
                description: 'CGCS2000 矢量底图',
                category: '天地图 · CGCS2000',
                preview: previewBaseUrl('vec', 'c', PREVIEW_X, PREVIEW_Y, PREVIEW_ZOOM),
                annotationLayerId: 'tiandituVectorLabelC',
                annotationName: '天地图-矢量注记（CGCS2000）',
                annotationPreview: previewBaseUrl('cva', 'c', PREVIEW_X, PREVIEW_Y, PREVIEW_ZOOM)
            },
            {
                id: 'tiandituImageryW',
                name: '天地图-影像（球面墨卡托）',
                description: 'EPSG:3857 影像底图',
                category: '天地图 · 球面墨卡托',
                preview: previewBaseUrl('img', 'w', PREVIEW_X, PREVIEW_Y, PREVIEW_ZOOM),
                annotationLayerId: 'tiandituImageryLabelW',
                annotationName: '天地图-影像注记（球面墨卡托）',
                annotationPreview: previewBaseUrl('cia', 'w', PREVIEW_X, PREVIEW_Y, PREVIEW_ZOOM)
            },
            {
                id: 'tiandituImageryC',
                name: '天地图-影像（CGCS2000）',
                description: 'CGCS2000 影像底图',
                category: '天地图 · CGCS2000',
                preview: previewBaseUrl('img', 'c', PREVIEW_X, PREVIEW_Y, PREVIEW_ZOOM),
                annotationLayerId: 'tiandituImageryLabelC',
                annotationName: '天地图-影像注记（CGCS2000）',
                annotationPreview: previewBaseUrl('cia', 'c', PREVIEW_X, PREVIEW_Y, PREVIEW_ZOOM)
            },
            {
                id: 'tiandituTerrainW',
                name: '天地图-地形（球面墨卡托）',
                description: 'EPSG:3857 地形底图',
                category: '天地图 · 球面墨卡托',
                preview: previewBaseUrl('ter', 'w', PREVIEW_X, PREVIEW_Y, PREVIEW_ZOOM),
                annotationLayerId: 'tiandituTerrainLabelW',
                annotationName: '天地图-地形注记（球面墨卡托）',
                annotationPreview: previewBaseUrl('cta', 'w', PREVIEW_X, PREVIEW_Y, PREVIEW_ZOOM)
            },
            {
                id: 'tiandituTerrainC',
                name: '天地图-地形（CGCS2000）',
                description: 'CGCS2000 地形底图',
                category: '天地图 · CGCS2000',
                preview: previewBaseUrl('ter', 'c', PREVIEW_X, PREVIEW_Y, PREVIEW_ZOOM),
                annotationLayerId: 'tiandituTerrainLabelC',
                annotationName: '天地图-地形注记（CGCS2000）',
                annotationPreview: previewBaseUrl('cta', 'c', PREVIEW_X, PREVIEW_Y, PREVIEW_ZOOM)
            }
        ];

        this.annotationOptions = [];
        
        this.baseLayerToAnnotation = {};
        this.baseLayerOptions.forEach(option => {
            if (option.annotationLayerId) {
                this.baseLayerToAnnotation[option.id] = option.annotationLayerId;
            }
        });
    }
    
    setBaseLayer(layerName) {
        const targetLayerName = this.baseLayerAliases[layerName] || layerName;

        if (this.currentBaseLayer) {
            this.map.removeLayer(this.currentBaseLayer);
        }
        
        if (this.baseLayers[targetLayerName]) {
            this.currentBaseLayer = this.baseLayers[targetLayerName];
            this.currentBaseLayer.addTo(this.map);
            this.currentBaseLayerId = targetLayerName;
            // 自动切换对应注记
            const annotationTarget = this.baseLayerToAnnotation[targetLayerName];
            if (annotationTarget) {
                this.setAnnotationLayer(annotationTarget);
            } else {
                this.setAnnotationLayer('none');
            }
        }
    }

    getBaseLayerOptions() {
        return this.baseLayerOptions.slice();
    }

    getCurrentBaseLayerId() {
        return this.currentBaseLayerId;
    }

    setAnnotationLayer(layerId) {
        if (this.currentAnnotationLayer) {
            this.map.removeLayer(this.currentAnnotationLayer);
            this.currentAnnotationLayer = null;
        }

        if (layerId && layerId !== 'none' && this.annotationLayers[layerId]) {
            this.currentAnnotationLayer = this.annotationLayers[layerId];
            this.currentAnnotationLayer.addTo(this.map);
            this.currentAnnotationLayerId = layerId;
        } else {
            this.currentAnnotationLayerId = 'none';
        }
    }

    getAnnotationOptions() {
        return this.annotationOptions.slice();
    }

    getCurrentAnnotationLayerId() {
        return this.currentAnnotationLayerId;
    }
    
    addGeoJSONLayer(geojsonData, name) {
        const layer = L.geoJSON(geojsonData, {
            style: (feature) => {
                return {
                    color: '#3388ff',
                    weight: 2,
                    opacity: 0.8,
                    fillOpacity: 0.3,
                    fillColor: '#3388ff'
                };
            },
            onEachFeature: (feature, layer) => {
                // Add click event to show properties in right panel only
                layer.on('click', (e) => {
                    L.DomEvent.stopPropagation(e); // 阻止事件冒泡到地图
                    this.onFeatureClick(feature, layer, e);
                });
                
                // Add hover effect
                layer.on('mouseover', (e) => {
                    const targetLayer = e.target;
                    // 如果不是选中的图层，才显示悬停效果
                    if (this.selectedLayer !== targetLayer) {
                        targetLayer.setStyle({
                            weight: 3,
                            opacity: 1,
                            fillOpacity: 0.5
                        });
                    }
                });
                
                layer.on('mouseout', (e) => {
                    const targetLayer = e.target;
                    // 如果不是选中的图层，才恢复默认样式
                    if (this.selectedLayer !== targetLayer) {
                        targetLayer.setStyle({
                            weight: 2,
                            opacity: 0.8,
                            fillOpacity: 0.3
                        });
                    }
                });
            }
        });
        
        layer.addTo(this.map);
        this.overlayLayers[name] = layer;
        
        return layer;
    }
    
    removeLayer(name) {
        if (this.overlayLayers[name]) {
            this.map.removeLayer(this.overlayLayers[name]);
            delete this.overlayLayers[name];
        }
    }
    
    onFeatureClick(feature, layer, event) {
        // Remove previous highlight
        if (this.selectedLayer) {
            this.selectedLayer.setStyle({
                color: '#3388ff',
                weight: 2,
                opacity: 0.8,
                fillOpacity: 0.3
            });
        }
        
        // Highlight current selection
        layer.setStyle({
            color: '#ff6b35',
            weight: 4,
            opacity: 1,
            fillOpacity: 0.6
        });
        
        this.selectedLayer = layer;
        
        // Update properties panel
        if (window.app && window.app.attributeViewer) {
            window.app.attributeViewer.showFeatureProperties(feature.properties);
        }
        
        // Scroll to properties panel if not visible
        const propertiesPanel = document.getElementById('properties-content');
        if (propertiesPanel) {
            propertiesPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
    
    zoomIn() {
        this.map.zoomIn();
    }
    
    zoomOut() {
        this.map.zoomOut();
    }
    
    fitBounds() {
        const allBounds = [];
        
        for (const layerName in this.overlayLayers) {
            const layer = this.overlayLayers[layerName];
            if (layer.getBounds) {
                allBounds.push(layer.getBounds());
            }
        }
        
        if (allBounds.length > 0) {
            const combinedBounds = allBounds[0];
            for (let i = 1; i < allBounds.length; i++) {
                combinedBounds.extend(allBounds[i]);
            }
            this.map.fitBounds(combinedBounds, { padding: [20, 20] });
        }
    }
    
    setView(lat, lng, zoom) {
        this.map.setView([lat, lng], zoom);
    }
    
    getZoom() {
        return this.map.getZoom();
    }
    
    getCenter() {
        return this.map.getCenter();
    }
    
    clearSelection() {
        // 清除选中状态
        if (this.selectedLayer) {
            this.selectedLayer.setStyle({
                color: '#3388ff',
                weight: 2,
                opacity: 0.8,
                fillOpacity: 0.3
            });
            this.selectedLayer = null;
        }
        
        // 清空属性面板
        if (window.app && window.app.attributeViewer) {
            window.app.attributeViewer.clearProperties();
        }
    }
    
    // 更新天地图API密钥
    updateTiandituKey(newKey) {
        if (!newKey || newKey.trim() === '') {
            alert('密钥不能为空！');
            return false;
        }
        
        // 保存到localStorage
        localStorage.setItem('tiandituApiKey', newKey.trim());
        this.tiandituKey = newKey.trim();
        
        // 提示用户刷新页面以应用新密钥
        const refresh = confirm('密钥已保存！需要刷新页面才能生效，是否立即刷新？');
        if (refresh) {
            window.location.reload();
        }
        
        return true;
    }
    
    // 获取当前天地图API密钥
    getTiandituKey() {
        return this.tiandituKey || localStorage.getItem('tiandituApiKey') || '285fd5c80869765246eb6c77caaf7bb6';
    }
    
    // 重置为默认密钥
    resetTiandituKey() {
        localStorage.removeItem('tiandituApiKey');
        this.tiandituKey = '285fd5c80869765246eb6c77caaf7bb6';
        
        const refresh = confirm('已重置为默认密钥！需要刷新页面才能生效，是否立即刷新？');
        if (refresh) {
            window.location.reload();
        }
    }
}
