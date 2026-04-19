const ALLOWED_IMAGE_DOMAINS = [
  "lh3.googleusercontent.com",
  "avatars.githubusercontent.com",
  "image.tmdb.org",
];

export function isAllowedBlogImageUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;

  const trimmed = url.trim();

  if (trimmed.startsWith("/api/blog/image/")) {
    return true;
  }

  try {
    const u = new URL(trimmed);
    return ALLOWED_IMAGE_DOMAINS.includes(u.hostname);
  } catch {
    return false;
  }
}

export function isAllowedBlogLinkUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;

  const trimmed = url.trim();

  if (trimmed.startsWith("/api/blog/image/")) {
    return true;
  }

  if (trimmed.startsWith("/")) {
    return true;
  }

  try {
    const u = new URL(trimmed);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
