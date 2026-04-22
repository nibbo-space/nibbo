"use client";

import { LandingHudCorners } from "@/components/landing/LandingHudCorners";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { useLandingReducedMotion } from "@/lib/landing-motion";
import { messageLocale, I18N } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Check,
  CreditCard,
  NotebookPen,
  ShoppingCart,
  SquareKanban,
  UtensilsCrossed,
} from "lucide-react";

type Tile = {
  key: string;
  Icon: typeof SquareKanban;
  label: string;
  hint: string;
  className: string;
  variant: "hero" | "compact";
  Decor?: () => React.ReactElement;
};

const KANBAN_COLS = [
  {
    label: "To Do",
    bg: "bg-warm-50",
    dot: "bg-warm-300",
    tasks: ["Fix faucet 🔧", "Order groceries"],
    taskBg: "bg-white border-warm-100/80",
  },
  {
    label: "In Progress",
    bg: "bg-amber-50",
    dot: "bg-amber-400",
    tasks: ["Plan birthday 🎂"],
    taskBg: "bg-white border-amber-100/80",
  },
  {
    label: "Done",
    bg: "bg-emerald-50",
    dot: "bg-emerald-400",
    tasks: ["Book dentist ✅", "Pay bills ✅"],
    taskBg: "bg-white border-emerald-100/80",
  },
] as const;

