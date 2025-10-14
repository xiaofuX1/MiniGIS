# 贡献指南

感谢您对MiniGIS项目的关注！我们欢迎任何形式的贡献。

## 如何贡献

### 报告问题

如果您发现bug或有功能建议：

1. 检查[Issues](https://github.com/xiaofuX1/MiniGIS/issues)是否已存在相关问题
2. 如果没有，创建新Issue并提供：
   - 清晰的标题和描述
   - 复现步骤（对于bug）
   - 期望行为
   - 实际行为
   - 截图（如果适用）
   - 系统环境信息

### 提交代码

1. **Fork项目**
   ```bash
   git clone https://github.com/xiaofuX1/MiniGIS.git
   cd MiniGIS
   ```

2. **创建分支**
   ```bash
   git checkout -b feature/your-feature-name
   # 或
   git checkout -b fix/your-bug-fix
   ```

3. **安装依赖**
   ```bash
   npm install
   ```

4. **开发**
   - 遵循现有代码风格
   - 添加必要的注释
   - 编写/更新测试（如果适用）

5. **提交**
   ```bash
   git add .
   git commit -m "feat: 添加XXX功能"
   # 或
   git commit -m "fix: 修复XXX问题"
   ```

6. **推送并创建PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   然后在GitHub上创建Pull Request

## 提交信息规范

使用[Conventional Commits](https://www.conventionalcommits.org/)格式：

- `feat:` 新功能
- `fix:` Bug修复
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 代码重构
- `perf:` 性能优化
- `test:` 测试相关
- `chore:` 构建/工具相关

示例：
```
feat: 添加GeoJSON导入功能
fix: 修复属性表排序bug
docs: 更新安装文档
```

## 开发环境

### 前置要求
- Node.js >= 18.0.0
- Rust >= 1.70.0
- GDAL 3.8（Windows用户参考[GDAL_SETUP.md](./GDAL_SETUP.md)）

### 启动开发服务器
```bash
# 自动配置GDAL环境并启动
npm run dev:gdal

# 或手动启动
npm run tauri:dev
```

### 代码风格

- **TypeScript**: 使用严格模式，避免any
- **React**: 优先使用函数组件和Hooks
- **命名**: 
  - 组件：PascalCase
  - 函数/变量：camelCase
  - 常量：UPPER_SNAKE_CASE
- **格式化**: 使用项目配置的Prettier

### 项目结构

```
src/
├── components/     # React组件
├── stores/        # 状态管理
├── services/      # API服务
├── utils/         # 工具函数
└── types/         # TypeScript类型

src-tauri/
├── src/
│   ├── commands/  # Tauri命令
│   ├── services/  # 业务逻辑
│   └── gis/       # GIS处理
```

## 审核流程

1. 自动化检查（CI/CD）
2. 代码审查
3. 测试验证
4. 合并到main分支

## 许可证

通过贡献代码，您同意将您的代码以[MIT License](./LICENSE)授权。

## 联系方式

有疑问？通过以下方式联系：
- GitHub Issues
- GitHub Discussions

感谢您的贡献！🎉
