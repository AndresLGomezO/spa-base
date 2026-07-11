/**
 * Pathname-only active route matching (ignore query/hash at the call site).
 * `/` matches exactly; other paths match exact or any subpath prefix.
 */
export function isActivePathMatch(
  pathname: string,
  matchPath: string,
): boolean {
  const path = pathname.trim();
  const match = matchPath.trim();
  if (match.length === 0) {
    return false;
  }
  if (match === "/") {
    return path === "/";
  }
  return path === match || path.startsWith(`${match}/`);
}
