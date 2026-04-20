"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { cn, normalizeProfileEmoji } from "@/lib/utils";
import Image from "next/image";
import {
  CalendarDays,
  CreditCard,
  Focus,
  House,
  Menu,
  NotebookPen,
  Repeat2,
  ShoppingCart,
  Clapperboard,
  SquareKanban,
  Users,
  UtensilsCrossed,
  Pill,
  MessageSquareText,
  Shield,
  Map,
  Newspaper,
  X,
} from "lucide-react";
import { messageLocale, I18N } from "@/lib/i18n";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { filterMainNavByDisabled, isFocusRoutingAvailable } from "@/lib/family-app-modules";
import { useFocusMode } from "@/components/shared/FocusModeProvider";
import { useDisabledAppModules } from "@/components/shared/DisabledAppModulesProvider";

const mobileMenuIconBtnClass =
  "min-h-[44px] min-w-[44px] shrink-0 rounded-2xl border-2 border-rose-300/80 bg-white text-rose-600 shadow-sm flex items-center justify-center transition-transform touch-manipulation active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2";

const mobileTopBarClass =
  "flex min-h-[52px] shrink-0 items-center justify-between gap-2 border-b border-warm-100 px-3 py-2";

const mainNavItems = [
  { href: "/dashboard", key: "dashboard", Icon: House },
  { href: "/family", key: "family", Icon: Users },
  { href: "/tasks", key: "tasks", Icon: SquareKanban },
  { href: "/calendar", key: "calendar", Icon: CalendarDays },
  { href: "/menu", key: "menu", Icon: UtensilsCrossed },
  { href: "/notes", key: "notes", Icon: NotebookPen },
  { href: "/budget", key: "budget", Icon: CreditCard },
  { href: "/subscriptions", key: "subscriptions", Icon: Repeat2 },
  { href: "/shopping", key: "shopping", Icon: ShoppingCart },
  { href: "/watch", key: "watch", Icon: Clapperboard },
  { href: "/medications", key: "medications", Icon: Pill },
] as const;

const bottomNavItems = [
  { href: "/feedback", key: "feedback", Icon: MessageSquareText },
  { href: "/roadmap", key: "roadmap", Icon: Map },
  { href: "/blog", key: "blog", Icon: Newspaper },
  { href: "/privacy", key: "privacy", Icon: Shield },
] as const;

const FOCUS_NAV_ORDER = ["/shopping", "/tasks", "/calendar"] as const;

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    color?: string;
    emoji?: string;
  };
  isAdmin?: boolean;
}

