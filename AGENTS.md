# Minework deployment

- Commit and push authorized code changes before publishing a release.
- User preference (2026-10-16): after a successful release, keep only the active application image and source release. Remove stopped Minework rollback/check containers, old application images, old source releases, transfer archives, temporary deployment scripts and build/configuration backups. Do not retain a growing history of build artifacts on the server.
- Preserve the active container, its bind-mounted database, current environment file and live proxy/TLS configuration. Git does not back up log data; existing database snapshots are separate from disposable build backups.
- Run `scripts/cleanup-releases.py` on the server to preview cleanup, inspect the plan, then use `sudo python3 /home/ubuntu/workweave/cleanup-releases.py --apply` after the new version is healthy. Some historical configuration backup directories are root-owned. The script targets `/home/ubuntu/workweave` and derives the active version from the running `workweave` container.
- `--prune-build-cache` additionally clears unused cache in the shared Docker builder. It never prunes volumes or unrelated application images/containers. Subsequent builds may need to download dependencies again.
- Build and publish from the committed revision so deleted artifacts can be rebuilt. Keep credentials and runtime data out of Git.
