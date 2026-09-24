/**
 * Minimal semver comparison, dependency-free.
 * Supports "x.y.z" (optionally prefixed with "v") and ignores any
 * pre-release/build metadata suffix (e.g. "1.2.0-beta.1" -> "1.2.0").
 */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) =>
    v
      .trim()
      .replace(/^v/i, '')
      .split(/[-+]/)[0]
      .split('.')
      .map((part) => parseInt(part, 10) || 0);

  const [aMajor, aMinor, aPatch] = parse(a);
  const [bMajor, bMinor, bPatch] = parse(b);

  if (aMajor !== bMajor) return aMajor - bMajor;
  if (aMinor !== bMinor) return aMinor - bMinor;
  return aPatch - bPatch;
}

/** Returns true when `latest` is strictly newer than `current`. */
export function isNewerVersion(current: string, latest: string): boolean {
  return compareVersions(latest, current) > 0;
}
