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
  const featured = active[0] ?? history[0] ?? null;
  const featuredSrc = featured ? posterSrc(featured.posterPath, "w500") : null;
  const featuredSeason = featured ? seasonLabel(featured) : null;

  const communityScroll = (
    <div className="mb-5 rounded-3xl border border-warm-200/80 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-base font-semibold text-warm-800">{t.communityTitle}</h3>
      {community.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-warm-200 bg-warm-50/70 px-4 py-5">
          <p className="text-sm font-medium text-warm-500">{t.communityEmpty}</p>
          <p className="mt-1 text-xs text-warm-400">{t.communityHint}</p>
        </div>
      ) : (
        <div className="scrollbar-thin flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
          {community.map((row) => {
            const src = posterSrc(row.posterPath, "w500");
            const seasonLine = row.mediaType === "TV" ? seasonLabel(row) : null;
            return (
              <div
                key={row.id}
                className="group relative w-[228px] shrink-0 snap-start overflow-hidden rounded-3xl border border-warm-200 bg-warm-100 shadow-sm"
              >
                <div className="relative aspect-[2/3] w-full">
                  {src ? <Image src={src} alt="" fill className="object-cover transition duration-500 group-hover:scale-[1.03]" sizes="228px" /> : null}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                </div>
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <p className="line-clamp-2 text-sm font-semibold leading-tight text-white">{row.title}</p>
                  {seasonLine && <p className="mt-0.5 text-xs text-white/80">{seasonLine}</p>}
                  <p className="mt-1 truncate text-xs text-white/80">
                    {row.family.name} · {normalizeProfileEmoji(row.user.emoji)} {row.user.name || t.someone}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {community.length > 0 && <p className="mt-2 text-xs text-warm-400">{t.communityHint}</p>}
    </div>
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 pb-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-warm-800">
          <Clapperboard className="h-7 w-7 text-rose-500" />
          {t.title}
        </h1>
        <p className="mt-1 text-sm text-warm-500">{t.subtitle}</p>
      </div>

      {featured && (
        <div className="relative overflow-hidden rounded-3xl border border-warm-200 bg-warm-100 shadow-sm">
          {featuredSrc ? (
            <Image src={featuredSrc} alt="" fill className="object-cover" sizes="(max-width: 1200px) 100vw, 1200px" />
          ) : null}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-black/10" />
          <div className="relative z-10 flex min-h-[220px] flex-col justify-end p-5 sm:min-h-[260px]">
            <p className="max-w-xl text-2xl font-bold leading-tight text-white sm:text-3xl">{featured.title}</p>
            <p className="mt-2 text-sm text-white/80">
              {normalizeProfileEmoji(featured.user.emoji)} {featured.user.name || t.someone}
              {featured.mediaType === "TV" && featuredSeason ? ` · ${featuredSeason}` : ""}
              {featured.mediaType === "MOVIE" ? ` · ${t.badgeMovie}` : ""}
            </p>
          </div>
        </div>
      )}

      {communityScroll}

      <div className="rounded-3xl border border-warm-200/80 bg-white p-4 shadow-sm">
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
            tab === "active"
              ? "bg-warm-900 text-white"
              : "border border-warm-200 bg-white text-warm-600"
          )}
        >
          {t.tabActive} ({active.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("history")}
          className={cn(
            "rounded-2xl px-4 py-2 text-sm font-medium transition-colors",
            tab === "history"
              ? "bg-warm-900 text-white"
              : "border border-warm-200 bg-white text-warm-600"
          )}
        >
          {t.tabHistory} ({history.length})
        </button>
        <button
          type="button"
          onClick={() => void refreshCommunity()}
          className="ml-auto rounded-2xl border border-warm-200 bg-white px-3 py-2 text-xs text-warm-600"
        >
          {t.refreshCommunity}
        </button>
      </div>

      {list.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-warm-200 bg-white/50 py-12 text-center text-sm text-warm-500">
          {tab === "active" ? t.noActive : t.noHistory}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((row) => {
            const src = posterSrc(row.posterPath, "w500");
            const seasonLine = seasonLabel(row);
            const isActiveTab = tab === "active";
            return (
              <li
                key={row.id}
                className="group overflow-hidden rounded-3xl border border-warm-200 bg-white shadow-sm"
              >
                <div className="flex">
                  <div className="relative aspect-[2/3] w-[42%] min-w-[140px] bg-gradient-to-b from-warm-100 to-warm-200">
                  {src ? (
                    <Image
                      src={src}
                      alt=""
                      fill
                      className="object-cover transition duration-500 ease-out group-hover:scale-[1.03]"
                      sizes="(max-width: 640px) 42vw, 220px"
                    />
                  ) : (
                    <div className="flex h-full min-h-[200px] items-center justify-center">
                      <Clapperboard className="h-20 w-20 text-warm-300" strokeWidth={1.25} />
                    </div>
                  )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-3">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-base font-bold leading-snug text-warm-900">{row.title}</p>
                        <p className="mt-1 text-xs text-warm-500">
                          {normalizeProfileEmoji(row.user.emoji)} {row.user.name || t.someone}
                          {row.mediaType === "TV" && seasonLine ? ` · ${seasonLine}` : ""}
                          {row.mediaType === "MOVIE" ? ` · ${t.badgeMovie}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void remove(row.id)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-warm-200 bg-white text-warm-500 transition hover:border-rose-200 hover:text-rose-600"
                        aria-label={t.remove}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {isActiveTab && row.mediaType === "TV" && (
                      <label className="flex items-center gap-2 text-xs text-warm-600">
                        <span className="shrink-0 font-medium">{t.seasonField}</span>
                        <input
                          type="number"
                          min={0}
                          className="w-full max-w-[5rem] rounded-xl border border-warm-200 bg-warm-50 px-2.5 py-1.5 text-xs font-semibold text-warm-800 outline-none focus:border-rose-300"
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
                      <div className="grid grid-cols-2 gap-2">
                        {row.status === "WATCHING" ? (
                          <button
                            type="button"
                            onClick={() => void patch(row.id, { status: "PAUSED" })}
                            className="inline-flex min-h-[34px] items-center justify-center gap-1 rounded-xl border border-warm-200 bg-warm-50 px-2 text-xs font-semibold text-warm-800"
                          >
                            <Pause className="h-3 w-3 shrink-0" /> {t.pause}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void patch(row.id, { status: "WATCHING" })}
                            className="inline-flex min-h-[34px] items-center justify-center gap-1 rounded-xl border border-warm-200 bg-warm-50 px-2 text-xs font-semibold text-warm-800"
                          >
                            <Play className="h-3 w-3 shrink-0" /> {t.resume}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void patch(row.id, { status: "FINISHED" })}
                          className="inline-flex min-h-[34px] items-center justify-center gap-1 rounded-xl bg-sage-500 px-2 text-xs font-semibold text-white"
                        >
                          <Check className="h-3 w-3 shrink-0" /> {t.finish}
                        </button>
                        <button
                          type="button"
                          onClick={() => void patch(row.id, { status: "DROPPED" })}
                          className="col-span-2 inline-flex min-h-[34px] items-center justify-center gap-1 rounded-xl border border-warm-200 bg-white px-2 text-xs font-semibold text-warm-600"
                        >
                          <X className="h-3 w-3 shrink-0" /> {t.drop}
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
