# emap-web

`@mapseekai/emap` 的独立开发文档与示例站点工程。

本项目基于 Docusaurus 构建中英文双语文档站点：

- `docs/`：简体中文文档正文。
- `i18n/en/docusaurus-plugin-content-docs/current/`：英文文档正文与界面翻译。
- `src/`：站点主题样式与 MDX 组件扩展。
- `scripts/`：引擎构建产物同步、双语元数据校验与 API 链接校验脚本。

API 参考（TypeDoc）与可运行示例从相邻的 `emap` 引擎仓库构建并同步到本站，不在本仓库内维护第二份引擎源码。

## 获取代码与目录布局

构建完整站点需要同时检出 `emap` 引擎仓库与 `emap-web` 文档仓库。默认推荐将两个仓库放在同一父目录下：

```text
code/
  emap/       # 引擎源码、API 生成与可运行示例工程
  emap-web/   # 本站源码（当前仓库）
```

克隆仓库：

```bash
git clone https://github.com/mapseekai/emap.git
git clone https://github.com/mapseekai/emap-web.git
cd emap-web
```

如果 `emap` 引擎仓库位于其他路径，可在执行构建或同步命令时通过环境变量 `EMAP_SOURCE_DIR` 指定绝对路径：

```bash
EMAP_SOURCE_DIR=/absolute/path/to/emap pnpm build
```

## 前置要求

在安装和运行本项目前，请确认本地环境满足以下要求：

- [Node.js](https://nodejs.org/)：`>=22.18 <25`
- [pnpm](https://pnpm.io/)：`11.15.1`（已在 `package.json` 的 `packageManager` 字段中固定）

验证本地工具版本：

```bash
node --version
pnpm --version
```

> [!IMPORTANT]
> 首次运行完整构建前，请先在 `emap` 引擎仓库中执行 `pnpm install --frozen-lockfile`，确保引擎侧具备构建 API 与示例所需的全部依赖。

## 快速开始

### 1. 安装依赖

```bash
pnpm install --frozen-lockfile
```

### 2. 完整构建与本地预览

首次检出或修改了文档 front matter 中的 API / 示例关联后，执行完整构建：

```bash
pnpm build
pnpm serve --port 3000
```

`pnpm build` 会依次构建 `emap` 引擎、生成 TypeDoc API 文档、打包可运行示例、将生成产物同步至本站 `static/` 与 `.cache/`，最后构建中英文静态站点至 `build/`。启动预览服务后，在浏览器访问 `http://127.0.0.1:3000/mapseekai/emap/`。

### 3. 日常文档编写（开发服务器）

当本地已经生成过一次引擎产物，且本次仅修改文档正文或站点样式时，可直接复用已有构建产物并启动热更新开发服务器：

```bash
# 复用引擎已生成的 API 与示例产物
pnpm assets:sync

# 启动中文开发预览（默认）
pnpm start

# 启动英文开发预览
pnpm start --locale en

# 仅重新构建中英文文档站点（不重新编译引擎）
pnpm build:site
```

`pnpm assets:sync` 会校验 `emap` 仓库中的构建产物完整性，并将来源版本、Git 状态与复用标记记录在 `.cache/engine-build.json` 中。

## 构建、测试与校验

在提交文档或脚本修改前，运行完整校验命令：

```bash
pnpm verify
```

`pnpm verify` 依次执行以下检查：

1. `pnpm run typecheck`：检查站点 TypeScript 配置与组件类型。
2. `pnpm test`：运行资源同步测试、预览服务测试、内容校验器测试与构建链安全回归测试。
3. `pnpm run build`：同步引擎资源并执行中英文双语站点生产构建（Docusaurus 将断开的页面链接或无效 Markdown 链接视为构建失败；失效锚点默认显示警告）。
4. `pnpm run check:content`：运行 `scripts/check-docs-i18n.mjs` 与 `scripts/check-docs-api.mjs`，校验中英文文档一对一镜像、front matter 字段一致性、示例目录关联以及正文内所有本地 `/api/` 链接与锚点的有效性。

## 内容组织与维护约定

本站采用 Diátaxis 框架组织文档结构：

- **入门教程（`getting-started/`）**：面向初次接触 Emap 的开发者，通过内嵌 GeoJSON 手把手完成安装、第一张地图渲染、交互验证与资源释放。
- **操作指南与场景实践（`guides/`、`recipes/`、`data/`）**：面向具体开发任务，按相机控制、图层样式、要素选择、几何编辑、数据格式、属性管理、空间操作、GeoTIFF、GeoPackage、DuckDB 与性能优化提供可直接落地的方法。
- **概念说明（`concepts/`）**：深入解释地图与数据模型、数据源与图层分离、坐标系与 CRS、共享弧段拓扑、Cordis 运行时组成及源码职责边界。
- **参考手册（`reference/`）**：提供事件载荷、错误类型与恢复策略、浏览器与 Peer 依赖兼容性矩阵以及常见问题排查清单。

维护文档时请遵守以下边界：

- **双语同步**：`docs/` 与 `i18n/en/docusaurus-plugin-content-docs/current/` 保持相同的文件结构、稳定 `slug`、front matter 关联字段（`id`、`slug`、`api`、`examples`、`stability`、`verifiedVersion`）及兼容锚点。
- **生成物不入库**：`static/api/`、`static/examples/`、`.cache/` 与 `build/` 均为构建生成物，已在 `.gitignore` 中忽略，请勿提交到 Git。
- **静态资源与补丁**：站点自有图标位于 `static/img/`；`patches/` 保存文档构建链安全补丁，升级依赖时须通过回归测试验证。
