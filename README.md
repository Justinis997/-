# 贾丁丁个人网站

## 本地预览

在项目目录运行：

    python3 -m http.server 8000

然后访问 `http://localhost:8000/`。

## 内容更新

### 通过 Notion 自助更新

网站构建时会读取 Notion「个人网站更新」页面中的三个内容库：

- `建筑作品`：只有“发布状态”为“发布”的条目会同步，照片会下载并生成网页尺寸。
- `随笔文章`：完整正文写在条目页面内，只有“发布状态”为“发布”的条目会同步。
- `网站设置`：已启用的“首页近期动态”会替换首页对应文字。

Vercel 需要设置私密环境变量 `NOTION_API_KEY`。三个数据源 ID 已写入构建脚本，也可以使用 `.env.example` 中的同名变量覆盖。未设置密钥时，构建会保留仓库中的现有内容。

Notion 上传文件的地址会过期，因此构建过程会把作品照片下载并转存为网站自己的静态图片，不会在网页中直接引用临时地址。

本地生成部署目录：

    pnpm run build

- 摄影源文件放在 `参考/photos/` 对应分类中。
- 随笔正文保存在 `assets/js/essay-data.js`，随笔页按原始创建日期分年排列，首页自动显示最新三篇。
- 随笔只发布文字内容，不把备忘录中的图像或图像附件复制到网站。

重新生成网页图片、静态摄影网格和摄影清单前，请确认当前为 macOS 环境并可用系统自带的 `sips`；HEIC 源图还需要 `heif-convert`。同时需安装 Python 3 与 Pillow（仅用于生成纯黑 Logo）。

摄影源图保持在 `参考/photos/`，部署副本统一为 JPEG：

- `assets/photos/thumbnails/`：最长边 560px、质量 65，用于首页和摄影网格。
- `assets/photos/full/`：最长边 1400px、质量 68，用于灯箱和无 JavaScript 时的完整图链接。

脚本每次重建上述两个部署目录，并同步更新 `assets/js/photo-data.js` 与 `photography.html` 标记区间内的 217 张静态网格；不会修改 `参考/` 源文件。

在已安装全局 Node.js 的普通环境运行：

    node scripts/prepare-assets.mjs

当前 Codex 环境没有全局 `node`，请使用捆绑 Node：

    /Users/justin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/prepare-assets.mjs

资源脚本会优先使用 `PYTHON_BIN` 指定的 Python，其次尝试 Codex 捆绑 Python，最后回退到 PATH 中的 `python3`。

## 测试

在当前 Codex 环境运行全部测试：

    /Users/justin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/*.test.mjs

## 部署

网站是纯静态文件，可部署到支持静态托管的平台。部署前再次运行全部测试，并确认站点域名后补充 canonical URL 与最终 Open Graph 分享图。
