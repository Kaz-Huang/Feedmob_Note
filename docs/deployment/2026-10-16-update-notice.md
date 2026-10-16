# Column picker and update notice — 2026-10-16

## Column append behavior

The previous column append button reused an existing empty paragraph by placing the caret inside it. With an already-empty column this produced no visible new UI. An explicit click now opens the same slash block picker as the editor's other plus buttons, reusing the empty paragraph or adding one after existing content. Clicking the column's blank background continues to focus a plain paragraph.

## Website update prompt

- A shared application component checks `/api/version` every 60 seconds while the page is visible, and when returning to the tab or reconnecting.
- Each build embeds an identifier into the client and uses that same identifier as Next.js `BUILD_ID`. The version endpoint reads the running artifact's `.next/BUILD_ID` and returns `Cache-Control: no-store`. It returns only public build metadata, including when a session has expired.
- A differing server version displays “Minework 有新版本” with a “刷新更新” button. No automatic reload interrupts editing.
- The refresh button sends a synchronous, cancelable editor event. Current log JSON and page fields are saved to local draft storage before reload; a save in progress, active IME composition or failed draft write blocks reload with a message.
- Tabs opened before this feature was installed need one manual refresh. Subsequent releases can show the notification to those tabs.

Build mechanics use the documented Next.js [build identifier](https://nextjs.org/docs/app/api-reference/config/next-config-js/generateBuildId) and [compile-time environment](https://nextjs.org/docs/app/api-reference/config/next-config-js/env) behavior.

## Release

- Local `npm run build` completed, including TypeScript validation. The generated client update component contains the same identifier as `.next/BUILD_ID`.
- Release/image name: `20261016-update-notice`; production builds receive the committed Git revision as `MINEWORK_BUILD_VERSION`.
- The active environment file, database mount and port remain the existing deployment parameters. No database migration is needed.
- After the candidate and active release health checks pass, use the existing cleanup script to remove old source/images, temporary transfer artifacts and unused builder cache. No historical build backup is retained.
