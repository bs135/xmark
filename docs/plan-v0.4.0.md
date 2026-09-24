# v0.4.0 Plan: About Dialog + Update Check Tip

## Goal
Add two features to xMark:
1. "About this app" dialog (app info, version, author, license, links).
2. Automatic update check on startup that shows a dismissible tip when a newer
   GitHub release is available.

## Approach
- **No Tauri updater plugin.** Use a lightweight frontend-only check against
  the public GitHub Releases API (`https://api.github.com/repos/bs135/xmark/releases/latest`)
  via `fetch()`. No Rust/capabilities changes needed (CSP is `null`, and the
  existing release workflow already publishes GitHub releases per tag).
- Compare the fetched `tag_name` (semver) against the baked-in
  `__APP_VERSION__` using a small manual semver comparator (no new npm dep).
- Dismissal of the update tip is **session-only** (in-memory state) — it
  reappears on next app launch if still outdated.
- About dialog is triggered by a new **Info icon button** in the `Header`.

## Files to add
- `src/utils/version.ts` — `compareVersions(a, b)` semver compare helper.
- `src/utils/updateCheck.ts` — `checkForUpdate()`: fetches latest GitHub
  release, returns `{ hasUpdate, latestVersion, releaseUrl }`; used both by
  the startup auto-check and a manual "Check for Updates" button in the About
  dialog.
- `src/components/layout/AboutDialog.tsx` — modal with app icon, name,
  version, tagline/description, author, license, GitHub repo link, and a
  "Check for Updates" button with inline status (checking / up to date /
  update available + link to release page).
- `src/components/layout/UpdateTipBanner.tsx` — small dismissible banner
  shown under the header when a newer version is detected, with a link/button
  to open the GitHub release page (via `@tauri-apps/plugin-opener`).

## Files to modify
- `src/components/layout/Header.tsx` — add Info icon button that opens
  `AboutDialog`.
- `src/App.tsx` — mount `UpdateTipBanner`; run one auto update-check on
  mount (fire-and-forget, non-blocking, fails silently offline).
- `src/i18n/locales/en.json` / `vi.json` — add `about.*` and `update.*`
  translation keys.
- `package.json` version bump handled by existing release workflow — no
  manual change needed for this feature (workflow bumps `0.4.0` on next tag).

## Notes / considerations
- Network failures (offline, rate-limited) during the update check are
  swallowed silently — no error UI, just skip showing the tip.
- Opening external links (GitHub repo / release page) uses
  `@tauri-apps/plugin-opener`'s `openUrl`, already permitted via existing
  `opener:default` capability — no capability file changes required.
- Author/license/description text pulled from `package.json` /
  `src-tauri/Cargo.toml` (`bs135`, existing license) to keep About dialog
  accurate without hardcoding duplicate info.
