---
id: installation
slug: /getting-started/installation
title: 安装
description: "安装 Emap 核心包和样式表，按能力选择子入口及 peer 依赖。"
api: ["Emap", "TopologySource"]
examples: ["getting-started/vector-file"]
stability: stable
verifiedVersion: unreleased
---

# 安装与环境配置

<span id="安装核心包" />

在现代浏览器前端工程中，只需安装 `@mapseekai/emap` 核心包并引入内置样式表，即可在 DOM 容器挂载后创建交互式地图。Emap 的地图渲染与数据处理在浏览器客户端运行，Node.js 仅用于前端工程的本地开发与打包构建。

## 1. 安装核心包

请确保项目使用支持 ES Modules（ESM）的前端构建工具（如 Vite、Webpack 或 Rollup），并在项目根目录执行安装命令：

```bash
pnpm add @mapseekai/emap
```

如果项目使用 npm，请执行 `npm install @mapseekai/emap`（请勿在同一项目中混用多种包管理器）。`@mapseekai/emap` 将 `maplibre-gl` 声明为公开类型所需的 Peer 依赖，主流包管理器默认会自动安装。

在客户端入口代码中导入核心类与样式表：

```ts
import { Emap, TopologySource } from '@mapseekai/emap';
import '@mapseekai/emap/style.css';
```

> **提示**：`@mapseekai/emap/style.css` 提供了地图容器、导航按钮、编辑工具栏与状态栏控件的基础样式。如果漏掉该导入，地图控件将无法正常排版显示。

## 2. 配置 TypeScript

<span id="更多环境与模块配置" />

Emap 面向现代浏览器环境并提供完整的 TypeScript 类型声明。建议在 `tsconfig.json` 中使用基于打包器的模块解析配置：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true
  }
}
```

如果你的应用使用了服务端渲染（SSR，如 Next.js 或 Nuxt），请务必将 `Emap.create()` 放在客户端挂载钩子（如 React 的 `useEffect` 或 Vue 的 `onMounted`）中执行，不要在服务端渲染阶段实例化浏览器地图。完整的浏览器版本下限与渲染后端要求请参见[环境与兼容性](../reference/compatibility.md)。

## 3. 按需选择功能子入口

除根入口 `@mapseekai/emap` 外，Emap 将大型扩展能力拆分为独立的子路径导出，避免未使用功能的体积进入主包：

| 业务需求 | 导入子入口 | 所需额外准备与参考文档 |
| --- | --- | --- |
| 地图渲染、内置矢量格式与拓扑编辑 | `@mapseekai/emap` | 开箱即用，详见[创建第一张地图](./quick-start.md) |
| Arrow、GeoArrow、GeoParquet 读写 | `@mapseekai/emap/arrow` | 安装 `apache-arrow`（及 `parquet-wasm`），详见[数据格式](../data/formats.md) |
| 浏览器内 SQL 查询与空间分析工具箱 | `@mapseekai/emap/duckdb` | 安装 `@duckdb/duckdb-wasm` 与 `apache-arrow`，详见[DuckDB 空间处理](../data/duckdb.md) |
| 本地 `.gpkg` 多图层矢量表直接导入 | `@mapseekai/emap/geopackage` | 部署 SQL.js WASM 与 GeoPackage Worker，详见[导入 GeoPackage](../data/geopackage.md) |
| 本地 GeoTIFF / COG 大影像按窗口读取 | `@mapseekai/emap/geotiff` | 部署 GeoTIFF Worker，详见[读取与显示 GeoTIFF](../data/geotiff.md) |
| MapLibre 在线矢量/栅格底图与叠加服务 | `@mapseekai/emap/maplibre` | 注册 `mapLibrePlugin`，详见[编写与安装插件](../guides/plugins.md) |

如果你需要深度定制运行时或集成 AI Agent 工具调用，还可以按需使用 `/context`、`/services`、`/providers`、`/plugins`、`/presets` 和 `/ai` 子入口。注意：使用可选数据格式（如 Arrow 或 GeoPackage）时，需先将对应格式插件注册到地图实例，再将 `map.formats` 传给 `TopologySource`。

## 4. 前端框架集成最佳实践

在 React、Vue 3 或 Next.js 等框架中使用 Emap 时，请遵循以下生命周期与响应式防坑规则：

### React 18 / 19 与 Next.js

在 React 中，使用 `useRef` 保存 DOM 容器和地图引用。React 不会等待 effect 的清理函数返回的 Promise，因此下例将创建和销毁串行化，避免 StrictMode 在开发环境中重新执行 effect 时复用尚未释放的容器：

```tsx
import { useEffect, useRef } from 'react';
import { Emap } from '@mapseekai/emap';
import '@mapseekai/emap/style.css';

