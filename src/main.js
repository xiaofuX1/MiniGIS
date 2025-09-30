import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { MapManager } from './modules/mapManager.js';
import { LayerManager } from './modules/layerManager.js';
import { RibbonController } from './modules/ribbonController.js';
import { AttributeViewer } from './modules/attributeViewer.js';
import { SessionManager } from './modules/sessionManager.js';

// Global app state
window.app = {
    mapManager: null,
    layerManager: null,
    ribbonController: null,
    attributeViewer: null,
    sessionManager: null,
    currentLayers: new Map()
};

// Initialize application
async function initializeApp() {
    try {
        // Setup console logging
        setupConsoleLogging();
        
        // Initialize map
        window.app.mapManager = new MapManager('map');
        
        // Initialize managers
        window.app.layerManager = new LayerManager();
        window.app.ribbonController = new RibbonController();
        window.app.attributeViewer = new AttributeViewer();
        window.app.sessionManager = new SessionManager();
        
        // Setup event handlers
        setupEventHandlers();
        
        // 恢复上次会话
        const sessionInfo = window.app.sessionManager.getSessionInfo();
        if (sessionInfo) {
            console.log(`发现上次会话: ${sessionInfo.layerCount} 个图层, 保存于 ${new Date(sessionInfo.savedAt).toLocaleString()}`);
            updateStatus('正在恢复上次会话...');
            await window.app.sessionManager.restoreSession();
            updateStatus('会话已恢复');
        } else {
            updateStatus('应用程序已就绪');
        }
        
        // 自动保存会话
        setupAutoSave();
        
        console.log('MiniGIS initialized successfully');
    } catch (error) {
        console.error('Failed to initialize app:', error);
        updateStatus('初始化失败: ' + error.message);
    }
}

// Setup event handlers
function setupEventHandlers() {
    // Ribbon tabs
    document.querySelectorAll('.ribbon-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            window.app.ribbonController.switchTab(e.target.dataset.tab);
        });
    });
    
    // Add Shapefile button
    document.getElementById('btn-add-shapefile').addEventListener('click', async () => {
        await addShapefile();
    });
    
    // Remove layer button
    document.getElementById('btn-remove-layer').addEventListener('click', () => {
        window.app.layerManager.removeSelectedLayer();
    });
    
    // Navigation tools
    document.getElementById('btn-zoom-in').addEventListener('click', () => {
        window.app.mapManager.zoomIn();
    });
    
    document.getElementById('btn-zoom-out').addEventListener('click', () => {
        window.app.mapManager.zoomOut();
    });
    
    document.getElementById('btn-zoom-extent').addEventListener('click', () => {
        window.app.mapManager.fitBounds();
    });
    
    // Panel toggle buttons
    document.getElementById('btn-toggle-layers').addEventListener('click', () => {
        togglePanel('layers-panel');
    });
    
    document.getElementById('btn-toggle-properties').addEventListener('click', () => {
        togglePanel('properties-panel');
    });
    
    // API Settings Dialog
    const apiDialog = document.getElementById('api-settings-dialog');
    const apiKeyInput = document.getElementById('tianditu-api-key');
    const currentKeyStatus = document.getElementById('current-key-status');
    
    document.getElementById('btn-api-settings').addEventListener('click', () => {
        // 显示对话框并加载当前密钥
        apiKeyInput.value = window.app.mapManager.getTiandituKey();
        currentKeyStatus.textContent = window.app.mapManager.getTiandituKey();
        apiDialog.style.display = 'flex';
    });
    
    document.getElementById('close-api-settings').addEventListener('click', () => {
        apiDialog.style.display = 'none';
    });
    
    document.getElementById('cancel-api-settings').addEventListener('click', () => {
        apiDialog.style.display = 'none';
    });
    
    document.getElementById('save-api-key').addEventListener('click', () => {
        const newKey = apiKeyInput.value.trim();
        if (window.app.mapManager.updateTiandituKey(newKey)) {
            apiDialog.style.display = 'none';
        }
    });
    
    document.getElementById('reset-api-key').addEventListener('click', () => {
        window.app.mapManager.resetTiandituKey();
        apiDialog.style.display = 'none';
    });
    
    // 点击对话框外部关闭
    apiDialog.addEventListener('click', (e) => {
        if (e.target === apiDialog) {
            apiDialog.style.display = 'none';
        }
    });
    
    // Export map button
    document.getElementById('btn-export-map').addEventListener('click', () => {
        exportMap();
    });
    
    // Pan button (already enabled by default)
    document.getElementById('btn-pan').addEventListener('click', () => {
        updateStatus('平移模式已启用（默认）');
    });
    
    // Select feature button
    document.getElementById('btn-select').addEventListener('click', () => {
        updateStatus('选择模式：点击地图要素以查看属性');
    });
    
    // Clear selection button
    document.getElementById('btn-clear-selection').addEventListener('click', () => {
        window.app.mapManager.clearSelection();
        updateStatus('已清除选择');
    });
    
    // Add marker button
    document.getElementById('btn-add-marker').addEventListener('click', () => {
        startAddMarker();
    });
    
    // Add text button
    document.getElementById('btn-add-text').addEventListener('click', () => {
        startAddText();
    });
    
    // Buffer analysis
    document.getElementById('btn-buffer').addEventListener('click', () => {
        showBufferDialog();
    });
    
    // Intersect analysis
    document.getElementById('btn-intersect').addEventListener('click', () => {
        showIntersectDialog();
    });
    
    // Union analysis
    document.getElementById('btn-union').addEventListener('click', () => {
        showUnionDialog();
    });
    
    // Statistics
    document.getElementById('btn-statistics').addEventListener('click', () => {
        showStatisticsDialog();
    });
    
    // Console toggle
    document.getElementById('btn-toggle-console').addEventListener('click', () => {
        togglePanel('console-panel');
    });
    
    // Map coordinate display and scale
    window.app.mapManager.map.on('mousemove', (e) => {
        updateCoordinates(e.latlng.lat, e.latlng.lng);
    });
    
    // Update scale on zoom/move
    window.app.mapManager.map.on('zoomend', updateScale);
    window.app.mapManager.map.on('moveend', updateScale);
    
    // Initial scale update
    setTimeout(updateScale, 500);
}

