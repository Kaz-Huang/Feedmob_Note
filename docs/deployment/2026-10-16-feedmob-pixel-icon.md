# 2026-10-16 FeedMob pixel icon

Released to `https://minework.techmob.net/`.

## Design and scope

- Replaced the grass-block mark with a pixel rendering of FeedMob's teal circular badge and white plus, using stepped edges, teal shading and a short extrusion.
- Reference: `https://feedmob.com/wp-content/uploads/2023/02/plus-logo-instagram.png`.
- Changed only `src/app/icon.svg` and `src/components/brand/MineworkMark.tsx` relative to the existing production release source. The shared component updates the login page, sidebar and top bar.
- Kept the production authentication environment, Caddy routing and database mount. No migration or seed ran.

## Deployment

- Image: `workweave:20261016-feedmob-pixel-icon`.
- Source: `/home/ubuntu/workweave/releases/20261016-feedmob-pixel-icon/`, copied from the prior icon release and overlaid with the two icon files.
- Active container: `workweave`, bound to `127.0.0.1:3008`.
- Stopped rollback container: `workweave-rollback-20261016-before-feedmob-icon`.
- Private container metadata and build log: `/home/ubuntu/workweave/backups/20261016-feedmob-pixel-icon/`.

## Verification

- Local Next.js build and production Docker build passed.
- Reviewed the SVG on light and dark backgrounds at large and favicon sizes.
- Candidate and production login pages use the new teal pixel mark. The public favicon matches the released SVG exactly: SHA256 `3184c3ab2dc35f166aaca2623213997f4103c82db2ed27499be6b527f54a9688`.
- The login page now references `/icon.svg?8c34cb669086021a`, replacing the prior favicon cache version.
- The Google callback remains `https://minework.techmob.net/api/auth/callback/google`; unauthenticated `/api/me` returns 401.
- The old hostname's login page remains available with HTTP 200.

## Rollback

1. Stop `workweave` and rename it to `workweave-failed-20261016-feedmob-pixel-icon`.
2. Rename `workweave-rollback-20261016-before-feedmob-icon` to `workweave` and start it.
3. Caddy and the environment file require no rollback change; both releases use port `3008` and the Minework canonical URL.
