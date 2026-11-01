---
id: undo-redo
slug: /recipes/undo-redo
title: 撤销与重做
description: "管理编辑历史，使用事务组合修改并回滚失败操作。"
api: ["Emap", "HistoryControl", "HistoryControlOptions"]
examples: ["attribute-editing", "transaction", "undo-redo"]
stability: stable
verifiedVersion: unreleased
---

# 接入撤销与重做

Emap 的编辑历史栈会自动记录每一次通过编辑工具、`map.attributes` 或 `map.ops` 提交的可逆修改。在业务应用中，你可以直接使用内置的 `HistoryControl` 和快捷键绑定，也可以监听 `historychange` 事件将撤销/重做状态同步到自定义工具栏。

## 1. 使用内置历史控件与键盘快捷键

最省心的接入方式是挂载 `HistoryControl` 并调用 `map.bindHistoryShortcuts()` 启用键盘快捷键（如 `Ctrl+Z` / `Cmd+Z` 撤销，重做快捷键同理）：

```ts
import { HistoryControl } from '@mapseekai/emap';

await map.addControl(new HistoryControl(), 'top-right');
const unbind = map.bindHistoryShortcuts();
```

`bindHistoryShortcuts()` 将快捷键监听限制在当前地图交互范围内，并返回解绑函数 `unbind`。**在组件卸载时，请务必先调用 `unbind()`，再调用 `await map.dispose()`**，防止单页应用反复挂载组件时叠加多个重复的键盘监听器。

## 2. 同步自定义撤销与重做按钮

如果你的应用拥有自定义的顶部导航栏或编辑工具条，可以通过监听 `historychange` 事件，利用 `map.canUndo()` 和 `map.canRedo()` 动态更新按钮的可用状态：

```ts
function syncHistoryButtons() {
  undoButton.disabled = !map.canUndo();
  redoButton.disabled = !map.canRedo();
}
map.on('historychange', syncHistoryButtons);
syncHistoryButtons();
```

在按钮点击事件中分别调用 `map.undo()` 和 `map.redo()` 即可；组件卸载时请使用同一个 `syncHistoryButtons` 函数引用执行 `map.off('historychange', syncHistoryButtons)`。

## 3. 事务合并与外部数据替换的边界

在设计编辑工作流时，请留意以下三个历史状态边界：

1. **多步修改合并为一次撤销**：使用 `map.beginTransaction()` 将连续多步操作包裹在同一个事务中。只有当 `await transaction.commit(label)` 返回 `ok: true` 时，这批修改才会作为单条记录写入历史栈；如果用户在预览阶段取消或某一步执行失败，调用 `transaction.rollback()` 即可恢复原状，详见[编辑几何与管理事务](../guides/editing.md)。
2. **外部 `setData()` 替换会重置历史关联**：调用 `source.setData()` 从外部重新加载整份数据属于数据源级替换，会为该数据源建立新的历史、选择和高亮基线，不能指望通过 `map.undo()` 跨过 `setData()` 退回旧文件版本。
3. **内存历史不等于持久化保存**：撤销栈仅保存在当前浏览器会话内存中，跨页面的工程保存与服务端版本归档仍需由宿主应用通过[数据导出](../data/formats.md)或后端接口完成。

## 4. 验证撤销与重做行为

接入完成后，建议按以下顺序验证完整闭环：

- 连续执行几何绘制、顶点移动与属性修改，依次点击撤销与重做，核对画布几何、属性面板读数与要素选中状态是否准确恢复。
- 执行一次撤销后立即进行一项新的编辑修改，确认原有的重做（Redo）分支已被自动清空，`map.canRedo()` 变为 `false`。
- 对选中要素执行合并或拆分等改变要素数量的批量操作后，验证撤销与重做是否能正确还原选中引用。

## API

<span id="核心参数" />
<span id="核心方法" />
<span id="historychange-事件" />
<span id="更多事务" />

- `Emap`
- `HistoryControl`
- `HistoryControlOptions`

## 可运行示例

- [撤销与重做](/mapseekai/emap/examples/undo-redo/)
- [事务](/mapseekai/emap/examples/transaction/)
- [属性编辑](/mapseekai/emap/examples/attribute-editing/)

## 实现依据

- [`src/engine/map/map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/map.ts)
- [`src/domain/edit/transaction.ts`](https://github.com/mapseekai/emap/blob/master/src/domain/edit/transaction.ts)