export default function Sidebar({ user: u, isAdmin = false }: SidebarProps) {
  const modulesCtx = useDisabledAppModules();
  const disabledAppModules = modulesCtx?.disabledAppModules ?? [];
  const user = {
    name: u?.name ?? null,
    email: u?.email ?? null,
    image: u?.image ?? null,
    color: u?.color ?? "#f43f5e",
    emoji: normalizeProfileEmoji(u?.emoji),
  };
  const { language } = useAppLanguage();
  const t = I18N[messageLocale(language)];
  const pathname = usePathname();
  const [openMobileMenu, setOpenMobileMenu] = useState(false);
  const { enabled: focusEnabled, setEnabled: setFocusEnabled, active: focusActive } = useFocusMode();

  const baseNav = useMemo(
    () => filterMainNavByDisabled(mainNavItems, disabledAppModules),
    [disabledAppModules]
  );

  const mobileMainNav = useMemo(() => {
    if (focusActive && isFocusRoutingAvailable(disabledAppModules)) {
      return FOCUS_NAV_ORDER.map((h) => baseNav.find((i) => i.href === h)).filter(
        (x): x is (typeof mainNavItems)[number] => Boolean(x)
      );
    }
    return baseNav;
  }, [baseNav, focusActive, disabledAppModules]);

  const desktopNav = baseNav;

  const showFocusToggle = isFocusRoutingAvailable(disabledAppModules);

  const tourKeyFor = (href: string) =>
    href === "/family"
      ? "nav-family"
      : href === "/menu"
        ? "nav-menu"
        : href === "/calendar"
          ? "nav-calendar"
          : href === "/notes"
            ? "nav-notes"
            : href === "/budget"
              ? "nav-budget"
              : undefined;

  return (
    <>
      <aside className="md:hidden bg-white/85 backdrop-blur-md shadow-sm">
        <div className={mobileTopBarClass}>
          <Link
            href="/dashboard"
            className="flex min-w-0 flex-1 items-center gap-2 rounded-xl py-1 pl-0.5 pr-2 -my-1 outline-none ring-rose-200 transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2"
            aria-label={`Nibbo — ${t.nav.dashboard}`}
          >
            <Image src="/favicon.svg" alt="" width={24} height={24} className="shrink-0" aria-hidden />
            <span className="truncate font-bold text-warm-800 text-base leading-tight">Nibbo</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpenMobileMenu(true)}
            className={mobileMenuIconBtnClass}
            aria-label={t.openMenuAria}
          >
            <Menu size={20} strokeWidth={2} aria-hidden />
          </button>
        </div>
      </aside>
      <AnimatePresence>
        {openMobileMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-[60] bg-white"
          >
            <div className="flex h-full flex-col">
              <div className={mobileTopBarClass}>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Link
                    href="/dashboard"
                    onClick={() => setOpenMobileMenu(false)}
                    className="shrink-0 rounded-xl p-0.5 outline-none ring-rose-200 transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2"
                    aria-label={`Nibbo — ${t.nav.dashboard}`}
                  >
                    <Image src="/favicon.svg" alt="" width={24} height={24} aria-hidden />
                  </Link>
                  <h2 className="truncate font-bold text-warm-800 text-base leading-tight">{t.mobileMenuTitle}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenMobileMenu(false)}
                  className={mobileMenuIconBtnClass}
                  aria-label={t.closeMenuAria}
                >
                  <X size={20} strokeWidth={2} aria-hidden />
                </button>
              </div>
              <nav className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden px-3 pb-3 pt-3">
                {showFocusToggle ? (
                  <div className="rounded-2xl border border-warm-200 bg-warm-50/90 px-3 py-3 shadow-sm">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-warm-100 bg-white text-rose-600">
                        <Focus size={18} strokeWidth={2} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-warm-800">{t.focusMode.sectionLabel}</p>
                        <p className="mt-0.5 text-xs text-warm-500">{t.focusMode.hint}</p>
                        <button
                          type="button"
                          onClick={() => setFocusEnabled(!focusEnabled)}
                          className={cn(
                            "mt-2 w-full rounded-xl border px-3 py-2 text-sm font-semibold transition-colors touch-manipulation",
                            focusEnabled
                              ? "border-rose-300 bg-gradient-to-r from-rose-50 to-rose-100 text-rose-700"
                              : "border-warm-200 bg-white text-warm-700 hover:bg-warm-50"
                          )}
                        >
                          {focusEnabled ? t.focusMode.active : t.focusMode.inactive}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
                {mobileMainNav.map((item) => {
                  const isActive =
                    pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  const tourKey = tourKeyFor(item.href);
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setOpenMobileMenu(false)} data-tour={tourKey}>
                      <motion.div
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          "flex min-h-[52px] items-center gap-3 rounded-2xl border px-3 py-2.5 text-[15px] font-semibold leading-snug transition-colors",
                          isActive
                            ? "border-rose-200/90 bg-gradient-to-r from-rose-50 to-rose-100 text-rose-700 shadow-sm"
                            : "border-warm-100 bg-warm-50/90 text-warm-800 shadow-sm"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                            isActive
                              ? "border-rose-200/70 bg-white text-rose-600"
                              : "border-warm-100/80 bg-white text-warm-600"
                          )}
                          aria-hidden
                        >
                          <item.Icon size={18} strokeWidth={2} />
                        </span>
                        <span className="min-w-0 flex-1">{t.nav[item.key as keyof typeof t.nav]}</span>
                      </motion.div>
                    </Link>
                  );
                })}
                {isAdmin ? (
                  <div className="mt-2">
                    <Link
                      href="/admin"
                      onClick={() => setOpenMobileMenu(false)}
                      className="flex min-h-[52px] items-center gap-3 rounded-2xl border border-rose-200/90 bg-gradient-to-r from-rose-50 to-rose-100/80 px-3 py-2.5 text-[15px] font-semibold leading-snug text-rose-800 shadow-sm"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-200/80 bg-white text-rose-600">
                        <Shield size={18} strokeWidth={2} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">{t.nav.adminPanel}</span>
                    </Link>
                  </div>
                ) : null}
              </nav>
              <div className="shrink-0 border-t border-warm-100 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <div className="flex items-center justify-center gap-4">
                  {bottomNavItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href);
                    const label = t.nav[item.key as keyof typeof t.nav];
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpenMobileMenu(false)}
                        aria-label={label}
                        title={label}
                        className="touch-manipulation"
                      >
                        <motion.div
                          whileTap={{ scale: 0.96 }}
                          className={cn(
                            "flex h-[52px] w-[52px] items-center justify-center rounded-2xl border-2 transition-colors",
                            isActive
                              ? "border-rose-300/90 bg-gradient-to-br from-rose-50 to-rose-100 text-rose-600 shadow-sm"
                              : "border-warm-200/90 bg-warm-50/90 text-warm-600 shadow-sm active:bg-warm-100"
                          )}
                        >
                          <item.Icon size={22} strokeWidth={2} aria-hidden />
                        </motion.div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <aside
        data-tour="sidebar-nav"
        className="hidden md:flex w-64 h-full bg-white/80 backdrop-blur-md border-r border-warm-100 flex-col shadow-cozy z-10"
      >
        <div className="p-6 border-b border-warm-100">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-2xl -m-2 p-2 outline-none ring-rose-200 transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2"
            aria-label={`Nibbo — ${t.nav.dashboard}`}
          >
            <Image src="/favicon.svg" alt="" width={32} height={32} aria-hidden />
            <div className="min-w-0">
              <span className="block font-bold text-warm-800 text-lg leading-tight">Nibbo</span>
              <span className="block text-xs text-warm-400">{t.dashboardHomeTagline}</span>
            </div>
          </Link>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-4">
          {desktopNav.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const tourKey = tourKeyFor(item.href);
            return (
              <div key={item.href}>
                <Link href={item.href} data-tour={tourKey}>
                  <motion.div
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.97 }}
                    className={cn(
                      "relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all",
                      isActive
                        ? "bg-gradient-to-r from-rose-50 to-rose-100/50 text-rose-700 shadow-sm"
                        : "text-warm-600 hover:bg-warm-50 hover:text-warm-800"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-rose-100 to-rose-50"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                      />
                    )}
                    <item.Icon size={18} className="relative z-10" />
                    <span className="relative z-10">{t.nav[item.key as keyof typeof t.nav]}</span>
                    {isActive && <div className="relative z-10 ml-auto h-1.5 w-1.5 rounded-full bg-rose-400" />}
                  </motion.div>
                </Link>
              </div>
            );
          })}
        </nav>
        {isAdmin ? (
          <div className="shrink-0 border-t border-warm-100 px-4 pt-3">
            <Link href="/admin">
              <motion.div
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  "relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all",
                  pathname.startsWith("/admin")
                    ? "bg-gradient-to-r from-rose-100 to-rose-50 text-rose-800 shadow-sm"
                    : "text-rose-700 hover:bg-rose-50/90 hover:text-rose-900"
                )}
              >
                <Shield size={18} className="relative z-10 shrink-0" />
                <span className="relative z-10">{t.nav.adminPanel}</span>
              </motion.div>
            </Link>
          </div>
        ) : null}
        <div className="shrink-0 space-y-1 border-t border-warm-100 p-4 pt-3">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href);
            return (
              <div key={item.href}>
                <Link href={item.href}>
                  <motion.div
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.97 }}
                    className={cn(
                      "relative flex items-center gap-3 rounded-2xl px-4 py-2.5 text-[13px] font-medium transition-all",
                      isActive
                        ? "bg-gradient-to-r from-rose-50 to-rose-100/50 text-rose-700 shadow-sm"
                        : "text-warm-500 hover:bg-warm-50 hover:text-warm-700"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-rose-100 to-rose-50"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                      />
                    )}
                    <item.Icon size={17} className="relative z-10" />
                    <span className="relative z-10">{t.nav[item.key as keyof typeof t.nav]}</span>
                    {isActive && <div className="relative z-10 ml-auto h-1.5 w-1.5 rounded-full bg-rose-400" />}
                  </motion.div>
                </Link>
              </div>
            );
          })}
        </div>
        <div className="shrink-0 border-t border-warm-100 p-4">
          <Link
            href="/profile"
            className={cn(
              "block rounded-2xl p-3 outline-none transition focus-visible:ring-2 focus-visible:ring-lavender-300 focus-visible:ring-offset-2",
              pathname === "/profile"
                ? "border border-lavender-200/90 bg-lavender-50/70 shadow-sm"
                : "border border-transparent bg-warm-50 hover:border-warm-200/80 hover:bg-warm-100/90"
            )}
            aria-label={t.nav.profile}
          >
            <div className="flex items-center gap-3">
              {user.image ? (
                <span className="relative block h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 ring-warm-200/90">
                  <Image
                    src={user.image}
                    alt=""
                    width={36}
                    height={36}
                    className="h-full w-full object-cover object-center"
                    unoptimized={user.image.startsWith("/api/users/avatar/")}
                  />
                </span>
              ) : (
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-white"
                  style={{ backgroundColor: user.color || "#f43f5e" }}
                >
                  {user.name?.[0] || "U"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-warm-800">{user.name}</p>
                <p className="truncate text-xs text-warm-400">{user.email}</p>
              </div>
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
}
