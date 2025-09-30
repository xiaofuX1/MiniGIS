// Ribbon Controller Module
export class RibbonController {
    constructor() {
        this.currentTab = 'project';
        this.basemapPanelVisible = false;
        this.baseLayerCards = new Map();
        this.initializeRibbon();
    }
    
    initializeRibbon() {
        this.basemapPanel = document.getElementById('basemap-panel');
        this.basemapButton = document.getElementById('btn-basemap-gallery');
        this.basemapNameElement = document.getElementById('basemap-current-name');

        if (this.basemapPanel) {
            this.basemapPanel.addEventListener('click', (e) => e.stopPropagation());
        }

        if (this.basemapButton) {
            this.basemapButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleBasemapPanel();
            });
        }

        document.addEventListener('click', () => {
            if (this.basemapPanelVisible) {
                this.hideBasemapPanel();
            }
        });

        this.renderBasemapPanel();
        this.updateBasemapLabel();
        
        // Setup measurement tools
        this.setupMeasurementTools();
        
        // Setup drawing tools
        this.setupDrawingToolsPanel();
        
        // Initialize ribbon state
        this.updateRibbonState();
    }
    
    switchTab(tabName) {
        // Update tab active state
        document.querySelectorAll('.ribbon-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            }
        });
        
        // Update panel visibility
        document.querySelectorAll('.ribbon-panel').forEach(panel => {
            panel.classList.remove('active');
            if (panel.dataset.panel === tabName) {
                panel.classList.add('active');
            }
        });
        
        this.currentTab = tabName;
    }
    
    setBaseMap(mapType) {
        // Compatibility wrapper for legacy calls
        this.selectBaseLayer(mapType);
    }
    
    setupMeasurementTools() {
        this.measurementMode = null;
        this.measurementPoints = [];
        this.measurementLayer = null;
        this.measurementMarkers = [];
        this.currentPopup = null;
        this.measurementPanel = null;
        this.measurementLayers = []; // Store all measurement layers
        
        // Unified measurement button
        const measureBtn = document.getElementById('btn-measure-distance');
        if (measureBtn) {
            measureBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMeasurementPanel();
            });
        }
    }
    
    toggleMeasurementPanel() {
        if (this.measurementPanel) {
            this.hideMeasurementPanel();
        } else {
            this.showMeasurementPanel();
        }
    }
    
    showMeasurementPanel() {
        // Remove existing panel
        if (this.measurementPanel) {
            this.measurementPanel.remove();
        }
        
        // Create measurement panel
        const panel = document.createElement('div');
        panel.className = 'measurement-panel-compact';
        panel.innerHTML = `
            <button class="measurement-tool-btn" data-type="distance" title="测距">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="4" y1="12" x2="20" y2="12"></line>
                    <circle cx="4" cy="12" r="2"></circle>
                    <circle cx="20" cy="12" r="2"></circle>
                </svg>
            </button>
            <button class="measurement-tool-btn" data-type="area" title="测面积">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="12,3 20,8 20,16 12,21 4,16 4,8"></polygon>
                </svg>
            </button>
            <button class="measurement-tool-btn" data-type="angle" title="测角度">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 12 L20 12 A8 8 0 0 1 15.3 17.7 Z"></path>
                    <line x1="12" y1="12" x2="20" y2="12"></line>
                    <line x1="12" y1="12" x2="15.3" y2="17.7"></line>
                </svg>
            </button>
            <button class="measurement-tool-btn" data-type="perimeter" title="测周长">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="5" y="5" width="14" height="14" rx="2"></rect>
                    <line x1="9.5" y1="5" x2="9.5" y2="19"></line>
                    <line x1="14.5" y1="5" x2="14.5" y2="19"></line>
                </svg>
            </button>
            <div class="measurement-divider"></div>
            <button class="measurement-tool-btn measurement-clear" data-type="clear" title="清除所有测量">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
            </button>
            <button class="measurement-tool-btn measurement-cancel" data-type="cancel" title="取消当前测量">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
            <button class="measurement-panel-close" title="关闭">×</button>
        `;
        
        document.body.appendChild(panel);
        this.measurementPanel = panel;
        
        // Position panel on left side of map
        const layersPanel = document.getElementById('layers-panel');
        const layersPanelWidth = layersPanel ? layersPanel.offsetWidth : 300;
        
        panel.style.position = 'fixed';
        panel.style.left = (layersPanelWidth + 10) + 'px';
        panel.style.top = '155px'; // Below ribbon
        panel.style.display = 'flex';
        
        // Add event listeners
        panel.querySelector('.measurement-panel-close').addEventListener('click', (e) => {
            e.stopPropagation();
            this.hideMeasurementPanel();
        });
        
        panel.querySelectorAll('.measurement-tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const type = btn.dataset.type;
                
                // Remove active state from all buttons
                panel.querySelectorAll('.measurement-tool-btn').forEach(b => b.classList.remove('active'));
                
                if (type === 'cancel') {
                    this.cancelMeasurement();
                } else if (type === 'clear') {
                    this.clearAllMeasurements();
                } else {
                    btn.classList.add('active');
                    this.startMeasurement(type);
                }
            });
        });
    }
    
    hideMeasurementPanel() {
        if (this.measurementPanel) {
            this.measurementPanel.remove();
            this.measurementPanel = null;
        }
    }
    
    
    startMeasurement(type) {
        if (!window.app.mapManager) return;
        
        // Cancel previous measurement
        this.cancelMeasurement();
        
        this.measurementMode = type;
        this.measurementPoints = [];
        this.measurementMarkers = [];
        
        const map = window.app.mapManager.map;
        
        // Highlight measurement button
        document.getElementById('btn-measure-distance').classList.add('active');
        
        // Create measurement layer
        if (type === 'distance') {
            this.measurementLayer = L.polyline([], {
                color: '#ff4444',
                weight: 3,
                opacity: 0.8,
                dashArray: '10, 10'
            }).addTo(map);
            this.updateStatus('测距模式：点击地图添加测量点，双击或按ESC结束');
        } else if (type === 'perimeter') {
            this.measurementLayer = L.polygon([], {
                color: '#9944ff',
                weight: 3,
                opacity: 0.8,
                fillOpacity: 0.2,
                dashArray: '10, 10'
            }).addTo(map);
            this.updateStatus('测周长模式：点击地图添加测量点，双击或按ESC结束');
        } else if (type === 'area') {
            this.measurementLayer = L.polygon([], {
                color: '#4444ff',
                weight: 3,
                opacity: 0.8,
                fillOpacity: 0.2,
                dashArray: '10, 10'
            }).addTo(map);
            this.updateStatus('测面积模式：点击地图添加测量点，双击或按ESC结束');
        } else if (type === 'angle') {
            this.measurementLayer = L.polyline([], {
                color: '#ff9900',
                weight: 3,
                opacity: 0.8,
                dashArray: '10, 10'
            }).addTo(map);
            this.updateStatus('测角度模式：点击地图添加3个点');
        }
        
        // Setup event handlers
        this.measureClickHandler = (e) => this.handleMeasureClick(e);
        this.measureDblClickHandler = () => this.finishMeasurement();
        this.measureMoveHandler = (e) => this.handleMeasureMove(e);
        this.measureKeyHandler = (e) => {
            if (e.key === 'Escape') {
                this.cancelMeasurement();
            }
        };
        
        map.on('click', this.measureClickHandler);
        map.on('dblclick', this.measureDblClickHandler);
        map.on('mousemove', this.measureMoveHandler);
        document.addEventListener('keydown', this.measureKeyHandler);
    }
    
    handleMeasureClick(e) {
        const map = window.app.mapManager.map;
        
        // Snap to nearby features
        const snappedPoint = this.snapToFeature(e.latlng, 15);
        const point = snappedPoint || e.latlng;
        
        // Add point
        this.measurementPoints.push(point);
        
        // Add marker
        const colors = {
            distance: '#ff4444',
            area: '#4444ff',
            angle: '#ff9900',
            perimeter: '#9944ff'
        };
        const marker = L.circleMarker(point, {
            radius: 5,
            fillColor: '#ffffff',
            color: colors[this.measurementMode] || '#ff4444',
            weight: 2,
            opacity: 1,
            fillOpacity: 1
        }).addTo(map);
        
        this.measurementMarkers.push(marker);
        
        // Update measurement layer
        this.measurementLayer.setLatLngs(this.measurementPoints);
        
        // Update measurements
        this.updateMeasurement();
    }
    
    handleMeasureMove(e) {
        if (this.measurementPoints.length === 0) return;
        
        const map = window.app.mapManager.map;
        
        // Snap to nearby features
        const snappedPoint = this.snapToFeature(e.latlng, 15);
        const point = snappedPoint || e.latlng;
        
        // Show preview
        const previewPoints = [...this.measurementPoints, point];
        this.measurementLayer.setLatLngs(previewPoints);
        
        // Update measurement display
        this.updateMeasurement(point);
    }
    
    snapToFeature(latlng, tolerance = 15) {
        if (!window.app.mapManager) return null;
        
        const map = window.app.mapManager.map;
        const point = map.latLngToLayerPoint(latlng);
        let closestPoint = null;
        let minDistance = tolerance;
        
        // Check all layers for snapping
        map.eachLayer((layer) => {
            if (layer instanceof L.Polyline || layer instanceof L.Polygon) {
                const latlngs = layer.getLatLngs();
                const flatLatLngs = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
                
                flatLatLngs.forEach(ll => {
                    const layerPoint = map.latLngToLayerPoint(ll);
                    const distance = point.distanceTo(layerPoint);
                    
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestPoint = ll;
                    }
                });
            }
        });
        
        return closestPoint;
    }
    
    updateMeasurement(previewPoint) {
        if (this.measurementPoints.length === 0) return;
        
        const points = previewPoint ? [...this.measurementPoints, previewPoint] : this.measurementPoints;
        
        if (this.measurementMode === 'distance' && points.length > 1) {
            let totalDistance = 0;
            for (let i = 1; i < points.length; i++) {
                totalDistance += points[i - 1].distanceTo(points[i]);
            }
            
            // Format distance
            let distanceText;
            if (totalDistance < 1000) {
                distanceText = `${totalDistance.toFixed(2)} 米`;
            } else {
                distanceText = `${(totalDistance / 1000).toFixed(3)} 公里`;
            }
            
            // Update popup
            if (this.currentPopup) {
                this.currentPopup.remove();
            }
            
            const lastPoint = points[points.length - 1];
            this.currentPopup = L.popup({ closeButton: false, autoClose: false, closeOnClick: false })
                .setLatLng(lastPoint)
                .setContent(`<div style="text-align: center;"><strong>总距离</strong><br>${distanceText}</div>`)
                .openOn(window.app.mapManager.map);
                
        } else if (this.measurementMode === 'perimeter' && points.length >= 3) {
            // Calculate perimeter
            let totalPerimeter = 0;
            for (let i = 1; i < points.length; i++) {
                totalPerimeter += points[i - 1].distanceTo(points[i]);
            }
            // Add closing edge
            totalPerimeter += points[points.length - 1].distanceTo(points[0]);
            
            // Format perimeter
            let perimeterText;
            if (totalPerimeter < 1000) {
                perimeterText = `${totalPerimeter.toFixed(2)} 米`;
            } else {
                perimeterText = `${(totalPerimeter / 1000).toFixed(3)} 公里`;
            }
            
            // Update popup
            if (this.currentPopup) {
                this.currentPopup.remove();
            }
            
            const tempPolygon = L.polygon(points);
            const bounds = tempPolygon.getBounds();
            const center = bounds.getCenter();
            this.currentPopup = L.popup({ closeButton: false, autoClose: false, closeOnClick: false })
                .setLatLng(center)
                .setContent(`<div style="text-align: center;"><strong>周长</strong><br>${perimeterText}</div>`)
                .openOn(window.app.mapManager.map);
                
        } else if (this.measurementMode === 'area' && points.length >= 3) {
            // Calculate area using Leaflet's method
            const tempPolygon = L.polygon(points);
            const bounds = tempPolygon.getBounds();
            const area = this.calculatePolygonArea(points);
            
            // Format area
            let areaText;
            if (area < 10000) {
                areaText = `${area.toFixed(2)} 平方米`;
            } else if (area < 1000000) {
                areaText = `${(area / 10000).toFixed(3)} 公顷`;
            } else {
                areaText = `${(area / 1000000).toFixed(3)} 平方公里`;
            }
            
            // Update popup
            if (this.currentPopup) {
                this.currentPopup.remove();
            }
            
            const center = bounds.getCenter();
            this.currentPopup = L.popup({ closeButton: false, autoClose: false, closeOnClick: false })
                .setLatLng(center)
                .setContent(`<div style="text-align: center;"><strong>面积</strong><br>${areaText}</div>`)
                .openOn(window.app.mapManager.map);
                
        } else if (this.measurementMode === 'angle' && points.length === 3) {
            // Calculate angle (angle at second point)
            const p1 = points[0];
            const p2 = points[1]; // vertex
            const p3 = points[2];
            
            // Convert to Cartesian coordinates for angle calculation
            const dx1 = p1.lng - p2.lng;
            const dy1 = p1.lat - p2.lat;
            const dx2 = p3.lng - p2.lng;
            const dy2 = p3.lat - p2.lat;
            
            // Calculate angle using atan2
            const angle1 = Math.atan2(dy1, dx1);
            const angle2 = Math.atan2(dy2, dx2);
            let angle = Math.abs(angle2 - angle1) * 180 / Math.PI;
            
            // Normalize to 0-360
            if (angle > 180) {
                angle = 360 - angle;
            }
            
            const angleText = `${angle.toFixed(2)}°`;
            
            // Update popup
            if (this.currentPopup) {
                this.currentPopup.remove();
            }
            
            this.currentPopup = L.popup({ closeButton: false, autoClose: false, closeOnClick: false })
                .setLatLng(p2)
                .setContent(`<div style="text-align: center;"><strong>角度</strong><br>${angleText}</div>`)
                .openOn(window.app.mapManager.map);
            
            // Auto finish when 3 points added
            if (this.measurementPoints.length === 3 && !previewPoint) {
                setTimeout(() => this.finishMeasurement(), 100);
            }
        }
    }
    
    calculatePolygonArea(latlngs) {
        // Use spherical area calculation
        let area = 0;
        const R = 6378137; // Earth radius in meters
        
        if (latlngs.length < 3) return 0;
        
        for (let i = 0; i < latlngs.length; i++) {
            const p1 = latlngs[i];
            const p2 = latlngs[(i + 1) % latlngs.length];
            
            const lat1 = p1.lat * Math.PI / 180;
            const lat2 = p2.lat * Math.PI / 180;
            const lng1 = p1.lng * Math.PI / 180;
            const lng2 = p2.lng * Math.PI / 180;
            
            area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
        }
        
        area = Math.abs(area * R * R / 2);
        return area;
    }
    
    finishMeasurement() {
        if (this.measurementPoints.length < 2) {
            this.cancelMeasurement();
            return;
        }
        
        // Keep the measurement on map
        if (this.measurementLayer) {
            // Change to solid line
            this.measurementLayer.setStyle({ dashArray: null });
            // Store for later clearing
            this.measurementLayers.push({
                layer: this.measurementLayer,
                markers: this.measurementMarkers,
                popup: this.currentPopup
            });
        }
        
        // Clear handlers
        this.clearMeasurementHandlers();
        
        // Reset state
        this.measurementMode = null;
        this.measurementPoints = [];
        this.measurementLayer = null;
        this.measurementMarkers = [];
        this.currentPopup = null;
        
        // Remove active state
        document.getElementById('btn-measure-distance').classList.remove('active');
        if (this.measurementPanel) {
            this.measurementPanel.querySelectorAll('.measurement-tool-btn').forEach(btn => {
                btn.classList.remove('active');
            });
        }
        
        this.updateStatus('测量已完成');
    }
    
    cancelMeasurement() {
        const map = window.app.mapManager?.map;
        if (!map) return;
        
        // Remove measurement layer
        if (this.measurementLayer) {
            map.removeLayer(this.measurementLayer);
            this.measurementLayer = null;
        }
        
        // Remove markers
        this.measurementMarkers.forEach(marker => map.removeLayer(marker));
        this.measurementMarkers = [];
        
        // Remove popup
        if (this.currentPopup) {
            this.currentPopup.remove();
            this.currentPopup = null;
        }
        
        // Clear handlers
        this.clearMeasurementHandlers();
        
        // Reset state
        this.measurementMode = null;
        this.measurementPoints = [];
        
        // Remove active state
        document.getElementById('btn-measure-distance').classList.remove('active');
        if (this.measurementPanel) {
            this.measurementPanel.querySelectorAll('.measurement-tool-btn').forEach(btn => {
                btn.classList.remove('active');
            });
        }
        
        this.updateStatus('测量已取消');
    }
    
    clearAllMeasurements() {
        const map = window.app.mapManager?.map;
        if (!map) return;
        
        // Cancel current measurement
        this.cancelMeasurement();
        
        // Remove all stored measurements
        this.measurementLayers.forEach(item => {
            if (item.layer) {
                map.removeLayer(item.layer);
            }
            if (item.markers) {
                item.markers.forEach(marker => map.removeLayer(marker));
            }
            if (item.popup) {
                item.popup.remove();
            }
        });
        
        this.measurementLayers = [];
        
        this.updateStatus('已清除所有测量数据');
    }
    
    clearMeasurementHandlers() {
        const map = window.app.mapManager?.map;
        if (!map) return;
        
        if (this.measureClickHandler) {
            map.off('click', this.measureClickHandler);
            this.measureClickHandler = null;
        }
        if (this.measureDblClickHandler) {
            map.off('dblclick', this.measureDblClickHandler);
            this.measureDblClickHandler = null;
        }
        if (this.measureMoveHandler) {
            map.off('mousemove', this.measureMoveHandler);
            this.measureMoveHandler = null;
        }
        if (this.measureKeyHandler) {
            document.removeEventListener('keydown', this.measureKeyHandler);
            this.measureKeyHandler = null;
        }
    }
    
    setupDrawingToolsPanel() {
        this.drawingMode = null;
        this.drawingPoints = [];
        this.drawingLayer = null;
        this.drawingPanel = null;
        this.drawingLayers = []; // Store all drawing layers
        this.tempDrawingLayer = null; // Store temporary preview layer
        
        // Unified drawing button
        const drawBtn = document.getElementById('btn-draw-tools');
        if (drawBtn) {
            drawBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDrawingPanel();
            });
        }
    }
    
    toggleDrawingPanel() {
        if (this.drawingPanel) {
            this.hideDrawingPanel();
        } else {
            this.showDrawingPanel();
        }
    }
    
    showDrawingPanel() {
        // Remove existing panel
        if (this.drawingPanel) {
            this.drawingPanel.remove();
        }
        
        // Create drawing panel
        const panel = document.createElement('div');
        panel.className = 'drawing-panel-compact';
        panel.innerHTML = `
            <button class="drawing-tool-btn" data-type="marker" title="添加标记">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2a7 7 0 017 7c0 5-7 13-7 13S5 14 5 9a7 7 0 017-7z"></path>
                    <circle cx="12" cy="9" r="2.5"></circle>
                </svg>
            </button>
            <button class="drawing-tool-btn" data-type="text" title="添加文字">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="4 7 4 4 20 4 20 7"></polyline>
                    <line x1="9" y1="20" x2="15" y2="20"></line>
                    <line x1="12" y1="4" x2="12" y2="20"></line>
                </svg>
            </button>
            <div class="drawing-divider"></div>
            <button class="drawing-tool-btn" data-type="point" title="绘制点">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="4"></circle>
                </svg>
            </button>
            <button class="drawing-tool-btn" data-type="line" title="绘制线">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="4 17 10 11 16 17 22 7"></polyline>
                </svg>
            </button>
            <button class="drawing-tool-btn" data-type="polygon" title="绘制面">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"></polygon>
                </svg>
            </button>
            <button class="drawing-tool-btn" data-type="circle" title="绘制圆">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="9"></circle>
                </svg>
            </button>
            <button class="drawing-tool-btn" data-type="rectangle" title="绘制矩形">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                </svg>
            </button>
            <div class="drawing-divider"></div>
            <button class="drawing-tool-btn drawing-clear" data-type="clear" title="清除所有绘制">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
            </button>
            <button class="drawing-tool-btn drawing-cancel" data-type="cancel" title="取消当前绘制">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
            <button class="drawing-panel-close" title="关闭">×</button>
        `;
        
        document.body.appendChild(panel);
        this.drawingPanel = panel;
        
        // Position panel on left side of map (below measurement panel)
        const layersPanel = document.getElementById('layers-panel');
        const layersPanelWidth = layersPanel ? layersPanel.offsetWidth : 300;
        
        panel.style.position = 'fixed';
        panel.style.left = (layersPanelWidth + 10) + 'px';
        panel.style.top = '430px'; // Below measurement panel
        panel.style.display = 'flex';
        
        // Add event listeners
        panel.querySelector('.drawing-panel-close').addEventListener('click', (e) => {
            e.stopPropagation();
            this.hideDrawingPanel();
        });
        
        panel.querySelectorAll('.drawing-tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const type = btn.dataset.type;
                
                // Remove active state from all buttons
                panel.querySelectorAll('.drawing-tool-btn').forEach(b => b.classList.remove('active'));
                
                if (type === 'cancel') {
                    this.cancelDrawing();
                } else if (type === 'clear') {
                    this.clearAllDrawings();
                } else {
                    btn.classList.add('active');
                    this.startDrawing(type);
                }
            });
        });
    }
    
    hideDrawingPanel() {
        if (this.drawingPanel) {
            this.drawingPanel.remove();
            this.drawingPanel = null;
        }
    }
    
    startDrawing(type) {
        if (!window.app.mapManager) return;
        
        const map = window.app.mapManager.map;
        
        // Clear previous drawing mode
        this.cancelDrawing();
        
        this.drawingMode = type;
        this.drawingPoints = [];
        
        const typeNames = {
            marker: '标记',
            text: '文字',
            point: '点',
            line: '线',
            polygon: '面',
            circle: '圆',
            rectangle: '矩形'
        };
        
        this.updateStatus(`${typeNames[type]}模式：点击地图${type === 'marker' || type === 'text' ? '放置' : '开始绘制'}`);
        
        if (type === 'marker') {
            this.drawMarker(map);
        } else if (type === 'text') {
            this.drawText(map);
        } else if (type === 'point') {
            this.drawPoint(map);
        } else if (type === 'line') {
            this.drawLine(map);
        } else if (type === 'polygon') {
            this.drawPolygon(map);
        } else if (type === 'circle') {
            this.drawCircle(map);
        } else if (type === 'rectangle') {
            this.drawRectangle(map);
        }
    }
    
    drawMarker(map) {
        const clickHandler = (e) => {
            const name = prompt('请输入标记名称：', '标记');
            if (name) {
                const marker = L.marker(e.latlng).addTo(map);
                const popupContent = `
                    <div class="drawing-popup">
                        <div class="popup-title"><b>标记</b></div>
                        <div class="popup-content">${name}</div>
                        <button class="popup-delete-btn" onclick="window.app.ribbonController.deleteDrawing(this)" title="删除">
                            <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
                                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                            </svg>
                        </button>
                    </div>
                `;
                marker.bindPopup(popupContent).openPopup();
                marker._drawingLayerId = this.drawingLayers.length;
                this.drawingLayers.push(marker);
            }
            this.cancelDrawing();
            this.updateStatus('标记已添加');
        };
        
        map.once('click', clickHandler);
        this.currentDrawingHandler = clickHandler;
    }
    
    drawText(map) {
        const clickHandler = (e) => {
            const text = prompt('请输入文字内容：', '');
            if (text) {
                const textIcon = L.divIcon({
                    className: 'text-annotation',
                    html: `<div style="background: white; padding: 4px 8px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); font-size: 14px; white-space: nowrap;">${text}</div>`,
                    iconSize: null
                });
                const marker = L.marker(e.latlng, { icon: textIcon }).addTo(map);
                const popupContent = `
                    <div class="drawing-popup">
                        <div class="popup-title"><b>文字注记</b></div>
                        <div class="popup-content">${text}</div>
                        <button class="popup-delete-btn" onclick="window.app.ribbonController.deleteDrawing(this)" title="删除">
                            <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
                                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                            </svg>
                        </button>
                    </div>
                `;
                marker.bindPopup(popupContent);
                marker._drawingLayerId = this.drawingLayers.length;
                this.drawingLayers.push(marker);
            }
            this.cancelDrawing();
            this.updateStatus('文字已添加');
        };
        
        map.once('click', clickHandler);
        this.currentDrawingHandler = clickHandler;
    }
    
    drawPoint(map) {
        const clickHandler = (e) => {
            const point = L.circleMarker(e.latlng, {
                radius: 6,
                fillColor: '#ff7800',
                color: '#000',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(map);
            
            // Add popup with coordinates
            const lat = e.latlng.lat.toFixed(6);
            const lng = e.latlng.lng.toFixed(6);
            const popupContent = `
                <div class="drawing-popup">
                    <div class="popup-title"><b>点</b></div>
                    <div class="popup-content">
                        经度: ${lng}<br/>
                        纬度: ${lat}
                    </div>
                    <button class="popup-delete-btn" onclick="window.app.ribbonController.deleteDrawing(this)" title="删除">
                        <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                            <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                        </svg>
                    </button>
                </div>
            `;
            point.bindPopup(popupContent);
            
            // Add click handler
            point.on('click', () => {
                point.openPopup();
            });
            
            point._drawingLayerId = this.drawingLayers.length;
            this.drawingLayers.push(point);
            this.cancelDrawing();
            this.updateStatus(`点已绘制 (${lat}, ${lng})`);
        };
        
        map.once('click', clickHandler);
        this.currentDrawingHandler = clickHandler;
    }
    
    drawLine(map) {
        this.drawingPoints = [];
        this.tempDrawingLayer = null;
        this.clickTimeout = null;
        
        // Disable double click zoom
        map.doubleClickZoom.disable();
        
        const clickHandler = (e) => {
            // Prevent map click from interfering
            L.DomEvent.stopPropagation(e);
            
            // Clear any pending click timeout
            if (this.clickTimeout) {
                clearTimeout(this.clickTimeout);
            }
            
            // Delay adding point to allow double-click to fire
            this.clickTimeout = setTimeout(() => {
                this.drawingPoints.push(e.latlng);
            
            if (this.tempDrawingLayer) {
                map.removeLayer(this.tempDrawingLayer);
            }
            
            this.tempDrawingLayer = L.polyline(this.drawingPoints, {
                color: '#3388ff',
                weight: 3,
                opacity: 0.8
            }).addTo(map);
            
                this.updateStatus(`绘制线: 已添加 ${this.drawingPoints.length} 个点 - 双击结束`);
            }, 250);
        };
        
        const dblClickHandler = (e) => {
            L.DomEvent.stopPropagation(e);
            L.DomEvent.preventDefault(e);
            
            // Clear the click timeout to prevent adding extra point
            if (this.clickTimeout) {
                clearTimeout(this.clickTimeout);
                this.clickTimeout = null;
            }
            
            if (this.drawingPoints.length >= 2) {
                // Calculate length
                let totalLength = 0;
                for (let i = 1; i < this.drawingPoints.length; i++) {
                    totalLength += this.drawingPoints[i - 1].distanceTo(this.drawingPoints[i]);
                }
                
                const lengthText = totalLength < 1000 
                    ? `${totalLength.toFixed(2)} 米` 
                    : `${(totalLength / 1000).toFixed(3)} 公里`;
                
                const line = L.polyline(this.drawingPoints, {
                    color: '#3388ff',
                    weight: 3,
                    opacity: 1
                }).addTo(map);
                
                // Add popup with length
                const popupContent = `
                    <div class="drawing-popup">
                        <div class="popup-title"><b>线条</b></div>
                        <div class="popup-content">长度: ${lengthText}</div>
                        <button class="popup-delete-btn" onclick="window.app.ribbonController.deleteDrawing(this)" title="删除">
                            <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
                                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                            </svg>
                        </button>
                    </div>
                `;
                line.bindPopup(popupContent);
                
                // Add click handler to show info
                line.on('click', () => {
                    line.openPopup();
                });
                
                line._drawingLayerId = this.drawingLayers.length;
                this.drawingLayers.push(line);
                
                if (this.tempDrawingLayer) {
                    map.removeLayer(this.tempDrawingLayer);
                    this.tempDrawingLayer = null;
                }
                
                this.updateStatus(`线已绘制 - 长度: ${lengthText}`);
            }
            
            map.off('click', clickHandler);
            map.off('dblclick', dblClickHandler);
            map.doubleClickZoom.enable();
            this.cancelDrawing();
        };
        
        map.on('click', clickHandler);
        map.on('dblclick', dblClickHandler);
        this.currentDrawingHandler = clickHandler;
        this.currentDblClickHandler = dblClickHandler;
    }
    
    drawPolygon(map) {
        this.drawingPoints = [];
        this.tempDrawingLayer = null;
        this.clickTimeout = null;
        
        // Disable double click zoom
        map.doubleClickZoom.disable();
        
        const clickHandler = (e) => {
            L.DomEvent.stopPropagation(e);
            
            // Clear any pending click timeout
            if (this.clickTimeout) {
                clearTimeout(this.clickTimeout);
            }
            
            // Delay adding point to allow double-click to fire
            this.clickTimeout = setTimeout(() => {
                this.drawingPoints.push(e.latlng);
            
            if (this.tempDrawingLayer) {
                map.removeLayer(this.tempDrawingLayer);
            }
            
            if (this.drawingPoints.length >= 2) {
                this.tempDrawingLayer = L.polygon(this.drawingPoints, {
                    color: '#3388ff',
                    weight: 2,
                    opacity: 0.8,
                    fillOpacity: 0.3
                }).addTo(map);
            }
            
                this.updateStatus(`绘制面: 已添加 ${this.drawingPoints.length} 个点 - 双击结束`);
            }, 250);
        };
        
        const dblClickHandler = (e) => {
            L.DomEvent.stopPropagation(e);
            L.DomEvent.preventDefault(e);
            
            // Clear the click timeout to prevent adding extra point
            if (this.clickTimeout) {
                clearTimeout(this.clickTimeout);
                this.clickTimeout = null;
            }
            
            if (this.drawingPoints.length >= 3) {
                // Calculate area
                const area = this.calculatePolygonArea(this.drawingPoints);
                
                let areaText;
                if (area < 10000) {
                    areaText = `${area.toFixed(2)} 平方米`;
                } else if (area < 1000000) {
                    areaText = `${(area / 10000).toFixed(3)} 公顷`;
                } else {
                    areaText = `${(area / 1000000).toFixed(3)} 平方公里`;
                }
                
                // Calculate perimeter
                let perimeter = 0;
                for (let i = 1; i < this.drawingPoints.length; i++) {
                    perimeter += this.drawingPoints[i - 1].distanceTo(this.drawingPoints[i]);
                }
                perimeter += this.drawingPoints[this.drawingPoints.length - 1].distanceTo(this.drawingPoints[0]);
                
                const perimeterText = perimeter < 1000 
                    ? `${perimeter.toFixed(2)} 米` 
                    : `${(perimeter / 1000).toFixed(3)} 公里`;
                
                const polygon = L.polygon(this.drawingPoints, {
                    color: '#3388ff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.5
                }).addTo(map);
                
                // Add popup with area and perimeter
                const popupContent = `
                    <div class="drawing-popup">
                        <div class="popup-title"><b>多边形</b></div>
                        <div class="popup-content">
                            面积: ${areaText}<br/>
                            周长: ${perimeterText}
                        </div>
                        <button class="popup-delete-btn" onclick="window.app.ribbonController.deleteDrawing(this)" title="删除">
                            <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
                                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                            </svg>
                        </button>
                    </div>
                `;
                polygon.bindPopup(popupContent);
                
                // Add click handler to show info
                polygon.on('click', () => {
                    polygon.openPopup();
                });
                
                polygon._drawingLayerId = this.drawingLayers.length;
                this.drawingLayers.push(polygon);
                
                if (this.tempDrawingLayer) {
                    map.removeLayer(this.tempDrawingLayer);
                    this.tempDrawingLayer = null;
                }
                
                this.updateStatus(`面已绘制 - 面积: ${areaText}`);
            }
            
            map.off('click', clickHandler);
            map.off('dblclick', dblClickHandler);
            map.doubleClickZoom.enable();
            this.cancelDrawing();
        };
        
        map.on('click', clickHandler);
        map.on('dblclick', dblClickHandler);
        this.currentDrawingHandler = clickHandler;
        this.currentDblClickHandler = dblClickHandler;
    }
    
    drawCircle(map) {
        let startPoint = null;
        this.tempDrawingLayer = null;
        
        const clickHandler = (e) => {
            L.DomEvent.stopPropagation(e);
            
            if (!startPoint) {
                startPoint = e.latlng;
                this.updateStatus('圆心已设置，点击设置半径');
            } else {
                const radius = startPoint.distanceTo(e.latlng);
                const circle = L.circle(startPoint, {
                    radius: radius,
                    color: '#3388ff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.3
                }).addTo(map);
                
                // Calculate area
                const area = Math.PI * radius * radius;
                let areaText;
                if (area < 10000) {
                    areaText = `${area.toFixed(2)} 平方米`;
                } else if (area < 1000000) {
                    areaText = `${(area / 10000).toFixed(3)} 公顷`;
                } else {
                    areaText = `${(area / 1000000).toFixed(3)} 平方公里`;
                }
                
                const radiusText = radius < 1000 
                    ? `${radius.toFixed(2)} 米` 
                    : `${(radius / 1000).toFixed(3)} 公里`;
                
                // Add popup
                const popupContent = `
                    <div class="drawing-popup">
                        <div class="popup-title"><b>圆形</b></div>
                        <div class="popup-content">
                            半径: ${radiusText}<br/>
                            面积: ${areaText}
                        </div>
                        <button class="popup-delete-btn" onclick="window.app.ribbonController.deleteDrawing(this)" title="删除">
                            <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
                                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                            </svg>
                        </button>
                    </div>
                `;
                circle.bindPopup(popupContent);
                
                // Add click handler
                circle.on('click', () => {
                    circle.openPopup();
                });
                
                circle._drawingLayerId = this.drawingLayers.length;
                this.drawingLayers.push(circle);
                
                if (this.tempDrawingLayer) {
                    map.removeLayer(this.tempDrawingLayer);
                    this.tempDrawingLayer = null;
                }
                
                map.off('click', clickHandler);
                map.off('mousemove', moveHandler);
                this.cancelDrawing();
                this.updateStatus(`圆已绘制 - 面积: ${areaText}`);
            }
        };
        
        const moveHandler = (e) => {
            if (startPoint) {
                if (this.tempDrawingLayer) {
                    map.removeLayer(this.tempDrawingLayer);
                }
                const radius = startPoint.distanceTo(e.latlng);
                this.tempDrawingLayer = L.circle(startPoint, {
                    radius: radius,
                    color: '#3388ff',
                    weight: 2,
                    opacity: 0.5,
                    fillOpacity: 0.2,
                    dashArray: '5, 5'
                }).addTo(map);
            }
        };
        
        map.on('click', clickHandler);
        map.on('mousemove', moveHandler);
        this.currentDrawingHandler = clickHandler;
        this.currentMoveHandler = moveHandler;
    }
    
    drawRectangle(map) {
        let startPoint = null;
        this.tempDrawingLayer = null;
        
        const clickHandler = (e) => {
            L.DomEvent.stopPropagation(e);
            
            if (!startPoint) {
                startPoint = e.latlng;
                this.updateStatus('起点已设置，点击设置终点');
            } else {
                const bounds = L.latLngBounds(startPoint, e.latlng);
                const rectangle = L.rectangle(bounds, {
                    color: '#3388ff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.3
                }).addTo(map);
                
                // Calculate area and dimensions
                const corners = [
                    bounds.getNorthWest(),
                    bounds.getNorthEast(),
                    bounds.getSouthEast(),
                    bounds.getSouthWest()
                ];
                
                const width = corners[0].distanceTo(corners[1]);
                const height = corners[1].distanceTo(corners[2]);
                const area = width * height;
                
                let areaText;
                if (area < 10000) {
                    areaText = `${area.toFixed(2)} 平方米`;
                } else if (area < 1000000) {
                    areaText = `${(area / 10000).toFixed(3)} 公顷`;
                } else {
                    areaText = `${(area / 1000000).toFixed(3)} 平方公里`;
                }
                
                const widthText = width < 1000 
                    ? `${width.toFixed(2)} 米` 
                    : `${(width / 1000).toFixed(3)} 公里`;
                const heightText = height < 1000 
                    ? `${height.toFixed(2)} 米` 
                    : `${(height / 1000).toFixed(3)} 公里`;
                
                // Add popup
                const popupContent = `
                    <div class="drawing-popup">
                        <div class="popup-title"><b>矩形</b></div>
                        <div class="popup-content">
                            宽度: ${widthText}<br/>
                            高度: ${heightText}<br/>
                            面积: ${areaText}
                        </div>
                        <button class="popup-delete-btn" onclick="window.app.ribbonController.deleteDrawing(this)" title="删除">
                            <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
                                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                            </svg>
                        </button>
                    </div>
                `;
                rectangle.bindPopup(popupContent);
                
                // Add click handler
                rectangle.on('click', () => {
                    rectangle.openPopup();
                });
                
                rectangle._drawingLayerId = this.drawingLayers.length;
                this.drawingLayers.push(rectangle);
                
                if (this.tempDrawingLayer) {
                    map.removeLayer(this.tempDrawingLayer);
                    this.tempDrawingLayer = null;
                }
                
                map.off('click', clickHandler);
                map.off('mousemove', moveHandler);
                this.cancelDrawing();
                this.updateStatus(`矩形已绘制 - 面积: ${areaText}`);
            }
        };
        
        const moveHandler = (e) => {
            if (startPoint) {
                if (this.tempDrawingLayer) {
                    map.removeLayer(this.tempDrawingLayer);
                }
                const bounds = L.latLngBounds(startPoint, e.latlng);
                this.tempDrawingLayer = L.rectangle(bounds, {
                    color: '#3388ff',
                    weight: 2,
                    opacity: 0.5,
                    fillOpacity: 0.2,
                    dashArray: '5, 5'
                }).addTo(map);
            }
        };
        
        map.on('click', clickHandler);
        map.on('mousemove', moveHandler);
        this.currentDrawingHandler = clickHandler;
        this.currentMoveHandler = moveHandler;
    }
    
    cancelDrawing() {
        const map = window.app.mapManager?.map;
        if (!map) return;
        
        if (this.currentDrawingHandler) {
            map.off('click', this.currentDrawingHandler);
        }
        if (this.currentDblClickHandler) {
            map.off('dblclick', this.currentDblClickHandler);
        }
        if (this.currentMoveHandler) {
            map.off('mousemove', this.currentMoveHandler);
        }
        
        // Remove temporary drawing layer
        if (this.tempDrawingLayer) {
            map.removeLayer(this.tempDrawingLayer);
            this.tempDrawingLayer = null;
        }
        
        // Remove active state from buttons
        if (this.drawingPanel) {
            this.drawingPanel.querySelectorAll('.drawing-tool-btn').forEach(btn => {
                btn.classList.remove('active');
            });
        }
        
        this.drawingMode = null;
        this.drawingPoints = [];
        this.currentDrawingHandler = null;
        this.currentDblClickHandler = null;
        this.currentMoveHandler = null;
        
        this.updateStatus('绘制已取消');
    }
    
    clearAllDrawings() {
        const map = window.app.mapManager?.map;
        if (!map) return;
        
        // Cancel current drawing
        this.cancelDrawing();
        
        // Remove all stored drawings
        this.drawingLayers.forEach(layer => {
            if (layer) {
                map.removeLayer(layer);
            }
        });
        
        this.drawingLayers = [];
        
        this.updateStatus('已清除所有绘制数据');
    }
    
    deleteDrawing(buttonElement) {
        const map = window.app.mapManager?.map;
        if (!map) return;
        
        // Find the popup element
        const popup = buttonElement.closest('.leaflet-popup');
        if (!popup) return;
        
        // Get the layer from the popup
        let layerToDelete = null;
        map.eachLayer((layer) => {
            if (layer._popup && layer._popup._container === popup) {
                layerToDelete = layer;
            }
        });
        
        if (layerToDelete) {
            // Remove from drawingLayers array
            const index = this.drawingLayers.indexOf(layerToDelete);
            if (index > -1) {
                this.drawingLayers.splice(index, 1);
            }
            
            // Close popup first
            if (layerToDelete._popup) {
                layerToDelete._popup.remove();
            }
            
            // Remove layer from map
            map.removeLayer(layerToDelete);
            
            this.updateStatus('已删除绘制图形');
        }
    }
    
    stopDrawing() {
        // For compatibility, just call cancelDrawing
        this.cancelDrawing();
    }
    
    updateRibbonState() {
        // Update ribbon button states based on current application state
        // This can be called when layers are added/removed, etc.
        this.updateBasemapLabel();
        this.refreshBasemapSelection();
        
        // Update layer list
        if (window.app.layerManager) {
            window.app.layerManager.renderLayerList();
        }
    }

    updateStatus(message) {
        if (document.getElementById('status-message')) {
            document.getElementById('status-message').textContent = message;
        }
    }

    toggleBasemapPanel() {
        if (!this.basemapPanel) return;
        if (this.basemapPanelVisible) {
            this.hideBasemapPanel();
        } else {
            this.showBasemapPanel();
        }
    }

    showBasemapPanel() {
        if (!this.basemapPanel) return;
        this.renderBasemapPanel();
        this.basemapPanel.removeAttribute('hidden');
        this.basemapPanel.classList.add('visible');
        this.basemapPanelVisible = true;
    }

    hideBasemapPanel() {
        if (!this.basemapPanel) return;
        this.basemapPanel.classList.remove('visible');
        this.basemapPanel.setAttribute('hidden', 'hidden');
        this.basemapPanelVisible = false;
    }

    renderBasemapPanel() {
        if (!this.basemapPanel || !window.app.mapManager) return;

        const mapManager = window.app.mapManager;
        const baseOptions = mapManager.getBaseLayerOptions();

        this.baseOptionsCache = baseOptions;
        this.baseLayerCards = new Map();

        this.basemapPanel.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'basemap-panel-header';

        const title = document.createElement('div');
        title.className = 'basemap-panel-title';
        title.textContent = '底图选择';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'basemap-panel-close';
        closeBtn.innerHTML = '×';
        closeBtn.addEventListener('click', () => this.hideBasemapPanel());

        header.appendChild(title);
        header.appendChild(closeBtn);
        this.basemapPanel.appendChild(header);

        this.appendBasemapCategoryGroups(baseOptions);

        this.refreshBasemapSelection();
    }

    appendBasemapCategoryGroups(options) {
        if (!options || options.length === 0) return;

        const categories = new Map();
        options.forEach(option => {
            const key = option.category || '底图';
            if (!categories.has(key)) {
                categories.set(key, []);
            }
            categories.get(key).push(option);
        });

        categories.forEach((items, categoryLabel) => {
            const categoryEl = document.createElement('div');
            categoryEl.className = 'basemap-category';
            categoryEl.textContent = categoryLabel;
            this.basemapPanel.appendChild(categoryEl);

            items.forEach(option => {
                const card = this.createBasemapCard(option);
                this.basemapPanel.appendChild(card);
                this.baseLayerCards.set(option.id, card);
            });
        });
    }

    createBasemapCard(option) {
        const card = document.createElement('div');
        card.className = 'basemap-card';
        card.dataset.id = option.id;
        card.dataset.type = 'basemap';

        if (option.preview) {
            const img = document.createElement('img');
            img.src = option.preview;
            img.alt = option.name;
            card.appendChild(img);
        } else {
            const thumb = document.createElement('div');
            thumb.className = 'basemap-card-thumb';
            thumb.textContent = '无预览';
            card.appendChild(thumb);
        }

        const body = document.createElement('div');
        body.className = 'basemap-card-body';

        const title = document.createElement('div');
        title.className = 'basemap-card-title';
        title.textContent = option.name;
        body.appendChild(title);

        if (option.description) {
            const desc = document.createElement('div');
            desc.className = 'basemap-card-desc';
            desc.textContent = option.description;
            body.appendChild(desc);
        }
        
        if (option.annotationLayerId) {
            const footer = document.createElement('div');
            footer.className = 'basemap-card-footer';
            footer.textContent = '含中文注记';
            body.appendChild(footer);
        }

        card.appendChild(body);

        card.addEventListener('click', () => {
            this.selectBaseLayer(option.id);
        });

        return card;
    }

    selectBaseLayer(layerId) {
        if (!window.app.mapManager || !layerId) return;
        window.app.mapManager.setBaseLayer(layerId);
        this.updateBasemapLabel();
        this.refreshBasemapSelection();
        this.hideBasemapPanel();
        
        // Update layer list to show new basemap/annotation
        if (window.app.layerManager) {
            window.app.layerManager.renderLayerList();
        }
    }

    refreshBasemapSelection() {
        if (!window.app.mapManager) return;
        const currentBaseId = window.app.mapManager.getCurrentBaseLayerId();

        this.baseLayerCards.forEach((card, id) => {
            if (id === currentBaseId) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });
    }


    updateBasemapLabel() {
        if (!this.basemapNameElement || !window.app.mapManager) return;
        this.basemapNameElement.textContent = '底图库';
    }
}
