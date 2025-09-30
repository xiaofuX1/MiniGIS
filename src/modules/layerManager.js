// Layer Manager Module
export class LayerManager {
    constructor() {
        this.layers = new Map();
        this.systemLayers = [];
        this.layerOrder = []; // 存储图层顺序
        this.selectedLayerId = null;
        this.layerListElement = document.getElementById('layers-list');
        this.draggedElement = null;
    }
    
    addLayer(layerData) {
        this.layers.set(layerData.id, layerData);
        // 新图层添加到顶部
        this.layerOrder.unshift({ id: layerData.id, type: 'user' });
        this.renderLayerList();
        this.selectLayer(layerData.id);
    }
    
    removeLayer(layerId) {
        const layer = this.layers.get(layerId);
        if (layer) {
            // Remove from map
            if (window.app.mapManager) {
                window.app.mapManager.removeLayer(layer.name);
            }
            
            // Remove from list and order
            this.layers.delete(layerId);
            this.layerOrder = this.layerOrder.filter(item => item.id !== layerId);
            
            // Update selection
            if (this.selectedLayerId === layerId) {
                this.selectedLayerId = null;
            }
            
            this.renderLayerList();
            this.updateMapLayerOrder();
        }
    }
    
    removeSelectedLayer() {
        if (this.selectedLayerId) {
            this.removeLayer(this.selectedLayerId);
        }
    }
    
    selectLayer(layerId) {
        this.selectedLayerId = layerId;
        this.renderLayerList();
        
        // Show layer properties
        const layer = this.layers.get(layerId);
        if (layer && window.app.attributeViewer) {
            window.app.attributeViewer.showLayerInfo(layer.info);
        }
    }
    
    toggleLayerVisibility(layerId) {
        const layer = this.layers.get(layerId);
        if (layer) {
            layer.visible = !layer.visible;
            
            // Toggle on map
            if (layer.layer) {
                if (layer.visible) {
                    window.app.mapManager.map.addLayer(layer.layer);
                } else {
                    window.app.mapManager.map.removeLayer(layer.layer);
                }
            }
            
            this.renderLayerList();
        }
    }
    
    updateSystemLayers() {
        if (!window.app.mapManager) return;
        
        const mapManager = window.app.mapManager;
        this.systemLayers = [];
        
        // 获取当前底图和注记
        const currentBaseId = mapManager.getCurrentBaseLayerId();
        const currentAnnotationId = mapManager.getCurrentAnnotationLayerId();
        
        // 添加注记
        if (currentAnnotationId && currentAnnotationId !== 'none') {
            const baseOptions = mapManager.getBaseLayerOptions();
            let annotationName = '注记';
            
            for (const baseOption of baseOptions) {
                if (baseOption.annotationLayerId === currentAnnotationId) {
                    annotationName = baseOption.annotationName || '注记';
                    break;
                }
            }
            
            this.systemLayers.push({
                id: 'current-annotation',
                name: annotationName,
                type: 'annotation',
                visible: mapManager.currentAnnotationLayer ? true : false,
                editable: false,
                system: true,
                crs: 'EPSG:3857',
                extent: '全球'
            });
        }
        
        // 添加底图
        if (currentBaseId) {
            const baseOption = mapManager.getBaseLayerOptions().find(opt => opt.id === currentBaseId);
            if (baseOption) {
                this.systemLayers.push({
                    id: 'current-basemap',
                    name: baseOption.name,
                    type: 'basemap', 
                    visible: mapManager.currentBaseLayer ? true : false,
                    editable: false,
                    system: true,
                    crs: currentBaseId.includes('C') ? 'CGCS2000' : 'EPSG:3857',
                    extent: '全球'
                });
            }
        }
    }
    
    updateLayerOrder() {
        // 以当前 layerOrder 为权威顺序，按可用系统图层进行清理与补充
        const validSystemIds = new Set(this.systemLayers.map(l => l.id));
        
        // 1) 移除不存在的系统图层占位
        let newOrder = this.layerOrder.filter(item => item.type === 'user' || validSystemIds.has(item.id));
        
        // 2) 如果有新的系统图层（首次渲染或状态变化），追加到当前顺序末尾
        this.systemLayers.forEach(sys => {
            if (!newOrder.some(item => item.id === sys.id)) {
                newOrder.push({ id: sys.id, type: 'system' });
            }
        });
        
        this.layerOrder = newOrder;
    }
    
