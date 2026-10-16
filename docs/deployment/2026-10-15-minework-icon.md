# 2026-10-15 Minework icon and hostname cutover

## Released icon

- Added a pixel-art grass-block mark inspired by Minecraft to the browser icon, workspace sidebar, top bar, and login page.
- Allowed the public `/icon.svg` route through authentication middleware.
- Production image: `workweave:20261015-minework-icon` (`sha256:548f53ce56349dd5f4b307e281254346e6c67db5c0a4ebb85dc8cc1e55ff4eea`).
- Active container: `workweave`, bound to `127.0.0.1:3008`.
- Caddy routes both `workweave.techmob.net` and `minework.techmob.net` to the active container. The previous container is retained, stopped, as `workweave-rollback-20261015-minework-rebrand`.
- No database migration or data change was made.

## Verification

- Local Next.js build and production Docker build passed.
- Public `https://workweave.techmob.net/login` returned 200 and `https://workweave.techmob.net/icon.svg` returned `image/svg+xml` with 200.
- The unauthenticated `/api/me` endpoint returned 401.
- Cloudflare DNS now resolves `minework.techmob.net` to `13.58.220.167` (A, DNS only). Caddy was restarted after DNS propagation and issued the HTTPS certificate.
- Public `https://minework.techmob.net/login` returns 200, `/icon.svg` returns `image/svg+xml` with 200, and `/api/me` returns 401.

## Authentication and domain cutover

- Added `https://minework.techmob.net/api/auth/callback/google` to the existing `FeedMob WorkWeave Web` OAuth client's authorized redirect URIs, preserving the old callback.
- Updated `/home/ubuntu/workweave/workweave.env` to `NEXTAUTH_URL=https://minework.techmob.net` and recreated the active container from `workweave:20261015-minework-icon`, keeping the same database bind mount and port `127.0.0.1:3008`.
- The prior container remains stopped as `workweave-rollback-20261015-pre-minework-url`. The previous environment file is backed up at `/home/ubuntu/workweave/backups/20261015-minework-url-cutover/workweave.env.before`.
- Caddy continues to serve both `workweave.techmob.net` and `minework.techmob.net` through the active container.

- Both `https://minework.techmob.net/login` and `https://workweave.techmob.net/login` returned 200 after cutover.
- The production `/api/auth/providers` response reports the Minework Google sign-in and callback URLs.
- Completed Google sign-in on `minework.techmob.net` and returned to the authenticated Minework workspace.
- No database migration or data change was made.

## Rollback

1. Stop `workweave` and rename it to `workweave-failed-20261015-minework-url`.
2. Restore `/home/ubuntu/workweave/backups/20261015-minework-url-cutover/workweave.env.before` to `/home/ubuntu/workweave/workweave.env`.
3. Rename `workweave-rollback-20261015-pre-minework-url` to `workweave` and start it. Caddy already routes both hostnames to port `3008`.
