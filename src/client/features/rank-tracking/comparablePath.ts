/** Path of a URL or of a path, without query and trailing slash. */
export function comparablePath(url: string): string {
  let path = url;
  try {
    path = new URL(url, "https://placeholder.invalid").pathname;
  } catch {
    // Keep the raw value; the comparison then just won't match.
  }
  const trimmed = path.replace(/\/+$/, "");
  return (trimmed === "" ? "/" : trimmed).toLowerCase();
}
