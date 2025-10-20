# 开发者贡献完整指南

欢迎参与 MiniGIS 项目开发！本文档提供完整的开发指南。

---

## 🚀 快速开始

### 1. 环境准备

```bash
# 必需软件
- Node.js >= 18.0.0
- Rust >= 1.70.0
- Git

# 可选但推荐
- VS Code
- vcpkg（Windows GDAL 支持）
```

### 2. 克隆项目

```bash
git clone https://github.com/xiaofuX1/MiniGIS.git
cd MiniGIS
npm install
```

### 3. 配置 GDAL

参考 [GDAL_SETUP.md](GDAL_SETUP.md)

### 4. 启动开发

```bash
# 启动开发服务器（已自动配置GDAL环境）
npm run tauri:dev
```

---

## 📝 开发流程

### 1. 创建功能分支

```bash
git checkout -b feature/your-feature-name
```

### 2. 开发并测试

```bash
# 实时测试
npm run tauri:dev

# 构建测试
npm run tauri:build
```

### 3. 记录修改

每次提交前更新 `UNRELEASED.md`：

```markdown
## 🚀 新增功能
- ✅ **你的功能** - 功能描述
  - 详细说明
  - 影响的文件: `src/xxx.ts`
  - 相关文档: `docs/XXX.md`
```

### 4. 提交代码

```bash
git add .
git commit -m "feat: 添加新功能

- 功能详细说明
- 相关 Issue: #123
"
```

### 5. 推送和 PR

```bash
git push origin feature/your-feature-name

# 然后在 GitHub 创建 Pull Request
```

---

## 💻 代码规范

### TypeScript/React

```typescript
// 使用严格类型
interface LayerInfo {
  id: string;
  name: string;
  visible: boolean;
}

// 避免 any
const getData = (): LayerInfo[] => { ... }

// 使用函数组件和 Hooks
const MyComponent: React.FC = () => {
  const [state, setState] = useState<string>('');
  return <div>{state}</div>;
}
```

### Rust

```rust
// 使用 Result 进行错误处理
pub fn read_file(path: &str) -> Result<String, Error> {
    // 使用 ? 操作符，不要 unwrap()
    let content = fs::read_to_string(path)?;
    Ok(content)
}

// 遵循 Rust 命名规范
pub struct VectorLayer {
    layer_name: String,  // snake_case
}
```

---

## 🧪 测试

### 运行测试

```bash
# Rust 测试
cd src-tauri
cargo test

# 前端测试（如果有）
npm test
```

### 编写测试

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_feature() {
        assert_eq!(1 + 1, 2);
    }
}
```

---

## 📖 文档

### 何时更新文档

- 新增功能 → 更新 `UNRELEASED.md` + 功能文档
- 修复 Bug → 更新 `UNRELEASED.md`
- API 变更 → 更新 `DEVELOPMENT.md`
- 用户界面变更 → 更新 `USER_GUIDE.md`

### 文档位置

- 用户文档: `docs/USER_GUIDE.md`
- 开发文档: `docs/DEVELOPMENT.md`
- 功能文档: `docs/FEATURE_NAME.md`
- 修改记录: `UNRELEASED.md`

---

## 🔄 Pull Request 指南

### PR 标题格式

```
<type>(<scope>): <subject>

类型:
- feat: 新功能
- fix: Bug修复
- docs: 文档
- style: 格式
- refactor: 重构
- test: 测试
- chore: 构建/工具

示例:
feat(map): 添加测量工具
fix(gdal): 修复坐标转换问题
docs(readme): 更新安装说明
```

### PR 描述模板

```markdown
## 变更类型
- [ ] 新功能
- [ ] Bug 修复
- [ ] 文档更新
- [ ] 其他

## 变更说明
简要描述你的修改...

## 测试
- [ ] 本地测试通过
- [ ] 添加了新的测试
- [ ] 更新了相关文档

## 相关 Issue
Closes #123

## 截图（如适用）
```

---

## 🎯 贡献重点领域

### 急需帮助

- 🌍 多语言支持（国际化）
- 🧪 单元测试和集成测试
- 📱 macOS/Linux 支持
- 📖 文档翻译

### 功能增强

- 空间分析工具
- 栅格数据支持
- 地图打印输出
- 插件系统

---

## 📚 学习资源

- [Tauri 文档](https://tauri.app/)
- [React 文档](https://react.dev/)
- [OpenLayers 文档](https://openlayers.org/)
- [GDAL 文档](https://gdal.org/)
- [项目开发文档](DEVELOPMENT.md)

---

## 💬 获取帮助

- GitHub Issues
- GitHub Discussions
- 项目 Wiki

**感谢你的贡献！** 🎉
