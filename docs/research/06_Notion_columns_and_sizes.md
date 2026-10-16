# Notion columns and block sizing — 2026-10-16

## Evidence and limits

- [Notion page formatting](https://www.notion.com/help/columns-headings-and-dividers): drag blocks sideways to create columns; drag the shared gray vertical guide to resize columns; a full-width blue guide means moving outside the columns.
- [Notion block API](https://developers.notion.com/reference/block#column-list-and-column): a column list owns columns, and each column owns its own child blocks. Optional `width_ratio` stores relative column width; absent ratios use equal widths.
- [Notion media](https://www.notion.com/help/images-files-and-media#arrange-and-resize): media can move into columns and exposes left/right sizing guides.
- Browser observation: the authenticated Feedmob workspace opened, but displayed its free block limit. The existing pages inspected contained no column groups. No Notion document was edited; no claim of a live drag experiment is made.

The independent stacking model follows from separate child sequences in the official data model, together with the documented column interaction. Text grows with content and available width. A column group ends below its tallest column; each column can contain several blocks above that boundary.

## Minework implementation

- Retain `columnList → column → block+`; existing log JSON remains valid.
- Give each column a natural-height content container plus a local append button. Stretch only the column hit area across the row height so the remaining space accepts clicks and drops.
- Dropping below a short column's final block inserts after that block within the column. The row's outer edge retains the existing full-row extraction behavior.
- Store positive flex weights in column `width` attributes, defaulting to equal weights. Adjust adjacent weights together, retaining their total and every other column's width.
- Provide pointer, keyboard, equalization, cancellation and history boundaries. Pointer capture keeps a resize active across iframe surfaces.
- Media `blockWidth` is a percentage of its containing column/page. Optional `blockHeight` controls the embed, graph viewport or displayed canvas. Whiteboard bitmap data and intrinsic drawing coordinates remain unchanged.
- Media height controls are a Minework affordance for the existing custom whiteboard, Mermaid and embed blocks. The official Notion media source establishes horizontal resize; it is not evidence that every Notion block has arbitrary width/height controls.
- Mobile columns stack in reading order; stored desktop ratios are retained.

Size attributes participate in the existing editor JSON, draft autosave and submit flow. No database migration is needed.
