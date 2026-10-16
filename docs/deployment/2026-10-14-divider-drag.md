# 2026-10-14 divider and drag release

Released to `https://workweave.techmob.net/`. REA was paused at the user's request; this release used project source, local command reproductions and Chrome interaction checks.

- Image: `workweave:20261014-divider-drag` (`sha256:7143c7fa0e33397789cf1aa9de3800e5f60239c32e1f3fde9ad86e8593e5e1dd`).
- Container: `workweave`, user `node`, restart `unless-stopped`, loopback `127.0.0.1:3005` → container `3000`.
- Source SHA-256: `4ef994346db202a851d139ff31f7912a0a61f35694e81776b0a29c845cd6c26d`.
- Source: `/home/ubuntu/workweave/releases/20261014-divider-drag/`.
- Backup: `/home/ubuntu/workweave/backups/20261014-divider-drag/` (SQLite snapshot, previous Caddyfile, private container metadata, public static assets and build log).
- Previous container: `workweave-rollback-20261013-columns`, stopped and retained on loopback port `3004`.

## Changes and verification

- Restored paragraph as the schema's default block by separating toggle keyboard priority from node registration. This fixes invalid empty toggles created after a divider and repairs missing toggle titles on document load without discarding body content.
- Atom selection Enter reuses the following text block or creates a paragraph below. Keyboard and mouse agree on the first text block of toggle/callout/blockquote containers.
- Both sides have gutters; side zones are 20% of width, capped at 120px and one third of narrow columns. Column gaps resolve independently of the dragged source, with an explicit vertical guide and label. Stacked mobile columns use vertical hit distances.
- Invalid structural swaps and copies are rejected, the final deleted list item removes its wrapper, ordered-list item numbering survives conversion/drag into columns, and duplicate/delete menus restore editor focus. Optional browser preferences tolerate unavailable storage.
- 17 slash-command flows after divider creation produced valid ProseMirror documents. Chrome verified code insertion and typing below a divider, right-side middle drops, inter-column drops, extraction from a column, complete undo, collapsed-title Enter and matching preview/commit placement. Fixture content remained in the ignored local harness.
- Type check, local production build, server Docker build and whitespace checks passed. No automated test suite was added or run for this release.
- Candidate and public HTTP checks passed: login HTML, 10 scripts, protected APIs returning 401 and production Google callback host. Runtime environment values matched the previous container; no credentials were printed or moved off the server.
- A fresh authenticated production tab loaded the existing account and current local draft, with the new `46px` right gutter and no load error. No log was submitted during this check.
- SQLite integrity was `ok`, with 3 users and 1 stored work log before and after cutover. No schema migration or seed ran.
- Previous static assets were copied into the candidate for existing browser sessions. Only this domain's Caddy upstream changed; the shared proxy required a restart because its admin API is disabled. The peer HTTPS site returned 200 afterward.

## Rollback

1. Start `workweave-rollback-20261013-columns` (port `3004`).
2. Change only `workweave.techmob.net`'s Caddy upstream from `127.0.0.1:3005` to `127.0.0.1:3004`, preserving changes to other domains.
3. Validate and restart Caddy, then verify the site before stopping the current container:

```sh
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl restart caddy
docker stop workweave
docker rename workweave workweave-failed-20261014-divider-drag
docker rename workweave-rollback-20261013-columns workweave
```

The proxy restart briefly affects the other domains hosted by this Caddy instance. Both versions use the same live database; preserve later user edits when deciding whether a database restoration is needed.
