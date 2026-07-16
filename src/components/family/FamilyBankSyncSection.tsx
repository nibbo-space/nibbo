"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { I18N, messageLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type BankConnectionPublic = {
  id: string;
  provider: string;
  enabled: boolean;
  accountIds: string[];
  lastSyncAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  configured: boolean;
};

type AccountPreview = {
  id: string;
  type: string;
  currencyCode: number;
  maskedPan: string[];
  selectedByDefault: boolean;
};

type BankCardId = "MONOBANK" | "PRIVAT24" | "PUMB";

export function FamilyBankSyncSection({ owner }: { owner: boolean }) {
  const { language } = useAppLanguage();
  const t = I18N[messageLocale(language)].family;
  const [connection, setConnection] = useState<BankConnectionPublic | null>(null);
  const [token, setToken] = useState("");
  const [accounts, setAccounts] = useState<AccountPreview[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [activeBank, setActiveBank] = useState<BankCardId>("MONOBANK");

  const errorMessage = (code: string | null | undefined) => {
    if (!code) return null;
    if (code === "invalid_token") return t.bankErrorInvalidToken;
    if (code === "rate_limited") return t.bankErrorRateLimited;
    if (code === "empty_accounts") return t.bankErrorEmptyAccounts;
    if (code === "disabled") return t.bankErrorDisabled;
    if (code === "not_configured") return t.bankErrorNotConfigured;
    return t.bankErrorSyncFailed;
  };

  const load = useCallback(async () => {
    if (!owner) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/family/bank-connections");
      if (!res.ok) throw new Error("fail");
      const payload = (await res.json()) as { connections: BankConnectionPublic[] };
      const mono = payload.connections.find((c) => c.provider === "MONOBANK") ?? null;
      setConnection(mono);
      if (mono?.accountIds?.length) setSelectedIds(mono.accountIds);
    } catch {
      toast.error(t.bankToastLoadError);
    } finally {
      setLoading(false);
    }
  }, [owner, t.bankToastLoadError]);

  useEffect(() => {
    void load();
  }, [load]);

  const validateToken = async () => {
    if (!token.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/family/bank-connections/monobank/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(errorMessage(payload.error) || t.bankErrorInvalidToken);
        return;
      }
      const list = (payload.accounts ?? []) as AccountPreview[];
      setAccounts(list);
      setSelectedIds(list.filter((a) => a.selectedByDefault).map((a) => a.id));
      toast.success(t.bankToastValidated);
    } catch {
      toast.error(t.bankErrorInvalidToken);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        provider: "MONOBANK",
        enabled: connection?.enabled ?? true,
        accountIds: selectedIds,
      };
      if (token.trim()) body.token = token.trim();
      const res = await fetch("/api/family/bank-connections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(errorMessage(payload.error) || t.bankToastSaveError);
        return;
      }
      setToken("");
      setAccounts([]);
      toast.success(t.bankToastSaved);
      await load();
    } catch {
      toast.error(t.bankToastSaveError);
    } finally {
      setBusy(false);
    }
  };

  const toggleEnabled = async () => {
    if (!connection?.configured) return;
    setBusy(true);
    try {
      const res = await fetch("/api/family/bank-connections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "MONOBANK",
          enabled: !connection.enabled,
        }),
      });
      if (!res.ok) throw new Error("fail");
      await load();
    } catch {
      toast.error(t.bankToastSaveError);
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    if (!confirm(t.bankClearConfirm)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/family/bank-connections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "MONOBANK", clearToken: true }),
      });
      if (!res.ok) throw new Error("fail");
      setConnection(null);
      setAccounts([]);
      setSelectedIds([]);
      setToken("");
      toast.success(t.bankToastCleared);
    } catch {
      toast.error(t.bankToastSaveError);
    } finally {
      setBusy(false);
    }
  };

  const syncNow = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/family/bank-connections/monobank/sync", { method: "POST" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(errorMessage(payload.error) || t.bankErrorSyncFailed);
        await load();
        return;
      }
      toast.success(
        t.bankToastSynced
          .replace("{expenses}", String(payload.importedExpenses ?? 0))
          .replace("{incomes}", String(payload.importedIncomes ?? 0))
          .replace("{fetched}", String(payload.fetched ?? 0)),
      );
      await load();
    } catch {
      toast.error(t.bankErrorSyncFailed);
    } finally {
      setBusy(false);
    }
  };

  const banks: Array<{
    id: BankCardId;
    name: string;
    available: boolean;
    status?: string;
  }> = [
    {
      id: "MONOBANK",
      name: t.bankNameMonobank,
      available: true,
      status: connection?.configured
        ? connection.enabled
          ? t.bankStatusConnected
          : t.bankStatusPaused
        : t.bankStatusAvailable,
    },
    { id: "PRIVAT24", name: t.bankNamePrivat24, available: false },
    { id: "PUMB", name: t.bankNamePumb, available: false },
  ];

  if (!owner) {
    return (
      <div className="rounded-3xl border border-warm-100 bg-white/80 p-5">
        <h3 className="text-sm font-semibold text-warm-800">{t.bankSectionTitle}</h3>
        <p className="mt-2 text-xs text-warm-500">{t.ownerOnlySettings}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-3xl border border-warm-100 bg-white/80 p-5">
      <div>
        <h3 className="text-sm font-semibold text-warm-800">{t.bankSectionTitle}</h3>
        <p className="mt-1 text-xs leading-relaxed text-warm-500">{t.bankSectionHint}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {banks.map((bank) => {
          const selected = activeBank === bank.id;
          return (
            <button
              key={bank.id}
              type="button"
              onClick={() => setActiveBank(bank.id)}
              className={cn(
                "rounded-2xl border px-3 py-3 text-left transition",
                selected
                  ? "border-rose-300 bg-rose-50/80 ring-1 ring-rose-200"
                  : "border-warm-100 bg-warm-50/50 hover:border-warm-200",
                !bank.available && "opacity-80",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-warm-800">{bank.name}</p>
                {!bank.available && (
                  <span className="shrink-0 rounded-full bg-warm-200/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-warm-600">
                    {t.bankComingSoon}
                  </span>
                )}
              </div>
              <p className="mt-1 text-[11px] text-warm-500">
                {bank.available ? bank.status : t.bankComingSoonHint}
              </p>
            </button>
          );
        })}
      </div>

      {activeBank !== "MONOBANK" ? (
        <div className="rounded-2xl border border-dashed border-warm-200 bg-warm-50/40 px-4 py-6 text-center">
          <p className="text-sm font-semibold text-warm-700">
            {activeBank === "PRIVAT24" ? t.bankNamePrivat24 : t.bankNamePumb}
          </p>
          <p className="mt-1 text-xs text-warm-500">{t.bankComingSoonBody}</p>
        </div>
      ) : loading ? (
        <p className="text-xs text-warm-400">{t.loading}</p>
      ) : (
        <>
          <a
            href="https://api.monobank.ua/"
            target="_blank"
            rel="noreferrer"
            className="inline-block text-xs font-semibold text-rose-600 hover:text-rose-700"
          >
            {t.bankTokenLink}
          </a>

          <div className="space-y-1">
            <p className="text-xs text-warm-500">{t.bankTokenLabel}</p>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={connection?.configured ? t.bankTokenConfiguredPlaceholder : t.bankTokenPlaceholder}
              disabled={busy}
              className="w-full rounded-xl border border-warm-200 bg-warm-50 px-3 py-2 text-sm text-warm-800 outline-none focus:border-rose-300 disabled:opacity-60"
              autoComplete="off"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !token.trim()}
              onClick={() => void validateToken()}
              className="rounded-xl border border-warm-200 bg-white px-3 py-2 text-xs font-semibold text-warm-700 hover:bg-warm-50 disabled:opacity-50"
            >
              {t.bankValidate}
            </button>
            <button
              type="button"
              disabled={busy || (!token.trim() && !connection?.configured)}
              onClick={() => void save()}
              className="rounded-xl bg-rose-500 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-600 disabled:opacity-50"
            >
              {t.bankSave}
            </button>
            {connection?.configured && (
              <>
                <button
                  type="button"
                  disabled={busy || !connection.enabled}
                  onClick={() => void syncNow()}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                >
                  {t.bankSyncNow}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void clear()}
                  className="rounded-xl border border-warm-200 px-3 py-2 text-xs font-semibold text-warm-500 hover:bg-warm-50 disabled:opacity-50"
                >
                  {t.bankClear}
                </button>
              </>
            )}
          </div>

          {accounts.length > 0 && (
            <div className="space-y-2 rounded-2xl border border-warm-100 bg-warm-50/60 p-3">
              <p className="text-xs font-semibold text-warm-700">{t.bankAccountsLabel}</p>
              {accounts.map((a) => {
                const checked = selectedIds.includes(a.id);
                const label = a.maskedPan[0] || a.type || a.id.slice(0, 8);
                return (
                  <label key={a.id} className="flex cursor-pointer items-center gap-2 text-xs text-warm-700">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setSelectedIds((prev) =>
                          checked ? prev.filter((id) => id !== a.id) : [...prev, a.id],
                        );
                      }}
                    />
                    <span>
                      {label} · {a.type} · {a.currencyCode}
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          {connection?.configured && (
            <div className="flex flex-col gap-3 border-t border-warm-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                role="switch"
                aria-checked={connection.enabled}
                disabled={busy}
                onClick={() => void toggleEnabled()}
                className={cn(
                  "flex w-full max-w-xs items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-xs font-semibold transition",
                  connection.enabled
                    ? "border-sage-300 bg-sage-50 text-sage-800"
                    : "border-warm-200 bg-warm-50 text-warm-600",
                )}
              >
                <span>{t.bankEnabledLabel}</span>
                <span>{connection.enabled ? t.moduleOn : t.moduleOff}</span>
              </button>
              <div className="text-xs text-warm-500">
                {connection.lastSuccessAt && (
                  <p>
                    {t.bankLastSync}: {new Date(connection.lastSuccessAt).toLocaleString()}
                  </p>
                )}
                {connection.lastError && (
                  <p className="text-rose-600">{errorMessage(connection.lastError)}</p>
                )}
                <p className="mt-1 text-warm-400">{t.bankSyncIntervalHint}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
