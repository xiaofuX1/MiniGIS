# MiniGIS 发布流程文档

本文档详细说明 MiniGIS 项目的完整发布流程。

---

## 📋 发布前检查清单

### 1. 代码准备
- [ ] 所有功能已开发完成并测试通过
- [ ] 代码已提交到 Git
- [ ] 开发模式测试正常
- [ ] 生产构建测试正常

### 2. 文档更新
- [ ] UNRELEASED.md 记录了所有变更
- [ ] 功能文档已更新
- [ ] README.md 的功能列表已更新

---

## 🚀 发布步骤

### 步骤 1: 更新版本号

更新以下文件中的版本号（例如从 0.4.0 → 0.5.0）：

1. **package.json**
   ```json
   {
     "version": "0.5.0"
   }
   ```

2. **Cargo.toml**
   ```toml
   [workspace.package]
   version = "0.5.0"
   ```

3. **src-tauri/tauri.conf.json**
   ```json
   {
     "version": "0.5.0"
   }
   ```

4. **README.md**
   ```markdown
   ![Version](https://img.shields.io/badge/version-0.5.0-blue.svg)
   
   ## ✨ 最新更新 (v0.5.0)
   ```

### 步骤 2: 整理变更日志

1. 将 `UNRELEASED.md` 的内容整理到 `CHANGELOG.md`

```markdown
## [0.5.0] - 2025-10-24

### ✨ 新增功能
...

### 🐛 Bug 修复
...
```

2. 在 CHANGELOG.md 末尾添加版本链接

```markdown
[0.5.0]: https://github.com/xiaofuX1/MiniGIS/releases/tag/v0.5.0
```

3. 重置 `UNRELEASED.md` 为下一版本模板

```markdown
**当前版本**: v0.5.0  
**下一版本**: v0.6.0 (计划中)  
**最后更新**: 2025-10-24

## 🚀 新增功能 (Features)

> 暂无
```

### 步骤 3: 创建发布说明文档

在 `docs/releases/` 目录创建 `RELEASE_NOTES_vX.X.X.md`：

```markdown
# MiniGIS vX.X.X 发布说明

**发布日期**: 2025-XX-XX  
**版本类型**: Minor Release

## 📖 版本概述
...

## ✨ 新增功能
...

## 🐛 Bug 修复
...

## 🔧 改进与优化
...
```

### 步骤 4: 提交版本更新

```bash
git add -A
git commit -m "chore: release vX.X.X"
git push origin main
```

### 步骤 5: 构建 MSI 安装包

```bash
npm run tauri:build
```

构建完成后，MSI 文件位于：
```
target\release\bundle\msi\MiniGIS_X.X.X_x64_zh-CN.msi
```

### 步骤 6: 准备 GitHub Release 说明

创建 `release_notes.md` 文件（**重要：必须使用 UTF-8 编码**）：

```markdown
# MiniGIS vX.X.X 🎉

## 重大更新

vX.X.X 是一个重要的...版本。

### ✨ 新增功能

- ✅ **功能1** - 描述
- ✅ **功能2** - 描述

### 🐛 Bug 修复

- 修复问题1
- 修复问题2

### 📦 下载

**Windows MSI 安装包**

**SHA256校验和**: [将在发布脚本中自动计算]

### 🔧 系统要求

- Windows 10/11 x64
- 无需预装 GDAL 环境
- 自动配置所有依赖

### 📖 完整说明

详见仓库中的 [RELEASE_NOTES_vX.X.X.md](./docs/releases/RELEASE_NOTES_vX.X.X.md)

### 🎯 快速开始

1. 下载并安装MSI文件
2. 启动MiniGIS
3. 体验新功能

---

**完整变更日志**: [CHANGELOG.md](./CHANGELOG.md)
```

### 步骤 7: 创建 GitHub Release

**方式1: 使用批处理脚本（推荐）**

```bash
.\scripts\release.bat X.X.X
```

**方式2: 手动执行命令**

```bash
# 设置编码为 UTF-8
chcp 65001

# 创建 Release
gh release create vX.X.X ^
    --title "MiniGIS vX.X.X" ^
    --notes-file release_notes.md ^
    --latest ^
    target\release\bundle\msi\MiniGIS_X.X.X_x64_zh-CN.msi
```

### 步骤 8: 验证发布

1. 访问 https://github.com/xiaofuX1/MiniGIS/releases
2. 检查版本号、标题、说明是否正确
3. 检查中文是否正常显示（在网页中，不是终端）
4. 检查 MSI 文件是否已上传
5. 测试下载链接

### 步骤 9: 清理临时文件

```bash
git rm release_notes.md create_release.bat
git commit -m "chore: 清理发布临时文件"
git push origin main
```

---

## ⚠️ 重要注意事项

### 编码问题

**问题**: PowerShell 在处理中文时会出现编码问题，导致 GitHub Release 说明乱码。

**解决方案**: 
1. ✅ **使用批处理文件 (.bat)** - 设置 `chcp 65001` 切换到 UTF-8
2. ✅ **release_notes.md 必须使用 UTF-8 编码保存**
3. ❌ **不要使用 PowerShell 脚本** (.ps1) 处理中文内容

### CSP 问题

如果生产构建出现样式问题，检查 `src-tauri/tauri.conf.json`：

```json
{
  "security": {
    "csp": null  // 禁用 CSP 或设置为宽松策略
  }
}
```

### Git Tag

GitHub Release 会自动创建 Git tag，无需手动创建。

如需删除 Release 和 Tag：
```bash
gh release delete vX.X.X --yes
git push origin :refs/tags/vX.X.X
```

---

## 📝 发布后任务

1. [ ] 在 GitHub Discussions 发布公告
2. [ ] 更新项目主页
3. [ ] 通知用户群
4. [ ] 收集用户反馈
5. [ ] 规划下一版本

---

## 🔧 故障排查

### MSI 文件未找到
```
Error: MSI file not found
```
**解决**: 先运行 `npm run tauri:build` 构建项目

### GitHub CLI 未认证
```
Error: gh not authenticated
```
**解决**: 运行 `gh auth login` 登录 GitHub

### Release 中文乱码
**解决**: 
1. 确保使用批处理脚本而非 PowerShell
2. 确保 release_notes.md 是 UTF-8 编码
3. 在浏览器中查看（终端显示可能乱码，但网页正常）

### 版本已存在
```
Error: release already exists
```
**解决**: 
```bash
gh release delete vX.X.X --yes
git push origin :refs/tags/vX.X.X
```

---

## 📚 相关文档

- [CHANGELOG.md](../CHANGELOG.md) - 完整变更日志
- [UNRELEASED.md](../UNRELEASED.md) - 未发布的变更
- [CONTRIBUTING.md](../CONTRIBUTING.md) - 贡献指南
- [docs/releases/](../docs/releases/) - 历史版本发布说明

---

## 🤝 反馈与改进

如果发现发布流程有任何问题或改进建议，请：
- 提交 Issue
- 更新本文档
- 分享经验

---

**最后更新**: 2025-10-24  
**文档版本**: 1.0
