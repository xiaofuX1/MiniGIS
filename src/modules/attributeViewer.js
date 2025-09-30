// Attribute Viewer Module
import { invoke } from '@tauri-apps/api/core';

export class AttributeViewer {
    constructor() {
        this.currentData = null;
        this.currentFields = null;
        this.propertiesContent = document.getElementById('properties-content');
        this.attributeTableHead = document.getElementById('attribute-table-head');
        this.attributeTableBody = document.getElementById('attribute-table-body');
    }
    
    setData(attributeData, fields) {
        this.currentData = attributeData;
        this.currentFields = fields;
        this.renderAttributeTable();
    }
    
    async loadAttributesForLayer(path, fields) {
        try {
            const attributes = await invoke('get_shapefile_attributes', { path });
            this.setData(attributes, fields);
        } catch (error) {
            console.error('Failed to load attributes:', error);
        }
    }
    
    renderAttributeTable() {
        if (!this.currentData || !this.currentFields) {
            return;
        }
        
        // Clear existing content
        this.attributeTableHead.innerHTML = '';
        this.attributeTableBody.innerHTML = '';
        
        // Create header
        const headerRow = document.createElement('tr');
        
        // Add ID column
        const idHeader = document.createElement('th');
        idHeader.textContent = 'ID';
        headerRow.appendChild(idHeader);
        
        // Add field columns
        this.currentFields.forEach(field => {
            const th = document.createElement('th');
            th.textContent = field.name;
            th.title = field.field_type;
            headerRow.appendChild(th);
        });
        
        this.attributeTableHead.appendChild(headerRow);
        
        // Create data rows
        if (this.currentData.features) {
            this.currentData.features.forEach((feature, index) => {
                const row = document.createElement('tr');
                row.dataset.featureId = feature.id;
                
                // Add ID cell
                const idCell = document.createElement('td');
                idCell.textContent = feature.id;
                row.appendChild(idCell);
                
                // Add property cells
                this.currentFields.forEach(field => {
                    const td = document.createElement('td');
                    td.textContent = feature.properties[field.name] || '';
                    row.appendChild(td);
                });
                
                // Add row click handler
                row.addEventListener('click', () => {
                    this.selectRow(row);
                    this.showFeatureProperties(feature.properties);
                });
                
                this.attributeTableBody.appendChild(row);
            });
        }
        
        // Show the attribute panel
        const panel = document.getElementById('attribute-panel');
        if (panel) {
            panel.style.display = 'flex';
        }
    }
    
    selectRow(row) {
        // Remove previous selection
        this.attributeTableBody.querySelectorAll('tr').forEach(tr => {
            tr.classList.remove('selected');
        });
        
        // Add selection to current row
        row.classList.add('selected');
    }
    
    showFeatureProperties(properties) {
        if (!properties) {
            this.propertiesContent.innerHTML = '<p class="empty-message">点击地图要素以查看详细属性</p>';
            return;
        }
        
        let html = '<div class="property-group">';
        html += '<div class="property-group-title">✓ 已选中要素</div>';
        html += '<div style="padding: 8px 12px; background: #e8f5e9; border-left: 3px solid #4caf50; margin-bottom: 12px; border-radius: 4px;">';
        html += '<small style="color: #2e7d32;">当前选中图斑的属性信息</small>';
        html += '</div>';
        
        for (const [key, value] of Object.entries(properties)) {
            // 跳过内部ID字段
            if (key.startsWith('_')) continue;
            
            html += `
                <div class="property-item">
                    <span class="property-label">${key}</span>
                    <span class="property-value">${value || '-'}</span>
                </div>
            `;
        }
        
        html += '</div>';
        this.propertiesContent.innerHTML = html;
        
        // 不再自动弹出底部属性表，只显示右侧属性面板
        // 右侧属性面板默认就是显示的，无需额外操作
    }
    
    clearProperties() {
        this.propertiesContent.innerHTML = '<p class="empty-message">点击地图要素以查看详细属性</p>';
    }
    
    showLayerInfo(layerInfo) {
        if (!layerInfo) {
            this.propertiesContent.innerHTML = '<p class="empty-message">选择图层以查看信息</p>';
            return;
        }
        
        let html = '<div class="property-group">';
        html += '<div class="property-group-title">图层信息</div>';
        
        html += `
            <div class="property-item">
                <span class="property-label">文件名:</span>
                <span class="property-value">${layerInfo.filename}</span>
            </div>
            <div class="property-item">
                <span class="property-label">几何类型:</span>
                <span class="property-value">${layerInfo.geometry_type}</span>
            </div>
            <div class="property-item">
                <span class="property-label">要素数量:</span>
                <span class="property-value">${layerInfo.feature_count}</span>
            </div>
        `;
        
        if (layerInfo.bounds && layerInfo.bounds.length === 4) {
            html += `
                <div class="property-item">
                    <span class="property-label">范围:</span>
                    <span class="property-value">
                        X: ${layerInfo.bounds[0].toFixed(6)} - ${layerInfo.bounds[2].toFixed(6)}<br>
                        Y: ${layerInfo.bounds[1].toFixed(6)} - ${layerInfo.bounds[3].toFixed(6)}
                    </span>
                </div>
            `;
        }
        
        html += '</div>';
        
        // Add fields info
        if (layerInfo.fields && layerInfo.fields.length > 0) {
            html += '<div class="property-group">';
            html += '<div class="property-group-title">字段信息</div>';
            
            layerInfo.fields.forEach(field => {
                html += `
                    <div class="property-item">
                        <span class="property-label">${field.name}:</span>
                        <span class="property-value">${field.field_type}</span>
                    </div>
                `;
            });
            
            html += '</div>';
        }
        
        this.propertiesContent.innerHTML = html;
    }
    
    clearProperties() {
        this.propertiesContent.innerHTML = '<p class="empty-message">选择要素以查看属性</p>';
    }
    
    clearAttributeTable() {
        this.attributeTableHead.innerHTML = '';
        this.attributeTableBody.innerHTML = '';
        this.currentData = null;
        this.currentFields = null;
    }
}
