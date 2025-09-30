// Session Manager Module - 管理地图状态的保存和恢复
export class SessionManager {
    constructor() {
        this.sessionKey = 'minigis_session';
    }
    
    // 保存当前会话状态
    saveSession() {
        try {
            const mapManager = window.app.mapManager;
            const layerManager = window.app.layerManager;
            
            if (!mapManager || !mapManager.map) {
                console.log('地图未初始化，跳过保存');
                return;
            }
            
            const center = mapManager.getCenter();
            const zoom = mapManager.getZoom();
            
            const session = {
                // 地图状态
                map: {
                    center: [center.lat, center.lng],
                    zoom: zoom,
                    baseLayerId: mapManager.getCurrentBaseLayerId(),
                    annotationLayerId: mapManager.getCurrentAnnotationLayerId()
                },
                // 图层状态
                layers: [],
                // 保存时间
                savedAt: new Date().toISOString()
            };
            
            // 保存用户添加的图层
            if (layerManager && layerManager.layers) {
                layerManager.layers.forEach((layerData, layerId) => {
                    session.layers.push({
                        id: layerId,
                        name: layerData.name,
                        filePath: layerData.filePath,
                        visible: layerData.visible !== false,
                        info: layerData.info
                    });
                });
            }
            
            localStorage.setItem(this.sessionKey, JSON.stringify(session));
            console.log('会话已保存:', session);
        } catch (error) {
            console.error('保存会话失败:', error);
        }
    }
    
    // 恢复上次会话状态
    async restoreSession() {
        try {
            const sessionData = localStorage.getItem(this.sessionKey);
            if (!sessionData) {
                console.log('没有找到上次会话');
                return false;
            }
            
            const session = JSON.parse(sessionData);
            console.log('恢复会话:', session);
            
            const mapManager = window.app.mapManager;
            const layerManager = window.app.layerManager;
            
            // 恢复地图状态
            if (session.map) {
                // 恢复底图
                if (session.map.baseLayerId) {
                    mapManager.setBaseLayer(session.map.baseLayerId);
                }
                
                // 恢复注记
                if (session.map.annotationLayerId) {
                    mapManager.setAnnotationLayer(session.map.annotationLayerId);
                }
                
                // 恢复地图中心和缩放（延迟执行，确保底图已加载）
                setTimeout(() => {
                    if (session.map.center && session.map.zoom) {
                        mapManager.map.setView(session.map.center, session.map.zoom);
                    }
                }, 100);
            }
            
            // 恢复图层
            if (session.layers && session.layers.length > 0) {
                console.log(`准备恢复 ${session.layers.length} 个图层`);
                
                for (const layerInfo of session.layers) {
                    try {
                        await this.restoreLayer(layerInfo);
                    } catch (error) {
                        console.warn(`恢复图层失败: ${layerInfo.name}`, error);
                        // 如果图层文件不存在，自动从会话中移除
                        this.removeLayerFromSession(layerInfo.id);
                    }
                }
            }
            
            return true;
        } catch (error) {
            console.error('恢复会话失败:', error);
            return false;
        }
    }
    
    // 恢复单个图层
    async restoreLayer(layerInfo) {
        const { invoke } = await import('@tauri-apps/api/core');
        
        // 检查文件是否存在
        if (layerInfo.filePath) {
            try {
                // 尝试读取文件
                const geojsonData = await invoke('read_shapefile', { 
                    path: layerInfo.filePath 
                });
                
                if (geojsonData) {
                    // 添加到地图
                    const layer = window.app.mapManager.addGeoJSONLayer(
                        geojsonData, 
                        layerInfo.name
                    );
                    
                    // 添加到图层管理器
                    const layerData = {
                        id: layerInfo.id,
                        name: layerInfo.name,
                        filePath: layerInfo.filePath,
                        visible: layerInfo.visible,
                        layer: layer,
                        info: layerInfo.info || {}
                    };
                    
                    window.app.layerManager.addLayer(layerData);
                    
                    // 设置可见性
                    if (!layerInfo.visible) {
                        window.app.layerManager.toggleLayerVisibility(layerInfo.id);
                    }
                    
                    console.log(`图层已恢复: ${layerInfo.name}`);
                } else {
                    throw new Error('文件内容为空');
                }
            } catch (error) {
                console.warn(`图层文件不存在或无法访问: ${layerInfo.filePath}`);
                throw error;
            }
        }
    }
    
    // 从会话中移除不存在的图层
    removeLayerFromSession(layerId) {
        try {
            const sessionData = localStorage.getItem(this.sessionKey);
            if (!sessionData) return;
            
            const session = JSON.parse(sessionData);
            session.layers = session.layers.filter(layer => layer.id !== layerId);
            
            localStorage.setItem(this.sessionKey, JSON.stringify(session));
            console.log(`已从会话中移除图层: ${layerId}`);
        } catch (error) {
            console.error('移除图层失败:', error);
        }
    }
    
    // 清除会话
    clearSession() {
        localStorage.removeItem(this.sessionKey);
        console.log('会话已清除');
    }
    
    // 获取会话信息
    getSessionInfo() {
        try {
            const sessionData = localStorage.getItem(this.sessionKey);
            if (!sessionData) return null;
            
            const session = JSON.parse(sessionData);
            return {
                savedAt: session.savedAt,
                layerCount: session.layers ? session.layers.length : 0,
                center: session.map.center,
                zoom: session.map.zoom
            };
        } catch (error) {
            console.error('获取会话信息失败:', error);
            return null;
        }
    }
}
