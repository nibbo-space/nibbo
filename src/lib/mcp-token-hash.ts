import { createHash, randomBytes } from "node:crypto";

export function hashMcpReadToken(plain: string): string {
  return createHash("sha256").update(plain, "utf8").digest("hex");
}

export function generateMcpReadTokenPlain(): string {
  return `nib_${randomBytes(32).toString("base64url")}`;
}
