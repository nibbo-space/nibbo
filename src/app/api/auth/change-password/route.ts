import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

const MIN_LEN = 8;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!row?.passwordHash) {
    return NextResponse.json({ error: "no_password" }, { status: 400 });
  }
  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = (await req.json()) as { currentPassword?: string; newPassword?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const currentPassword = String(body.currentPassword ?? "");
  const newPassword = String(body.newPassword ?? "");
  if (newPassword.length < MIN_LEN) {
    return NextResponse.json({ error: "password_too_short" }, { status: 400 });
  }
  const match = await bcrypt.compare(currentPassword, row.passwordHash);
  if (!match) {
    return NextResponse.json({ error: "wrong_password" }, { status: 401 });
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
  return NextResponse.json({ ok: true });
}
