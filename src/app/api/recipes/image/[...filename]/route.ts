import { auth } from "@/lib/auth";
import { decodeBlobPath } from "@/lib/blob-path";
import { readUploadFile } from "@/lib/upload-storage";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string[] }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse(null, { status: 401 });
  }

  const { filename } = await params;
  const token = Array.isArray(filename) ? filename.join("/") : filename;
  const pathname = decodeBlobPath(token);
  if (!pathname) return new NextResponse(null, { status: 404 });
  const segments = pathname.split("/");
  if (segments.length < 4 || segments[0] !== "recipes") return new NextResponse(null, { status: 404 });

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
