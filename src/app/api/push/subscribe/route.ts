import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { isWebPushConfigured } from "@/lib/push/vapid";
import { NextRequest, NextResponse } from "next/server";

type PushSubBody = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

export async function POST(req: NextRequest) {
  if (!isWebPushConfigured()) {
    return NextResponse.json({ error: "push_not_configured" }, { status: 503 });
  }
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { subscription?: PushSubBody; locale?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sub = body.subscription;
  const endpoint = typeof sub?.endpoint === "string" ? sub.endpoint.trim() : "";
  const p256dh = typeof sub?.keys?.p256dh === "string" ? sub.keys.p256dh.trim() : "";
  const keyAuth = typeof sub?.keys?.auth === "string" ? sub.keys.auth.trim() : "";
  if (!endpoint || !p256dh || !keyAuth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const localeRaw = typeof body.locale === "string" ? body.locale.trim().toLowerCase() : "";
  const locale = localeRaw === "en" ? "en" : "uk";
  const userAgent = req.headers.get("user-agent")?.slice(0, 512) ?? null;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: session.user.id,
      endpoint,
      p256dh,
      auth: keyAuth,
      locale,
      userAgent,
    },
    update: {
      userId: session.user.id,
      p256dh,
      auth: keyAuth,
      locale,
      userAgent,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let endpoint = "";
  try {
    const body = await req.json();
    endpoint = typeof body.endpoint === "string" ? body.endpoint.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!endpoint) {
    return NextResponse.json({ error: "endpoint required" }, { status: 400 });
  }
  await prisma.pushSubscription.deleteMany({
    where: { userId: session.user.id, endpoint },
  });
  return NextResponse.json({ ok: true });
}
