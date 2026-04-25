import { deriveCredentialGate } from "@/lib/auth-gate";
import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { parseInviteEmailList, upsertFamilyInvitationWithNotify } from "@/lib/family-invite";
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
    select: {
      passwordHash: true,
      credentialSetupDeadline: true,
      accounts: { select: { provider: true } },
    },
  });
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const gate = deriveCredentialGate(row);
  if (gate.credentialExpired) {
    return NextResponse.json({ error: "credential_expired" }, { status: 403 });
  }
  if (!gate.mustSetPassword) {
    return NextResponse.json({ error: "not_required" }, { status: 400 });
  }
  let body: { password?: string; name?: string; inviteEmails?: string };
  try {
    body = (await req.json()) as { password?: string; name?: string; inviteEmails?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const password = String(body.password || "");
  if (password.length < MIN_LEN) {
    return NextResponse.json({ error: "password_too_short" }, { status: 400 });
  }
  const nameTrim = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      credentialSetupDeadline: null,
      ...(nameTrim ? { name: nameTrim } : {}),
    },
  });
  const familyId = await ensureUserFamily(userId);
  const inviteList =
    typeof body.inviteEmails === "string" ? parseInviteEmailList(body.inviteEmails) : [];
  if (familyId && inviteList.length) {
    const owner = await prisma.user.findUnique({
      where: { id: userId },
      select: { familyRole: true, familyId: true },
    });
    if (owner?.familyRole === "OWNER" && owner.familyId === familyId) {
      for (const em of inviteList) {
        await upsertFamilyInvitationWithNotify({
          familyId,
          invitedByUserId: userId,
          email: em,
        });
      }
    }
  }
  return NextResponse.json({ ok: true });
}
