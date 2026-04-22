"use client";

import { useState } from "react";
import Link from "next/link";
import { Medal } from "lucide-react";
import toast from "react-hot-toast";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { ACHIEVEMENT_UNLOCK_EVENT, type AchievementUnlockDetail } from "@/lib/achievement-unlock-events";
import { listAchievementsSorted } from "@/lib/achievements/registry";
import { messageLocale, I18N } from "@/lib/i18n";

export default function AchievementsLabClient({ initialTapCount }: { initialTapCount: number }) {
  const { language } = useAppLanguage();
  const t = I18N[messageLocale(language)].adminAchievementsLab;
  const [tapCount, setTapCount] = useState(initialTapCount);
  const [previewId, setPreviewId] = useState(listAchievementsSorted()[0]?.id ?? "first-steps");
  const [busy, setBusy] = useState(false);

  const postTaps = async (count: number) => {
    setBusy(true);
    try {
      const res = await fetch("/api/achievements/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "mascot_blob_tap", count }),
      });
      if (!res.ok) {
        toast.error(t.tapFail);
        return;
      }
      const data = (await res.json()) as { newUnlockIds?: string[]; value?: number };
      if (typeof data.value === "number") setTapCount(data.value);
      const ids = data.newUnlockIds?.filter(Boolean) ?? [];
      if (ids.length > 0) {
        window.dispatchEvent(
          new CustomEvent<AchievementUnlockDetail>(ACHIEVEMENT_UNLOCK_EVENT, { detail: { ids } })
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const resetAll = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/achievements/reset", { method: "POST" });
      if (!res.ok) {
        toast.error(t.resetFail);
        return;
      }
      setTapCount(0);
      toast.success(t.resetOk);
    } finally {
      setBusy(false);
    }
  };

  const playPreview = () => {
    window.dispatchEvent(
      new CustomEvent<AchievementUnlockDetail>(ACHIEVEMENT_UNLOCK_EVENT, { detail: { ids: [previewId] } })
    );
  };

  const refreshState = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/achievements/state");
      if (!res.ok) return;
      const data = (await res.json()) as { mascotTapCount?: number };
      if (typeof data.mascotTapCount === "number") setTapCount(data.mascotTapCount);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-sage-200 bg-sage-50 px-3 py-1 text-xs font-semibold text-sage-800">
          <Medal size={14} aria-hidden />
          {t.badge}
        </span>
        <Link href="/dashboard" className="text-sm font-medium text-rose-600 hover:underline">
          {t.backLink}
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-warm-900">{t.title}</h1>
        <p className="mt-2 text-sm text-warm-600">{t.subtitle}</p>
      </div>

      <div className="rounded-3xl border border-warm-200 bg-white/90 p-5 shadow-sm space-y-4">
        <p className="text-sm text-warm-700">
          {t.tapCountLabel}: <span className="font-semibold">{tapCount}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => postTaps(1)}
            className="rounded-2xl border border-warm-200 bg-warm-50 px-4 py-2 text-sm font-semibold text-warm-800 hover:bg-warm-100 disabled:opacity-50"
          >
            {t.tapOnce}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => postTaps(5)}
            className="rounded-2xl border border-warm-200 bg-warm-50 px-4 py-2 text-sm font-semibold text-warm-800 hover:bg-warm-100 disabled:opacity-50"
          >
            {t.tapFive}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={refreshState}
            className="rounded-2xl border border-lavender-200 bg-lavender-50 px-4 py-2 text-sm font-semibold text-lavender-900 hover:bg-lavender-100 disabled:opacity-50"
          >
            {t.stateRefresh}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={resetAll}
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-900 hover:bg-rose-100 disabled:opacity-50"
          >
            {t.resetMyProgress}
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-warm-200 bg-white/90 p-5 shadow-sm space-y-3">
        <p className="text-sm font-semibold text-warm-800">{t.previewLabel}</p>
        <select
          value={previewId}
          onChange={(e) => setPreviewId(e.target.value)}
          className="w-full rounded-2xl border border-warm-200 bg-white px-3 py-2 text-sm text-warm-900"
        >
          {listAchievementsSorted().map((d) => (
            <option key={d.id} value={d.id}>
              {d.id}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={playPreview}
          className="w-full rounded-2xl bg-warm-900 py-3 text-sm font-semibold text-white hover:bg-warm-800"
        >
          {t.previewRun}
        </button>
      </div>
    </div>
  );
}
