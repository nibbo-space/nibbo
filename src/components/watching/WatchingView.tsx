"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Clapperboard, Loader2, Pause, Play, Plus, Search, Trash2, Check, X } from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { cn, normalizeProfileEmoji } from "@/lib/utils";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { ACHIEVEMENT_UNLOCK_EVENT, type AchievementUnlockDetail } from "@/lib/achievement-unlock-events";
import { intlLocaleForUi, messageLocale, I18N } from "@/lib/i18n";

function dispatchNewAchievements(payload: unknown) {
  if (typeof payload !== "object" || payload === null) return;
  const raw = (payload as { newAchievementIds?: unknown }).newAchievementIds;
  if (!Array.isArray(raw) || raw.length === 0) return;
  const ids = raw.filter((x): x is string => typeof x === "string" && x.length > 0);
  if (ids.length === 0) return;
  window.dispatchEvent(
    new CustomEvent<AchievementUnlockDetail>(ACHIEVEMENT_UNLOCK_EVENT, { detail: { ids } })
  );
}

type WatchUser = {
  id: string;
  name: string | null;
  image: string | null;
  color: string;
  emoji: string;
};

export type WatchRow = {
  id: string;
  title: string;
  posterPath: string | null;
  mediaType: "MOVIE" | "TV";
  status: "WATCHING" | "PAUSED" | "FINISHED" | "DROPPED";
  season: number | null;
  startedAt: string;
  completedAt: string | null;
  user: WatchUser;
};

export type CommunityRow = {
  id: string;
  title: string;
  posterPath: string | null;
  mediaType: "MOVIE" | "TV";
  season: number | null;
  updatedAt: string;
  family: { name: string };
  user: { name: string | null; emoji: string };
};

type SearchHit = {
  externalId: string;
  mediaType: "MOVIE" | "TV";
  title: string;
  posterPath: string | null;
  year: string | null;
};

