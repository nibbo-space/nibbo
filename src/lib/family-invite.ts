import { randomBytes } from "node:crypto";
import { createTransport } from "nodemailer";
import { cookies } from "next/headers";
import { syncFamilyMemberUnlocks } from "@/lib/achievements/evaluate";
import { getSmtpMailConfig } from "@/lib/auth-providers";
import { emailLogoInlinePng } from "@/lib/email-inline-logo";
import { APP_LANGUAGE_COOKIE_KEY, messageLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { getMetadataBaseUrl } from "@/lib/site-url";

export const FAMILY_INVITE_COOKIE = "nibbo_family_invite";

const INVITE_LINK_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const COOKIE_MAX_AGE_SEC = 14 * 24 * 60 * 60;

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type FamilyInviteEmailLocale = ReturnType<typeof messageLocale>;

async function familyInviteEmailLocale(explicit?: FamilyInviteEmailLocale): Promise<FamilyInviteEmailLocale> {
  if (explicit) return explicit;
  const c = await cookies();
  return messageLocale(c.get(APP_LANGUAGE_COOKIE_KEY)?.value ?? "");
}

function familyInviteIntroHtml(
  locale: FamilyInviteEmailLocale,
  familyName: string,
  inviterLabel: string,
  appName: string
) {
  const f = esc(familyName);
  const i = esc(inviterLabel);
  const a = esc(appName);
  if (locale === "en") {
    return `You're invited to join the family <strong>${f}</strong> on ${a} from ${i}.`;
  }
  if (locale === "ja") {
    return `${i}から、${a}の家族「<strong>${f}</strong>」への招待です。`;
  }
  return `Запрошення до сім'ї <strong>${f}</strong> від ${i}.`;
}

function familyInviteCta(locale: FamilyInviteEmailLocale) {
  if (locale === "en") return "Accept invitation";
  if (locale === "ja") return "招待を受け取る";
  return "Прийняти запрошення";
}

function familyInviteFooter(locale: FamilyInviteEmailLocale) {
  if (locale === "en") {
    return "After you sign in or register with this email, you will join the family automatically.";
  }
  if (locale === "ja") {
    return "このメールアドレスでログインまたは登録すると、家族に参加します。";
  }
  return "Після входу або реєстрації з цим email ти одразу потрапиш у сім'ю.";
}

function familyInviteSubject(locale: FamilyInviteEmailLocale, appName: string) {
  if (locale === "en") return `${appName} · Family invitation`;
  if (locale === "ja") return `${appName} · 家族への招待`;
  return `${appName} · запрошення у сім'ю`;
}

function familyInviteInviterFallback(locale: FamilyInviteEmailLocale) {
  if (locale === "en") return "a family member";
  if (locale === "ja") return "家族のメンバー";
  return "учасника сім'ї";
}

function familyInviteDefaultFamilyName(locale: FamilyInviteEmailLocale) {
  if (locale === "en") return "Family";
  if (locale === "ja") return "家族";
  return "Сім'я";
}

function familyInviteTextBody(
  locale: FamilyInviteEmailLocale,
  appName: string,
  familyName: string,
  inviterLabel: string,
  url: string,
  origin: string
) {
  const a = appName;
  const f = familyName;
  const i = inviterLabel;
  if (locale === "en") {
    return `${a} — you're invited to join "${f}" by ${i}\n\n${url}\n\n${origin}`;
  }
  if (locale === "ja") {
    return `${a} — ${i}から家族「${f}」への招待です。\n\n${url}\n\n${origin}`;
  }
  return `${a} — запрошення до сім'ї «${f}» від ${i}\n\n${url}\n\n${origin}`;
}

function newInviteToken() {
  return randomBytes(24).toString("hex");
}

export type FamilyInviteAcceptResult =
  | {
      ok: true;
      switched: boolean;
      previousFamilyDeleted?: boolean;
      newAchievementIds: string[];
    }
  | { ok: false; error: string; status: number };

async function acceptFamilyInvitationCore(
  me: { id: string; email: string; familyId: string | null; familyRole: "OWNER" | "MEMBER" },
  invite: { id: string; familyId: string }
): Promise<FamilyInviteAcceptResult> {
  if (me.familyId === invite.familyId) {
    await prisma.familyInvitation.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
    const newAchievementIds = await syncFamilyMemberUnlocks(invite.familyId);
    return { ok: true, switched: false, newAchievementIds };
  }

  const currentFamilyId = me.familyId;
  if (!currentFamilyId) {
    await prisma.user.update({
      where: { id: me.id },
      data: { familyId: invite.familyId, familyRole: "MEMBER" },
    });
    await prisma.familyInvitation.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
    const newAchievementIds = await syncFamilyMemberUnlocks(invite.familyId);
    return {
      ok: true,
      switched: true,
      previousFamilyDeleted: false,
      newAchievementIds,
    };
  }

  const [membersCount, isOwner] = await Promise.all([
    prisma.user.count({ where: { familyId: currentFamilyId } }),
    Promise.resolve(me.familyRole === "OWNER"),
  ]);
  if (isOwner && membersCount > 1) {
    return {
      ok: false,
      error:
        "Ти власник сім'ї з іншими учасниками. Передай власність або видали учасників перед переходом.",
      status: 409,
    };
  }

  let previousFamilyDeleted = false;
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: me.id },
      data: { familyId: invite.familyId, familyRole: "MEMBER" },
    });
    await tx.familyInvitation.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
    const leftMembers = await tx.user.count({ where: { familyId: currentFamilyId } });
    if (leftMembers === 0) {
      await tx.family.delete({ where: { id: currentFamilyId } });
      previousFamilyDeleted = true;
    }
  });

  const newAchievementIds = await syncFamilyMemberUnlocks(invite.familyId);
  return { ok: true, switched: true, previousFamilyDeleted, newAchievementIds };
}

