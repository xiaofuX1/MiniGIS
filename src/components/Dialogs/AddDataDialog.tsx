import React, { useState, useEffect } from 'react';
import { Modal, Tree, Button, message, Spin, Empty } from 'antd';
import { FolderOutlined, FileOutlined, DatabaseOutlined, FolderOpenOutlined, HomeOutlined, DesktopOutlined, FileTextOutlined, HddOutlined, LaptopOutlined, LeftOutlined, RightOutlined, UpOutlined, LinkOutlined } from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
import { homeDir, desktopDir, documentDir, downloadDir } from '@tauri-apps/api/path';
import './AddDataDialog.css';

interface AddDataDialogProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (files: FileItem[]) => void;
}

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'gdb' | 'gdb-dataset' | 'gdb-layer';
  extension?: string;
  size?: number;
  parentGdbPath?: string;  // GDB路径
  layerIndex?: number;     // 图层索引
  geometryType?: string;   // 几何类型
  featureCount?: number;   // 要素数量
  isSymlink?: boolean;     // 是否是快捷方式
  targetPath?: string;     // 快捷方式目标
}

interface TreeNode {
  key: string;
  title: string;
  icon?: React.ReactNode;
  children?: TreeNode[];
  isLeaf?: boolean;
  path: string;
}

