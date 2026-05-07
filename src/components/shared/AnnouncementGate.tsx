"use client";

import { useAppLanguage } from "@/hooks/useAppLanguage";
import { messageLocale, I18N } from "@/lib/i18n";
import { format } from "date-fns";
import { enUS, uk } from "date-fns/locale";
import { Megaphone, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type AnnouncementItem = {
  id: string;
  title: string;
  body: string;
  publishedAt: string;
};

export default function AnnouncementGate({ enabled }: { enabled: boolean }) {
  const { language } = useAppLanguage();
  const ml = messageLocale(language);
  const t = I18N[ml].announcementGate;
  const dateLocale = ml === "uk" ? uk : enUS;
  const [item, setItem] = useState<AnnouncementItem | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let active = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/announcements/latest-unseen?lang=${encodeURIComponent(language)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { item: AnnouncementItem | null };
        if (!active || !data.item) return;
        setItem(data.item);
        setOpen(true);
        void fetch(`/api/announcements/${data.item.id}/seen`, { method: "POST" });
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [enabled, language]);

  const publishedLabel = useMemo(() => {
    if (!item) return "";
    return format(new Date(item.publishedAt), "d MMM yyyy", { locale: dateLocale });
  }, [item, dateLocale]);

  if (!enabled || loading || !item || !open) return null;

  return (
    <div className="fixed inset-0 z-[490] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-xl rounded-3xl border border-warm-100 bg-white p-5 shadow-cozy md:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-rose-500">{t.badge}</p>
            <h2 className="mt-1 flex items-center gap-2 text-xl font-bold text-warm-900">
              <Megaphone className="h-5 w-5 text-rose-500" />
              {item.title}
            </h2>
            <p className="mt-1 text-xs text-warm-500">
              {t.publishedAt}: {publishedLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl border border-warm-200 bg-white p-2 text-warm-500 hover:bg-warm-50"
            aria-label={t.close}
          >
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[45vh] overflow-y-auto whitespace-pre-wrap rounded-2xl border border-warm-100 bg-cream-50/60 p-4 text-sm leading-relaxed text-warm-800">
          {item.body}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-2xl border-2 border-rose-400 bg-gradient-to-b from-rose-400 to-rose-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm"
          >
            {t.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
