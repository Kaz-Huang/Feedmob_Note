# Account ownership and administrator panel — 2026-10-16

## Identity and permissions

- Resolve the acting user from the signed Google session and database for every business API request. New SSO users start as members; no default administrator is created by a directory read.
- The workspace identity stays bound to `/api/me`. Remove member switching and the local-storage identity fallback. Profile updates can refresh only that same user.
- Logs, comments and reactions always use the authenticated user's ID. A supplied different `userId` returns 403, including for administrators. Team logs remain readable to signed-in colleagues.
- The normal profile endpoint can change only the current user's name/title. Roles, email identity and team assignments are not writable through it.
- Administrator APIs check the role in the database, independently of client controls. The panel supports member creation, names/titles, roles, team assignments, team creation/editing, and aggregate counts.
- Prevent self-demotion, removing the last corporate administrator, and assigning administrator privileges to historical local accounts. Role updates recheck administrator authority inside the transaction.
- Existing names are retained on sign-in instead of being overwritten by the Google profile.

## Account menu

The old menu treated a focus move from its name input back to its trigger button as leaving the menu. Blur closed it before the trigger click toggled it open again. The blur boundary now includes both the trigger and dialog. A second click closes it; outside clicks and Escape retain their dismissal behavior.

## Operator bootstrap and release

The owner's existing Google account is promoted with the operator-only `scripts/set-admin.mjs` command, using an explicitly supplied corporate email. The same transaction downgrades obsolete `@workspace.local` administrator labels without deleting any users or logs. No email is hard-coded in the application authorization rules.

Run only when the account owner/operator has authorized the assignment:

```bash
docker exec workweave node scripts/set-admin.mjs OWNER_CORPORATE_EMAIL
```

Local `npm run build` completed, including TypeScript validation. No database schema migration or seed is needed. Publish the committed revision as `20261016-admin-access`, preserve the existing environment/database binding, then remove old build artifacts using the retained cleanup script. The public version endpoint and existing update prompt carry the new revision to already-open clients.
