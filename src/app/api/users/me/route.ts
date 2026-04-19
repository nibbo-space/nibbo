import { auth } from "@/lib/auth";
import { isAllowedAssistantOllamaModel } from "@/lib/assistant-ollama-models";
import { ensureUserFamily } from "@/lib/family";
import { isSupportedCurrency } from "@/lib/exchange-rates";
import { normalizeProfileTimeZone } from "@/lib/profile-regional";
import { prisma } from "@/lib/prisma";
import { encryptUserSecret } from "@/lib/user-secret-crypto";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      color: true,
      emoji: true,
      familyId: true,
      displayCurrency: true,
      timeZone: true,
      personalApiEnabled: true,
      ollamaApiKeyEnc: true,
      ollamaModel: true,
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { ollamaApiKeyEnc: _k, ...rest } = user;
  return NextResponse.json({
    ...rest,
    ollamaKeyConfigured: Boolean(user.ollamaApiKeyEnc),
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const displayCurrencyRaw =
    body.displayCurrency !== undefined ? String(body.displayCurrency).trim().toUpperCase() : undefined;
  const displayCurrencyPatch =
    displayCurrencyRaw !== undefined && isSupportedCurrency(displayCurrencyRaw)
      ? displayCurrencyRaw
      : undefined;
  const timeZonePatch =
    body.timeZone !== undefined ? normalizeProfileTimeZone(String(body.timeZone)) : undefined;

  let ollamaApiKeyEncPatch: string | null | undefined;
  if (body.ollamaApiKey !== undefined) {
    const raw = body.ollamaApiKey === null ? "" : String(body.ollamaApiKey).trim();
    try {
      ollamaApiKeyEncPatch = raw ? encryptUserSecret(raw) : null;
    } catch {
      return NextResponse.json({ error: "Key storage failed" }, { status: 500 });
    }
  }

  let ollamaModelPatch: string | null | undefined;
  if (body.ollamaModel !== undefined) {
    const s = String(body.ollamaModel || "").trim();
    if (!s) {
      ollamaModelPatch = null;
    } else if (!isAllowedAssistantOllamaModel(s)) {
      return NextResponse.json({ error: "Invalid assistant model" }, { status: 400 });
    } else {
      ollamaModelPatch = s;
    }
  }

  const personalApiEnabledPatch =
    body.personalApiEnabled !== undefined ? Boolean(body.personalApiEnabled) : undefined;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(body.name !== undefined && { name: String(body.name).trim() || null }),
      ...(body.emoji !== undefined && { emoji: String(body.emoji) }),
      ...(body.color !== undefined && { color: String(body.color) }),
      ...(body.image !== undefined && { image: body.image ? String(body.image) : null }),
      ...(displayCurrencyPatch !== undefined && { displayCurrency: displayCurrencyPatch }),
      ...(timeZonePatch !== undefined && { timeZone: timeZonePatch }),
      ...(personalApiEnabledPatch !== undefined && { personalApiEnabled: personalApiEnabledPatch }),
      ...(ollamaApiKeyEncPatch !== undefined && { ollamaApiKeyEnc: ollamaApiKeyEncPatch }),
      ...(ollamaModelPatch !== undefined && { ollamaModel: ollamaModelPatch }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      color: true,
      emoji: true,
      familyId: true,
      displayCurrency: true,
      timeZone: true,
      personalApiEnabled: true,
      ollamaApiKeyEnc: true,
      ollamaModel: true,
    },
  });

  const { ollamaApiKeyEnc: _enc, ...rest } = user;
  return NextResponse.json({
    ...rest,
    ollamaKeyConfigured: Boolean(user.ollamaApiKeyEnc),
  });
}