// Add shapefile
async function addShapefile() {
    try {
        updateStatus('选择Shapefile文件...');
        
        // Open file dialog
        const selected = await open({
            multiple: false,
            filters: [{
                name: 'Shapefile',
                extensions: ['shp']
            }]
        });
        
        if (selected) {
            updateStatus('加载Shapefile...');
            
            // Load shapefile info
            const shpInfo = await invoke('load_shapefile', { path: selected });
            console.log('Shapefile info:', shpInfo);
            
            // Convert to GeoJSON for display
            const geojson = await invoke('shapefile_to_geojson', { path: selected });
            const geojsonData = JSON.parse(geojson);
            
            // Add layer to map
            const layer = window.app.mapManager.addGeoJSONLayer(geojsonData, shpInfo.filename);
            
            // Add to layer manager
            window.app.layerManager.addLayer({
                id: Date.now().toString(),
                name: shpInfo.filename,
                type: shpInfo.geometry_type,
                path: selected,
                info: shpInfo,
                layer: layer
            });
            
            // Fit map to layer bounds
            if (shpInfo.bounds && shpInfo.bounds.length === 4) {
                const bounds = [
                    [shpInfo.bounds[1], shpInfo.bounds[0]],
                    [shpInfo.bounds[3], shpInfo.bounds[2]]
                ];
                window.app.mapManager.map.fitBounds(bounds);
            }
            
            updateStatus(`成功加载: ${shpInfo.filename}`);
            
            // Load attributes for display
            const attributes = await invoke('get_shapefile_attributes', { path: selected });
            window.app.attributeViewer.setData(attributes, shpInfo.fields);
        }
    } catch (error) {
        console.error('Failed to add shapefile:', error);
        updateStatus('加载失败: ' + error);
        alert('无法加载Shapefile: ' + error);
    }
}

// Toggle panel visibility
window.togglePanel = function(panelId) {
    const panel = document.getElementById(panelId);
    if (panel) {
        if (panelId === 'attribute-panel') {
            panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
        } else {
            const isVisible = panel.style.display !== 'none';
            panel.style.display = isVisible ? 'none' : 'flex';
        }
    }
}

// Update status message
function updateStatus(message, progress = null) {
    document.getElementById('status-message').textContent = message;
    
    const progressEl = document.getElementById('status-progress');
    if (progress !== null) {
        progressEl.style.display = 'block';
        progressEl.querySelector('.progress-fill').style.width = `${progress}%`;
    } else {
        progressEl.style.display = 'none';
    }
}

// Update coordinate display
function updateCoordinates(lat, lng) {
    const coordDisplay = document.getElementById('coordinate-display');
    coordDisplay.textContent = `经度: ${lng.toFixed(6)} | 纬度: ${lat.toFixed(6)}`;
}

