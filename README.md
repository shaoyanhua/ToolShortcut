# ToolShortcut

这是一个可直接部署到 GitHub Pages 的静态下载页。

## 使用方式

1. 把需要下载的文件放在仓库根目录。
2. 推送到 `main` 分支。
3. 在 GitHub 仓库设置里启用 Pages，并将来源设置为 `GitHub Actions`。
4. 等待 `.github/workflows/pages.yml` 跑完后，访问仓库的 Pages 地址。

页面源码位于 `docs/`，会优先通过 GitHub API 读取仓库根目录的文件列表，因此后续新增文件通常不需要再改页面代码。