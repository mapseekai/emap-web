---
id: editing
slug: /guides/editing
title: 编辑
description: "绘制和修改几何，管理编辑会话、事务及撤销历史。"
api: ["AffineMatrix", "AppendedArc", "AutoCompletePolygonHandler", "AutoCompletePolygonOptions", "AutoCompletePolygonResult", "BulkFeatureDeleteCommand", "BulkFeatureDeleteCommandOptions", "composeMatrix", "CompositeCommand", "DatasetReplaceCommand", "DatasetReplaceCommandOptions", "EditCommand", "EditHistory", "EditHistoryOptions", "Emap", "FeatureAffineCommand", "FeatureAffineCommandOptions", "FeatureAppendCommand", "FeatureAppendCommandOptions", "FeatureCreateCommand", "FeatureDeleteCommand", "FeatureDeleteCommandOptions", "FeaturePropertyChangeCommand", "FeaturePropertyChangeCommandOptions", "FeatureTranslateCommand", "FeatureTranslateCommandOptions", "FieldAddCommand", "FieldAddCommandOptions", "FieldRemoveCommand", "FieldRemoveCommandOptions", "FieldRenameCommand", "FieldRenameCommandOptions", "HistoryStateSnapshot", "IDENTITY_MATRIX", "invertMatrix", "planSharedArcSplit", "planSharedNodeSplit", "rotateMatrix", "scaleMatrix", "SplitSharedArcsCommand", "SplitSharedArcsCommandOptions", "SplitSharedArcsRemap", "SplitSharedNodeCommand", "SplitSharedNodePlan", "TopologySource.fromBytes", "Transaction", "TranslatedPointFeature", "VertexDeleteCommand", "VertexInsertCommand", "VertexMoveCommand", "AddPartOptions", "AddRingOptions", "DeletePartOptions", "DeleteRingOptions", "FillRingOptions", "PartEditHandler", "PartEditOptions", "ReshapeFeatureHandler", "ReshapeFeatureOptions", "ReshapeSelectedOptions", "ReshapeSelectedResult", "RingEditHandler", "RingEditOptions", "DrawFeatureHandler", "VertexEditHandler", "SplitFeatureHandler", "TransformFeatureHandler"]
examples: ["attribute-editing","china-editing","draw-snap","feature-rotate","feature-scale","feature-translate","rebuild-topology","reshape-ring-part","snapshot","split-features","transaction","undo-redo","vertex-editing", "luma-vertex-editing"]
stability: stable
verifiedVersion: unreleased
---

# 编辑几何与管理事务

<span id="实验性-luma-顶点编辑" />

Emap 通过交互式 Handler、编辑会话（Edit Session）以及可逆编辑命令（`EditCommand`）修改空间数据。每一次提交都会自动更新数据源版本号、触发画布重绘并写入撤销/重做历史栈；当你需要把多步修改合并为一次原子操作时，可以使用事务（`Transaction`）。

## 1. 准备可编辑图层与启用绘制

在启动任何编辑工具前，请先确认目标数据源（`source`）、数据图层（`sourceLayer`）和几何类型已经就绪：

- **编辑已有文件**：导入矢量文件并注册数据源后，可直接将其中的数据图层作为编辑目标。
- **从零新建空图层**：如果画布上还没有数据，请先调用 `await map.createLayer(...)` 创建带有明确几何类型和字段定义的数据图层，再用 `map.addLayer(...)` 为其配置渲染样式（注意：`addLayer()` 只声明渲染外观，不能用来创建底层数据图层）。
- **确认运行时预设**：默认的 `'editor'` 预设已内置全部编辑 Handler；若使用自定义预设，请确保已安装相应的编辑插件。

以下示例假设数据源 `parcels` 中已有面数据图层 `lots`，我们开启多边形绘制工具并配置 12 像素的顶点与边吸附（Snap）：

```ts
map.drawFeature.setOptions({
  source: 'parcels', sourceLayer: 'lots', type: 'polygon',
  snapThreshold: 12, snapToVertex: true, snapToEdge: true,
});
map.drawFeature.enable();
```

`snapThreshold` 的单位为屏幕像素。当用户在画布上完成一次多边形草图闭合后，新要素会自动提交到 `lots` 图层。切换到其他工具（如点选或顶点编辑）时，请记得调用当前 Handler 的 `disable()`，避免多个交互工具同时争夺鼠标点击和拖拽事件。

## 2. 按任务选择编辑工具

<span id="更多编辑工具" />
<span id="选择编辑会话" />

Emap 针对不同的几何修改需求提供了专门的 Handler 与会话入口：