// Calculate and update map scale
function updateScale() {
    if (!window.app.mapManager || !window.app.mapManager.map) return;
    
    const map = window.app.mapManager.map;
    const zoom = map.getZoom();
    const center = map.getCenter();
    
    // 计算地图比例尺
    // Web Mercator 投影在赤道的比例尺
    const earthCircumference = 40075017; // 地球周长（米）
    const mapWidth = map.getSize().x; // 地图宽度（像素）
    
    // 在当前缩放级别下，256像素对应的实际距离（米）
    const metersPerPixel = earthCircumference * Math.cos(center.lat * Math.PI / 180) / Math.pow(2, zoom + 8);
    
    // 计算比例尺（假设屏幕分辨率为96 DPI）
    const scale = metersPerPixel * 96 / 0.0254; // 转换为实际比例
    
    // 格式化比例尺显示（显示完整数字，添加千位分隔符）
    const scaleDisplay = document.getElementById('scale-display');
    const scaleValue = Math.round(scale);
    const formattedScale = scaleValue.toLocaleString('zh-CN');
    scaleDisplay.textContent = `比例尺: 1:${formattedScale}`;
}

// 自动保存会话
function setupAutoSave() {
    // 在地图移动/缩放后保存
    let saveTimeout = null;
    
    window.app.mapManager.map.on('moveend', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            window.app.sessionManager.saveSession();
        }, 1000); // 延迟1秒保存，避免频繁操作
    });
    
    window.app.mapManager.map.on('zoomend', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            window.app.sessionManager.saveSession();
        }, 1000);
    });
    
    // 在添加/移除图层后保存
    const originalAddLayer = window.app.layerManager.addLayer.bind(window.app.layerManager);
    window.app.layerManager.addLayer = function(...args) {
        originalAddLayer(...args);
        setTimeout(() => window.app.sessionManager.saveSession(), 500);
    };
    
    const originalRemoveLayer = window.app.layerManager.removeLayer.bind(window.app.layerManager);
    window.app.layerManager.removeLayer = function(...args) {
        originalRemoveLayer(...args);
        setTimeout(() => window.app.sessionManager.saveSession(), 500);
    };
    
    // 在底图切换后保存
    const originalSetBaseLayer = window.app.mapManager.setBaseLayer.bind(window.app.mapManager);
    window.app.mapManager.setBaseLayer = function(...args) {
        originalSetBaseLayer(...args);
        setTimeout(() => window.app.sessionManager.saveSession(), 500);
    };
    
    const originalSetAnnotationLayer = window.app.mapManager.setAnnotationLayer.bind(window.app.mapManager);
    window.app.mapManager.setAnnotationLayer = function(...args) {
        originalSetAnnotationLayer(...args);
        setTimeout(() => window.app.sessionManager.saveSession(), 500);
    };
    
    // 在页面关闭前保存
    window.addEventListener('beforeunload', () => {
        window.app.sessionManager.saveSession();
    });
    
    console.log('自动保存已启用');
}

// Export map as image
function exportMap() {
    if (!window.app.mapManager) return;
    
    updateStatus('正在导出地图...');
    
    // Use Leaflet's simple print method
    const mapElement = document.getElementById('map');
    
    // Use html2canvas if available, otherwise use leaflet-image
    import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js')
        .then(module => {
            const html2canvas = module.default;
            html2canvas(mapElement, {
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff'
            }).then(canvas => {
                // Convert to blob and download
                canvas.toBlob(blob => {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.download = `map-export-${Date.now()}.png`;
                    link.href = url;
                    link.click();
                    URL.revokeObjectURL(url);
                    updateStatus('地图已导出');
                });
            });
        })
        .catch(error => {
            console.error('Export failed:', error);
            alert('导出失败，请尝试使用浏览器的截图功能');
            updateStatus('导出失败');
        });
}

// Add marker to map
let markerMode = false;
function startAddMarker() {
    if (markerMode) {
        stopAddMarker();
        return;
    }
    
    markerMode = true;
    updateStatus('点击地图添加标记');
    document.getElementById('btn-add-marker').classList.add('active');
    
    const map = window.app.mapManager.map;
    map.once('click', (e) => {
        const marker = L.marker(e.latlng).addTo(map);
        const name = prompt('请输入标记名称：', '标记');
        if (name) {
            marker.bindPopup(name).openPopup();
        }
        markerMode = false;
        document.getElementById('btn-add-marker').classList.remove('active');
        updateStatus('标记已添加');
    });
}

