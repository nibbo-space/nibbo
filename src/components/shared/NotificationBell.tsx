"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bell } from "lucide-react";
import { PushNotificationsOptIn } from "@/components/shared/PushNotificationsOptIn";
import { cn } from "@/lib/utils";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { I18N } from "@/lib/i18n";

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

export default function NotificationBell() {
  const { language } = useAppLanguage();
  const t = I18N[language].notificationBell;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setCount(typeof data.count === "number" ? data.count : 0);
      if (Array.isArray(data.items)) setItems(data.items);
    } catch {
      setCount(0);
    }
  }, []);

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
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

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
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
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
                  {count > 0 && (
                    <button
                      type="button"
                      onClick={() => markAll()}
                      className="text-xs text-rose-600 hover:text-rose-700 font-medium whitespace-nowrap"
                    >
                      {t.markAllRead}
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto flex-1 p-2">
                  {loading ? (
                    <p className="text-xs text-warm-400 text-center py-6">{t.loading}</p>
                  ) : items.length === 0 ? (
                    <p className="text-xs text-warm-400 text-center py-6 px-3">
                      {t.empty}
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {items.map((n) => (
                        <li key={n.id}>
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
                  )}
                </div>
                <PushNotificationsOptIn />
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
