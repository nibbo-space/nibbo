"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { MessageCircle, RotateCcw, Send, X } from "lucide-react";
import toast from "react-hot-toast";
import type { AssistantActionsEnvelope } from "@/lib/assistant-action-parse";
import {
  streamingActionCutIndex,
  stripAssistantActionFromText,
} from "@/lib/assistant-action-parse";
import { useUserPreferences } from "@/components/shared/UserPreferencesProvider";
import { useCozyConfig } from "@/hooks/useCozyConfig";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { ACHIEVEMENT_UNLOCK_EVENT, type AchievementUnlockDetail } from "@/lib/achievement-unlock-events";
import { messageLocale, I18N } from "@/lib/i18n";
import {
  awaitMascotSpeakMinDuration,
  flushMascotSpeakCoalesced,
  pushMascotSpeakDelta,
  startMascotSpeakAudio,
  stopMascotSpeakAudio,
  warmupMascotSpeakAudio,
} from "@/lib/mascot-speak-audio";
import { readOllamaStream } from "@/lib/ollama-stream-read";
import { AssistantMarkdownMessage } from "@/components/shared/AssistantMarkdownMessage";
import type { NibbyChatDrive } from "@/components/shared/NibbyAssistantStage";
import { useFocusModeActive } from "@/components/shared/FocusModeProvider";

const NibbyAssistantStage = dynamic(() => import("./NibbyAssistantStage"), {
  ssr: false,
  loading: () => (
    <div className="h-full min-h-[160px] w-full animate-pulse rounded-3xl bg-gradient-to-b from-sky-50 via-white to-cyan-50" />
  ),
});

type ChatMsg = { role: "user" | "assistant"; content: string };

type AssistantBuddyContextValue = {
  openBuddy: () => void;
};

const AssistantBuddyContext = createContext<AssistantBuddyContextValue | null>(null);

export function useAssistantBuddy(): AssistantBuddyContextValue {
  return useContext(AssistantBuddyContext) ?? { openBuddy: () => {} };
}

