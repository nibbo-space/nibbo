export const APP_MODULE_KEYS = [
  "TASKS",
  "CALENDAR",
  "MENU",
  "NOTES",
  "BUDGET",
  "SUBSCRIPTIONS",
  "SHOPPING",
  "WATCH",
  "MEDICATIONS",
] as const;

export type AppModuleKey = (typeof APP_MODULE_KEYS)[number];

const MODULE_PATHS: { prefix: string; module: AppModuleKey }[] = [
  { prefix: "/tasks", module: "TASKS" },
  { prefix: "/calendar", module: "CALENDAR" },
  { prefix: "/menu", module: "MENU" },
  { prefix: "/notes", module: "NOTES" },
  { prefix: "/budget", module: "BUDGET" },
  { prefix: "/subscriptions", module: "SUBSCRIPTIONS" },
  { prefix: "/shopping", module: "SHOPPING" },
  { prefix: "/watch", module: "WATCH" },
  { prefix: "/medications", module: "MEDICATIONS" },
];

const NAV_FALLBACK_ORDER: { href: string; module: AppModuleKey | null }[] = [
  { href: "/dashboard", module: null },
  { href: "/family", module: null },
  { href: "/tasks", module: "TASKS" },
  { href: "/calendar", module: "CALENDAR" },
  { href: "/menu", module: "MENU" },
  { href: "/notes", module: "NOTES" },
  { href: "/budget", module: "BUDGET" },
  { href: "/subscriptions", module: "SUBSCRIPTIONS" },
  { href: "/shopping", module: "SHOPPING" },
  { href: "/watch", module: "WATCH" },
  { href: "/medications", module: "MEDICATIONS" },
];

const FOCUS_ORDER: { href: string; module: AppModuleKey }[] = [
  { href: "/shopping", module: "SHOPPING" },
  { href: "/tasks", module: "TASKS" },
  { href: "/calendar", module: "CALENDAR" },
];

export function parseDisabledAppModules(raw: string[] | null | undefined): AppModuleKey[] {
  const out = new Set<AppModuleKey>();
  const allowed = new Set<string>(APP_MODULE_KEYS);
  for (const s of raw ?? []) {
    const k = String(s).trim().toUpperCase();
    if (allowed.has(k)) out.add(k as AppModuleKey);
  }
  return [...out];
}

export function pathnameToAppModule(pathname: string): AppModuleKey | null {
  for (const { prefix, module } of MODULE_PATHS) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return module;
  }
  return null;
}

export function isModuleDisabled(disabled: readonly string[], mod: AppModuleKey): boolean {
  return disabled.includes(mod);
}

export function isPathBlockedByDisabledModules(pathname: string, disabled: readonly string[]): boolean {
  const m = pathnameToAppModule(pathname);
  if (!m) return false;
  return isModuleDisabled(disabled, m);
}

export function matchesNavHref(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function firstAccessibleNavHref(disabled: readonly string[]): string {
  for (const row of NAV_FALLBACK_ORDER) {
    if (row.module === null || !isModuleDisabled(disabled, row.module)) return row.href;
  }
  return "/dashboard";
}

export function focusAllowlistHrefs(disabled: readonly string[]): string[] {
  return FOCUS_ORDER.filter((row) => !isModuleDisabled(disabled, row.module)).map((row) => row.href);
}

export function firstFocusHref(disabled: readonly string[]): string {
  const list = focusAllowlistHrefs(disabled);
  return list[0] ?? "/dashboard";
}

export function isFocusRoutingAvailable(disabled: readonly string[]): boolean {
  return focusAllowlistHrefs(disabled).length > 0;
}

export function isFocusPathAllowed(pathname: string, disabled: readonly string[]): boolean {
  if (!isFocusRoutingAvailable(disabled)) return true;
  for (const href of focusAllowlistHrefs(disabled)) {
    if (matchesNavHref(pathname, href)) return true;
  }
  return false;
}

export function filterMainNavByDisabled<T extends { href: string }>(items: readonly T[], disabled: readonly string[]): T[] {
  return items.filter((item) => {
    if (item.href === "/dashboard" || item.href === "/family") return true;
    const mod = MODULE_PATHS.find((p) => p.prefix === item.href)?.module;
    if (!mod) return true;
    return !isModuleDisabled(disabled, mod);
  });
}

export const FAMILY_MODULE_CARD_ORDER = [
  { key: "TASKS" as const, navKey: "tasks" },
  { key: "CALENDAR" as const, navKey: "calendar" },
  { key: "MENU" as const, navKey: "menu" },
  { key: "NOTES" as const, navKey: "notes" },
  { key: "BUDGET" as const, navKey: "budget" },
  { key: "SUBSCRIPTIONS" as const, navKey: "subscriptions" },
  { key: "SHOPPING" as const, navKey: "shopping" },
  { key: "WATCH" as const, navKey: "watch" },
  { key: "MEDICATIONS" as const, navKey: "medications" },
];