function posterSrc(path: string | null, size: "w185" | "w342" | "w500" = "w342") {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export default function WatchingView({
  initialActive,
  initialHistory,
  initialCommunity,
  hasTmdb,
}: {
  initialActive: WatchRow[];
  initialHistory: WatchRow[];
  initialCommunity: CommunityRow[];
  hasTmdb: boolean;
}) {
  const { language } = useAppLanguage();
  const t = I18N[messageLocale(language)].watch;
  const [active, setActive] = useState(initialActive);
  const [history, setHistory] = useState(initialHistory);
  const [community, setCommunity] = useState(initialCommunity);
  const [tab, setTab] = useState<"active" | "history">("active");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const searchGenerationRef = useRef(0);
  const SEARCH_DEBOUNCE_MS = 520;

  const refreshLists = useCallback(async () => {
    const res = await fetch("/api/watch");
    if (!res.ok) return;
    const data = (await res.json()) as { active: WatchRow[]; history: WatchRow[] };
    setActive(data.active);
    setHistory(data.history);
  }, []);

  const refreshCommunity = useCallback(async () => {
    const res = await fetch("/api/watch/community");
    if (!res.ok) return;
    const data = (await res.json()) as { items: CommunityRow[] };
    setCommunity(data.items);
  }, []);

  useEffect(() => {
    if (!hasTmdb || q.trim().length < 2) {
      searchGenerationRef.current += 1;
      setHits([]);
      setSearchBusy(false);
      return;
    }

    const ac = new AbortController();
    const gen = ++searchGenerationRef.current;

    const timer = setTimeout(async () => {
      if (gen !== searchGenerationRef.current) return;
      setSearchBusy(true);
      try {
        const res = await fetch(`/api/watch/search?q=${encodeURIComponent(q.trim())}`, {
          signal: ac.signal,
        });
        if (gen !== searchGenerationRef.current) return;
        const data = await res.json();
        if (gen !== searchGenerationRef.current) return;
        if (res.status === 503) {
          setHits([]);
          return;
        }
        setHits(Array.isArray(data.results) ? data.results : []);
      } catch (e) {
        if (gen !== searchGenerationRef.current || ac.signal.aborted) return;
        setHits([]);
      } finally {
        if (gen === searchGenerationRef.current) setSearchBusy(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      ac.abort();
      searchGenerationRef.current += 1;
    };
  }, [q, hasTmdb]);

  const addFromHit = async (hit: SearchHit) => {
    setSavingId(hit.externalId + hit.mediaType);
    try {
      const res = await fetch("/api/watch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalId: hit.externalId,
          mediaType: hit.mediaType,
          title: hit.title,
          posterPath: hit.posterPath,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "fail");
      }
      const payload = await res.json().catch(() => ({}));
      dispatchNewAchievements(payload);
      setQ("");
      setHits([]);
      setPanelOpen(false);
      toast.success(t.toastAdded);
      await refreshLists();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.toastError);
    } finally {
      setSavingId(null);
    }
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/watch/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      toast.error(t.toastError);
      return;
    }
    const payload = await res.json().catch(() => ({}));
    dispatchNewAchievements(payload);
    await refreshLists();
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/watch/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(t.toastError);
      return;
    }
    toast.success(t.toastRemoved);
    await refreshLists();
  };

  const seasonLabel = (row: WatchRow | CommunityRow) => {
    if (row.mediaType !== "TV" || row.season == null) return null;
    return t.seasonDisplay.replace("{n}", String(row.season));
  };

  const list = tab === "active" ? active : history;

  const communityScroll = (
    <div className="mb-6">
      <h3 className="mb-2 text-sm font-semibold text-warm-700">{t.communityTitle}</h3>
      {community.length === 0 ? (
        <p className="text-sm text-warm-400">{t.communityEmpty}</p>
      ) : (
        <div className="scrollbar-thin flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
          {community.map((row) => {
            const src = posterSrc(row.posterPath, "w342");
            const seasonLine = row.mediaType === "TV" ? seasonLabel(row) : null;
            return (
              <div
                key={row.id}
                className="w-[140px] shrink-0 snap-start rounded-2xl border border-warm-100 bg-white/90 p-2 shadow-sm"
              >
                <div className="relative mb-2 aspect-[2/3] w-full overflow-hidden rounded-xl bg-warm-100">
                  {src ? (
                    <Image src={src} alt="" fill className="object-cover" sizes="140px" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-warm-300">
                      <Clapperboard className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <p className="line-clamp-2 text-xs font-medium leading-tight text-warm-800">{row.title}</p>
                {seasonLine && <p className="mt-0.5 text-[10px] text-warm-500">{seasonLine}</p>}
                <p className="mt-1 truncate text-[10px] text-warm-400">
                  {row.family.name} · {normalizeProfileEmoji(row.user.emoji)} {row.user.name || t.someone}
                </p>
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-1 text-[11px] text-warm-400">{t.communityHint}</p>
    </div>
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-warm-800 flex items-center gap-2">
          <Clapperboard className="h-7 w-7 text-rose-500" />
          {t.title}
        </h1>
        <p className="mt-1 text-sm text-warm-500">{t.subtitle}</p>
      </div>

      {communityScroll}

      <div className="rounded-3xl border border-warm-100 bg-white/85 p-4 shadow-cozy">
        {!hasTmdb && <p className="mb-3 text-sm text-amber-700">{t.searchNoKey}</p>}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warm-400" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPanelOpen(true);
            }}
            onFocus={() => setPanelOpen(true)}
            placeholder={t.searchPlaceholder}
            disabled={!hasTmdb}
            className="w-full rounded-2xl border border-warm-200 bg-warm-50 py-2.5 pl-10 pr-10 text-sm text-warm-800 outline-none focus:border-rose-300 disabled:opacity-60"
          />
          {searchBusy && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-warm-400" />
          )}
          <AnimatePresence>
            {panelOpen && hasTmdb && (hits.length > 0 || (q.trim().length >= 2 && !searchBusy)) && (
              <motion.ul
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-2xl border border-warm-100 bg-white py-1 shadow-lg"
              >
                {hits.length === 0 && q.trim().length >= 2 && !searchBusy && (
                  <li className="px-3 py-2 text-sm text-warm-500">{t.searchEmpty}</li>
                )}
                {hits.map((hit) => {
                  const src = posterSrc(hit.posterPath, "w185");
                  const busy = savingId === hit.externalId + hit.mediaType;
                  return (
                    <li key={hit.externalId + hit.mediaType}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void addFromHit(hit)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-warm-50 disabled:opacity-50"
                      >
                        <div className="relative h-12 w-8 shrink-0 overflow-hidden rounded-lg bg-warm-100">
                          {src ? <Image src={src} alt="" fill className="object-cover" sizes="32px" /> : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-warm-800">{hit.title}</p>
                          <p className="text-xs text-warm-400">
                            {hit.mediaType === "MOVIE" ? t.badgeMovie : t.badgeTv}
                            {hit.year ? ` · ${hit.year}` : ""}
                          </p>
                        </div>
                        {busy ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <Plus className="h-4 w-4 shrink-0 text-rose-500" />}
                      </button>
                    </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
        {panelOpen && (hits.length > 0 || q.length > 0) && (
          <button
            type="button"
            className="mt-2 text-xs text-warm-400 underline"
            onClick={() => {
              setPanelOpen(false);
              setHits([]);
            }}
          >
            {t.closeSearch}
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("active")}
          className={cn(
            "rounded-2xl px-4 py-2 text-sm font-medium transition-colors",
            tab === "active" ? "bg-rose-500 text-white" : "bg-white/80 text-warm-600 border border-warm-100"
          )}
        >
          {t.tabActive} ({active.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("history")}
          className={cn(
            "rounded-2xl px-4 py-2 text-sm font-medium transition-colors",
            tab === "history" ? "bg-rose-500 text-white" : "bg-white/80 text-warm-600 border border-warm-100"
          )}
        >
          {t.tabHistory} ({history.length})
        </button>
        <button
          type="button"
          onClick={() => void refreshCommunity()}
          className="ml-auto rounded-2xl border border-warm-200 bg-white/80 px-3 py-2 text-xs text-warm-600"
        >
          {t.refreshCommunity}
        </button>
      </div>

      {list.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-warm-200 bg-white/50 py-12 text-center text-sm text-warm-500">
          {tab === "active" ? t.noActive : t.noHistory}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {list.map((row) => {
            const src = posterSrc(row.posterPath, "w500");
            const seasonLine = seasonLabel(row);
            const isActiveTab = tab === "active";
            return (
              <li
                key={row.id}
                className="group flex flex-col overflow-hidden rounded-3xl border border-warm-100 bg-white/95 shadow-cozy"
              >
                <div className="relative aspect-[2/3] w-full bg-gradient-to-b from-warm-100 to-warm-200">
                  {src ? (
                    <Image
                      src={src}
                      alt=""
                      fill
                      className="object-cover transition duration-500 ease-out group-hover:scale-[1.03]"
                      sizes="(max-width: 640px) 100vw, (max-width: 896px) 50vw, 400px"
                    />
                  ) : (
                    <div className="flex h-full min-h-[200px] items-center justify-center">
                      <Clapperboard className="h-20 w-20 text-warm-300" strokeWidth={1.25} />
                    </div>
                  )}
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/35 to-transparent"
                    aria-hidden
                  />
                  <button
                    type="button"
                    onClick={() => void remove(row.id)}
                    className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/40 bg-white/90 text-warm-500 shadow-md backdrop-blur-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                    aria-label={t.remove}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-col gap-3 p-4 pt-3">
                  <div>
                    <p className="text-base font-bold leading-snug text-warm-900 line-clamp-2">{row.title}</p>
                    <p className="mt-1 text-xs text-warm-500">
                      {normalizeProfileEmoji(row.user.emoji)} {row.user.name || t.someone}
                      {row.mediaType === "TV" && seasonLine ? ` · ${seasonLine}` : ""}
                      {row.mediaType === "MOVIE" ? ` · ${t.badgeMovie}` : ""}
                    </p>
                  </div>

                  {isActiveTab && row.mediaType === "TV" && (
                    <label className="flex items-center gap-2 text-xs text-warm-600">
                      <span className="shrink-0 font-medium">{t.seasonField}</span>
                      <input
                        type="number"
                        min={0}
                        className="w-full max-w-[5.5rem] rounded-xl border border-warm-200 bg-warm-50 px-3 py-2 text-sm font-semibold text-warm-800 outline-none focus:border-rose-300"
                        value={row.season != null ? row.season : ""}
                        onChange={(e) => {
                          const v = e.target.value === "" ? null : Number(e.target.value);
                          setActive((prev) =>
                            prev.map((r) => (r.id === row.id ? { ...r, season: v } : r))
                          );
                        }}
                        onBlur={(e) => {
                          const v = e.target.value === "" ? null : Math.max(0, Math.floor(Number(e.target.value)));
                          void patch(row.id, { season: v });
                        }}
                      />
                    </label>
                  )}

                  {isActiveTab && (
                    <div className="flex flex-wrap gap-2">
                      {row.status === "WATCHING" ? (
                        <button
                          type="button"
                          onClick={() => void patch(row.id, { status: "PAUSED" })}
                          className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-2xl border border-warm-200 bg-warm-50/80 px-3 text-xs font-semibold text-warm-800 sm:flex-initial"
                        >
                          <Pause className="h-3.5 w-3.5 shrink-0" /> {t.pause}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void patch(row.id, { status: "WATCHING" })}
                          className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-2xl border border-warm-200 bg-warm-50/80 px-3 text-xs font-semibold text-warm-800 sm:flex-initial"
                        >
                          <Play className="h-3.5 w-3.5 shrink-0" /> {t.resume}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void patch(row.id, { status: "FINISHED" })}
                        className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-2xl bg-sage-500 px-3 text-xs font-semibold text-white shadow-sm sm:flex-initial"
                      >
                        <Check className="h-3.5 w-3.5 shrink-0" /> {t.finish}
                      </button>
                      <button
                        type="button"
                        onClick={() => void patch(row.id, { status: "DROPPED" })}
                        className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-2xl border border-warm-200 bg-white px-3 text-xs font-semibold text-warm-600 sm:flex-initial"
                      >
                        <X className="h-3.5 w-3.5 shrink-0" /> {t.drop}
                      </button>
                    </div>
                  )}

                  {!isActiveTab && row.completedAt && (
                    <p className="text-xs text-warm-500">
                      {row.status === "FINISHED" ? t.statusFinished : t.statusDropped}:{" "}
                      {new Date(row.completedAt).toLocaleDateString(intlLocaleForUi(language))}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-center text-[11px] text-warm-400">
        <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer" className="underline">
          {t.tmdbAttribution}
        </a>
      </p>
    </div>
  );
}