const AddDataDialog: React.FC<AddDataDialogProps> = ({ visible, onClose, onAdd }) => {
  const [fileList, setFileList] = useState<FileItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [searchText, setSearchText] = useState<string>('');
  const [isInGdb, setIsInGdb] = useState<boolean>(false);
  const [currentGdbPath, setCurrentGdbPath] = useState<string>('');
  const [expandedKeys, setExpandedKeys] = useState<string[]>(['quick-access']);
  const [pathInput, setPathInput] = useState<string>('');
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('all');
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number>(-1);

  // 支持的矢量文件扩展名
  const supportedExtensions = new Set([
    'shp', 'gpkg', 'geojson', 'json', 'kml', 'kmz', 'tab', 'gml', 'gdb'
  ]);

  // 初始化快速访问目录
  useEffect(() => {
    if (visible) {
      console.log('[添加数据] 对话框打开，开始初始化...');
      initQuickAccess();
      
      // 恢复上次打开的位置（仅在当前会话中）
      const lastPath = sessionStorage.getItem('lastOpenPath');
      if (lastPath) {
        console.log('[添加数据] 恢复上次位置:', lastPath);
        if (lastPath.includes('::')) {
          // GDB路径
          const parts = lastPath.split('::');
          if (parts.length === 2) {
            enterGdb(parts[0]);
          } else if (parts.length === 3) {
            setCurrentGdbPath(parts[0]);
            filterByDataset(parts[1]);
          }
        } else if (lastPath.toLowerCase().endsWith('.gdb')) {
          enterGdb(lastPath);
        } else {
          loadDirectory(lastPath);
          setCurrentPath(lastPath);
        }
      }
    }
  }, [visible]);

  const initQuickAccess = async () => {
    try {
      const home = await homeDir();
      const desktop = await desktopDir();
      const documents = await documentDir();
      const downloads = await downloadDir();

      // 检测可用的驱动器（Windows）
      const drives: TreeNode[] = [];
      const driveLetters = ['C:', 'D:', 'E:', 'F:', 'G:', 'H:', 'I:', 'J:', 'K:'];
      
      console.log('[添加数据] 开始检测驱动器...');
      
      for (const drive of driveLetters) {
        try {
          const drivePath = drive + '\\';
          await invoke('read_directory_unrestricted', { path: drivePath });
          console.log(`[添加数据] 检测到驱动器: ${drive}`);
          drives.push({
            key: `drive-${drive}`,
            title: `本地磁盘 (${drive})`,
            icon: <HddOutlined />,
            path: drivePath,
            isLeaf: false,
          });
        } catch (error) {
          console.log(`[添加数据] 驱动器 ${drive} 不可访问:`, error);
        }
      }
      
      console.log(`[添加数据] 共检测到 ${drives.length} 个驱动器`);

      const quickAccessTree: TreeNode[] = [
        {
          key: 'quick-access',
          title: '快速访问',
          icon: <FolderOpenOutlined />,
          children: [
            {
              key: `desktop-${desktop}`,
              title: '桌面',
              icon: <DesktopOutlined />,
              path: desktop,
              isLeaf: false,
            },
            {
              key: `documents-${documents}`,
              title: '文档',
              icon: <FileTextOutlined />,
              path: documents,
              isLeaf: false,
            },
            {
              key: `downloads-${downloads}`,
              title: '下载',
              icon: <FolderOutlined />,
              path: downloads,
              isLeaf: false,
            },
            {
              key: `home-${home}`,
              title: '主目录',
              icon: <HomeOutlined />,
              path: home,
              isLeaf: false,
            },
          ],
          path: '',
        },
        {
          key: 'this-pc',
          title: '此电脑',
          icon: <LaptopOutlined />,
          children: drives.length > 0 ? drives : [{
            key: 'no-drives',
            title: '未检测到可用驱动器',
            icon: <FolderOutlined />,
            path: '',
            isLeaf: true,
          }],
          path: '',
        },
      ];

      console.log('[添加数据] 树结构:', quickAccessTree);
      
      setTreeData(quickAccessTree);
      setExpandedKeys(['quick-access', 'this-pc']); // 默认展开两个节点
      
      // 默认打开桌面
      if (desktop) {
        setCurrentPath(desktop);
        loadDirectory(desktop);
      }
    } catch (error) {
      console.error('初始化快速访问失败:', error);
    }
  };

  // 加载目录内容
  const loadDirectory = async (path: string) => {
    setLoading(true);
    try {
      const entries: any[] = await invoke('read_directory_unrestricted', { path });
      
      const files: FileItem[] = entries.map((entry: any) => {
        const isGDB = entry.name.toLowerCase().endsWith('.gdb') && entry.is_directory;
        const extension = entry.is_file ? entry.name.split('.').pop()?.toLowerCase() : undefined;
        
        return {
          name: entry.name,
          path: entry.path,
          type: isGDB ? 'gdb' : (entry.is_directory ? 'directory' : 'file'),
          extension,
          isSymlink: entry.is_symlink || false,
          targetPath: entry.target_path,
        };
      });

      // 过滤并排序
      const sortedFiles = files.filter(file => {
        if (file.type === 'directory' || file.type === 'gdb') return true;
        if (file.type === 'file' && file.extension) {
          return supportedExtensions.has(file.extension);
        }
        return false;
      }).sort((a, b) => {
        if (a.type !== 'file' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type !== 'file') return 1;
        return a.name.localeCompare(b.name, 'zh-CN');
      });

      setFileList(sortedFiles);
      setCurrentPath(path);
    } catch (error) {
      console.error('加载目录失败:', error);
      const errorMsg = (error as any)?.message || String(error);
      
      // 如果是权限错误，给出更友好的提示
      if (errorMsg.includes('forbidden') || errorMsg.includes('permission')) {
        message.error({
          content: (
            <div>
              <div>此目录无法访问</div>
              <div style={{ fontSize: 12, marginTop: 4, color: '#999' }}>
                提示：如果需要访问系统保护目录，请重启应用并授予权限
              </div>
            </div>
          ),
          duration: 5,
        });
      } else {
        message.error('加载目录失败：' + errorMsg);
      }
      
      // 清空文件列表
      setFileList([]);
    } finally {
      setLoading(false);
    }
  };

  // 处理目录树节点点击
  const handleTreeSelect = (selectedKeys: React.Key[], info: any) => {
    if (selectedKeys.length > 0 && info.node.path) {
      loadDirectory(info.node.path);
    }
  };

  // 处理文件双击 - 进入目录或GDB
  const handleFileDoubleClick = async (file: FileItem) => {
    // 如果是快捷方式，尝试解析并跳转
    if (file.isSymlink && file.type === 'directory') {
      // 快捷方式指向的目录，直接导航
      navigateToPath(file.path);
      return;
    }
    
    if (file.type === 'directory') {
      navigateToPath(file.path);
    } else if (file.type === 'gdb') {
      // 进入GDB
      await enterGdb(file.path);
    } else if (file.type === 'gdb-dataset') {
      // 进入要素集（只显示该要素集的图层）
      filterByDataset(file.name);
    }
  };

  // 进入GDB
  const enterGdb = async (gdbPath: string) => {
    try {
      message.loading('正在读取GDB结构...', 0);
      const multiLayerInfo: any = await invoke('gdal_open_multi_layer_vector', { path: gdbPath });
      message.destroy();

      // 按要素集分组
      const featureDatasets = new Map<string, any[]>();
      const standaloneFeatureLayers: any[] = [];
      
      multiLayerInfo.layers.forEach((layerInfo: any) => {
        if (layerInfo.feature_dataset) {
          if (!featureDatasets.has(layerInfo.feature_dataset)) {
            featureDatasets.set(layerInfo.feature_dataset, []);
          }
          featureDatasets.get(layerInfo.feature_dataset)!.push(layerInfo);
        } else {
          standaloneFeatureLayers.push(layerInfo);
        }
      });

      // 构建文件列表
      const items: FileItem[] = [];
      
      // 添加要素集
      featureDatasets.forEach((layers, datasetName) => {
        items.push({
          name: datasetName,
          path: `${gdbPath}::${datasetName}`,
          type: 'gdb-dataset' as const,
          parentGdbPath: gdbPath,
        });
      });

      // 添加独立图层
      standaloneFeatureLayers.forEach((layerInfo: any) => {
        items.push({
          name: layerInfo.name,
          path: `${gdbPath}::${layerInfo.name}`,
          type: 'gdb-layer' as const,
          parentGdbPath: gdbPath,
          layerIndex: layerInfo.index,
          geometryType: layerInfo.geometry_type,
          featureCount: layerInfo.feature_count,
        });
      });

      setFileList(items);
      setIsInGdb(true);
      setCurrentGdbPath(gdbPath);
      setCurrentPath(gdbPath);
      addToHistory(gdbPath);
      // 保存到会话存储
      sessionStorage.setItem('lastOpenPath', gdbPath);

    } catch (error) {
      message.destroy();
      console.error('读取GDB失败:', error);
      message.error('读取GDB结构失败');
    }
  };

  // 过滤显示要素集的图层
  const filterByDataset = async (datasetName: string) => {
    try {
      message.loading('正在加载要素集...', 0);
      const multiLayerInfo: any = await invoke('gdal_open_multi_layer_vector', { path: currentGdbPath });
      message.destroy();

      const datasetLayers = multiLayerInfo.layers.filter(
        (l: any) => l.feature_dataset === datasetName
      );

      const items: FileItem[] = datasetLayers.map((layerInfo: any) => ({
        name: layerInfo.name,
        path: `${currentGdbPath}::${datasetName}::${layerInfo.name}`,
        type: 'gdb-layer' as const,
        parentGdbPath: currentGdbPath,
        layerIndex: layerInfo.index,
        geometryType: layerInfo.geometry_type,
        featureCount: layerInfo.feature_count,
      }));

      setFileList(items);
      const newPath = `${currentGdbPath}::${datasetName}`;
      setCurrentPath(newPath);
      addToHistory(newPath);
      // 保存到会话存储
      sessionStorage.setItem('lastOpenPath', newPath);
    } catch (error) {
      message.destroy();
      console.error('加载要素集失败:', error);
      message.error('加载要素集失败');
    }
  };

  // 切换文件选中状态
  const toggleFileSelection = (path: string, ctrlKey: boolean = false, shiftKey: boolean = false, currentIndex: number = -1) => {
    if (shiftKey && lastSelectedIndex !== -1 && currentIndex !== -1) {
      // Shift+点击：范围选择
      const start = Math.min(lastSelectedIndex, currentIndex);
      const end = Math.max(lastSelectedIndex, currentIndex);
      const newSelected = new Set(selectedFiles);
      
      const selectableFiles = filteredFileList.filter(f => f.type === 'gdb-layer' || f.type === 'file');
      for (let i = start; i <= end && i < selectableFiles.length; i++) {
        newSelected.add(selectableFiles[i].path);
      }
      setSelectedFiles(newSelected);
      setLastSelectedIndex(currentIndex);
    } else if (ctrlKey) {
      // Ctrl+点击：多选模式，切换选中状态
      const newSelected = new Set(selectedFiles);
      if (newSelected.has(path)) {
        newSelected.delete(path);
      } else {
        newSelected.add(path);
      }
      setSelectedFiles(newSelected);
      setLastSelectedIndex(currentIndex);
    } else {
      // 普通点击：单选模式，只选中当前项
      setSelectedFiles(new Set([path]));
      setLastSelectedIndex(currentIndex);
    }
  };

  // 返回上级目录
  const handleGoUp = () => {
    if (!currentPath) return;
    
    const parts = currentPath.split(/[\\/]/);
    parts.pop();
    const parentPath = parts.join('\\');
    
    if (parentPath) {
      loadDirectory(parentPath);
    }
  };

  // 导航到路径
  const navigateToPath = (path: string) => {
    loadDirectory(path);
    setCurrentPath(path);
    setIsInGdb(false);
    setCurrentGdbPath('');
    addToHistory(path);
    // 保存到会话存储
    sessionStorage.setItem('lastOpenPath', path);
  };

  // 添加到历史
  const addToHistory = (path: string) => {
    const newHistory = navigationHistory.slice(0, historyIndex + 1);
    newHistory.push(path);
    setNavigationHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // 后退
  const goBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const path = navigationHistory[newIndex];
      setHistoryIndex(newIndex);
      loadPathFromHistory(path);
    }
  };

  // 前进
  const goForward = () => {
    if (historyIndex < navigationHistory.length - 1) {
      const newIndex = historyIndex + 1;
      const path = navigationHistory[newIndex];
      setHistoryIndex(newIndex);
      loadPathFromHistory(path);
    }
  };

  // 从历史加载路径
  const loadPathFromHistory = (path: string) => {
    if (path.includes('::')) {
      // GDB路径
      const parts = path.split('::');
      if (parts.length === 2) {
        enterGdb(parts[0]);
      } else if (parts.length === 3) {
        setCurrentGdbPath(parts[0]);
        filterByDataset(parts[1]);
      }
    } else {
      // 普通路径
      loadDirectory(path);
      setCurrentPath(path);
      setIsInGdb(false);
    }
  };

  // 向上一级
  const goUp = () => {
    if (isInGdb) {
      // 如果在GDB内部，退出到父目录
      const parentDir = currentGdbPath.substring(0, currentGdbPath.lastIndexOf('\\'));
      navigateToPath(parentDir);
    } else if (currentPath) {
      const parentDir = currentPath.substring(0, currentPath.lastIndexOf('\\'));
      if (parentDir) {
        navigateToPath(parentDir);
      }
    }
  };

  // 确认添加
  const handleConfirm = () => {
    if (selectedFiles.size === 0) {
      message.warning('请至少选择一个数据源');
      return;
    }

    const selectedItems = fileList.filter(file => selectedFiles.has(file.path));
    onAdd(selectedItems);
    handleClose();
  };

  // 关闭对话框
  const handleClose = () => {
    setSelectedFiles(new Set());
    setFileList([]);
    onClose();
  };

  // 获取文件图标
  const getFileIcon = (file: FileItem) => {
    if (file.type === 'directory') return <FolderOutlined style={{ color: '#faad14' }} />;
    if (file.type === 'gdb') return <DatabaseOutlined style={{ color: '#1890ff' }} />;
    if (file.type === 'gdb-dataset') return <FolderOpenOutlined style={{ color: '#52c41a' }} />;
    if (file.type === 'gdb-layer') return <FileTextOutlined style={{ color: '#722ed1' }} />;
    
    switch (file.extension) {
      case 'shp': return <FileTextOutlined style={{ color: '#1890ff' }} />;
      case 'gpkg': return <DatabaseOutlined style={{ color: '#13c2c2' }} />;
      case 'geojson':
      case 'json': return <FileTextOutlined style={{ color: '#52c41a' }} />;
      case 'kml':
      case 'kmz': return <FileTextOutlined style={{ color: '#fa8c16' }} />;
      default: return <FileOutlined />;
    }
  };

  // 获取文件类型描述
  const getFileTypeLabel = (file: FileItem) => {
    let typeLabel = '';
    
    if (file.type === 'directory') typeLabel = '文件夹';
    else if (file.type === 'gdb') typeLabel = 'GDB数据库';
    else if (file.type === 'gdb-dataset') typeLabel = '要素集';
    else if (file.type === 'gdb-layer') typeLabel = 'GDB图层';
    else {
      switch (file.extension) {
        case 'shp': typeLabel = 'Shapefile'; break;
        case 'gpkg': typeLabel = 'GeoPackage'; break;
        case 'geojson': typeLabel = 'GeoJSON'; break;
        case 'json': typeLabel = 'JSON'; break;
        case 'kml': typeLabel = 'KML'; break;
        case 'kmz': typeLabel = 'KMZ'; break;
        case 'tab': typeLabel = 'MapInfo TAB'; break;
        case 'gml': typeLabel = 'GML'; break;
        default: typeLabel = file.extension?.toUpperCase() || '文件';
      }
    }
    
    // 如果是快捷方式，添加标记
    return file.isSymlink ? `${typeLabel} (快捷方式)` : typeLabel;
  };

  // 获取几何类型显示文本
  const getGeometryTypeText = (geometryType?: string) => {
    if (!geometryType) return '';
    const typeMap: Record<string, string> = {
      'Point': '点',
      'LineString': '线',
      'Polygon': '面',
      'MultiPoint': '多点',
      'MultiLineString': '多线',
      'MultiPolygon': '多面',
    };
    return typeMap[geometryType] || geometryType;
  };

  // 过滤文件列表（搜索 + 文件类型筛选）
  const filteredFileList = fileList.filter(file => {
    // 搜索筛选
    if (searchText && !file.name.toLowerCase().includes(searchText.toLowerCase())) {
      return false;
    }
    
    // 文件类型筛选
    if (fileTypeFilter !== 'all') {
      if (fileTypeFilter === 'gdb' && file.type !== 'gdb' && file.type !== 'gdb-layer' && file.type !== 'gdb-dataset') {
        return false;
      }
      if (fileTypeFilter === 'shp' && file.extension !== 'shp') {
        return false;
      }
      if (fileTypeFilter === 'gpkg' && file.extension !== 'gpkg') {
        return false;
      }
      if (fileTypeFilter === 'geojson' && file.extension !== 'geojson' && file.extension !== 'json') {
        return false;
      }
      if (fileTypeFilter === 'kml' && file.extension !== 'kml' && file.extension !== 'kmz') {
        return false;
      }
      if (fileTypeFilter === 'folder' && file.type !== 'directory') {
        return false;
      }
    }
    
    return true;
  });

  // 处理路径输入跳转
  const handlePathInputSubmit = async () => {
    if (!pathInput.trim()) return;
    
    const path = pathInput.trim();
    
    try {
      // 检查是否是GDB
      if (path.toLowerCase().endsWith('.gdb')) {
        await enterGdb(path);
      } else {
        // 普通目录
        await navigateToPath(path);
      }
      setPathInput('');
    } catch (error) {
      message.error('无法访问该路径');
    }
  };

  // 渲染面包屑
  const renderBreadcrumb = () => {
    if (!currentPath) return <span style={{ flex: 1, color: '#999', fontSize: 12 }}>请选择位置</span>;
    
    let parts: string[] = [];
    let displayPath = currentPath;
    
    if (currentPath.includes('::')) {
      // GDB路径
      const gdbParts = currentPath.split('::');
      const gdbName = gdbParts[0].split('\\').pop();
      parts = [gdbName || 'GDB'];
      if (gdbParts.length > 1) {
        parts.push(...gdbParts.slice(1));
      }
    } else {
      // 普通路径
      parts = currentPath.split('\\').filter(p => p);
    }
    
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span style={{ color: '#999' }}> &gt; </span>}
            <span style={{ color: '#1890ff', cursor: 'pointer' }} onClick={() => {
              if (currentPath.includes('::')) {
                const gdbParts = currentPath.split('::');
                if (index === 0) {
                  navigateToPath(gdbParts[0].substring(0, gdbParts[0].lastIndexOf('\\')));
                } else if (index === 1) {
                  enterGdb(gdbParts[0]);
                }
              } else {
                const targetPath = parts.slice(0, index + 1).join('\\');
                navigateToPath(targetPath);
              }
            }}>
              {part}
            </span>
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <Modal
      title="添加数据"
      open={visible}
      onCancel={handleClose}
      width={900}
      height={600}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          取消
        </Button>,
        <Button key="add" type="primary" onClick={handleConfirm} disabled={selectedFiles.size === 0}>
          添加 ({selectedFiles.size})
        </Button>,
      ]}
      className="add-data-dialog"
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* 导航栏：按钮 + 路径 + 搜索 */}
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button
            icon={<LeftOutlined />}
            size="small"
            disabled={historyIndex <= 0}
            onClick={goBack}
            title="后退"
          />
          <Button
            icon={<RightOutlined />}
            size="small"
            disabled={historyIndex >= navigationHistory.length - 1}
            onClick={goForward}
            title="前进"
          />
          <Button
            icon={<UpOutlined />}
            size="small"
            disabled={!currentPath}
            onClick={goUp}
            title="向上一级"
          />
          {renderBreadcrumb()}
          <input
            type="text"
            placeholder="搜索..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              width: 200,
              padding: '4px 12px',
              border: '1px solid #d9d9d9',
              borderRadius: '2px',
              outline: 'none',
              fontSize: 12
            }}
          />
        </div>

        {/* 主内容区 */}
        <div className="add-data-container">
          {/* 目录树 */}
          <div className="add-data-sidebar">
            <div className="sidebar-title">位置</div>
            <Tree
              showIcon
              treeData={treeData}
              selectedKeys={[]}
              expandedKeys={expandedKeys}
              onExpand={(keys: React.Key[]) => setExpandedKeys(keys as string[])}
              onSelect={handleTreeSelect}
            />
          </div>

          {/* 右侧文件列表 */}
          <div className="add-data-content">

          {/* 文件列表 */}
          <div className="file-list">
            {loading ? (
              <div className="loading-container">
                <Spin tip="加载中..." />
              </div>
            ) : filteredFileList.length === 0 ? (
              <Empty description={searchText ? "未找到匹配的数据" : "此目录为空或不包含支持的数据格式"} />
            ) : (
              <table className="file-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafafa', borderBottom: '2px solid #f0f0f0' }}>
                    <th style={{ padding: '8px 16px', textAlign: 'left', fontWeight: 600 }}>名称</th>
                    <th style={{ padding: '8px 16px', textAlign: 'left', fontWeight: 600, width: '150px' }}>类型</th>
                    <th style={{ padding: '8px 16px', textAlign: 'left', fontWeight: 600, width: '100px' }}>几何类型</th>
                    <th style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 600, width: '100px' }}>要素数量</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFileList.map((file, index) => (
                    <tr
                      key={file.path}
                      className={selectedFiles.has(file.path) ? 'selected' : ''}
                      style={{
                        borderBottom: '1px solid #f0f0f0',
                        cursor: 'pointer',
                        background: selectedFiles.has(file.path) ? '#e6f7ff' : 'transparent'
                      }}
                      onClick={(e) => {
                        if (file.type === 'gdb-layer' || file.type === 'file') {
                          // 只对可选择的文件计算索引
                          const selectableFiles = filteredFileList.filter(f => f.type === 'gdb-layer' || f.type === 'file');
                          const selectableIndex = selectableFiles.findIndex(f => f.path === file.path);
                          toggleFileSelection(file.path, e.ctrlKey, e.shiftKey, selectableIndex);
                        }
                      }}
                      onDoubleClick={() => handleFileDoubleClick(file)}
                    >
                      <td style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ position: 'relative', display: 'inline-flex' }}>
                          {getFileIcon(file)}
                          {file.isSymlink && (
                            <LinkOutlined style={{ 
                              position: 'absolute', 
                              bottom: -2, 
                              right: -2, 
                              fontSize: 10, 
                              color: '#1890ff',
                              background: 'white',
                              borderRadius: '50%',
                              padding: 1
                            }} />
                          )}
                        </span>
                        <span>{file.name}</span>
                      </td>
                      <td style={{ padding: '8px 16px', color: '#666' }}>{getFileTypeLabel(file)}</td>
                      <td style={{ padding: '8px 16px', color: '#666' }}>{getGeometryTypeText(file.geometryType)}</td>
                      <td style={{ padding: '8px 16px', textAlign: 'right', color: '#666' }}>
                        {file.featureCount !== undefined ? file.featureCount.toLocaleString() : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* 底部工具栏 */}
          <div className="content-footer">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#666', fontWeight: 500 }}>名称:</span>
              <input
                type="text"
                value={pathInput}
                onChange={(e) => setPathInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePathInputSubmit()}
                placeholder="粘贴或输入路径..."
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '2px',
                  fontSize: 12,
                  outline: 'none'
                }}
              />
              <select
                value={fileTypeFilter}
                onChange={(e) => setFileTypeFilter(e.target.value)}
                style={{
                  padding: '4px 8px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '2px',
                  fontSize: 12,
                  outline: 'none',
                  minWidth: 120
                }}
              >
                <option value="all">所有类型</option>
                <option value="folder">文件夹</option>
                <option value="gdb">GDB数据库</option>
                <option value="shp">Shapefile</option>
                <option value="gpkg">GeoPackage</option>
                <option value="geojson">GeoJSON</option>
                <option value="kml">KML/KMZ</option>
              </select>
            </div>
          </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AddDataDialog;
