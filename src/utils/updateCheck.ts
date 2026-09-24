import { isNewerVersion } from './version';

const REPO = 'bs135/xmark';
const LATEST_RELEASE_URL = `https://api.github.com/repos/${REPO}/releases/latest`;

export interface UpdateCheckResult {
  hasUpdate: boolean;
  latestVersion: string | null;
  releaseUrl: string | null;
}

const NO_UPDATE: UpdateCheckResult = {
  hasUpdate: false,
  latestVersion: null,
  releaseUrl: null,
};

/**
 * Checks GitHub Releases for a newer published version than the one baked
 * into this build (`__APP_VERSION__`). Never throws — network failures,
 * rate limiting, or unexpected payloads all resolve to "no update".
 */
export async function checkForUpdate(): Promise<UpdateCheckResult> {
  try {
    const res = await fetch(LATEST_RELEASE_URL, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) return NO_UPDATE;

    const data: { tag_name?: string; html_url?: string } = await res.json();
    const tag = data.tag_name;
    if (!tag) return NO_UPDATE;

    const latestVersion = tag.replace(/^v/i, '');
    if (!isNewerVersion(__APP_VERSION__, latestVersion)) return NO_UPDATE;

    return {
      hasUpdate: true,
      latestVersion,
      releaseUrl: data.html_url ?? `https://github.com/${REPO}/releases/tag/${tag}`,
    };
  } catch {
    return NO_UPDATE;
  }
}
