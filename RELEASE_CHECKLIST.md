# v0.2.0 发布检查清单

## 准备工作

- [x] 更新版本号（package.json, Cargo.toml）
- [x] 更新CHANGELOG.md
- [x] 更新README.md
- [x] 创建LICENSE文件
- [x] 创建CONTRIBUTING.md
- [x] 创建GitHub Issue模板
- [x] 清理临时文件
- [x] 更新.gitignore

## 构建测试

- [ ] 运行开发版本测试所有功能
  ```bash
  npm run dev:gdal
  ```

- [ ] 构建MSI安装包
  ```bash
  npm run tauri:build
  ```

- [ ] 在干净系统上测试MSI安装
  - [ ] 安装成功
  - [ ] 启动正常
  - [ ] 打开shp文件
  - [ ] 符号系统工作
  - [ ] 测量工具工作

## Git操作

- [ ] 提交所有更改
  ```bash
  git add .
  git commit -m "chore: 准备v0.2.0发布"
  ```

- [ ] 创建版本标签
  ```bash
  git tag -a v0.2.0 -m "MiniGIS v0.2.0 正式发布"
  ```

- [ ] 推送到GitHub
  ```bash
  git push origin main
  git push origin v0.2.0
  ```

## GitHub Release

- [ ] 访问 https://github.com/xiaofuX1/MiniGIS/releases/new

- [ ] 填写发布信息
  - Tag: `v0.2.0`
  - Title: `MiniGIS v0.2.0 - GDAL完整支持`
  - Description: 复制 `RELEASE_NOTES_v0.2.0.md` 内容

- [ ] 上传文件
  - [ ] `MiniGIS_0.2.0_x64_zh-CN.msi`
  - [ ] 计算SHA256校验和并添加到说明

- [ ] 勾选"Set as latest release"

- [ ] 点击"Publish release"

## 发布后

- [ ] 验证GitHub Release页面
- [ ] 验证下载链接可用
- [ ] 更新README徽章（如果有）
- [ ] 社交媒体公告（可选）

## SHA256校验和

生成安装包SHA256：
```powershell
Get-FileHash "target\release\bundle\msi\MiniGIS_0.2.0_x64_zh-CN.msi" -Algorithm SHA256
```

添加到Release Notes：
```
**SHA256校验和**:
`[粘贴Hash值]`
```

## 故障排除

如果发布后发现问题：
1. 不要删除Release
2. 创建hotfix分支
3. 修复并发布v0.2.1

---

**完成发布后，记得庆祝一下！🎉**
