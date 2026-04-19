import { auth } from "@/lib/auth";
import { encodeBlobPath } from "@/lib/blob-path";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
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
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof Blob)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  let mime = file.type;
  if (!mime || !ALLOWED.has(mime)) {
    const guessed = inferImageFromBuffer(buf);
    if (guessed) mime = guessed.mime;
  }
  const ext = ALLOWED.get(mime);
  if (!ext) return NextResponse.json({ error: "Only JPEG, PNG, WebP, GIF" }, { status: 400 });

  const pathname = `avatars/${familyId}/${session.user.id}/${randomUUID()}${ext}`;
  try {
    await saveUploadFile(pathname, buf);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not save file to disk" }, { status: 500 });
  }
  const token = encodeBlobPath(pathname);
  const image = `/api/users/avatar/${token}`;
  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { image },
    select: { id: true, name: true, email: true, image: true, color: true, emoji: true },
  });
  return NextResponse.json(user);
}
