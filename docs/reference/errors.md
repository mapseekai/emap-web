---
id: errors
slug: /reference/errors
title: 错误参考
description: "查阅错误类型、Source 加载诊断、资源限制和验证器报告。"
api: ["Emap", "Err", "OK", "okValue", "OpError", "OpResult", "topologyValidator", "TopologyValidatorOptions", "ValidationChange", "ValidationIssue", "ValidationReport", "Validator", "ValidatorPhase", "ValidatorRegistry", "ValidatorResult", "SourceLoadError", "DuckDbOperationError", "DuckDbOperationErrorKind"]
examples: ["check-geometry","duckdb-query","transaction"]
stability: stable
verifiedVersion: unreleased
---

# 错误参考

<span id="核心错误处理" />
<span id="更多错误构造" />

Emap 的编辑、属性与空间操作通过结构化的 `OpResult` 报告执行结果；数据源导入预检通过 `SourceLoadDiagnostic` 报告状态；独立的 DuckDB 分析工具则抛出结构化的 `DuckDbOperationError`。编写错误处理逻辑时，请始终依据稳定的 `kind` 或 `code` 枚举字段分支，不要把面向人类阅读的 `message` 文本当作业务协议解析。

## 1. `OpResult` 与 `OpError` 分支表

`OpResult<T>` 是判别联合类型：成功时为 `{ ok: true, value: T }`（无返回值操作使用常量 `OK`，其 `value` 为 `undefined`；有返回值操作使用 `okValue(value)` 构造），失败时为 `{ ok: false, error: OpError }`（由 `Err` 辅助函数构造）。

`OpError` 按 `error.kind` 划分为以下七种类型：

| `error.kind` | 附加字段 | 触发原因与恢复建议 |
| --- | --- | --- |
| `'not-found'` | `what`、`id` | 指定的 `source`、`layer`、`mask`、`divider` 或 `field` 不存在；检查拼写及数据源是否已注册 |
| `'validation'` | `field`、`reason` | 调用参数不合法（如半径非正数、字段名非法或类型不匹配）；高亮提示用户修正对应表单项 |
| `'expression-disabled'` | `operation` | 在默认 `expressionPolicy: 'disabled'` 下调用了依赖 JS 表达式的操作；改用类型化接口或确认安全后开启 `'trusted'` |
| `'duckdb'` | `operation`、`duckDbKind`、`reason`、`field?`、`cause?` | 地图封装的 DuckDB 操作失败；结合下文的 `duckDbKind` 细分原因处理 |
| `'mapshaper'` | `cause`、`cmd?`、`operation?` | 底层拓扑算法执行、Worker 通信或结果提交异常；查看 `cause` 诊断数据或资源问题 |
| `'stale-operation'` | `sourceId`、`operation` | 异步计算期间目标数据源已被其他操作修改或替换；丢弃本次过期结果，基于最新数据重新发起 |
| `'host-removed'` | 无附加字段 | 操作完成前地图实例已被卸载销毁；直接终止后续 UI 更新 |

## 2. 数据源加载预检诊断码（`SourceLoadDiagnostic`）

调用 `map.preflightSource()` 时，返回的诊断项 `SourceLoadDiagnostic` 包含 `code`、`severity`（`'error'` 或 `'warning'`）以及可选的 `message`、`suppliedCrs`、`metadataCrs` 和 `effectiveCrs`。如果直接调用 `addSource()` 或 `confirmSource()` 失败，则会抛出携带这些诊断信息的 `SourceLoadError`。

| 诊断码（`code`） | 含义说明 | 推荐处理方式 |
| --- | --- | --- |
| `'source-crs-required'` | 数据源缺失坐标系（CRS）元数据 | 弹窗收集用户确认的 `sourceCrs`，连同 `draft` 重新调用 `preflightSource()` |
| `'source-crs-invalid'` | 传入或解析出的 CRS 标识无法识别 | 提示用户修正为合法的 EPSG 代码或投影定义字符串 |
| `'source-crs-overrides-metadata'` | 调用方显式传入的 CRS 覆盖了文件自带的元数据 | 属于警告级诊断（Warning），核对 `effectiveCrs` 是否符合预期 |
| `'source-id-conflict'` | 目标数据源 ID 已在地图中注册或正在加载中 | 更换新的唯一 ID，或先移除旧数据源后再导入 |
| `'source-load-cancelled'` | 导入流程被取消 | 等待清理完成后恢复文件选择界面 |
| `'source-load-rejected'` | 数据结构损坏或违反导入契约 | 读取同批次的其他具体诊断项并提示用户 |
| `'source-plan-invalid'` | 传入 `confirmSource()` 的 `plan` 无效、属于其他地图或已被消费过 | `ReadySourceLoadPlan` 绑定单个地图实例且只能使用一次，需重新执行预检 |
| `'source-plan-stale'` | 从生成 `plan` 到调用 `confirmSource()` 期间，地图或数据源状态已发生变化 | 基于当前最新状态重新执行 `preflightSource()` |

