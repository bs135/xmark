/**
 * Disables browser-like WebView defaults that hurt desktop-app UX:
 * - The native right-click context menu (Back/Forward/Reload/Save as/Print/Inspect...).
 * - Reload shortcuts (F5, Ctrl/Cmd+R, Ctrl/Cmd+Shift+R) which would otherwise
 *   reset the app state via a full WebView reload.
 *
 * Applied uniformly in both development and production builds.
 */
export function disableWebviewDefaults(): void {
  window.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });

  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    const isReloadKey = key === 'f5';
    const isReloadShortcut = (event.ctrlKey || event.metaKey) && key === 'r';

    if (isReloadKey || isReloadShortcut) {
      event.preventDefault();
    }
  });
}