export async function acceptFamilyInvitationById(
  userId: string,
  inviteId: string
): Promise<FamilyInviteAcceptResult> {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, familyId: true, familyRole: true },
  });
  if (!me?.email) return { ok: false, error: "User email required", status: 400 };
  const emailLower = me.email.toLowerCase();
  const invite = await prisma.familyInvitation.findFirst({
    where: { id: inviteId, email: emailLower, acceptedAt: null },
    select: { id: true, familyId: true },
  });
  if (!invite) return { ok: false, error: "Invite not found", status: 404 };
  return acceptFamilyInvitationCore(
    { id: me.id, email: emailLower, familyId: me.familyId, familyRole: me.familyRole },
    invite
  );
}

export async function acceptFamilyInvitationByToken(
  userId: string,
  userEmailLower: string,
  inviteToken: string
): Promise<FamilyInviteAcceptResult> {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, familyId: true, familyRole: true },
  });
  if (!me?.email || me.email.toLowerCase() !== userEmailLower) {
    return { ok: false, error: "Email mismatch", status: 403 };
  }
  const invite = await prisma.familyInvitation.findFirst({
    where: { inviteToken, email: userEmailLower, acceptedAt: null },
    select: { id: true, familyId: true },
  });
  if (!invite) return { ok: false, error: "Invite not found", status: 404 };
  return acceptFamilyInvitationCore(
    { id: me.id, email: userEmailLower, familyId: me.familyId, familyRole: me.familyRole },
    invite
  );
}

function buildFamilyInviteHtml(opts: {
  locale: FamilyInviteEmailLocale;
  appName: string;
  origin: string;
  familyName: string;
  inviterLabel: string;
  inviteeEmail: string;
  url: string;
  logoImgSrc: string | null;
}) {
  const { locale, appName, origin, familyName, inviterLabel, inviteeEmail, url, logoImgSrc } = opts;
  const htmlLang = locale === "en" ? "en" : locale === "ja" ? "ja" : "uk";
  const logoBlock = logoImgSrc
    ? `<img src="${esc(logoImgSrc)}" alt="" width="72" height="72" style="display:block;margin:0 auto 20px;border-radius:16px;">`
    : "";
  const intro = familyInviteIntroHtml(locale, familyName, inviterLabel, appName);
  const cta = esc(familyInviteCta(locale));
  const footer = esc(familyInviteFooter(locale));
  return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(appName)}</title>