## 3. 默认文件与 ZIP 解压资源上限

<span id="导入资源阈值" />

为防止超大文件或异常压缩包（ZIP Bomb）耗尽浏览器内存，`TopologySource.fromBytes()` 内置了以下默认限制（均可通过调用参数覆盖）：

| 配置项路径 | 默认上限 | 作用说明 |
| --- | --- | --- |
| `resourceLimits.maxInputBytes` | `2 GiB` | 一次导入请求的原始输入字节上限；多文件输入按总和计算 |
| `zipLimits.maxCompressedBytes` | `2 GiB` | ZIP 压缩包本身的字节上限 |
| `zipLimits.maxBytes` | `2 GiB` | ZIP 解压后所有条目累计允许的最大总字节数 |
| `zipLimits.maxEntries` | `5000` | ZIP 压缩包内允许包含的最大文件条目数 |
| `zipLimits.maxRatio` | `100` | 解压后大小与压缩包大小的最大允许膨胀比 |

请注意：`2 GiB` 是引擎拒绝超限输入的协议安全边界，不代表所有用户终端浏览器都能流畅处理 2 GiB 文件。在面向公网用户的上传场景中，建议在读取 `file.arrayBuffer()` 前先检查 `File.size`，并根据业务需要设置更保守的预算（如 50 MiB 至 200 MiB）。GeoPackage 与 GeoTIFF 栅格服务还拥有各自的资源限制选项。

## 4. DuckDB 空间操作错误类别（`DuckDbOperationError`）

<span id="更多加载与-duckdb-错误" />
<span id="duckdb-失败类别" />

直接调用 `@mapseekai/emap/duckdb` 中的工具函数失败时会抛出 `DuckDbOperationError`；通过地图图层封装调用时则会填入 `OpError` 的 `duckDbKind` 字段：

| `DuckDbOperationError.kind` | 故障原因与排查方向 |
| --- | --- |
| `'validation'` | 输入参数或 SQL 语句未通过校验（例如对地理坐标系 `EPSG:4326` 调用了要求平面投影坐标的 `buffer` 工具，或 SQL 不是针对 `input` 的单条 `SELECT`） |
| `'runtime-unavailable'` | DuckDB-Wasm 运行时未初始化、已关闭或 Worker/WASM 资源加载失败 |
| `'spatial-extension-unavailable'` | DuckDB Spatial 空间扩展未能成功加载（检查离线/内网环境下的扩展静态资源 URL 与 CSP 配置） |
| `'query-failed'` | DuckDB 内部 SQL 执行或数据库连接异常（检查字段名、数据类型与函数签名） |
| `'conversion-failed'` | Emap Dataset 与 Arrow / WKB 表结构之间的转换失败（检查几何列约束与空值） |

## 5. 提交后几何验证器报告（`ValidationReport`）

<span id="更多验证器报告" />

注册内置拓扑验证器（如检测弧段自交的 `topologyValidator()`）后，它会在编辑或事务**提交之后（`after-commit` 阶段）**异步运行：

- 验证报告 `ValidationReport` 包含布尔值 `ok` 和问题列表 `issues`；每个 `ValidationIssue` 包含严重级别 `severity`、描述 `message` 以及可选的关联要素引用 `FeatureRef`（若验证器自身抛出异常，会被捕获并转化为一条错误级 issue）。
- 当报告存在错误时，地图会触发 `validationfailed` 事件，携带验证结果数组 `results` 与本次提交标签 `label`。此时修改已经写入历史栈，且可能已有后续编辑；应引导用户检查和修复，只在确认目标提交仍是最新历史项时调用 `map.undo()`。

## API

<span id="err-构造参数" />
<span id="表达式与-worker-控制" />
<span id="topologyvalidator-参数" />

- [src.OpError](/mapseekai/emap/api/types/emap.OpError.html)
- [src.SourceLoadError](/mapseekai/emap/api/classes/emap.SourceLoadError.html)
- [src_duckdb.DuckDbOperationError](/mapseekai/emap/api/classes/duckdb.DuckDbOperationError.html)

## 可运行示例

- [check-geometry](/mapseekai/emap/examples/check-geometry/)
- [duckdb-query](/mapseekai/emap/examples/duckdb-query/)
- [transaction](/mapseekai/emap/examples/transaction/)

## 实现依据

- [`src/engine/map/op-result.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/op-result.ts)
- [`src/engine/map/source-loading.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/source-loading.ts)
- [`src/domain/validation/validator.ts`](https://github.com/mapseekai/emap/blob/master/src/domain/validation/validator.ts)
- [`src/domain/source/topology-source.ts`](https://github.com/mapseekai/emap/blob/master/src/domain/source/topology-source.ts)
