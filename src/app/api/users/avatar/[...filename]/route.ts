import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyMobileAccessToken } from "@/lib/auth-mobile/jwt";
import { decodeBlobPath } from "@/lib/blob-path";
import { ensureUserFamily } from "@/lib/family";
import { readUploadFile } from "@/lib/upload-storage";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string[] }> }
) {
  let userId: string | null = null;

  const session = await auth();
  if (session?.user?.id) {
    userId = session.user.id;
  } else {
    const header = req.headers.get("authorization") ?? "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    const token = match?.[1]?.trim();
    if (token) {
      try {
        const payload = await verifyMobileAccessToken(token);
        userId = payload.sub;
      } catch {
        userId = null;
      }
    }
  }

  if (!userId) return new NextResponse(null, { status: 401 });

  const familyId = await ensureUserFamily(userId);
  if (!familyId) return new NextResponse(null, { status: 401 });

  const { filename } = await params;
  const token = Array.isArray(filename) ? filename.join("/") : filename;
  const pathname = decodeBlobPath(token);
  if (!pathname) return new NextResponse(null, { status: 404 });
  const segments = pathname.split("/");
  if (segments.length < 4 || segments[0] !== "avatars") return new NextResponse(null, { status: 404 });
  if (segments[1] !== familyId) return new NextResponse(null, { status: 403 });

  const file = await readUploadFile(pathname);
  if (!file) return new NextResponse(null, { status: 404 });
  return new NextResponse(file.stream, {
    status: 200,
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