export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Emap | null>(null);
  const lifecycle = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    lifecycle.current = lifecycle.current.then(async () => {
      if (cancelled) return;
      const map = await Emap.create({ container });
      if (cancelled) await map.dispose();
      else mapRef.current = map;
    });
    void lifecycle.current.catch(console.error);

    return () => {
      cancelled = true;
      lifecycle.current = lifecycle.current.then(async () => {
        const map = mapRef.current;
        mapRef.current = null;
        if (map) await map.dispose();
      });
      void lifecycle.current.catch(console.error);
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
```

> **Next.js App Router 提示**：Emap 依赖浏览器 Canvas 与 DOM API，请在文件顶部添加 `'use client'` 指令，或使用 `dynamic(() => import('./MapView'), { ssr: false })` 动态引入。

### Vue 3

> [!CAUTION] 严禁使用深度响应式包装地图实例
> 切勿将 `map` 放入 Vue 的 `ref()` 或 `reactive()` 中！Vue 3 的深度 Proxy 会拦截 Emap 内部的私有成员属性和 Cordis Context，导致方法调用时抛出 `Cannot read private member` 或上下文丢失错误。

在 Vue 3 中，必须使用 `shallowRef` 或 `markRaw`：

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, shallowRef, useTemplateRef } from 'vue';
import { Emap } from '@mapseekai/emap';
import '@mapseekai/emap/style.css';

const container = useTemplateRef<HTMLDivElement>('container');
const mapInstance = shallowRef<Emap | null>(null);
let unmounted = false;

onMounted(async () => {
  if (!container.value) return;
  const map = await Emap.create({ container: container.value });
  if (unmounted) await map.dispose();
  else mapInstance.value = map;
});

onUnmounted(() => {
  unmounted = true;
  const map = mapInstance.value;
  mapInstance.value = null;
  if (map) void map.dispose().catch(console.error);
});
</script>

<template>
  <div ref="container" style="width: 100%; height: 500px;" />
</template>
```

卸载发生在异步创建完成之前时，示例会在创建完成后立即销毁实例。Vue 不会等待卸载回调完成；如果应用要在同一容器上重新创建地图，应由宿主代码等待旧实例的 `dispose()` 完成。

### 监听容器大小自适应（ResizeObserver）

当包含地图的侧边栏折叠/展开、全屏切换或弹窗展示时，容器的 CSS 尺寸会发生变化。此时需要调用 `map.resize()` 让 Canvas 重新同步视口与像素比：

```ts
const observer = new ResizeObserver(() => {
  map.resize();
});
observer.observe(containerElement);
// 组件卸载时断开监听：observer.disconnect();
```

## 5. 验证安装结果

完成上述配置后，请继续阅读[创建第一张地图](./quick-start.md)。该教程使用代码内嵌的 GeoJSON 数据和 Canvas2D 渲染器，不依赖外部网络请求或静态文件服务，能够帮助你快速确认包安装与构建配置是否正常工作。

如果在编译或运行阶段遇到问题，可按以下顺序排查：

- **缺少 Peer 依赖报错**：对照[兼容性参考中的 Peer 依赖矩阵](../reference/compatibility.md#peer-依赖配置)安装对应版本的依赖包。
- **控件按钮错位或无样式**：确认客户端入口已导入 `@mapseekai/emap/style.css`。
- **Worker 或 WASM 加载失败**：检查生产或预览环境下静态资源 URL 的实际响应内容，确保服务器返回的是 `.js` / `.wasm` 文件而非单页应用的 HTML 回退页。

## 可运行示例

- [打开矢量文件](/mapseekai/emap/examples/getting-started/vector-file/)

## 实现依据

<span id="前置条件" />
<span id="更多可选功能与-peer-依赖" />
<span id="geoarrow-和-geoparquet" />
<span id="duckdb-查询和空间处理" />
<span id="geopackage-导入" />
<span id="maplibre-在线底图与叠加层" />
<span id="worker-执行" />
<span id="下一步" />

- [`package.json`](https://github.com/mapseekai/emap/blob/master/package.json)
- [`tsconfig.json`](https://github.com/mapseekai/emap/blob/master/tsconfig.json)
