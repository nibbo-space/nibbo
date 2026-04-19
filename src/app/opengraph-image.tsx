import { ogShareImageResponse, OG_ALT, OG_SIZE } from "@/lib/og-share-card";

export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = "image/png";
export const runtime = "nodejs";

export default function Image() {
  return ogShareImageResponse();
}
