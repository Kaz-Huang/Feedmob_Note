# 2026-10-14 center merge release

Released to `https://workweave.techmob.net/` after the divider release.

- Image: `workweave:20261014-center-merge` (`sha256:c5627162f93869d37e157179795ef27772b4c74d739c13fbf6e6ee8389682c45`).
- Container: `workweave`, user `node`, restart `unless-stopped`, loopback `127.0.0.1:3006` → container `3000`.
- Source SHA-256: `f846939b8a11dc0f515c93c318ede8e1dc46dd443f53543cf50e626e9d113caa`.
- Source: `/home/ubuntu/workweave/releases/20261014-center-merge/`.
- Backup: `/home/ubuntu/workweave/backups/20261014-center-merge/` (SQLite snapshot, previous proxy configuration, private container metadata, public static assets and build log).
- Rollback container: `workweave-rollback-20261014-divider-drag`, stopped, port `3005`.

## Interaction changes

- Removed black hover instructions from both block action buttons and removed their hover/Alt state. Native dragging can no longer leave that instruction visible after a missed mouseleave.
- Within the block's vertical middle, the central content area now creates a column to the right. Users need not travel to the far-right edge. The left rail is at most 32px / one fifth of block width; top and bottom edges continue to reorder vertically. Column gaps retain their existing insertion behavior.
- Beginning a drag closes an open block menu. Drop guides remain confined to active dragging and clear on release/cancel.

## Verification

- Type check, local production build, server Docker build and whitespace checks passed. The existing wide-block expectation was updated to reflect the requested interaction; no automated test suite was added or run.
- Real Chrome dragging at 25% and 75% of the target block's width produced the same right-side column result. Left insertion, upper-edge sorting and complete undo worked. Drop line/label disappeared after release; revisiting the handle and closing its menu did not restore a black instruction. All fixture edits stayed in the ignored local harness.
- Candidate and public checks passed for login HTML, 10 script assets, protected APIs returning 401, malformed bearer rejection and production Google callback host. Runtime environment values matched the previous container.
- A fresh authenticated production page loaded the current draft and editor without an alert. No log was submitted during this check. Prior static assets remain available for older browser sessions; users must refresh existing pages to load the changed editor.
- SQLite integrity was `ok`, with 3 users and 1 stored work log before and after cutover. No migration or seed ran.
- Only this domain's Caddy upstream changed. The shared proxy required a restart because its admin API is disabled; the peer HTTPS site returned 200 afterward. REA remained paused throughout this release.

## Rollback

1. Start `workweave-rollback-20261014-divider-drag` (port `3005`).
2. Change only this domain's upstream from `127.0.0.1:3006` to `127.0.0.1:3005`, preserving later changes to other domains.
3. Validate, restart Caddy and verify the site before stopping the current container:

```sh
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl restart caddy
docker stop workweave
docker rename workweave workweave-failed-20261014-center-merge
docker rename workweave-rollback-20261014-divider-drag workweave
```

The proxy restart briefly affects the other domains on this Caddy instance. Both versions share the live database; preserve subsequent user edits.
