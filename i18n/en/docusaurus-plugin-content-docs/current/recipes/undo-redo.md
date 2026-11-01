---
id: undo-redo
slug: /recipes/undo-redo
title: Undo and redo
description: "Manage edit history and use transactions to group changes or roll back failures."
api: ["Emap", "HistoryControl", "HistoryControlOptions"]
examples: ["attribute-editing", "transaction", "undo-redo"]
stability: stable
verifiedVersion: unreleased
---

# Undo and redo

Emap records committed geometry edits, attribute updates, and `map.ops` mutations in `EditHistory`. Keep your toolbar buttons synchronized with `map.canUndo()` and `map.canRedo()`, and unbind keyboard shortcuts when your component unmounts.

## Mount the built-in history control and shortcuts

Use `HistoryControl` to add ready-made Undo/Redo buttons, and call `map.bindHistoryShortcuts()` to enable standard keyboard shortcuts (`Ctrl/Cmd + Z` and `Ctrl/Cmd + Shift + Z` / `Ctrl/Cmd + Y`):

```ts
import { HistoryControl } from '@mapseekai/emap';

await map.addControl(new HistoryControl(), 'top-right');
const unbind = map.bindHistoryShortcuts();
```

Store the `unbind` function returned by `bindHistoryShortcuts()` and call `unbind()` during component teardown before `await map.dispose()` so remounting the component does not register duplicate key listeners.

## Synchronize custom Undo/Redo buttons

If you render your own toolbar buttons, wire their click handlers to `map.undo()` and `map.redo()`, and update their `disabled` state on `historychange`:

```ts
function syncHistoryButtons() {
  undoButton.disabled = !map.canUndo();
  redoButton.disabled = !map.canRedo();
}
map.on('historychange', syncHistoryButtons);
syncHistoryButtons();
```

Remember to call `map.off('historychange', syncHistoryButtons)` when your toolbar component unmounts.

## Group multi-step edits and understand history boundaries

- **Transactions**: Use `map.beginTransaction()` to combine several operations into a single undo entry. Only a successful `await tx.commit(label)` adds a history step; roll back failed or cancelled previews with `tx.rollback()`. See [Editing](../guides/editing.md).
- **External data replacement**: Calling `source.setData()` replaces the underlying dataset from outside the edit command pipeline; do not assume earlier edit steps remain undoable across an external file replacement.
- **Persistent storage**: Undo history lives in browser memory for the current workspace session. Exporting files or saving project snapshots to a backend remains an explicit application action.

## Verify undo and redo behavior

Perform a geometry or attribute edit, click Undo, and click Redo:

1. Confirm that geometry, attributes, and feature selection restore accurately.
2. Confirm that performing a new edit after Undo clears the obsolete Redo branch.

## API

<span id="core-parameters" />
<span id="core-methods" />
<span id="historychange-event" />
<span id="more-transactions" />

- `Emap`
- `HistoryControl`
- `HistoryControlOptions`

## Runnable examples

- [Undo and redo](/mapseekai/emap/examples/undo-redo/)
- [Transactions](/mapseekai/emap/examples/transaction/)
- [Attribute editing](/mapseekai/emap/examples/attribute-editing/)

## Implementation sources

- [`src/engine/map/map.ts`](https://github.com/mapseekai/emap/blob/master/src/engine/map/map.ts)
- [`src/domain/edit/transaction.ts`](https://github.com/mapseekai/emap/blob/master/src/domain/edit/transaction.ts)