function TasksPreviewDecor() {
  return (
    <div className="mt-auto grid grid-cols-3 gap-1.5 rounded-xl border border-rose-100/90 bg-rose-50/30 p-2.5 shadow-inner">
      {KANBAN_COLS.map((col) => (
        <div key={col.label} className="space-y-1.5">
          <div className={cn("flex items-center gap-1 rounded-md px-1.5 py-1", col.bg)}>
            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", col.dot)} />
            <span className="truncate text-[8px] font-bold uppercase tracking-wide text-warm-500">
              {col.label}
            </span>
          </div>
          {col.tasks.map((task) => (
            <div
              key={task}
              className={cn(
                "rounded-lg border px-1.5 py-1.5 text-[9px] font-medium leading-snug text-warm-700 shadow-sm",
                col.taskBg,
              )}
            >
              {task}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const WEEK_DAYS = ["M", "T", "W", "T", "F", "S", "S"] as const;
const WEEK_EVENT_DAYS = new Set([1, 3, 5]);

function CalendarDecor() {
  return (
    <div className="mt-3 flex gap-1 md:hidden lg:flex">
      {WEEK_DAYS.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[8px] font-bold text-warm-400">{d}</span>
          <div
            className={cn(
              "flex h-5 w-full items-center justify-center rounded-md text-[8px] font-bold",
              WEEK_EVENT_DAYS.has(i)
                ? i === 5
                  ? "bg-lavender-100 text-lavender-600"
                  : "bg-rose-100 text-rose-500"
                : "bg-warm-50 text-warm-200",
            )}
          >
            {WEEK_EVENT_DAYS.has(i) ? "●" : ""}
          </div>
        </div>
      ))}
    </div>
  );
}

function MenuDecor() {
  return (
    <div className="mt-3 flex items-center gap-2 rounded-lg border border-warm-100 bg-cream-50/80 px-2.5 py-2 md:hidden lg:flex">
      <span className="shrink-0 text-base">🍝</span>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="h-2 w-full rounded-full bg-warm-200" />
        <div className="h-1.5 w-3/4 rounded-full bg-warm-100" />
      </div>
      <span className="shrink-0 rounded-md bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold text-rose-500">
        30 min
      </span>
    </div>
  );
}

function NotesDecor() {
  return (
    <div className="mt-3 space-y-1.5 rounded-lg border border-warm-100 bg-cream-50/80 p-2.5 md:hidden lg:flex lg:flex-col">
      <div className="h-2 w-full rounded-full bg-warm-200" />
      <div className="h-2 w-5/6 rounded-full bg-warm-100" />
      <div className="h-2 w-4/6 rounded-full bg-warm-100" />
    </div>
  );
}

const BUDGET_BARS = [
  { h: 60, color: "bg-rose-300" },
  { h: 40, color: "bg-lavender-300" },
  { h: 75, color: "bg-rose-400" },
  { h: 50, color: "bg-warm-200" },
  { h: 85, color: "bg-emerald-300" },
  { h: 35, color: "bg-warm-200" },
] as const;

function BudgetDecor() {
  return (
    <div className="mt-3 flex items-end gap-1 rounded-lg border border-warm-100 bg-cream-50/80 px-2.5 pb-1.5 pt-2 md:hidden lg:flex">
      {BUDGET_BARS.map((b, i) => (
        <div
          key={i}
          className={cn("flex-1 rounded-t-sm", b.color)}
          style={{ height: `${b.h * 0.22}px` }}
        />
      ))}
    </div>
  );
}

const SHOPPING_ITEMS = [
  { label: "Milk", checked: true },
  { label: "Eggs", checked: true },
  { label: "Bread", checked: false },
  { label: "Butter", checked: false },
] as const;

function ShoppingDecor() {
  return (
    <div className="mt-3 space-y-1.5 rounded-lg border border-warm-100 bg-cream-50/80 p-2.5 md:hidden lg:flex lg:flex-col lg:gap-1.5">
      {SHOPPING_ITEMS.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <div
            className={cn(
              "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded",
              item.checked ? "bg-emerald-400" : "border-2 border-warm-200",
            )}
          >
            {item.checked && <Check className="h-2 w-2 text-white" strokeWidth={3} />}
          </div>
          <span
            className={cn(
              "text-[10px] font-medium",
              item.checked ? "text-warm-400 line-through" : "text-warm-600",
            )}
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function LandingModulesBento() {
  const { language } = useAppLanguage();
  const t = I18N[messageLocale(language)].landing;
  const reduced = useLandingReducedMotion();

  const tiles: Tile[] = [
    {
      key: "tasks",
      Icon: SquareKanban,
      label: I18N[messageLocale(language)].login.features.tasks,
      hint: t.moduleHintTasks,
      className: "md:col-span-3 md:row-span-2 md:row-start-1",
      variant: "hero",
    },
    {
      key: "calendar",
      Icon: CalendarDays,
      label: I18N[messageLocale(language)].login.features.calendar,
      hint: t.moduleHintCalendar,
      className: "md:col-span-3 md:row-start-1 md:col-start-4",
      variant: "compact",
      Decor: CalendarDecor,
    },
    {
      key: "menu",
      Icon: UtensilsCrossed,
      label: I18N[messageLocale(language)].login.features.menu,
      hint: t.moduleHintMenu,
      className: "md:col-span-3 md:row-start-2 md:col-start-4",
      variant: "compact",
      Decor: MenuDecor,
    },
    {
      key: "notes",
      Icon: NotebookPen,
      label: I18N[messageLocale(language)].login.features.notes,
      hint: t.moduleHintNotes,
      className: "md:col-span-2 md:row-start-3 md:col-start-1",
      variant: "compact",
      Decor: NotesDecor,
    },
    {
      key: "budget",
      Icon: CreditCard,
      label: I18N[messageLocale(language)].login.features.budget,
      hint: t.moduleHintBudget,
      className: "md:col-span-2 md:row-start-3 md:col-start-3",
      variant: "compact",
      Decor: BudgetDecor,
    },
    {
      key: "shopping",
      Icon: ShoppingCart,
      label: I18N[messageLocale(language)].login.features.shopping,
      hint: t.moduleHintShopping,
      className: "md:col-span-2 md:row-start-3 md:col-start-5",
      variant: "compact",
      Decor: ShoppingDecor,
    },
  ];

  return (
    <section id="modules" className="scroll-mt-24">
      <div className="relative overflow-hidden rounded-2xl border-[3px] border-rose-200/75 bg-gradient-to-br from-white/95 via-cream-50/50 to-lavender-50/35 p-5 shadow-[0_10px_0_0_rgba(253,164,175,0.2),0_24px_48px_-20px_rgba(244,63,94,0.12)] sm:p-6 md:rounded-[1.75rem] md:p-8">
        <LandingHudCorners size="sm" />
        <div className="relative z-[1] mb-8 text-center md:mb-10 md:text-left">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-rose-500">◇ {t.modulesEyebrow} ◇</p>
          <h2 className="mt-3 max-w-3xl font-display text-2xl font-extrabold leading-tight tracking-tight text-warm-950 sm:text-3xl md:text-4xl">
            {t.modulesTitle}
          </h2>
          <div className="mx-auto mt-4 h-px max-w-xs bg-gradient-to-r from-transparent via-rose-300/70 to-transparent md:mx-0 md:max-w-md" />
        </div>

        <ul className="relative z-[1] grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-6 md:grid-rows-3 md:items-stretch md:gap-5">
          {tiles.map((tile, index) => (
            <motion.li
              key={tile.key}
              initial={false}
              transition={{ delay: reduced ? 0 : index * 0.04 }}
              whileHover={reduced ? {} : { y: -4, transition: { duration: 0.2 } }}
              className={cn(
                "group relative flex overflow-hidden rounded-2xl border-2 border-rose-100/95 bg-gradient-to-br from-white via-white to-cream-50/60 shadow-[0_5px_0_0_rgba(254,205,211,0.85)] transition-[box-shadow,border-color,transform] duration-200 hover:border-rose-300/80 hover:shadow-[0_8px_0_0_rgba(253,164,175,0.75)]",
                tile.variant === "hero"
                  ? "min-h-[280px] flex-col p-5 sm:p-6 md:min-h-0 md:h-full md:p-7"
                  : "min-h-[132px] flex-col p-5 sm:min-h-[140px] md:flex-row md:items-center md:gap-5 md:p-6",
                tile.className,
              )}
            >
              <div
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-100 via-rose-50 to-lavender-100 text-rose-600 shadow-md ring-2 ring-white/90 transition-transform duration-200 group-hover:scale-[1.03]",
                  tile.variant === "hero" ? "h-14 w-14 sm:h-16 sm:w-16" : "h-12 w-12 md:h-14 md:w-14",
                )}
              >
                <tile.Icon className={tile.variant === "hero" ? "h-7 w-7 sm:h-8 sm:w-8" : "h-6 w-6 md:h-7 md:w-7"} strokeWidth={2} />
              </div>
              <div className={cn("min-w-0", tile.variant === "hero" ? "mt-5 flex flex-1 flex-col" : "mt-4 md:mt-0 md:flex-1")}>
                <p className="font-display text-lg font-extrabold tracking-tight text-warm-950 sm:text-xl md:text-lg">
                  {tile.label}
                </p>
                <p className="mt-2 text-pretty text-sm leading-relaxed text-warm-600 sm:text-[15px] md:text-sm">{tile.hint}</p>
                {tile.variant === "hero" && <TasksPreviewDecor />}
                {tile.variant === "compact" && tile.Decor && <tile.Decor />}
              </div>
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-rose-200/25 blur-2xl transition-opacity duration-300 group-hover:opacity-90"
                aria-hidden
              />
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
