import { auth } from "@/lib/auth";
import { buildAssistantActionReference } from "@/lib/assistant-action-reference";
import { buildAssistantActionsPrompt } from "@/lib/assistant-actions-prompt";
import { buildFamilyContextForAssistant } from "@/lib/assistant-context";
import { resolveAssistantOllamaModel } from "@/lib/assistant-ollama-models";
import { buildAssistantSystemPrompt } from "@/lib/assistant-system-prompt";
import { ensureUserFamily } from "@/lib/family";
import { APP_LANGUAGE_COOKIE_KEY, messageLocale, type AppLanguage } from "@/lib/i18n";
import { resolveUiLanguageFromRequest } from "@/lib/languages";
import { prisma } from "@/lib/prisma";
import { decryptUserSecret } from "@/lib/user-secret-crypto";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
const lastRequestAt = new Map<string, number>();
const MIN_INTERVAL_MS = 1500;

type ChatMessage = { role: string; content: string };

function trimMessages(messages: unknown): ChatMessage[] {
  if (!Array.isArray(messages)) return [];
  const out: ChatMessage[] = [];
  for (const m of messages) {
    if (!m || typeof m !== "object") continue;
    const role = String((m as ChatMessage).role || "").toLowerCase();
    const content = String((m as ChatMessage).content || "").trim();
    if (!content || (role !== "user" && role !== "assistant")) continue;
    if (content.length > 8000) continue;
    out.push({ role, content: content.slice(0, 8000) });
  }
  return out.slice(-20);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const now = Date.now();
  const prev = lastRequestAt.get(session.user.id) ?? 0;
  if (now - prev < MIN_INTERVAL_MS) {
    return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 });
  }
  lastRequestAt.set(session.user.id, now);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { ollamaApiKeyEnc: true, ollamaModel: true },
  });
  if (!user?.ollamaApiKeyEnc) {
    return new Response(JSON.stringify({ error: "Assistant not configured" }), { status: 403 });
  }
  const apiKey = decryptUserSecret(user.ollamaApiKeyEnc);
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Invalid stored key" }), { status: 403 });
  }

  let body: { messages?: unknown; mode?: string };
  try {
    body = (await req.json()) as { messages?: unknown; mode?: string };
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const messages = trimMessages(body.messages);
  if (messages.length === 0) {
    return new Response(JSON.stringify({ error: "No messages" }), { status: 400 });
  }

  const [contextBase, actionRef] = await Promise.all([
    buildFamilyContextForAssistant(session.user.id, familyId),
    buildAssistantActionReference(session.user.id, familyId),
  ]);
  const context = `${contextBase}\n\n${actionRef}`;
  const mode = body.mode === "tamagotchi" ? "tamagotchi" : "default";
  const cookieStore = await cookies();
  const { language: resolvedLang } = await resolveUiLanguageFromRequest(
    cookieStore.get(APP_LANGUAGE_COOKIE_KEY)?.value,
    req.headers.get("accept-language")
  );
  const appLanguage: AppLanguage = messageLocale(resolvedLang);
  const model = resolveAssistantOllamaModel(user.ollamaModel, process.env.ASSISTANT_OLLAMA_MODEL);
  const siteName = process.env.NEXT_PUBLIC_APP_NAME || "Nibbo";
  const mascotName = "Nibby";

  const base = (process.env.ASSISTANT_OLLAMA_BASE_URL || "https://ollama.com").replace(/\/$/, "");
  const url = `${base}/api/chat`;

  const actionsPrompt = buildAssistantActionsPrompt(appLanguage, mode);
  const systemContent = buildAssistantSystemPrompt({
    mode,
    language: appLanguage,
    siteName,
    mascotName,
    context,
    actionsPrompt,
  });

  const ollamaMessages = [
    { role: "system", content: systemContent },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: ollamaMessages,
      stream: true,
    }),
  });

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => "");
    return new Response(JSON.stringify({ error: "Ollama error", detail: errText.slice(0, 500) }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!upstream.body) {
    return new Response(JSON.stringify({ error: "Empty response" }), { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
