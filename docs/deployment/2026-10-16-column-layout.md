# Independent columns and block sizing — 2026-10-16

## Changes

- Short columns expose a local append control and a full-height hit area; added text stays immediately below that column's content.
- Blank space below a short column accepts vertical block drops into that column. Outer row-edge drops retain the full-width behavior.
- Adjacent columns resize through a shared separator, with pointer capture, minimum widths, keyboard adjustment, equalization and Escape cancellation.
- Embed, Mermaid and whiteboard blocks expose horizontal and corner sizing controls. Bookmarks resize horizontally only.
- Width and height attributes are included in existing draft and submitted JSON. A resize previews in the DOM and commits one undoable document change on release.
- On mobile, columns stack in reading order without discarding desktop width ratios.

Design sources and research limitations are recorded in [Notion columns and sizes](../research/06_Notion_columns_and_sizes.md).

## Build and release

- Local `npm run build` completed successfully, including Next.js TypeScript validation.
- Release source: `/home/ubuntu/workweave/releases/20261016-column-layout/`, based on `20261016-column-delete` plus eleven reviewed source files.
- Image: `workweave:20261016-column-layout`.
- Existing environment file, loopback port `3008` and database mount are retained; no schema migration or seed command is needed.
- Previous image and a stopped rollback container are retained as `workweave-rollback-20261016-before-column-layout` after cutover.
- Build log and private container metadata: `/home/ubuntu/workweave/backups/20261016-column-layout/`.

Existing browser tabs need a refresh. A rollback uses the retained previous container with the same database mount. Existing browser drafts retain the additional attributes until a version supporting them reopens them.


## Retention policy updated later on 2026-10-16

At the user's request, the stopped rollback containers, old images/releases, transfer archives and build/configuration backups described above were retired after the release was healthy and source was pushed. The active release remains in place. Database snapshots are kept separately under `/home/ubuntu/workweave/database-backups/`; rebuild older code from Git instead of using the historical rollback commands. See [current cleanup policy](../../README.md#发布产物保留策略).
