# 2026-10-16 Empty-column deletion fix

Released to `https://minework.techmob.net/`.

## Problem and behavior

Deleting the only empty paragraph in a column removed its required `block+` content. ProseMirror immediately inserted an identical empty paragraph, so the delete menu appeared to do nothing. Selected-block deletion also deliberately retained this filler.

The menu and block-selection actions now share a sibling-range deletion routine. An explicit deletion removes the column when it removes all its blocks; the existing column cleanup unwraps a row with one remaining column. Other blocks, neighboring columns, rich formatting and a single-step undo are preserved. Intentional empty columns created by conversion remain editable until explicitly deleted.

## Verification

- Reproduced the failure with regression tests before the fix.
- All 56 tests passed, including the actual React menu click, local draft update, undo, selected-block Delete/Backspace, middle-column removal and preserving other blocks in the same column.
- Local Next.js build and production Docker build passed.
- Reviewed the server source diff: only `block-movement.ts` and `BlockSelection.ts` differ from the prior production source.
- Candidate and active containers passed login, icon, canonical OAuth callback and API protection checks.
- Verified the public asynchronous editor bundle contains the new deletion branch and matches the built artifact: `static/chunks/9081.d221093fc1275eb6.js`, SHA256 `e5f4ba4185a5400eb1cf5068a15a6f830358fe99f4c8ffb7e0f98a5b4780189c`.
- No production document or draft was modified during verification; tests used isolated fixtures. No database migration or seed ran.

## Deployment and rollback

- Image: `workweave:20261016-column-delete`.
- Source: `/home/ubuntu/workweave/releases/20261016-column-delete/`.
- Active container: `workweave`, loopback port `3008`, same environment and database bind mount.
- Stopped rollback container: `workweave-rollback-20261016-before-column-delete`.
- Private metadata and build log: `/home/ubuntu/workweave/backups/20261016-column-delete/`.

To roll back, stop and rename the active container, rename the retained rollback container to `workweave`, and start it. Caddy and the environment file remain valid for both versions.

Existing browser tabs need a refresh to load the new editor bundle. Draft storage keys and restoration behavior are unchanged.
