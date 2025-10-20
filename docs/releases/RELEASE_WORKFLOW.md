# 发布工作流程 (Release Workflow)

本文档定义 MiniGIS 项目的标准发布流程，确保每次发布都经过充分测试和文档化。

---

## 📋 版本号规范

遵循 [语义化版本 2.0.0](https://semver.org/lang/zh-CN/)：

```
主版本号.次版本号.修订号 (MAJOR.MINOR.PATCH)
```

### 版本递增规则

- **MAJOR (主版本号)**: 不兼容的 API 修改
- **MINOR (次版本号)**: 向后兼容的功能性新增
- **PATCH (修订号)**: 向后兼容的问题修正

### 版本示例

- `v0.3.0` → `v0.4.0`: 新增功能（坐标系统、会话恢复等）
- `v0.3.0` → `v0.3.1`: Bug 修复（紧急修复、小问题）
- `v0.9.0` → `v1.0.0`: 第一个稳定版本

---

## 🔄 完整发布流程

### 阶段 1: 开发期间

#### 1.1 记录修改
每次提交代码时，立即更新 `UNRELEASED.md`：

```markdown
## 🚀 新增功能
- ✅ **功能名称** - 功能描述
  - 详细说明
  - 影响的文件
  - 相关文档

## 🐛 Bug 修复
- ✅ **问题描述** - 修复说明
```

#### 1.2 编写测试
为新功能和修复编写测试用例。

#### 1.3 更新文档
- 功能文档（如需要）
- 开发文档（如有 API 变更）
- 用户指南（如有 UI 变更）

---

### 阶段 2: 发布准备（发布前 1-2 天）

#### 2.1 版本号决策
根据 `UNRELEASED.md` 中的修改类型确定版本号：

```bash
# 查看未发布的修改
cat UNRELEASED.md

# 决定版本号
# - 只有 Bug 修复 → PATCH
# - 有新功能 → MINOR
# - 有破坏性变更 → MAJOR
```

#### 2.2 更新版本号

```bash
# 1. package.json
"version": "0.4.0"

# 2. src-tauri/Cargo.toml
[package]
version = "0.4.0"

# 3. src-tauri/tauri.conf.json
"version": "0.4.0"
```

#### 2.3 整理 CHANGELOG

将 `UNRELEASED.md` 内容移动到 `CHANGELOG.md`：

```markdown
## [0.4.0] - 2025-10-20

### ✨ 新增功能
（从 UNRELEASED.md 复制）

### 🐛 Bug 修复
（从 UNRELEASED.md 复制）

### 📖 文档更新
（从 UNRELEASED.md 复制）
```

然后清空 `UNRELEASED.md`，保留模板结构，更新版本信息。

#### 2.4 创建发布笔记

创建 `docs/releases/RELEASE_NOTES_v0.4.0.md`：

```markdown
# MiniGIS v0.4.0 发布说明

**发布日期**: 2025-10-20
**版本类型**: 次要版本更新

## 亮点功能
...

## 完整更新内容
...

## 下载
...

## 升级指南
...
```

#### 2.5 运行发布前检查

```bash
# 使用发布检查清单
# 复制 docs/releases/RELEASE_CHECKLIST.md 创建新版本检查清单
cp docs/releases/RELEASE_CHECKLIST.md docs/releases/RELEASE_CHECKLIST_v0.4.0.md

# 编辑并执行所有检查项
```

---

### 阶段 3: 构建测试（发布当天）

#### 3.1 清理构建环境

```bash
# 清理旧的构建产物
cargo clean
rm -rf target/
rm -rf dist/

# 确保依赖是最新的
npm install
cargo update
```

#### 3.2 开发版本测试

```bash
# 启动开发版本
npm run tauri:dev

# 测试所有功能（参考检查清单）
# - 文件打开/保存
# - 图层操作
# - 坐标系统
# - 测量工具
# - 符号设置
# - 属性表
# - 会话恢复
```

#### 3.3 构建生产版本

```bash
# 构建 MSI 安装包
npm run tauri:build

# 等待构建完成
# 输出位置: target/release/bundle/msi/
```

#### 3.4 安装包测试

在**全新的虚拟机或测试环境**中：

1. **安装测试**
   - 双击 MSI 安装包
   - 确认安装向导正常
   - 检查安装目录
   - 检查开始菜单快捷方式

2. **功能测试**
   - 启动应用
   - 测试所有核心功能
   - 检查日志输出
   - 验证 GDAL 环境

3. **卸载测试**
   - 通过控制面板卸载
   - 确认文件完全清除

#### 3.5 计算校验和

```powershell
# Windows PowerShell
Get-FileHash "target\release\bundle\msi\MiniGIS_0.4.0_x64_zh-CN.msi" -Algorithm SHA256

# 记录输出的 Hash 值
```

---

### 阶段 4: Git 操作

#### 4.1 提交所有更改

```bash
# 查看状态
git status

# 添加所有文件
git add .

# 提交
git commit -m "chore: release v0.4.0

- 更新版本号到 0.4.0
- 整理 CHANGELOG
- 更新文档
"
```

#### 4.2 创建标签

```bash
# 创建带注释的标签
git tag -a v0.4.0 -m "MiniGIS v0.4.0

主要更新:
- GDAL 环境自动配置
- 文档系统重构
- 开发体验优化

完整更新内容见 CHANGELOG.md
"

# 查看标签
git tag
git show v0.4.0
```

#### 4.3 推送到远程

```bash
# 推送代码
git push origin main

# 推送标签
git push origin v0.4.0

# 或一次性推送所有标签
git push origin --tags
```

---

### 阶段 5: GitHub Release

#### 5.1 创建 Release

1. 访问 https://github.com/xiaofuX1/MiniGIS/releases/new
2. 选择标签: `v0.4.0`
3. 填写发布信息

**标题**:
```
MiniGIS v0.4.0 - 开发环境优化与文档重构
```

**描述**:
```markdown
（复制 docs/releases/RELEASE_NOTES_v0.4.0.md 的内容）

## 下载

### Windows x64 安装包
- [MiniGIS_0.4.0_x64_zh-CN.msi](下载链接)
- SHA256: `[粘贴Hash值]`

### 系统要求
- Windows 10/11 (64位)
- 100MB 可用磁盘空间

### 安装说明
1. 下载 MSI 安装包
2. 双击运行安装向导
3. 按提示完成安装
4. 从开始菜单启动 MiniGIS

## 完整更新日志
详见 [CHANGELOG.md](链接)
```

#### 5.2 上传安装包

拖放文件到 Release 编辑页面：
- `MiniGIS_0.4.0_x64_zh-CN.msi`

#### 5.3 发布选项

- ✅ Set as the latest release（如果是最新稳定版）
- ⬜ Set as a pre-release（如果是预览版）

#### 5.4 发布

点击 **Publish release** 按钮。

---

### 阶段 6: 发布后验证

#### 6.1 验证 Release

- [ ] GitHub Release 页面显示正常
- [ ] 下载链接可用
- [ ] Tag 正确关联
- [ ] 文件 SHA256 匹配

#### 6.2 更新项目文档

- [ ] README.md 版本徽章（如果有）
- [ ] 文档链接指向最新版本

#### 6.3 通知（可选）

- 项目 Discussions 发布公告
- 社交媒体分享
- 相关社区通知

---

## 🔧 工具和脚本

### 自动化脚本

项目提供以下辅助脚本（位于 `scripts/` 目录）：

#### create_release.ps1
自动创建 GitHub Release 并上传安装包：

```powershell
# 使用方法
.\scripts\create_release.ps1

# 功能：
# - 检查 GitHub CLI 认证
# - 计算 SHA256 校验和
# - 生成 Release Notes
# - 创建 GitHub Release
# - 上传 MSI 文件
```

#### check_gdal_env.ps1
检查 GDAL 环境配置：

```powershell
.\scripts\check_gdal_env.ps1
```

---

## 🚨 紧急修复流程 (Hotfix)

如果发布后发现严重 Bug：

### 1. 创建 Hotfix 分支

```bash
git checkout -b hotfix/v0.4.1 v0.4.0
```

### 2. 修复问题

```bash
# 修复代码
# 编写测试
# 更新 UNRELEASED.md
```

### 3. 快速发布

```bash
# 更新版本号（只递增 PATCH）
# 0.4.0 → 0.4.1

# 构建测试
npm run tauri:build

# 提交
git commit -m "fix: 修复严重问题"

# 标签
git tag -a v0.4.1 -m "紧急修复版本"

# 推送
git push origin hotfix/v0.4.1
git push origin v0.4.1

# 合并回主分支
git checkout main
git merge hotfix/v0.4.1
git push origin main

# 删除 hotfix 分支
git branch -d hotfix/v0.4.1
```

### 4. 创建 Hotfix Release

按照正常流程创建 Release，标题标注 `(Hotfix)`。

---

## 📝 检查清单模板

### 发布前检查

- [ ] `UNRELEASED.md` 内容已整理到 `CHANGELOG.md`
- [ ] 版本号已更新（3 个文件）
- [ ] 创建了发布笔记文档
- [ ] 所有测试通过
- [ ] 文档已更新
- [ ] 代码已提交
- [ ] 构建成功
- [ ] 安装测试通过

### 发布检查

- [ ] Git 标签已创建
- [ ] 代码和标签已推送
- [ ] GitHub Release 已创建
- [ ] 安装包已上传
- [ ] SHA256 校验和已添加

### 发布后检查

- [ ] Release 页面正常
- [ ] 下载链接可用
- [ ] 文档链接正确
- [ ] 通知已发送

---

## 🎯 最佳实践

### 1. 规律发布
- 建议 2-4 周发布一次小版本
- 及时修复严重 Bug（Hotfix）
- 不要囤积太多功能在一次发布中

### 2. 充分测试
- 在多个环境测试
- 测试升级路径
- 测试全新安装

### 3. 清晰沟通
- 详细的发布说明
- 突出破坏性变更
- 提供升级指南

### 4. 文档先行
- 发布前确保文档完整
- 包含迁移指南
- 更新示例代码

---

## 📚 参考资源

- [语义化版本规范](https://semver.org/lang/zh-CN/)
- [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)
- [GitHub Release 文档](https://docs.github.com/cn/repositories/releasing-projects-on-github)
- [Tauri 打包指南](https://tauri.app/v1/guides/building/)

---

## 🤝 贡献

如果您有改进发布流程的建议，欢迎：
- 提交 Issue 讨论
- 创建 Pull Request
- 分享您的经验

---

**最后更新**: 2025-10-17  
**维护者**: MiniGIS Team
