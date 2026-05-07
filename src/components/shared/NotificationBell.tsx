"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X } from "lucide-react";
import { PushNotificationsOptIn } from "@/components/shared/PushNotificationsOptIn";
import { cn } from "@/lib/utils";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { messageLocale, I18N } from "@/lib/i18n";

type NotificationItem = {
  id: string;
  title: string;
  boardId: string;
  boardName: string;
  boardEmoji: string;
  columnName: string;
  creatorName: string | null;
  creatorEmoji: string;
  updatedAt: string;
};

type NewsItem = {
  id: string;
  title: string;
  body: string;
  publishedAt: string;
  viewedAt: string | null;
  viewed: boolean;
};

export default function NotificationBell() {
  const { language } = useAppLanguage();
  const t = I18N[messageLocale(language)].notificationBell;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [newsUnreadCount, setNewsUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"assignments" | "news">("assignments");
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});

  const load = useCallback(async () => {
    try {
      const [taskRes, newsRes] = await Promise.all([
        fetch("/api/notifications"),
        fetch(`/api/announcements?lang=${encodeURIComponent(language)}`),
      ]);
      if (taskRes.ok) {
        const data = await taskRes.json();
        setCount(typeof data.count === "number" ? data.count : 0);
        if (Array.isArray(data.items)) setItems(data.items);
      }
      if (newsRes.ok) {
        const data = (await newsRes.json()) as { items?: NewsItem[]; unreadCount?: number };
        if (Array.isArray(data.items)) setNewsItems(data.items);
        setNewsUnreadCount(typeof data.unreadCount === "number" ? data.unreadCount : 0);
      }
    } catch {
      setCount(0);
      setNewsUnreadCount(0);
    }
  }, [language]);

  useEffect(() => {
    load();
    const t = setInterval(load, 90_000);
    const onVis = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (selectedNews) return;
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, selectedNews]);

  const updatePanelPosition = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const mobile = window.matchMedia("(max-width: 639px)").matches;
    if (mobile) {
      setPanelStyle({
        position: "fixed",
        left: 12,
        right: 12,
        top: r.bottom + 8,
        zIndex: 100,
        maxHeight: "min(24rem, 70vh)",
      });
    } else {
      setPanelStyle({
        position: "fixed",
        top: r.bottom + 8,
        right: Math.max(12, window.innerWidth - r.right),
        width: "22rem",
        zIndex: 100,
        maxHeight: "min(24rem, 70vh)",
      });
    }
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [open, updatePanelPosition]);

  const markReadAndGo = async (taskId: string) => {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId }),
    });
    setOpen(false);
    await load();
    router.push("/tasks");
  };

  const markAll = async () => {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    await load();
  };

  return (
    <div ref={wrapRef} className="relative">
      <motion.button
        data-tour="notifications-bell"
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 rounded-xl bg-warm-50 hover:bg-warm-100 flex items-center justify-center text-warm-500 hover:text-warm-700 transition-colors"
      >
        <Bell size={16} />
        {count + newsUnreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
            {count + newsUnreadCount > 9 ? "9+" : count + newsUnreadCount}
          </span>
        )}
      </motion.button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={panelRef}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                style={panelStyle}
                className="overflow-hidden flex flex-col rounded-2xl bg-white border border-warm-100 shadow-cozy"
              >
                <div className="px-4 py-3 border-b border-warm-100 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-warm-800">{t.title}</p>
                  {activeTab === "assignments" && count > 0 && (
                    <button
                      type="button"
                      onClick={() => markAll()}
                      className="text-xs text-rose-600 hover:text-rose-700 font-medium whitespace-nowrap"
                    >
                      {t.markAllRead}
                    </button>
                  )}
                </div>
                <div className="border-b border-warm-100 px-2 py-2">
                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-warm-50 p-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab("assignments")}
                      className={cn(
                        "rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors",
                        activeTab === "assignments" ? "bg-white text-warm-800 shadow-sm" : "text-warm-500"
                      )}
                    >
                      {t.assignmentsTab}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("news")}
                      className={cn(
                        "rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors",
                        activeTab === "news" ? "bg-white text-warm-800 shadow-sm" : "text-warm-500"
                      )}
                    >
                      {t.newsTab}
                    </button>
                  </div>
                </div>
                <div className="overflow-y-auto flex-1 p-2">
                  {loading ? (
                    <p className="text-xs text-warm-400 text-center py-6">{t.loading}</p>
                  ) : activeTab === "assignments" && items.length === 0 ? (
                    <p className="text-xs text-warm-400 text-center py-6 px-3">
                      {t.empty}
                    </p>
                  ) : activeTab === "news" && newsItems.length === 0 ? (
                    <p className="text-xs text-warm-400 text-center py-6 px-3">
                      {t.newsEmpty}
                    </p>
                  ) : activeTab === "assignments" ? (
                    <ul className="space-y-1">
                      {items.map((n, idx) => (
                        <li key={n.id || `assignment-${idx}`}>
                          <button
                            type="button"
                            onClick={() => markReadAndGo(n.id)}
                            className={cn(
                              "w-full text-left rounded-xl px-3 py-2.5 transition-colors",
                              "hover:bg-rose-50/80 border border-transparent hover:border-rose-100"
                            )}
                          >
                            <p className="text-sm font-medium text-warm-800 line-clamp-2">{n.title}</p>
                            <p className="text-[11px] text-warm-400 mt-1">
                              {n.boardEmoji} {n.boardName} · {n.columnName}
                            </p>
                            <p className="text-[11px] text-warm-500 mt-0.5">
                              {n.creatorEmoji}{" "}
                              {n.creatorName?.trim() || t.someone} {t.assignedYou}
                            </p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <ul className="space-y-1">
                      {newsItems.map((news, idx) => (
                        <li key={news.id || `news-${idx}`}>
                          <button
                            type="button"
                            onClick={() => setSelectedNews(news)}
                            className={cn(
                              "w-full text-left rounded-xl px-3 py-2.5 border transition-colors",
                              news.viewed
                                ? "border-warm-100 bg-white"
                                : "border-rose-100 bg-rose-50/60"
                            )}
                          >
                            <p className="text-sm font-medium text-warm-800 line-clamp-2">{news.title}</p>
                            <p className="mt-1 text-[11px] text-warm-500 line-clamp-3">{news.body}</p>
                            <p className="mt-1 text-[11px] text-warm-400">
                              {new Date(news.publishedAt).toLocaleDateString()}
                            </p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <PushNotificationsOptIn />
              </motion.div>
            )}
            {selectedNews && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[120] flex items-center justify-center bg-black/35 p-4"
                onClick={() => setSelectedNews(null)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.98, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: 8 }}
                  transition={{ duration: 0.15 }}
                  className="w-full max-w-lg rounded-2xl border border-warm-100 bg-white p-4 shadow-cozy"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <p className="text-base font-semibold text-warm-800">{selectedNews.title}</p>
                    <button
                      type="button"
                      onClick={() => setSelectedNews(null)}
                      className="rounded-lg border border-warm-200 bg-white p-1.5 text-warm-500 hover:bg-warm-50"
                      aria-label="Close"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <p className="mb-3 text-[11px] text-warm-400">
                    {new Date(selectedNews.publishedAt).toLocaleDateString()}
                  </p>
                  <div className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded-xl border border-warm-100 bg-cream-50/70 p-3 text-sm text-warm-700">
                    {selectedNews.body}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
