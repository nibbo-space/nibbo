import { isUserAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { encodeBlobPath } from "@/lib/blob-path";
import { inferImageFromBuffer } from "@/lib/image-magic-ext";
import { saveUploadFile } from "@/lib/upload-storage";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Map<string, string>([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isUserAdmin(session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  let mime = file.type;
  if (!mime || !ALLOWED.has(mime)) {
    const guessed = inferImageFromBuffer(buf);
    if (guessed) mime = guessed.mime;
  }
  const ext = ALLOWED.get(mime);
  if (!ext) {
    return NextResponse.json({ error: "Only JPEG, PNG, WebP, GIF" }, { status: 400 });
  }

  const pathname = `blog/${session.user.id}/${randomUUID()}${ext}`;
  try {
    await saveUploadFile(pathname, buf);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not save file" }, { status: 500 });
  }
  const token = encodeBlobPath(pathname);
  return NextResponse.json({ url: `/api/blog/image/${token}` });
}
