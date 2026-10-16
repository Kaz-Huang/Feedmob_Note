# 2026-10-15 Minework branding release

Released to `https://workweave.techmob.net/`.

- Image: `workweave:20261015-minework-rebrand` (`sha256:37327b98334b76903a52245e5057ce8283a55e27ea7c397fa4de8fb04768545e`).
- Container: `workweave`, user `node`, restart `unless-stopped`, loopback `127.0.0.1:3007` → container `3000`.
- Source: `/home/ubuntu/workweave/releases/20261015-minework-rebrand/`.
- Backup: `/home/ubuntu/workweave/backups/20261015-minework-rebrand/` (verified SQLite snapshot, previous Caddyfile, private container metadata, previous static assets and build log).
- Previous container: `workweave-rollback-20261014-center-merge`, stopped on loopback port `3006`.
- The database schema was unchanged; no migration or seed ran.

## Changes and verification

- Renamed the sidebar and top-bar brand, browser title, login heading, weekly-summary heading and download filename to Minework.
- Local `npm run build` and the production Docker build passed.
- Candidate login HTML showed Minework and no old brand text. The protected `/api/me` endpoint returned 401 before and after cutover.
- The public login page returned Minework after the Caddy switch. `forum.techmob.net` returned 200 after the Caddy restart.
- Caddy configuration validation passed before restart. The restart briefly affected the other sites on this host.
- Docker reported 49 dependency advisories during `npm prune` (3 low, 39 moderate, 7 high); dependencies were not changed in this branding release.

## Rollback

1. Start `workweave-rollback-20261014-center-merge`.
2. Change only `workweave.techmob.net`'s Caddy upstream from `127.0.0.1:3007` to `127.0.0.1:3006`, validate the Caddyfile and restart Caddy.
3. Verify the public site, then stop the current `workweave` container and rename it to `workweave-failed-20261015-minework`.
4. Rename `workweave-rollback-20261014-center-merge` to `workweave`.

Both containers use the same live database. Preserve later user edits if restoring any database snapshot.
