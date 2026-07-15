"use client";

import { LandingSceneCaption } from "@/components/landing/LandingSceneCaption";
import { useAppLanguage } from "@/hooks/useAppLanguage";
import { useLandingReducedMotion } from "@/lib/landing-motion";
import { I18N, messageLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { CalendarDays, Check, ShoppingCart, SquareKanban } from "lucide-react";

export function LandingSceneHome({ active }: { active: boolean }) {
  const { language } = useAppLanguage();
  const ml = messageLocale(language);
  const t = I18N[ml].landing;
  const dash = I18N[ml].dashboard;
  const tam = I18N[ml].tamagotchi;
  const priority = I18N[ml].task.priority;
  const reduced = useLandingReducedMotion();

  const tasks = [
    { title: t.mockTaskDinner, who: "A", color: "bg-[#f43f5e]", pri: "HIGH", priClass: "bg-peach-100 text-peach-700", done: false },
    { title: t.mockTaskGroceries, who: "S", color: "bg-[#38bdf8]", pri: "MEDIUM", priClass: "bg-sky-100 text-sky-700", done: false },
    { title: t.mockTaskVacuum, who: "M", color: "bg-[#4ade80]", pri: "LOW", priClass: "bg-sage-100 text-sage-700", done: true },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute bottom-[30%] left-3 top-4 z-10 flex w-[min(94%,400px)] flex-col gap-2.5 overflow-hidden md:bottom-[28%] md:left-6 md:top-6"
        initial={reduced ? false : { opacity: 0, x: -18 }}
        animate={active ? { opacity: 1, x: 0 } : { opacity: 0, x: -12 }}
        transition={{ duration: 0.45 }}
      >
        <div className="rounded-3xl border border-warm-100 bg-white/80 p-3.5 shadow-cozy backdrop-blur-md">
          <p className="text-xs font-bold text-warm-800">{dash.dayFocusTitle}</p>
          <p className="mt-0.5 text-[11px] text-warm-500">{dash.dayFocusSubtitle}</p>
          <div className="mt-3 space-y-2">
            <div>
              <div className="mb-1 flex justify-between text-[10px] font-semibold text-warm-500">
                <span>{tam.day}</span>
                <span>2 / 3</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-warm-100">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-peach-400 to-rose-400"
                  initial={false}
                  animate={active ? { width: "66%" } : { width: "0%" }}
                  transition={{ duration: reduced ? 0 : 0.8 }}
                />
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-[10px] font-semibold text-warm-500">
                <span>{tam.week}</span>
                <span>8 / 12</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-warm-100">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-sage-400 to-sky-400"
                  initial={false}
                  animate={active ? { width: "67%" } : { width: "0%" }}
                  transition={{ duration: reduced ? 0 : 0.9, delay: 0.05 }}
                />
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-cream-50 px-2.5 py-2 text-center">
              <p className="text-[10px] font-semibold text-warm-500">{tam.myActive}</p>
              <p className="font-display text-lg font-bold text-warm-800">5</p>
            </div>
            <div className="rounded-2xl bg-cream-50 px-2.5 py-2 text-center">
              <p className="text-[10px] font-semibold text-warm-500">{tam.doneTotal}</p>
              <p className="font-display text-lg font-bold text-warm-800">42</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: dash.stats.activeTasks, value: "12", Icon: SquareKanban, tone: "from-rose-400 to-rose-500" },
            { label: dash.stats.upcomingEvents, value: "4", Icon: CalendarDays, tone: "from-lavender-400 to-lavender-500" },
            { label: dash.stats.toBuy, value: "7", Icon: ShoppingCart, tone: "from-sage-400 to-sage-500" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={active ? { opacity: 1, y: 0 } : { opacity: 0 }}
              transition={{ delay: reduced ? 0 : 0.08 + i * 0.05 }}
              className={cn("rounded-2xl bg-gradient-to-br p-2.5 text-white shadow-cozy", s.tone)}
            >
              <s.Icon className="h-3.5 w-3.5 opacity-90" />
              <p className="mt-1 font-display text-lg font-bold leading-none">{s.value}</p>
              <p className="mt-1 text-[9px] font-semibold leading-tight opacity-90">{s.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-3xl border border-warm-100 bg-white/70 p-3 shadow-cozy backdrop-blur-md">
          <p className="text-xs font-bold text-warm-800">{dash.activeTasksTitle}</p>
          <div className="mt-2 space-y-1.5">
            {tasks.map((task, i) => (
              <motion.div
                key={task.title}
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={active ? { opacity: 1, y: 0 } : { opacity: 0 }}
                transition={{ delay: reduced ? 0 : 0.12 + i * 0.05 }}
                className="flex items-center gap-2 rounded-2xl border border-warm-100 bg-white/80 px-2.5 py-2"
              >
                <div
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                    task.done ? "bg-sage-500 text-white" : "border-2 border-warm-300",
                  )}
                >
                  {task.done && <Check className="h-3 w-3" strokeWidth={3} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-xs font-semibold",
                      task.done ? "text-warm-400 line-through" : "text-warm-800",
                    )}
                  >
                    {task.title}
                  </p>
                  <span className={cn("mt-0.5 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold", task.priClass)}>
                    {priority[task.pri as keyof typeof priority] ?? task.pri}
                  </span>
                </div>
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
                    task.color,
                  )}
                >
                  {task.who}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      <LandingSceneCaption title={t.sceneHomeTitle} body={t.sceneHomeBody} />
    </div>
  );
}