function AssistantBuddyChrome({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const { assistantEnabled, assistantMascotSeed } = useUserPreferences();
  const { config } = useCozyConfig();
  const { language } = useAppLanguage();
  const t = I18N[messageLocale(language)].assistant;
  const mascotLabel = config.mascot.slice(0, 1).toUpperCase() + config.mascot.slice(1);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingActions, setPendingActions] = useState<AssistantActionsEnvelope | null>(null);
  const [applyBusy, setApplyBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<ChatMsg[]>([]);
  const driveRef = useRef<NibbyChatDrive>({ speaking: false, lipPulse: 0 });
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    return () => stopMascotSpeakAudio();
  }, []);

  useEffect(() => {
    if (!open) {
      stopMascotSpeakAudio();
      setPendingActions(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !assistantEnabled) return;
    void warmupMascotSpeakAudio();
  }, [open, assistantEnabled]);

  const applyPending = useCallback(async () => {
    if (!pendingActions?.actions?.length || applyBusy) return;
    setApplyBusy(true);
    try {
      const res = await fetch("/api/assistant/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actions: pendingActions.actions }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        results?: { ok: boolean }[];
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error || t.buddyActionsError);
        return;
      }
      const results = data.results || [];
      const okCount = results.filter((r) => r.ok).length;
      if (okCount === results.length) toast.success(t.buddyActionsApplied);
      else toast.error(t.buddyActionsPartial);
      setPendingActions(null);
      router.refresh();
    } catch {
      toast.error(t.buddyActionsError);
    } finally {
      setApplyBusy(false);
    }
  }, [applyBusy, pendingActions, router, t]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;
    setPendingActions(null);
    const prev = messagesRef.current;
    const nextMsgs: ChatMsg[] = [...prev, { role: "user", content: text }];
    setMessages([...nextMsgs, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    driveRef.current.speaking = true;
    driveRef.current.lipPulse = 0.4;
    let acc = "";
    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "tamagotchi",
          messages: nextMsgs.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(err.error || t.errorGeneric);
        setMessages(prev);
        return;
      }
      await startMascotSpeakAudio(assistantMascotSeed);
      await readOllamaStream(res.body, (chunk) => {
        driveRef.current.lipPulse = Math.min(
          1,
          driveRef.current.lipPulse + (chunk.length > 0 ? 0.38 : 0.1)
        );
        if (chunk.length > 0) {
          const prevLen = acc.length;
          acc += chunk;
          const cut = streamingActionCutIndex(acc);
          const display = cut < 0 ? acc : acc.slice(0, cut).trimEnd();
          setMessages([...nextMsgs, { role: "assistant", content: display }]);
          const speakLen = cut < 0 ? chunk.length : Math.max(0, Math.min(chunk.length, cut - prevLen));
          if (speakLen > 0) pushMascotSpeakDelta(chunk.slice(0, speakLen));
        }
        requestAnimationFrame(() => {
          const el = scrollRef.current;
          if (el) el.scrollTop = el.scrollHeight;
        });
      });
      try {
        const ev = await fetch("/api/achievements/event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "buddy_chat_turn" }),
        });
        if (ev.ok) {
          const j = (await ev.json()) as { newUnlockIds?: string[] };
          const ids = j.newUnlockIds?.filter(Boolean) ?? [];
          if (ids.length > 0) {
            window.dispatchEvent(
              new CustomEvent<AchievementUnlockDetail>(ACHIEVEMENT_UNLOCK_EVENT, { detail: { ids } })
            );
          }
        }
      } catch {
        /* noop */
      }
      const stripped = stripAssistantActionFromText(acc);
      if (stripped.envelope) {
        setMessages((prev) => {
          const n = [...prev];
          const li = n.length - 1;
          if (li >= 0 && n[li]?.role === "assistant") {
            n[li] = { role: "assistant", content: stripped.displayText };
          }
          return n;
        });
        setPendingActions(stripped.envelope);
      }
    } catch {
      toast.error(t.errorGeneric);
      setMessages(prev);
    } finally {
      flushMascotSpeakCoalesced();
      setBusy(false);
      try {
        await awaitMascotSpeakMinDuration(2);
      } catch {
        /* noop */
      }
      stopMascotSpeakAudio();
      window.setTimeout(() => {
        driveRef.current.speaking = false;
        driveRef.current.lipPulse = 0;
      }, 420);
    }
  }, [assistantMascotSeed, busy, input, t.errorGeneric]);

  const resetChat = useCallback(() => {
    if (busy || messagesRef.current.length === 0) return;
    if (!window.confirm(t.buddyResetConfirm)) return;
    setMessages([]);
    setInput("");
    setPendingActions(null);
    messagesRef.current = [];
  }, [busy, t.buddyResetConfirm]);

  if (!assistantEnabled) return null;

  const overlay =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            role="presentation"
            className="fixed inset-0 z-[60] flex items-stretch justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:p-4 sm:items-center max-sm:bg-warm-950/15 max-sm:backdrop-blur-none"
            onClick={() => onOpenChange(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={t.buddyTitle}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="flex h-[100dvh] max-h-[100dvh] min-h-[100dvh] w-full max-w-none flex-col overflow-hidden rounded-none border-0 bg-gradient-to-b from-white via-warm-50/95 to-rose-50/30 shadow-none sm:h-[min(100dvh,720px)] sm:max-h-[min(100dvh,720px)] sm:min-h-0 sm:max-w-5xl sm:rounded-3xl sm:border sm:border-warm-200 sm:shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex shrink-0 items-start justify-between gap-2 border-b border-warm-100/90 bg-white/80 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] backdrop-blur-sm sm:pt-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-sage-600">{t.buddyEyebrow}</p>
                  <h2 className="text-lg font-semibold text-warm-900">{mascotLabel}</h2>
                  <p className="text-xs text-warm-500">{t.buddySubtitle}</p>
                  <p className="mt-1.5 break-words pr-1 text-[11px] leading-snug text-amber-800/90">
                    {t.buddyExperimentalDataNote}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    disabled={busy || messages.length === 0}
                    onClick={() => resetChat()}
                    className="inline-flex max-w-[10.5rem] items-center gap-1.5 rounded-2xl border border-warm-200 bg-white/90 px-2.5 py-2 text-left text-[11px] font-semibold leading-tight text-warm-700 shadow-sm transition hover:border-rose-200 hover:bg-rose-50/90 hover:text-warm-900 disabled:pointer-events-none disabled:opacity-40 sm:max-w-none sm:px-3 sm:text-xs"
                    aria-label={t.buddyResetAria}
                    title={t.buddyResetAria}
                  >
                    <RotateCcw className="h-3.5 w-3.5 shrink-0 text-rose-500 sm:h-4 sm:w-4" aria-hidden />
                    <span className="line-clamp-2 sm:line-clamp-none">{t.buddyResetChat}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="rounded-2xl p-2 text-warm-500 transition hover:bg-warm-100 hover:text-warm-800"
                    aria-label={t.closeAria}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[230px_minmax(0,1fr)] overflow-hidden md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:grid-rows-1 md:gap-0">
                <div className="relative flex h-full min-h-0 flex-col border-b border-warm-100/80 p-3 md:border-b-0 md:border-r md:p-4">
                  <div className="min-h-0 flex-1">
                    <NibbyAssistantStage familyId={assistantMascotSeed} driveRef={driveRef} />
                  </div>
                  <p className="pointer-events-none absolute bottom-8 left-1/2 z-[1] -translate-x-1/2 rounded-full bg-white/85 px-3 py-1 text-center text-[11px] text-warm-500 shadow-sm">
                    {t.buddyTapHint}
                  </p>
                </div>

                <div className="flex h-full min-h-0 flex-col overflow-hidden bg-warm-50/50">
                  <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
                    {messages.length === 0 ? (
                      <div className="mx-auto max-w-sm pt-4 text-center">
                        <p className="text-sm leading-relaxed text-warm-600">{t.buddyEmpty}</p>
                      </div>
                    ) : null}
                    {messages.map((m, i) => {
                      const isLast = i === messages.length - 1;
                      const assistantHidden =
                        m.role === "assistant" &&
                        !m.content.trim() &&
                        !(busy && isLast);
                      if (assistantHidden) return null;
                      return (
                        <div
                          key={i}
                          className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                        >
                          <div
                            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-xs font-bold ${
                              m.role === "user"
                                ? "bg-rose-400 text-white"
                                : "bg-gradient-to-br from-sage-400 to-sky-500 text-white"
                            }`}
                            aria-hidden
                          >
                            {m.role === "user" ? t.youInitial : mascotLabel.slice(0, 1)}
                          </div>
                          <div
                            className={`max-w-[min(100%,28rem)] rounded-2xl px-3.5 py-2.5 text-[15px] leading-snug shadow-sm ${
                              m.role === "user"
                                ? "rounded-tr-sm bg-rose-100/95 text-warm-900"
                                : "rounded-tl-sm border border-warm-100/80 bg-white text-warm-900"
                            }`}
                          >
                            {m.role === "assistant" && !m.content && busy ? (
                              <span className="inline-flex gap-1 text-warm-400">
                                <span className="animate-bounce">·</span>
                                <span className="animate-bounce [animation-delay:120ms]">·</span>
                                <span className="animate-bounce [animation-delay:240ms]">·</span>
                              </span>
                            ) : m.role === "assistant" ? (
                              <AssistantMarkdownMessage content={m.content} />
                            ) : (
                              <span className="whitespace-pre-wrap">{m.content}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="shrink-0 border-t border-warm-100/90 bg-white/90 px-3 pt-3 backdrop-blur-sm pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:pb-3">
                    {pendingActions ? (
                      <div className="mb-3 flex flex-col gap-3 rounded-2xl border border-sage-200 bg-sage-50/90 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                        <p className="min-w-0 text-xs font-medium text-sage-900">{t.buddyPendingActionsTitle}</p>
                        <div className="flex shrink-0 flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            disabled={applyBusy}
                            onClick={() => void applyPending()}
                            className="rounded-xl border border-warm-900/20 bg-warm-800 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-warm-900 disabled:opacity-50"
                          >
                            {t.buddyApplyChanges}
                          </button>
                          <button
                            type="button"
                            disabled={applyBusy}
                            onClick={() => setPendingActions(null)}
                            className="rounded-xl border border-warm-300 bg-white px-3 py-1.5 text-xs font-semibold text-warm-800 shadow-sm hover:bg-warm-50 disabled:opacity-50"
                          >
                            {t.buddyDismissChanges}
                          </button>
                        </div>
                      </div>
                    ) : null}
                    <div className="flex items-end gap-2">
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void send();
                          }
                        }}
                        rows={2}
                        placeholder={t.buddyInputPlaceholder}
                        className="min-h-[44px] min-w-0 flex-1 resize-none rounded-2xl border border-warm-200 bg-warm-50/90 px-3 py-2.5 text-[15px] text-warm-900 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                        disabled={busy}
                      />
                      <button
                        type="button"
                        onClick={() => void send()}
                        disabled={busy || !input.trim()}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-md disabled:opacity-45"
                        aria-label={t.sendAria}
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-1.5 text-center text-[10px] text-warm-400">{t.buddyFooterHint}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="fixed bottom-5 right-5 z-[55] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-lg ring-2 ring-white/80 touch-manipulation md:bottom-8 md:right-8"
        aria-label={t.openAria}
      >
        <MessageCircle className="h-7 w-7" aria-hidden />
      </button>
      {overlay}
    </>
  );
}

export function AssistantBuddyProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const openBuddy = useCallback(() => setOpen(true), []);
  const value = useMemo(() => ({ openBuddy }), [openBuddy]);
  const focusActive = useFocusModeActive();
  return (
    <AssistantBuddyContext.Provider value={value}>
      {children}
      {!focusActive ? <AssistantBuddyChrome open={open} onOpenChange={setOpen} /> : null}
    </AssistantBuddyContext.Provider>
  );
}
