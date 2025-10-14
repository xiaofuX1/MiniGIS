# 启动画面实现说明

## 概述
MiniGIS 实现了类似 ArcGIS Pro 的启动画面功能，在应用启动时立即显示精美的启动界面，避免白屏等待。

## 技术实现

### 1. Tauri 窗口配置
在 `src-tauri/tauri.conf.json` 中配置了两个窗口：

- **splashscreen（启动窗口）**
  - 启动时立即显示
  - 无边框、透明背景
  - 置顶显示
  - 不显示在任务栏
  - 尺寸: 600x400

- **main（主窗口）**
  - 启动时隐藏
  - 等待初始化完成后显示
  - 标准应用窗口
  - 尺寸: 1600x900

### 2. 启动逻辑
在 `src-tauri/src/lib.rs` 中实现：

```rust
.setup(|app| {
    // 获取启动窗口和主窗口
    let splashscreen_window = app.get_webview_window("splashscreen").unwrap();
    let main_window = app.get_webview_window("main").unwrap();
    
    // 在另一个线程中处理启动逻辑
    std::thread::spawn(move || {
        // 初始化过程
        std::thread::sleep(std::time::Duration::from_millis(2000));
        
        // 显示主窗口并关闭启动窗口
        main_window.show().unwrap();
        splashscreen_window.close().unwrap();
    });
    
    Ok(())
})
```

### 3. 启动界面设计
`splash.html` 包含：

- 渐变背景
- Logo 和标题
- 进度条动画
- 步骤指示器
- 版本信息

启动步骤：
1. 初始化系统环境 (25%)
2. 加载配置文件 (50%)
3. 初始化 GDAL 引擎 (75%)
4. 准备用户界面 (100%)

## 效果特点

✅ **零白屏**：应用启动立即显示启动画面
✅ **流畅动画**：进度条和步骤指示器有平滑过渡
✅ **专业美观**：采用现代化设计，渐变配色
✅ **自动关闭**：初始化完成后自动切换到主界面

## 自定义配置

### 修改启动时长
在 `src-tauri/src/lib.rs` 中修改：

```rust
std::thread::sleep(std::time::Duration::from_millis(2000)); // 修改此值
```

### 修改启动界面样式
编辑 `splash.html` 文件，可以自定义：
- 颜色主题
- Logo 图标
- 步骤文本
- 动画效果

### 添加实际初始化逻辑
替换 `lib.rs` 中的 `std::thread::sleep` 为实际的初始化代码：

```rust
std::thread::spawn(move || {
    // 替换为实际初始化逻辑
    // 例如：加载配置、连接数据库、检查更新等
    
    main_window.show().unwrap();
    splashscreen_window.close().unwrap();
});
```

## 注意事项

1. **启动窗口路径**：`splash.html` 需要放在项目根目录
2. **透明背景**：启动窗口设置了 `transparent: true`，支持圆角和阴影
3. **线程安全**：使用独立线程处理初始化，不阻塞主线程
4. **错误处理**：实际项目中应添加更完善的错误处理机制
