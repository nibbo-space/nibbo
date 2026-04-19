export function encodeBlobPath(pathname: string): string {
  return Buffer.from(pathname, "utf8").toString("base64url");
}

export function decodeBlobPath(token: string): string | null {
  const normalized = token.trim();
  if (!normalized) return null;
  const candidates = [normalized, normalized.replace(/-/g, "+").replace(/_/g, "/")];
  try {
    for (const value of candidates) {
      const pathname = Buffer.from(value, "base64").toString("utf8");
      if (!pathname) continue;
      if (pathname.includes("..") || pathname.startsWith("/") || pathname.includes("\\")) {
        continue;
      }
      return pathname;
    }
    return null;
  } catch {
    return null;
  }
}
