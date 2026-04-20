"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Upload } from "lucide-react";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { DEFAULT_APP_TIME_ZONE } from "@/lib/kyiv-range";
import { DISPLAY_CURRENCY_CODES, PROFILE_TIME_ZONES } from "@/lib/profile-regional";
import { USER_COLORS, USER_EMOJIS, normalizeProfileEmoji } from "@/lib/utils";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import {
  DEFAULT_ASSISTANT_OLLAMA_MODEL,
  isAllowedAssistantOllamaModel,
  OLLAMA_ASSISTANT_MODEL_OPTIONS,
  OLLAMA_CLOUD_API_KEYS_URL,
} from "@/lib/assistant-ollama-models";
import {
  SCOPE_V1_NOTES_WRITE,
  SCOPE_V1_READ,
  type TokenCreateMode,
  tokenHasScope,
} from "@/lib/api-scopes";
import { intlLocaleForUi, messageLocale, I18N } from "@/lib/i18n";

export interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  color: string;
  emoji: string;
  familyId?: string | null;
  displayCurrency?: string | null;
  timeZone?: string | null;
  personalApiEnabled?: boolean;
  ollamaKeyConfigured?: boolean;
  ollamaModel?: string | null;
}

interface ProfileSettingsFormProps {
  initialUser: UserProfile;
}