function stopAddMarker() {
    markerMode = false;
    document.getElementById('btn-add-marker').classList.remove('active');
    updateStatus('取消添加标记');
}

// Add text annotation
let textMode = false;
function startAddText() {
    if (textMode) {
        stopAddText();
        return;
    }
    
    textMode = true;
    updateStatus('点击地图添加文字');
    document.getElementById('btn-add-text').classList.add('active');
    
    const map = window.app.mapManager.map;
    map.once('click', (e) => {
        const text = prompt('请输入文字内容：', '');
        if (text) {
            const textIcon = L.divIcon({
                className: 'text-annotation',
                html: `<div style="background: white; padding: 4px 8px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); font-size: 14px; white-space: nowrap;">${text}</div>`,
                iconSize: null
            });
            L.marker(e.latlng, { icon: textIcon }).addTo(map);
        }
        textMode = false;
        document.getElementById('btn-add-text').classList.remove('active');
        updateStatus('文字已添加');
    });
}

function stopAddText() {
    textMode = false;
    document.getElementById('btn-add-text').classList.remove('active');
    updateStatus('取消添加文字');
}

// Buffer analysis dialog
function showBufferDialog() {
    const selectedLayer = window.app.layerManager?.selectedLayerId;
    if (!selectedLayer) {
        alert('请先选择一个图层');
        return;
    }
    
    const distance = prompt('请输入缓冲区距离（米）：', '100');
    if (distance && !isNaN(distance)) {
        updateStatus(`正在计算 ${distance}米 缓冲区...`);
        setTimeout(() => {
            alert(`缓冲区分析功能需要引入 Turf.js 库来实现\n距离: ${distance}米`);
            updateStatus('缓冲区分析（待实现）');
        }, 500);
    }
}

// Intersect analysis dialog
function showIntersectDialog() {
    const layers = Array.from(window.app.layerManager?.layers.values() || []);
    if (layers.length < 2) {
        alert('需要至少2个图层才能进行相交分析');
        return;
    }
    
    updateStatus('相交分析：请选择两个图层');
    alert(`相交分析功能需要引入 Turf.js 库来实现\n当前图层数: ${layers.length}`);
}

// Union analysis dialog
function showUnionDialog() {
    const layers = Array.from(window.app.layerManager?.layers.values() || []);
    if (layers.length < 2) {
        alert('需要至少2个图层才能进行合并分析');
        return;
    }
    
    updateStatus('合并分析：请选择要合并的图层');
    alert(`合并分析功能需要引入 Turf.js 库来实现\n当前图层数: ${layers.length}`);
}

// Statistics dialog
function showStatisticsDialog() {
    const selectedLayer = window.app.layerManager?.selectedLayerId;
    if (!selectedLayer) {
        alert('请先选择一个图层');
        return;
    }
    
    const layer = window.app.layerManager.layers.get(selectedLayer);
    if (!layer || !layer.info) {
        alert('图层信息不可用');
        return;
    }
    
    const stats = `图层统计信息\n\n` +
        `名称: ${layer.name}\n` +
        `类型: ${layer.type}\n` +
        `要素数量: ${layer.info.feature_count || 0}\n` +
        `字段数量: ${layer.info.fields?.length || 0}\n` +
        `坐标系: ${layer.info.crs || 'EPSG:4326'}`;
    
    alert(stats);
    updateStatus('统计信息已显示');
}

// Setup console logging
function setupConsoleLogging() {
    const consoleContent = document.getElementById('console-content');
    if (!consoleContent) return;
    
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    function addToConsole(message, type = 'log') {
        const timestamp = new Date().toLocaleTimeString();
        const color = {
            'log': '#d4d4d4',
            'error': '#f48771',
            'warn': '#dcdcaa'
        }[type];
        
        const logEntry = document.createElement('div');
        logEntry.style.color = color;
        logEntry.style.marginTop = '4px';
        logEntry.innerHTML = `<span style="color: #858585;">[${timestamp}]</span> ${message}`;
        consoleContent.appendChild(logEntry);
        consoleContent.scrollTop = consoleContent.scrollHeight;
    }
    
    console.log = function(...args) {
        originalLog.apply(console, args);
        addToConsole(args.join(' '), 'log');
    };
    
    console.error = function(...args) {
        originalError.apply(console, args);
        addToConsole(args.join(' '), 'error');
    };
    
    console.warn = function(...args) {
        originalWarn.apply(console, args);
        addToConsole(args.join(' '), 'warn');
    };
}

// Initialize app when DOM is ready
window.addEventListener('DOMContentLoaded', initializeApp);
