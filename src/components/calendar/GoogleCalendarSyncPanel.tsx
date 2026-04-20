"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link2, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { intlLocaleForUi, messageLocale, I18N } from "@/lib/i18n";

type Status = {
  googleAccount: boolean;
  hasCalendarScope: boolean;
  syncEnabled: boolean;
  syncUserId: string | null;
  isSyncUser: boolean;
  calendarId: string;
  lastSyncAt: string | null;
};

export default function GoogleCalendarSyncPanel() {
  const { language } = useAppLanguage();
  const t = I18N[messageLocale(language)].calendar;
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/calendar/google/status");
    if (!res.ok) return;
    const data = (await res.json()) as Status;
    setStatus(data);
  }, []);

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (searchParams.get("gc_connected") === "1") {
      toast.success(t.googleConnectedToast);
      void load();
      window.history.replaceState(null, "", "/calendar");
    }
    if (searchParams.get("gc_error")) {
      toast.error(t.googleErrorToast);
      window.history.replaceState(null, "", "/calendar");
    }
  }, [searchParams, load, t.googleConnectedToast, t.googleErrorToast]);

  const connectCalendar = () => {
    window.location.href = "/api/calendar/google/auth";
  };

  const toggleSync = async (enabled: boolean) => {
    setBusy(true);
    try {
      const res = await fetch("/api/calendar/google/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err.error === "calendar_scope_required") toast.error(t.googleNeedConnectToast);
        else toast.error(t.googleSettingsErrorToast);
        return;
      }
      toast.success(enabled ? t.googleSyncOnToast : t.googleSyncOffToast);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const runSync = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/calendar/google/sync", { method: "POST" });
      if (!res.ok) {
        toast.error(t.googleSyncFailedToast);
        return;
      }
      toast.success(t.googleSyncDoneToast);
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  if (loading || !status) {
    return (
      <div className="rounded-2xl border border-warm-100 bg-white/60 px-4 py-3 text-sm text-warm-500">
        {t.googleLoading}
      </div>
    );
  }

  if (!status.googleAccount) {
    return (
      <div className="rounded-2xl border border-warm-100 bg-white/80 px-4 py-3 text-sm text-warm-600 shadow-cozy">
        <p className="font-medium text-warm-800">{t.googleTitle}</p>
        <p className="mt-1 text-xs text-warm-500">{t.googleSignInHint}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-warm-100 bg-white/80 px-4 py-3 shadow-cozy">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2 min-w-0">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
            <Link2 size={16} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-warm-800">{t.googleTitle}</p>
            <p className="text-xs text-warm-500">
              {status.syncEnabled && !status.isSyncUser
                ? t.googleSyncManagedByOther
                : status.syncEnabled
                  ? t.googleSyncActiveHint.replace("{id}", status.calendarId)
                  : t.googleSyncInactiveHint}
            </p>
            {status.lastSyncAt ? (
              <p className="text-[11px] text-warm-400 mt-0.5">
                {t.googleLastSync}: {new Date(status.lastSyncAt).toLocaleString(intlLocaleForUi(language))}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!status.hasCalendarScope ? (
            <button
              type="button"
              disabled={busy}
              onClick={connectCalendar}
              className="rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white shadow-cozy transition hover:bg-sky-700 disabled:opacity-50"
            >
              {t.googleAllowAccess}
            </button>
          ) : null}
          {status.hasCalendarScope && !status.syncEnabled ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void toggleSync(true)}
              className="rounded-xl bg-sage-600 px-3 py-2 text-xs font-semibold text-white shadow-cozy transition hover:bg-sage-700 disabled:opacity-50"
            >
              {t.googleEnableSync}
            </button>
          ) : null}
          {status.hasCalendarScope && status.syncEnabled && status.isSyncUser ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void toggleSync(false)}
              className="rounded-xl border border-warm-200 bg-white px-3 py-2 text-xs font-semibold text-warm-700 transition hover:bg-warm-50 disabled:opacity-50"
            >
              {t.googleDisableSync}
            </button>
          ) : null}
          {status.syncEnabled ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void runSync()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 transition hover:bg-sky-100 disabled:opacity-50"
            >
              <RefreshCw size={14} className={busy ? "animate-spin" : ""} aria-hidden />
              {t.googleSyncNow}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