| 编辑任务 | 推荐入口 | 核心行为说明 |
| --- | --- | --- |
| 新增点、折线或多边形要素 | `map.drawFeature` | 支持鼠标点选绘草图、自动闭合多边形，以及顶点/边吸附 |
| 移动、插入或删除已有顶点 | `map.vertexEdit` | 直接拖拽拓扑弧段上的控制点，或点击线段插入新顶点 |
| 沿草图切分要素或局部改形 | `map.splitFeature`、`map.reshapeFeature` | 用绘制的切割线将面/线一分为二，或替换局部边界走向 |
| 依附已有边界自动补全面、编辑环/部件 | `map.autoCompletePolygon`、`map.ringEdit`、`map.partEdit` | 利用相邻多边形已有边界闭合新地块，或增删孔洞（Ring）与多部件（Part） |
| 整体平移、旋转或缩放要素 | `map.transformFeature`、`map.editSession` | 对选中要素执行仿射变换；自定义交互工具可直接使用 `editSession` 控制 `preview`、`commit` 与 `cancel` |

> **共享边界（拓扑共边）注意事项**：在对选中要素执行平移、旋转或缩放时，变换会话默认会拆分选中要素与未选中邻接要素之间的共享弧段（`splitSharedArcs: true`），从而只移动选中对象。如果你希望拖动公共边界时让相邻地块跟随一起变形，可将 `splitSharedArcs` 设为 `false`，详见[拓扑模型](../concepts/topology.md)。

## 3. 使用事务合并多步修改

当一次业务动作需要连续执行多个数据修改（例如先裁剪图层、再清理碎屑，或者同时修改几何与属性），且希望它们在历史栈中合并为**一步撤销**、任何一步失败都能完整回滚时，请使用 `map.beginTransaction()`：

```ts
const tx = map.beginTransaction();
try {
  const clipped = await map.ops.clipLayer({
    source: 'parcels', target: 'lots', mask: 'boundary',
  });
  if (!clipped.ok) {
    tx.rollback();
    console.error(clipped.error);
  } else {
    const committed = await tx.commit('Clip parcels');
    if (!committed.ok) console.error(committed.error);
  }
} catch (error) {
  if (tx.isOpen) tx.rollback();
  throw error;
}
```

使用事务时的关键规范：

1. **检查每一步的 `ok` 与 `commit()` 结果**：无论是事务内的 `map.ops.*` 还是最终的 `await tx.commit(label)`，都返回 `OpResult`，请务必检查 `ok` 字段。
2. **异常兜底回滚**：在 `catch` 块中通过 `if (tx.isOpen) tx.rollback()` 确保未关闭的事务被安全回滚。
3. **避免长时间挂起事务**：打开中的事务会阻止其他并发编辑操作，界面应在用户确认或取消后及时提交或回滚。

## 4. 历史管理与提交后几何验证

提交编辑后，应用可通过 `map.canUndo()`、`map.undo()`、`map.canRedo()` 和 `map.redo()` 控制撤销与重做，界面按钮与快捷键的绑定方法请参见[撤销与重做](../recipes/undo-redo.md)。

需要注意两个底层契约：

- **请勿直接篡改只读 Dataset**：`source.getDataset()` 返回的是只读实时视图，直接改动底层数组会破坏拓扑与版本状态；自定义低层 `EditCommand` 通常描述已应用的变更，仅将其压入历史栈不会自动替代首次执行。
- **几何验证器运行在提交之后**：注册拓扑验证器后，它会在提交完成后（`after-commit`）运行并通过 `validationfailed` 事件报告问题，不会自动回滚。验证是异步的，收到报告时可能已有后续编辑；先引导用户检查和修复，只有确认目标提交仍是最新历史项时才调用 `map.undo()`。

## 可运行示例

- [顶点编辑](/mapseekai/emap/examples/vertex-editing/)
- [撤销与重做](/mapseekai/emap/examples/undo-redo/)
- [事务](/mapseekai/emap/examples/transaction/)

## 实现依据

<span id="核心方法" />
<span id="handler-通用方法" />
<span id="绘制要素" />
<span id="handler-选项" />
<span id="一次性操作" />
<span id="拖动会话" />
<span id="撤销重做和快捷键" />
<span id="将多个操作作为一个动作" />
<span id="高级可撤销编辑" />
<span id="命令契约" />
<span id="内置命令选项" />
<span id="低层拓扑命令" />
<span id="支持契约" />
<span id="luma-示例的编辑刷新" />
<span id="luma-实验示例的深度缩放" />

- [`src/engine/map/map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/map.ts)
- [`src/domain/edit/transaction.ts`](https://github.com/mapseekai/emap/blob/master/src/domain/edit/transaction.ts)
- [`src/runtime/presets/index.ts`](https://github.com/mapseekai/emap/blob/master/src/runtime/presets/index.ts)