export default function ProfileSettingsForm({ initialUser }: ProfileSettingsFormProps) {
  const router = useRouter();
  const { language } = useAppLanguage();
  const t = I18N[messageLocale(language)].profile;
  const [user, setUser] = useState(initialUser);
  const [name, setName] = useState(user.name ?? "");
  const [emoji, setEmoji] = useState(() => normalizeProfileEmoji(user.emoji));
  const [color, setColor] = useState(user.color || "#f43f5e");
  const [displayCurrency, setDisplayCurrency] = useState(() => user.displayCurrency || "USD");
  const [timeZone, setTimeZone] = useState(() => user.timeZone || DEFAULT_APP_TIME_ZONE);
  const [ollamaKeyInput, setOllamaKeyInput] = useState("");
  const [ollamaModelInput, setOllamaModelInput] = useState(() =>
    user.ollamaModel && isAllowedAssistantOllamaModel(user.ollamaModel)
      ? user.ollamaModel
      : DEFAULT_ASSISTANT_OLLAMA_MODEL
  );
  const [busy, setBusy] = useState(false);
  const [familyBusy, setFamilyBusy] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [familyMembers, setFamilyMembers] = useState<
    { id: string; name: string | null; email: string | null; emoji: string; color: string; familyRole?: string }[]
  >([]);
  const [pendingInvites, setPendingInvites] = useState<{ id: string; email: string }[]>([]);
  const [incomingInvites, setIncomingInvites] = useState<
    { id: string; email: string; familyId: string; family: { name: string } }[]
  >([]);
  const [currentUserRole, setCurrentUserRole] = useState<"OWNER" | "MEMBER" | null>(null);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [deleteSuccessorId, setDeleteSuccessorId] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [mcpTokens, setMcpTokens] = useState<{ id: string; createdAt: string; scopes: string[] }[]>([]);
  const [mcpBusy, setMcpBusy] = useState(false);
  const [mcpShownSecret, setMcpShownSecret] = useState<string | null>(null);
  const [mcpErr, setMcpErr] = useState<string | null>(null);
  const [mcpCopied, setMcpCopied] = useState(false);
  const [tokenMode, setTokenMode] = useState<TokenCreateMode>("mcp_read");
  const [personalApiBusy, setPersonalApiBusy] = useState(false);
  const [apiBaseOrigin, setApiBaseOrigin] = useState("");
  const [curlCopied, setCurlCopied] = useState(false);

  const successorCandidates = useMemo(
    () => familyMembers.filter((m) => m.id !== user.id),
    [familyMembers, user.id]
  );
  const needsSuccessorPick = currentUserRole === "OWNER" && successorCandidates.length > 0;

  useEffect(() => {
    setUser(initialUser);
    setName(initialUser.name ?? "");
    setEmoji(normalizeProfileEmoji(initialUser.emoji));
    setColor(initialUser.color || "#f43f5e");
    setDisplayCurrency(initialUser.displayCurrency || "USD");
    setTimeZone(initialUser.timeZone || DEFAULT_APP_TIME_ZONE);
    setOllamaKeyInput("");
    setOllamaModelInput(
      initialUser.ollamaModel && isAllowedAssistantOllamaModel(initialUser.ollamaModel)
        ? initialUser.ollamaModel
        : DEFAULT_ASSISTANT_OLLAMA_MODEL
    );
  }, [initialUser]);

  useEffect(() => {
    setDeleteConfirmEmail("");
    setDeleteSuccessorId("");
    setDeleteError(null);
  }, [user.id]);

  const emojiPicker = useMemo(() => {
    const current = normalizeProfileEmoji(emoji);
    const seen = new Set<string>();
    const out: string[] = [];
    const add = (e: string) => {
      if (seen.has(e)) return;
      seen.add(e);
      out.push(e);
    };
    add(current);
    USER_EMOJIS.forEach(add);
    return out;
  }, [emoji]);

  const loadFamily = useCallback(async () => {
    setFamilyBusy(true);
    try {
      const res = await fetch("/api/family/members");
      if (!res.ok) return;
      const data = await res.json();
      setFamilyMembers(data.members || []);
      setPendingInvites(data.invitations || []);
      setIncomingInvites(data.incomingInvitations || []);
      setCurrentUserRole(data.currentUserRole || null);
    } finally {
      setFamilyBusy(false);
    }
  }, []);

  useEffect(() => {
    void loadFamily();
  }, [user.id, loadFamily]);

  const loadMcpTokens = useCallback(async () => {
    const pt = I18N[messageLocale(language)].profile;
    setMcpBusy(true);
    setMcpErr(null);
    try {
      const res = await fetch("/api/users/me/mcp-tokens");
      if (!res.ok) {
        setMcpErr(pt.mcpLoadError);
        return;
      }
      const data = (await res.json()) as {
        tokens?: { id: string; createdAt: string; scopes: string[] }[];
      };
      setMcpTokens(data.tokens ?? []);
    } finally {
      setMcpBusy(false);
    }
  }, [language]);

  useEffect(() => {
    void loadMcpTokens();
  }, [loadMcpTokens, user.id]);

  useEffect(() => {
    setApiBaseOrigin(typeof window !== "undefined" ? window.location.origin : "");
  }, []);

  useEffect(() => {
    if (!user.personalApiEnabled && tokenMode !== "mcp_read") setTokenMode("mcp_read");
  }, [user.personalApiEnabled, tokenMode]);

  const tokenScopeSummary = (scopes: string[]) => {
    const s = scopes ?? [];
    if (tokenHasScope(s, SCOPE_V1_NOTES_WRITE)) return t.mcpTokenScopeV1ReadWrite;
    if (tokenHasScope(s, SCOPE_V1_READ)) return t.mcpTokenScopeV1Read;
    return t.mcpTokenScopeReadOnly;
  };

  const setPersonalApiEnabled = async (next: boolean) => {
    setPersonalApiBusy(true);
    setMcpErr(null);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalApiEnabled: next }),
      });
      if (!res.ok) return;
      const updated = (await res.json()) as UserProfile;
      setUser(updated);
      router.refresh();
    } finally {
      setPersonalApiBusy(false);
    }
  };

  const exampleCurl = useMemo(() => {
    if (!apiBaseOrigin) return "";
    return `curl -sS -H "Authorization: Bearer YOUR_TOKEN_HERE" "${apiBaseOrigin}/api/v1/me"`;
  }, [apiBaseOrigin]);

  const copyExampleCurl = async () => {
    try {
      await navigator.clipboard.writeText(exampleCurl);
      setCurlCopied(true);
      setTimeout(() => setCurlCopied(false), 2000);
    } catch {
      setMcpErr(t.mcpCopyError);
    }
  };

  const createMcpToken = async () => {
    setMcpBusy(true);
    setMcpErr(null);
    setMcpShownSecret(null);
    setMcpCopied(false);
    try {
      const res = await fetch("/api/users/me/mcp-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: tokenMode }),
      });
      if (res.status === 403) {
        setMcpErr(t.restApiCreateForbidden);
        return;
      }
      if (!res.ok) {
        setMcpErr(t.mcpCreateError);
        return;
      }
      const data = (await res.json()) as { token?: string };
      if (data.token) setMcpShownSecret(data.token);
      await loadMcpTokens();
    } finally {
      setMcpBusy(false);
    }
  };

  const revokeMcpToken = async (id: string) => {
    if (!window.confirm(t.mcpRevokeConfirm)) return;
    setMcpBusy(true);
    setMcpErr(null);
    try {
      const res = await fetch(`/api/users/me/mcp-tokens/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setMcpErr(t.mcpRevokeError);
        return;
      }
      await loadMcpTokens();
    } finally {
      setMcpBusy(false);
    }
  };

  const copyMcpSecret = async (secret: string) => {
    try {
      await navigator.clipboard.writeText(secret);
      setMcpCopied(true);
      setTimeout(() => setMcpCopied(false), 2000);
    } catch {
      setMcpErr(t.mcpCopyError);
    }
  };

  const dateLocale = intlLocaleForUi(language);

  const save = async () => {
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        name,
        emoji,
        color,
        displayCurrency,
        timeZone,
        ollamaModel: ollamaModelInput,
      };
      if (ollamaKeyInput.trim()) payload.ollamaApiKey = ollamaKeyInput.trim();
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return;
      const next = (await res.json()) as UserProfile;
      setUser(next);
      setOllamaKeyInput("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const clearOllamaKey = async () => {
    if (!window.confirm(t.ollamaClearConfirm)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ollamaApiKey: "" }),
      });
      if (!res.ok) return;
      const next = (await res.json()) as UserProfile;
      setUser(next);
      setOllamaKeyInput("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const onUpload = async (file: File | null) => {
    if (!file) return;
    const form = new FormData();
    form.set("file", file);
    setBusy(true);
    try {
      const res = await fetch("/api/users/avatar", { method: "POST", body: form });
      if (!res.ok) return;
      const next = (await res.json()) as UserProfile;
      setUser(next);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const invite = async () => {
    if (currentUserRole !== "OWNER") return;
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    setFamilyBusy(true);
    try {
      const res = await fetch("/api/family/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) return;
      setInviteEmail("");
      const listRes = await fetch("/api/family/members");
      if (!listRes.ok) return;
      const data = await listRes.json();
      setFamilyMembers(data.members || []);
      setPendingInvites(data.invitations || []);
    } finally {
      setFamilyBusy(false);
    }
  };

  const leaveFamily = async () => {
    if (currentUserRole !== "MEMBER" && currentUserRole !== "OWNER") return;
    const ok = confirm(
      currentUserRole === "OWNER" ? t.leaveFamilyOwnerConfirm : t.leaveFamilyMemberConfirm
    );
    if (!ok) return;
    setFamilyBusy(true);
    try {
      const res = await fetch("/api/family/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: user.id }),
      });
      if (!res.ok) return;
      const meRes = await fetch("/api/users/me");
      if (!meRes.ok) return;
      const next = (await meRes.json()) as UserProfile;
      setUser(next);
      router.push("/dashboard");
      router.refresh();
    } finally {
      setFamilyBusy(false);
    }
  };

  const deleteAccount = async () => {
    if (!user.email?.trim()) return;
    if (!window.confirm(t.deleteAccountFinalConfirm)) return;
    const normalized = deleteConfirmEmail.trim().toLowerCase();
    if (normalized !== user.email.trim().toLowerCase()) {
      setDeleteError(t.deleteInvalidEmail);
      return;
    }
    if (needsSuccessorPick && !deleteSuccessorId) {
      setDeleteError(t.deleteNeedSuccessor);
      return;
    }
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmEmail: normalized,
          ...(needsSuccessorPick && deleteSuccessorId
            ? { transferOwnershipToUserId: deleteSuccessorId }
            : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        if (data.error === "NEED_SUCCESSOR") setDeleteError(t.deleteNeedSuccessor);
        else if (data.error === "INVALID_EMAIL") setDeleteError(t.deleteInvalidEmail);
        else setDeleteError(t.deleteAccountError);
        return;
      }
      await signOut({ redirect: false });
      window.location.href = "/login";
    } finally {
      setDeleteBusy(false);
    }
  };

  const acceptInvite = async (inviteId: string, familyName: string) => {
    const ok = confirm(t.acceptInviteConfirm.replace("{familyName}", familyName));
    if (!ok) return;
    setFamilyBusy(true);
    try {
      const res = await fetch("/api/family/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acceptInviteId: inviteId }),
      });
      if (!res.ok) return;
      const meRes = await fetch("/api/users/me");
      if (!meRes.ok) return;
      const next = (await meRes.json()) as UserProfile;
      setUser(next);
      window.location.reload();
    } finally {
      setFamilyBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-warm-800">{t.title}</h2>
        <p className="mt-1 text-sm text-warm-500">
          {user.email ? `${user.email}` : null}
        </p>
      </div>

      <div className="space-y-4 rounded-3xl border border-warm-100 bg-white/80 p-5">
        <h3 className="text-sm font-semibold text-warm-800">{t.personalSection}</h3>
        <div className="flex flex-wrap items-center gap-4">
          {user.image ? (
            <span className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-2xl">
              <Image
                src={user.image}
                alt={user.name || t.userFallback}
                width={56}
                height={56}
                className="h-full w-full object-cover object-center"
                unoptimized={user.image.startsWith("/api/users/avatar/")}
              />
            </span>
          ) : (
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-white"
              style={{ backgroundColor: color }}
            >
              <span className="select-none text-2xl leading-none">{normalizeProfileEmoji(emoji)}</span>
            </div>
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-warm-50 px-3 py-2 text-sm text-warm-700 hover:bg-warm-100">
            <Upload size={14} className="text-warm-500" aria-hidden />
            {t.uploadPhoto}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onUpload(e.target.files?.[0] ?? null)} />
          </label>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-warm-500">{t.namePlaceholder}</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.namePlaceholder}
            className="w-full rounded-xl border border-warm-200 bg-warm-50 px-3 py-2 text-sm text-warm-800 outline-none focus:border-rose-300"
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-warm-500">{t.iconLabel}</p>
          <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto rounded-2xl bg-warm-50 p-3">
            {emojiPicker.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg leading-none transition-colors ${
                  normalizeProfileEmoji(emoji) === e
                    ? "bg-white ring-2 ring-rose-300"
                    : "bg-white/60 hover:bg-white"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-warm-500">{t.colorLabel}</p>
          <div className="flex flex-wrap gap-2">
            {USER_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-8 w-8 rounded-full ${color === c ? "ring-2 ring-rose-400 ring-offset-2" : ""}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <div className="space-y-3 border-t border-warm-100 pt-4">
          <p className="text-xs font-semibold text-warm-700">{t.regionalSection}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-[11px] text-warm-500">{t.currencyLabel}</p>
              <select
                value={displayCurrency}
                onChange={(e) => setDisplayCurrency(e.target.value)}
                className="w-full rounded-xl border border-warm-200 bg-warm-50 px-3 py-2 text-sm text-warm-800 outline-none focus:border-rose-300"
              >
                {DISPLAY_CURRENCY_CODES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] text-warm-500">{t.timeZoneLabel}</p>
              <select
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                className="w-full rounded-xl border border-warm-200 bg-warm-50 px-3 py-2 text-sm text-warm-800 outline-none focus:border-rose-300"
              >
                {PROFILE_TIME_ZONES.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="space-y-3 border-t border-warm-100 pt-4">
          <p className="text-xs font-semibold text-warm-700">{t.ollamaSection}</p>
          <p className="text-xs text-warm-500">{t.ollamaHint}</p>
          <div
            role="note"
            className="rounded-2xl border border-amber-200/90 bg-amber-50/80 px-3 py-2.5 text-[11px] leading-snug text-amber-950/90"
          >
            {t.ollamaDataNotice}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-warm-500">{t.ollamaKeyLabel}</p>
              <a
                href={OLLAMA_CLOUD_API_KEYS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-sky-600 underline-offset-2 hover:text-sky-800 hover:underline"
              >
                {t.ollamaGetApiKeyLink}
              </a>
            </div>
            <input
              type="password"
              value={ollamaKeyInput}
              onChange={(e) => setOllamaKeyInput(e.target.value)}
              autoComplete="off"
              placeholder={t.ollamaKeyPlaceholder}
              className="w-full rounded-xl border border-warm-200 bg-warm-50 px-3 py-2 text-sm text-warm-800 outline-none focus:border-rose-300"
            />
            {user.ollamaKeyConfigured ? (
              <p className="text-[11px] text-sage-600">
                {messageLocale(language) === "en" ? "Key is saved" : "Ключ збережено"}
              </p>
            ) : null}
          </div>
          <div className="space-y-1">
            <p className="text-[11px] text-warm-500">{t.ollamaModelLabel}</p>
            <select
              value={ollamaModelInput}
              onChange={(e) => setOllamaModelInput(e.target.value)}
              className="w-full rounded-xl border border-warm-200 bg-warm-50 px-3 py-2 text-sm text-warm-800 outline-none focus:border-rose-300"
            >
              {OLLAMA_ASSISTANT_MODEL_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {messageLocale(language) === "en" ? opt.labelEn : opt.labelUk}
                </option>
              ))}
            </select>
          </div>
          {user.ollamaKeyConfigured ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void clearOllamaKey()}
              className="text-sm text-rose-600 hover:text-rose-700 underline-offset-2 hover:underline"
            >
              {t.ollamaClearKey}
            </button>
          ) : null}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded-xl bg-sage-500 px-4 py-2 text-sm text-white hover:bg-sage-600 disabled:opacity-60"
        >
          {t.save}
        </button>
      </div>

      <div className="space-y-4 rounded-3xl border border-warm-100 bg-white/80 p-5">
        <h3 className="text-sm font-semibold text-warm-800">{t.familyTitle}</h3>
        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {familyMembers.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-2xl bg-warm-50 px-3 py-2">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm text-white"
                style={{ backgroundColor: m.color || "#f43f5e" }}
              >
                <span className="leading-none">{normalizeProfileEmoji(m.emoji)}</span>
              </div>
              <p className="text-sm font-medium text-warm-800">{m.name || m.email || t.memberFallback}</p>
            </div>
          ))}
          {pendingInvites.map((i) => (
            <p key={i.id} className="text-sm text-warm-400">
              {t.invitedLabel} {i.email}
            </p>
          ))}
          {incomingInvites.map((i) => (
            <div
              key={i.id}
              className="flex flex-col gap-3 rounded-2xl bg-warm-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="break-words text-sm text-warm-700">
                  {t.inviteToLabel} {i.family.name}
                </p>
                <p className="text-xs text-warm-400">{i.email}</p>
              </div>
              <button
                type="button"
                disabled={familyBusy}
                onClick={() => acceptInvite(i.id, i.family.name)}
                className="w-full rounded-lg bg-sage-500 px-3 py-2 text-xs text-white hover:bg-sage-600 disabled:opacity-60 sm:w-auto sm:py-1.5"
              >
                {t.accept}
              </button>
            </div>
          ))}
          {!familyBusy && familyMembers.length === 0 && (
            <p className="text-sm text-warm-400">{t.onlyYouInFamily}</p>
          )}
        </div>
        {currentUserRole === "OWNER" ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder={t.inviteEmailPlaceholder}
              className="w-full flex-1 rounded-xl border border-warm-200 bg-warm-50 px-3 py-2 text-sm text-warm-800 outline-none focus:border-rose-300"
            />
            <button
              type="button"
              disabled={familyBusy}
              onClick={() => void invite()}
              className="w-full rounded-xl bg-rose-500 px-4 py-2 text-sm text-white hover:bg-rose-600 disabled:opacity-60 sm:w-auto"
            >
              {t.add}
            </button>
          </div>
        ) : currentUserRole === "MEMBER" ? (
          <button
            type="button"
            disabled={familyBusy}
            onClick={() => void leaveFamily()}
            className="rounded-xl bg-rose-500 px-4 py-2 text-sm text-white hover:bg-rose-600 disabled:opacity-60"
          >
            {t.leaveFamily}
          </button>
        ) : (
          <div className="h-8 rounded-xl border border-warm-100 bg-warm-50" />
        )}
      </div>

      <div className="space-y-3 rounded-3xl border border-warm-100 bg-white/80 p-5">
        <h3 className="text-sm font-semibold text-warm-800">{t.mcpSectionTitle}</h3>
        <p className="text-sm text-warm-500">{t.mcpSectionHint}</p>
        <div className="flex flex-col gap-2 rounded-2xl border border-warm-100 bg-warm-50/80 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-warm-800">{t.restApiToggleLabel}</p>
            <p className="text-xs text-warm-500">{t.restApiToggleHint}</p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 self-start sm:self-center">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-warm-300 text-lavender-600 focus:ring-lavender-400"
              checked={Boolean(user.personalApiEnabled)}
              disabled={personalApiBusy}
              onChange={(e) => void setPersonalApiEnabled(e.target.checked)}
            />
            <span className="text-sm text-warm-700">
              {user.personalApiEnabled ? t.restApiToggleOn : t.restApiToggleOff}
            </span>
          </label>
        </div>
        {user.personalApiEnabled && apiBaseOrigin ? (
          <div className="space-y-2 rounded-2xl border border-warm-100 bg-warm-50/60 px-3 py-3">
            <p className="text-xs font-medium text-warm-700">{t.restApiEndpointsHint}</p>
            <p className="text-xs text-warm-600">{t.restApiCurlCaption}</p>
            <div className="flex flex-wrap items-start gap-2">
              <code className="max-w-full flex-1 break-all rounded-lg bg-white/90 px-2 py-1.5 text-[11px] leading-relaxed text-warm-900">
                {exampleCurl}
              </code>
              <button
                type="button"
                disabled={!exampleCurl}
                onClick={() => void copyExampleCurl()}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-warm-200 bg-white px-2 py-1.5 text-xs font-medium text-warm-800 hover:bg-warm-50"
              >
                <Copy size={14} aria-hidden />
                {curlCopied ? t.mcpCopied : t.restApiCurlCopy}
              </button>
            </div>
          </div>
        ) : null}
        {mcpErr && <p className="text-sm text-rose-600">{mcpErr}</p>}
        {mcpShownSecret && (
          <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50/80 p-3 dark:border-amber-800/60 dark:bg-amber-950/30">
            <p className="text-xs font-medium text-amber-900 dark:text-amber-100">{t.mcpCreatedOnceHint}</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="max-w-full flex-1 break-all rounded-lg bg-white/90 px-2 py-1.5 text-xs text-warm-900 dark:bg-warm-900 dark:text-warm-100">
                {mcpShownSecret}
              </code>
              <button
                type="button"
                onClick={() => void copyMcpSecret(mcpShownSecret)}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-warm-900 dark:text-amber-100 dark:hover:bg-warm-800"
              >
                <Copy size={14} aria-hidden />
                {mcpCopied ? t.mcpCopied : t.mcpCopy}
              </button>
              <button
                type="button"
                onClick={() => setMcpShownSecret(null)}
                className="text-xs text-warm-600 underline dark:text-warm-400"
              >
                {t.mcpTokenAck}
              </button>
            </div>
          </div>
        )}
        <div className="space-y-2">
          <p className="text-xs font-medium text-warm-700">{t.restApiTokenModeLabel}</p>
          <select
            value={tokenMode}
            onChange={(e) => setTokenMode(e.target.value as TokenCreateMode)}
            className="w-full max-w-md rounded-xl border border-warm-200 bg-warm-50 px-3 py-2 text-sm text-warm-800 outline-none focus:border-rose-300"
          >
            <option value="mcp_read">{t.restApiModeMcpRead}</option>
            <option value="v1_read" disabled={!user.personalApiEnabled}>
              {t.restApiModeV1Read}
            </option>
            <option value="v1_read_write" disabled={!user.personalApiEnabled}>
              {t.restApiModeV1ReadWrite}
            </option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={mcpBusy}
            onClick={() => void createMcpToken()}
            className="rounded-xl bg-lavender-500 px-4 py-2 text-sm text-white hover:bg-lavender-600 disabled:opacity-60"
          >
            {t.mcpCreateButton}
          </button>
        </div>
        <ul className="space-y-2">
          {mcpTokens.length === 0 && !mcpBusy ? (
            <li className="text-sm text-warm-400">{t.mcpNoTokens}</li>
          ) : (
            mcpTokens.map((tok) => (
              <li
                key={tok.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-warm-50 px-3 py-2 dark:bg-warm-900/50"
              >
                <span className="text-xs text-warm-600 dark:text-warm-300">
                  {t.mcpKeyLabel} · {tokenScopeSummary(tok.scopes ?? [])} · {tok.id.slice(0, 8)}… ·{" "}
                  {new Date(tok.createdAt).toLocaleString(dateLocale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
                <button
                  type="button"
                  disabled={mcpBusy}
                  onClick={() => void revokeMcpToken(tok.id)}
                  className="rounded-lg border border-warm-200 px-2 py-1 text-xs text-warm-700 hover:bg-white dark:border-warm-600 dark:text-warm-200 dark:hover:bg-warm-800"
                >
                  {t.mcpRevoke}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="space-y-3 rounded-3xl border border-warm-100 bg-white/80 p-5">
        <h3 className="text-sm font-semibold text-warm-800">{t.deleteAccountSection}</h3>
        <p className="text-sm text-warm-500">{t.deleteAccountHint}</p>
        {needsSuccessorPick && (
          <>
            <p className="text-sm text-warm-500">{t.deleteOwnershipHint}</p>
            <div className="space-y-1">
              <p className="text-xs text-warm-500">{t.deleteSuccessorLabel}</p>
              <select
                value={deleteSuccessorId}
                onChange={(e) => setDeleteSuccessorId(e.target.value)}
                className="w-full rounded-xl border border-warm-200 bg-warm-50 px-3 py-2 text-sm text-warm-800 outline-none focus:border-rose-300"
              >
                <option value="">{t.deleteSuccessorPlaceholder}</option>
                {successorCandidates.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name || m.email || t.memberFallback}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        {!user.email?.trim() ? (
          <p className="text-sm text-warm-400">{t.deleteNoEmail}</p>
        ) : (
          <>
            <div className="space-y-1">
              <p className="text-xs text-warm-500">{t.deleteConfirmEmailLabel}</p>
              <input
                type="email"
                autoComplete="email"
                value={deleteConfirmEmail}
                onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                placeholder={t.deleteConfirmEmailPlaceholder}
                className="w-full rounded-xl border border-warm-200 bg-warm-50 px-3 py-2 text-sm text-warm-800 outline-none focus:border-rose-300"
              />
            </div>
            {deleteError && <p className="text-sm text-rose-600">{deleteError}</p>}
            <button
              type="button"
              disabled={deleteBusy}
              onClick={() => void deleteAccount()}
              className="rounded-xl bg-rose-500 px-4 py-2 text-sm text-white hover:bg-rose-600 disabled:opacity-60"
            >
              {deleteBusy ? t.deleteAccountBusy : t.deleteAccountButton}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
