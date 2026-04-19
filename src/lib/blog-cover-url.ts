export function isAllowedBlogCoverUrl(url: string): boolean {
  const u = url.trim();
  if (!u) return false;
  if (u.startsWith("/api/blog/image/")) return true;
  if (u.startsWith("https://") || u.startsWith("http://")) return true;
  return false;
}
