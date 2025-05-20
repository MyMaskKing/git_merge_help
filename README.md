# Git Manager Help (开发中 🚧)

这是一个正在开发中的项目，旨在提供Git仓库管理的辅助工具。

## ⚠️ 开发状态

**注意：** 此项目仍处于早期开发阶段，尚未完成。目前存在一些已知问题需要解决。

### 已知问题

1. 浏览器端存储相关问题:
   - IndexedDB API 在服务器端渲染(SSR)环境中无法正常工作
   - `@isomorphic-git/lightning-fs` 依赖项存在兼容性问题

2. 浏览器 API 访问限制:
   - Navigator API 在服务器端环境中不可用
   - 需要调整代码以适应SSR环境

## 🛠 技术栈

- Next.js
- Isomorphic Git
- Lightning FS

## 📝 待办事项

- [ ] 解决SSR环境下的IndexedDB兼容性问题
- [ ] 实现适当的服务器端存储方案
- [ ] 优化浏览器/服务器端代码分离
- [ ] 完善错误处理机制

## 🚀 如何开始

由于项目仍在开发中，目前不建议在生产环境中使用。如果您想参与开发：

1. 克隆仓库
```bash
git clone [repository-url]
```

2. 安装依赖
```bash
npm install
```

3. 启动开发服务器
```bash
npm run dev
```

## 🤝 贡献

欢迎提交Issue和Pull Request来帮助改进这个项目。

## 📄 许可证

[待定]

---
⚠️ 此项目正在积极开发中，功能和API可能会发生重大变化。 