</head>
<body style="margin:0;background:#fdf8f3;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Ukraine,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fdf8f3;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background:#ffffff;border-radius:24px;border:1px solid #fce7f3;box-shadow:0 12px 40px rgba(244,63,94,0.08);">
<tr><td style="padding:36px 28px 32px;text-align:center;">
${logoBlock}
<p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#44403c;">${esc(appName)}</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#78716b;">${intro}</p>
<p style="margin:0 0 20px;font-size:12px;color:#a8a29e;">${esc(inviteeEmail)}</p>
<table role="presentation" cellspacing="0" cellpadding="0" align="center"><tr><td style="border-radius:16px;background:#e11d48;">
<a href="${esc(url)}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:16px;">${cta}</a>
</td></tr></table>
<p style="margin:28px 0 0;font-size:12px;line-height:1.5;color:#a8a29e;">${footer}</p>
<p style="margin:16px 0 0;font-size:11px;color:#d6d3d1;">${esc(origin)}</p>
</td></tr></table>
</td></tr></table>
</body>
</html>`;
}

function buildFamilyInviteText(opts: {
  locale: FamilyInviteEmailLocale;
  appName: string;
  origin: string;
  familyName: string;
  inviterLabel: string;
  url: string;
}) {
  return familyInviteTextBody(opts.locale, opts.appName, opts.familyName, opts.inviterLabel, opts.url, opts.origin);
}

export async function sendFamilyInviteEmail(params: {
  to: string;
  inviteToken: string;
  familyName: string;
  inviterName: string | null;
  inviterEmail: string | null;
  locale: FamilyInviteEmailLocale;
}) {
  const cfg = getSmtpMailConfig();
  if (!cfg) return { sent: false as const };
  const origin = getMetadataBaseUrl().origin.replace(/\/$/, "");
  const appName = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Nibbo";
  const url = `${origin}/api/invites/attest?token=${encodeURIComponent(params.inviteToken)}`;
  const inviterLabel =
    params.inviterName?.trim() || params.inviterEmail || familyInviteInviterFallback(params.locale);
  const transport = createTransport(cfg.server);
  const subject = familyInviteSubject(params.locale, appName);
  const logo = await emailLogoInlinePng();
  const result = await transport.sendMail({
    to: params.to,
    from: cfg.from,
    subject,
    text: buildFamilyInviteText({
      locale: params.locale,
      appName,
      origin,
      familyName: params.familyName,
      inviterLabel,
      url,
    }),
    html: buildFamilyInviteHtml({
      locale: params.locale,
      appName,
      origin,
      familyName: params.familyName,
      inviterLabel,
      inviteeEmail: params.to,
      url,
      logoImgSrc: logo.ok ? logo.imgSrc : null,
    }),
    attachments: logo.ok ? logo.attachments : undefined,
  });
  const rejected = result.rejected || [];
  const pending = result.pending || [];
  const failed = rejected.concat(pending).filter(Boolean);
  if (failed.length) {
    throw new Error(`Email (${failed.join(", ")}) could not be sent`);
  }
  return { sent: true as const };
}

export async function upsertFamilyInvitationWithNotify(params: {
  familyId: string;
  invitedByUserId: string;
  email: string;
  emailLocale?: FamilyInviteEmailLocale;
}): Promise<{
  id: string;
  email: string;
  createdAt: Date;
  inviteToken: string | null;
  emailSent: boolean;
  blockedReason: "already_in_family" | null;
}> {
  const email = params.email.trim().toLowerCase();
  const inviteToken = newInviteToken();
  const existingUser = await prisma.user.findFirst({
    where: { email },
    select: { id: true, familyId: true },
  });
  if (existingUser?.familyId && existingUser.familyId === params.familyId) {
    return {
      id: "",
      email,
      createdAt: new Date(),
      inviteToken: null,
      emailSent: false,
      blockedReason: "already_in_family",
    };
  }
  const invite = await prisma.familyInvitation.upsert({
    where: { familyId_email: { familyId: params.familyId, email } },
    update: { invitedById: params.invitedByUserId, acceptedAt: null, inviteToken },
    create: {
      familyId: params.familyId,
      invitedById: params.invitedByUserId,
      email,
      inviteToken,
    },
    select: { id: true, email: true, createdAt: true, inviteToken: true },
  });
  const token = invite.inviteToken;
  let emailSent = false;
  if (token) {
    try {
      const locale = await familyInviteEmailLocale(params.emailLocale);
      const [family, inviter] = await Promise.all([
        prisma.family.findUnique({
          where: { id: params.familyId },
          select: { name: true },
        }),
        prisma.user.findUnique({
          where: { id: params.invitedByUserId },
          select: { name: true, email: true },
        }),
      ]);
      const familyName = family?.name?.trim() || familyInviteDefaultFamilyName(locale);
      await sendFamilyInviteEmail({
        to: email,
        inviteToken: token,
        familyName,
        inviterName: inviter?.name ?? null,
        inviterEmail: inviter?.email ?? null,
        locale,
      });
      emailSent = true;
    } catch {
      emailSent = false;
    }
  }
  return {
    id: invite.id,
    email: invite.email,
    createdAt: invite.createdAt,
    inviteToken: invite.inviteToken,
    emailSent,
    blockedReason: null,
  };
}

export function parseInviteEmailList(raw: string, max = 20): string[] {
  const parts = raw
    .split(/[\s,;]+/g)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.includes("@"));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
    if (out.length >= max) break;
  }
  return out;
}

export async function validateFamilyInviteAttestToken(token: string) {
  const row = await prisma.familyInvitation.findFirst({
    where: { inviteToken: token, acceptedAt: null },
    select: { id: true, createdAt: true, email: true },
  });
  if (!row) return { ok: false as const, reason: "not_found" as const };
  if (Date.now() - row.createdAt.getTime() > INVITE_LINK_MAX_AGE_MS) {
    return { ok: false as const, reason: "expired" as const };
  }
  return { ok: true as const, email: row.email };
}

export function familyInviteCookieOptions() {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: COOKIE_MAX_AGE_SEC,
  };
}

export async function applyFamilyInviteCookieIfPresent(
  userId: string,
  email: string | null | undefined
): Promise<boolean> {
  if (!email) return false;
  const emailLower = email.trim().toLowerCase();
  const cookieStore = await cookies();
  const token = cookieStore.get(FAMILY_INVITE_COOKIE)?.value;
  if (!token) return false;
  const result = await acceptFamilyInvitationByToken(userId, emailLower, token);
  return result.ok;
}

