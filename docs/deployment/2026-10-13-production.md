# 2026-10-13 production release

Deployed the block editor and workspace UI improvements to `https://workweave.techmob.net/`.

## Release

- Image: `workweave:20261013-notion-ui`
- Container: `workweave`, bound to `127.0.0.1:3003` and serving port `3000` in the container.
- Caddy routes `workweave.techmob.net` to `127.0.0.1:3003`.
- The existing Google OAuth environment values were carried over unchanged. No credential values are stored in this repository.
- Production SQLite remains at `/home/ubuntu/workweave/data/dev.db`.
- Pre-deploy backup: `/home/ubuntu/workweave/backups/20261013-notion-ui/` (database snapshot, prior Caddyfile, container inspection, old static assets, and build log).
- Previous image `workweave:20260914-154333` and stopped container `workweave-rollback-20260914` are retained for rollback.

## Verification

- 43 automated tests passed; type check and production build passed.
- Public smoke check passed: login page and 10 script assets load, `/api/logs`, `/api/users`, and `/api/me` require authentication, malformed bearer auth is rejected, and Google OAuth callback uses the production host.
- Database integrity check returned `ok`; deployment preserved the two existing users and the existing zero-log count.
- Caddy was restarted to load the validated config because its admin API is disabled. The service is active and a second hosted HTTPS site returned HTTP 200 after restart.

## Rollback

The previous container still uses host port `3000`; restore the saved Caddyfile first to route traffic back to it, then start the rollback container and retire the current one:

```sh
sudo cp /home/ubuntu/workweave/backups/20261013-notion-ui/Caddyfile /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
docker start workweave-rollback-20260914
sudo systemctl restart caddy
docker stop workweave
docker rename workweave workweave-failed-20261013
docker rename workweave-rollback-20260914 workweave
```

The Caddy restart briefly interrupts all sites on this host because the Caddy admin API is disabled.