    renderLayerList() {
        this.updateSystemLayers();
        this.updateLayerOrder();
        this.layerListElement.innerHTML = '';
        
        // 按顺序渲染所有图层
        this.layerOrder.forEach((orderItem, index) => {
            let layer, isSystem;
            
            if (orderItem.type === 'system') {
                layer = this.systemLayers.find(l => l.id === orderItem.id);
                isSystem = true;
            } else {
                layer = this.layers.get(orderItem.id);
                isSystem = false;
            }
            
            if (layer) {
                const layerItem = this.createLayerElement(layer, orderItem.id, isSystem, index);
                this.layerListElement.appendChild(layerItem);
            }
        });
        
        // 如果没有任何图层，显示提示
        if (this.layerOrder.length === 0) {
            this.layerListElement.innerHTML = '<p class="empty-message">暂无图层</p>';
        }
    }
    
    
    createLayerElement(layer, id, isSystem = false, orderIndex = 0) {
        const layerItem = document.createElement('div');
        layerItem.className = 'layer-item';
        layerItem.draggable = true; // 所有图层都可拖拽
        layerItem.dataset.layerId = id;
        layerItem.dataset.layerType = isSystem ? 'system' : 'user';
        layerItem.dataset.orderIndex = orderIndex;
        
        if (isSystem) {
            layerItem.classList.add('system-layer');
        } else if (id === this.selectedLayerId) {
            layerItem.classList.add('active');
        }
        
        const infoText = isSystem ? 
            `类型: ${layer.type} | 坐标系: ${layer.crs || 'EPSG:3857'}` : 
            `类型: ${layer.type} | 要素: ${layer.info?.feature_count || 0}`;
        
        layerItem.innerHTML = `
            <div class="layer-item-header">
                <span class="drag-handle" title="拖拽排序"><span class="drag-icon"></span></span>
                <input type="checkbox" 
                       class="layer-visibility" 
                       ${layer.visible !== false ? 'checked' : ''}
                       data-layer-id="${id}">
                <span class="layer-name">${layer.name}</span>
            </div>
            <div class="layer-info">
                ${infoText}
            </div>
        `;
        
        // Add drag and drop handlers for all layers
        this.addDragDropHandlers(layerItem);
        
        // Add click handler for selection
        layerItem.addEventListener('click', (e) => {
            if (!e.target.classList.contains('layer-visibility') && 
                !e.target.classList.contains('drag-handle')) {
                if (!isSystem) {
                    this.selectLayer(id);
                }
            }
        });
        
        // Add context menu
        layerItem.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showEnhancedContextMenu(id, isSystem, e.clientX, e.clientY, orderIndex);
        });
        
        // Add checkbox handler
        const checkbox = layerItem.querySelector('.layer-visibility');
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            if (isSystem) {
                this.toggleSystemLayerVisibility(id, e.target.checked);
            } else {
                this.toggleLayerVisibility(id);
            }
        });
        
        return layerItem;
    }
    
    
    
    addDragDropHandlers(layerItem) {
        layerItem.addEventListener('dragstart', (e) => {
            this.draggedElement = layerItem;
            layerItem.classList.add('dragging');
            // 必须设置数据，部分内核否则不触发 drop
            try {
                e.dataTransfer.setData('text/plain', layerItem.dataset.layerId || '');
            } catch (_) {}
            e.dataTransfer.effectAllowed = 'move';
        });
        
        layerItem.addEventListener('dragend', (e) => {
            layerItem.classList.remove('dragging');
            this.draggedElement = null;
            // 清除所有drop-zone样式
            document.querySelectorAll('.layer-item').forEach(item => {
                item.classList.remove('drop-zone-above', 'drop-zone-below');
            });
        });
        
        layerItem.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (this.draggedElement && this.draggedElement !== layerItem) {
                const rect = layerItem.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                
                // 清除其他drop-zone样式
                document.querySelectorAll('.layer-item').forEach(item => {
                    item.classList.remove('drop-zone-above', 'drop-zone-below');
                });
                
                if (e.clientY < midY) {
                    layerItem.classList.add('drop-zone-above');
                } else {
                    layerItem.classList.add('drop-zone-below');
                }
                // 指示为移动效果
                try { e.dataTransfer.dropEffect = 'move'; } catch (_) {}
            }
        });
        
        layerItem.addEventListener('drop', (e) => {
            e.preventDefault();
            if (this.draggedElement && this.draggedElement !== layerItem) {
                const draggedId = this.draggedElement.dataset.layerId;
                const targetId = layerItem.dataset.layerId;
                const rect = layerItem.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                const dropAbove = e.clientY < midY;
                
                this.reorderLayers(draggedId, targetId, dropAbove);
            }
            
            // 清除drop-zone样式
            layerItem.classList.remove('drop-zone-above', 'drop-zone-below');
        });
    }
    
    reorderLayers(draggedId, targetId, dropAbove) {
        const draggedIndex = this.layerOrder.findIndex(item => item.id === draggedId);
        const targetIndex = this.layerOrder.findIndex(item => item.id === targetId);
        
        if (draggedIndex === -1 || targetIndex === -1) return;
        
        // 移除被拖拽元素
        const draggedItem = this.layerOrder.splice(draggedIndex, 1)[0];
        
        // 重新计算目标位置（因为移除了一个元素）
        let newTargetIndex = targetIndex;
        if (draggedIndex < targetIndex) {
            newTargetIndex--;
        }
        
        // 计算新位置
        let newIndex = dropAbove ? newTargetIndex : newTargetIndex + 1;
        
        // 插入到新位置
        this.layerOrder.splice(newIndex, 0, draggedItem);
        
        // 重新渲染和更新地图
        this.renderLayerList();
        this.updateMapLayerOrder();
    }
    
    updateMapLayerOrder() {
        if (!window.app.mapManager) return;
        
        const mapManager = window.app.mapManager;
        
        // 按新顺序重新排列所有图层
        this.layerOrder.forEach((orderItem, index) => {
            if (orderItem.type === 'user') {
                const layer = this.layers.get(orderItem.id);
                if (layer && layer.layer) {
                    // 移除后重新添加用户图层
                    if (mapManager.map.hasLayer(layer.layer)) {
                        mapManager.map.removeLayer(layer.layer);
                    }
                    layer.layer.addTo(mapManager.map);
                }
            } else if (orderItem.type === 'system') {
                // 处理系统图层顺序
                if (orderItem.id === 'current-basemap' && mapManager.currentBaseLayer) {
                    if (mapManager.map.hasLayer(mapManager.currentBaseLayer)) {
                        mapManager.map.removeLayer(mapManager.currentBaseLayer);
                    }
                    mapManager.currentBaseLayer.addTo(mapManager.map);
                } else if (orderItem.id === 'current-annotation' && mapManager.currentAnnotationLayer) {
                    if (mapManager.map.hasLayer(mapManager.currentAnnotationLayer)) {
                        mapManager.map.removeLayer(mapManager.currentAnnotationLayer);
                    }
                    mapManager.currentAnnotationLayer.addTo(mapManager.map);
                }
            }
        });
        
        console.log('所有图层顺序已更新:', this.layerOrder.map(item => ({ id: item.id, type: item.type })));
    }
    
    showEnhancedContextMenu(layerId, isSystem, x, y, orderIndex) {
        // Remove existing context menu
        const existingMenu = document.querySelector('.context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
        
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            background: white;
            border: 1px solid #ccc;
            box-shadow: 2px 2px 5px rgba(0,0,0,0.2);
            z-index: 10000;
            padding: 5px 0;
            min-width: 160px;
            border-radius: 4px;
        `;
        
        const menuItems = [];
        
        // 所有图层都有上移下移功能
        if (orderIndex > 0) {
            menuItems.push({ text: '上移图层', icon: '↑', action: () => this.moveLayerUp(layerId) });
        }
        if (orderIndex < this.layerOrder.length - 1) {
            menuItems.push({ text: '下移图层', icon: '↓', action: () => this.moveLayerDown(layerId) });
        }
        
        if (!isSystem) {
            // 用户图层专有菜单
            menuItems.push({ text: '缩放至图层', icon: '🔍', action: () => this.zoomToLayer(layerId) });
            menuItems.push({ text: '查看属性表', icon: '📋', action: () => this.showAttributeTable(layerId) });
            menuItems.push({ text: '图层属性', icon: '⚙️', action: () => this.showLayerProperties(layerId, isSystem) });
            menuItems.push({ text: '---', divider: true });
            menuItems.push({ text: '移除图层', icon: '🗑️', action: () => this.removeLayer(layerId) });
        } else {
            // 系统图层菜单
            menuItems.push({ text: '图层属性', icon: '⚙️', action: () => this.showLayerProperties(layerId, isSystem) });
        }
        
        menuItems.forEach(item => {
            if (item.divider) {
                const divider = document.createElement('div');
                divider.style.cssText = `
                    height: 1px;
                    background: #e0e0e0;
                    margin: 5px 0;
                `;
                menu.appendChild(divider);
                return;
            }
            
            const menuItem = document.createElement('div');
            menuItem.innerHTML = `
                <span style="margin-right: 8px;">${item.icon || ''}</span>
                <span>${item.text}</span>
            `;
            menuItem.style.cssText = `
                padding: 8px 15px;
                cursor: pointer;
                font-size: 13px;
                display: flex;
                align-items: center;
            `;
            menuItem.addEventListener('mouseover', () => {
                menuItem.style.background = '#f0f0f0';
            });
            menuItem.addEventListener('mouseout', () => {
                menuItem.style.background = 'white';
            });
            menuItem.addEventListener('click', () => {
                item.action();
                menu.remove();
            });
            menu.appendChild(menuItem);
        });
        
        document.body.appendChild(menu);
        
        // 调整菜单位置避免超出屏幕
        const rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            menu.style.left = (x - rect.width) + 'px';
        }
        if (rect.bottom > window.innerHeight) {
            menu.style.top = (y - rect.height) + 'px';
        }
        
        // Remove menu when clicking elsewhere
        setTimeout(() => {
            document.addEventListener('click', () => menu.remove(), { once: true });
        }, 100);
    }
    
    moveLayerUp(layerId) {
        const index = this.layerOrder.findIndex(item => item.id === layerId);
        
        if (index > 0) {
            // 交换位置
            [this.layerOrder[index], this.layerOrder[index - 1]] = 
            [this.layerOrder[index - 1], this.layerOrder[index]];
            this.renderLayerList();
            this.updateMapLayerOrder();
        }
    }
    
    moveLayerDown(layerId) {
        const index = this.layerOrder.findIndex(item => item.id === layerId);
        
        if (index < this.layerOrder.length - 1 && index !== -1) {
            // 交换位置
            [this.layerOrder[index], this.layerOrder[index + 1]] = 
            [this.layerOrder[index + 1], this.layerOrder[index]];
            this.renderLayerList();
            this.updateMapLayerOrder();
        }
    }
    
    toggleSystemLayerVisibility(layerId, visible) {
        if (!window.app.mapManager) return;
        
        const mapManager = window.app.mapManager;
        
        if (layerId === 'current-annotation') {
            if (visible && mapManager.currentAnnotationLayer) {
                mapManager.currentAnnotationLayer.addTo(mapManager.map);
            } else if (!visible && mapManager.currentAnnotationLayer) {
                mapManager.map.removeLayer(mapManager.currentAnnotationLayer);
            }
        } else if (layerId === 'current-basemap') {
            if (visible && mapManager.currentBaseLayer) {
                mapManager.currentBaseLayer.addTo(mapManager.map);
            } else if (!visible && mapManager.currentBaseLayer) {
                mapManager.map.removeLayer(mapManager.currentBaseLayer);
            }
        }
        
        // 更新系统图层状态
        const systemLayer = this.systemLayers.find(l => l.id === layerId);
        if (systemLayer) {
            systemLayer.visible = visible;
        }
    }
    
    showLayerProperties(layerId, isSystem) {
        let layer, layerData;
        
        if (isSystem) {
            layer = this.systemLayers.find(l => l.id === layerId);
            layerData = {
                name: layer.name,
                type: layer.type,
                crs: layer.crs,
                extent: layer.extent,
                visible: layer.visible,
                source: layer.type === 'basemap' ? '天地图/Google' : '天地图',
                description: layer.type === 'basemap' ? '地理底图服务' : '文字注记服务'
            };
        } else {
            layer = this.layers.get(layerId);
            if (!layer) return;
            
            layerData = {
                name: layer.name,
                type: layer.type,
                crs: layer.info?.crs || 'EPSG:4326',
                extent: layer.info?.extent || '未知',
                visible: layer.visible,
                source: layer.path || '用户导入',
                featureCount: layer.info?.feature_count || 0,
                fields: layer.info?.fields || [],
                description: `用户导入的${layer.type}图层`
            };
        }
        
        this.showLayerPropertiesDialog(layerData);
    }
    
    showLayerPropertiesDialog(layerData) {
        // Remove existing dialog
        const existingDialog = document.querySelector('.layer-properties-dialog');
        if (existingDialog) {
            existingDialog.remove();
        }
        
        const dialog = document.createElement('div');
        dialog.className = 'layer-properties-dialog';
        dialog.innerHTML = `
            <div class="dialog-overlay"></div>
            <div class="dialog-content">
                <div class="dialog-header">
                    <h3>图层属性</h3>
                    <button class="dialog-close">×</button>
                </div>
                <div class="dialog-body">
                    <div class="property-group">
                        <h4>基本信息</h4>
                        <div class="property-item">
                            <label>名称:</label>
                            <span>${layerData.name}</span>
                        </div>
                        <div class="property-item">
                            <label>类型:</label>
                            <span>${layerData.type}</span>
                        </div>
                        <div class="property-item">
                            <label>状态:</label>
                            <span>${layerData.visible ? '可见' : '隐藏'}</span>
                        </div>
                        <div class="property-item">
                            <label>数据源:</label>
                            <span>${layerData.source}</span>
                        </div>
                    </div>
                    
                    <div class="property-group">
                        <h4>空间信息</h4>
                        <div class="property-item">
                            <label>坐标系:</label>
                            <span>${layerData.crs}</span>
                        </div>
                        <div class="property-item">
                            <label>范围:</label>
                            <span>${layerData.extent}</span>
                        </div>
                        ${layerData.featureCount !== undefined ? `
                        <div class="property-item">
                            <label>要素数量:</label>
                            <span>${layerData.featureCount}</span>
                        </div>
                        ` : ''}
                    </div>
                    
                    ${layerData.fields && layerData.fields.length > 0 ? `
                    <div class="property-group">
                        <h4>属性字段</h4>
                        <div class="fields-list">
                            ${layerData.fields.map(field => `
                                <div class="field-item">
                                    <span class="field-name">${field.name}</span>
                                    <span class="field-type">${field.type}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                    
                    <div class="property-group">
                        <h4>描述</h4>
                        <p>${layerData.description}</p>
                    </div>
                </div>
                <div class="dialog-footer">
                    <button class="btn-primary dialog-ok">确定</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Add event listeners
        dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.remove());
        dialog.querySelector('.dialog-ok').addEventListener('click', () => dialog.remove());
        dialog.querySelector('.dialog-overlay').addEventListener('click', () => dialog.remove());
    }
    
    zoomToLayer(layerId) {
        const layer = this.layers.get(layerId);
        if (layer && layer.layer) {
            if (layer.layer.getBounds) {
                window.app.mapManager.map.fitBounds(layer.layer.getBounds());
            } else if (layer.layer.getLatLng) {
                window.app.mapManager.map.setView(layer.layer.getLatLng(), 15);
            }
        }
    }
    
    async showAttributeTable(layerId) {
        const layer = this.layers.get(layerId);
        if (layer && layer.path) {
            const panel = document.getElementById('attribute-panel');
            panel.style.display = 'flex';
            
            // Load attributes if needed
            if (window.app.attributeViewer) {
                await window.app.attributeViewer.loadAttributesForLayer(layer.path, layer.info.fields);
            }
        }
    }
}
