"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, Zap } from "lucide-react";

function ChatMock() {
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1.5">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500 text-[10px]">🐾</div>
        <div className="max-w-[82%] rounded-2xl rounded-bl-sm bg-warm-100 px-2.5 py-2">
          <p className="text-[9px] font-semibold leading-tight text-warm-700">Hi! I'm Nibby. What does your family need today?</p>
        </div>
      </div>
      <div className="flex justify-end">
        <div className="max-w-[78%] rounded-2xl rounded-br-sm bg-rose-500 px-2.5 py-2">
          <p className="text-[9px] font-semibold leading-tight text-white">Set up chores for the kids</p>
        </div>
      </div>
      <div className="flex items-end gap-1.5">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500 text-[10px]">🐾</div>
        <div className="max-w-[82%] rounded-2xl rounded-bl-sm bg-warm-100 px-2.5 py-2">
          <p className="text-[9px] font-semibold leading-tight text-warm-700">Done! 3 tasks added ✅</p>
        </div>
      </div>
    </div>
  );
}

function KanbanMock() {
  const cols = [
    { label: "To Do", color: "bg-warm-100 text-warm-600", tasks: ["Laundry", "Groceries"] },
    { label: "Doing", color: "bg-amber-100 text-amber-700", tasks: ["Dinner"] },
    { label: "Done", color: "bg-emerald-100 text-emerald-700", tasks: ["Vacuum"] },
  ];
  return (
    <div className="grid grid-cols-3 gap-1">
      {cols.map((col) => (
        <div key={col.label} className="space-y-1">
          <div className={cn("rounded-md px-1.5 py-0.5 text-center text-[8px] font-extrabold", col.color)}>
            {col.label}
          </div>
          {col.tasks.map((task) => (
            <div key={task} className="rounded-md border border-warm-100 bg-white px-1.5 py-1 text-[8px] font-semibold leading-tight text-warm-700 shadow-sm">
              {task}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function XpMock() {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-orange-400 shadow-sm">
            <span className="text-sm">🦊</span>
          </div>
          <div>
            <p className="text-[9px] font-extrabold leading-none text-warm-800">Mitchell Family</p>
            <p className="text-[8px] text-warm-500">Level 12</p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 rounded-lg bg-rose-100 px-2 py-1">
          <Zap className="h-2.5 w-2.5 text-rose-500" strokeWidth={2.5} />
          <span className="text-[9px] font-extrabold text-rose-600">1,850</span>
        </div>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-[8px] text-warm-500">
          <span>XP Progress</span><span>185 / 200</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-warm-100">
          <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-rose-400 to-rose-600" />
        </div>
      </div>
      <div className="flex gap-1">
        {["✅", "⭐", "🏆"].map((badge) => (
          <div key={badge} className="flex flex-1 items-center justify-center rounded-lg border border-warm-100 bg-white py-1 text-sm shadow-sm">
            {badge}
          </div>
        ))}
      </div>
    </div>
  );
}

function HabitsMock() {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const done = [true, true, true, true, false, false, false];
  return (
    <div className="space-y-2">
      <p className="text-[9px] font-extrabold text-warm-700">This week's streak 🔥</p>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <div
              className={cn(
                "flex h-6 w-full items-center justify-center rounded-md text-[8px] font-bold",
                done[i]
                  ? "bg-emerald-400 text-white shadow-sm"
                  : "bg-warm-100 text-warm-400",
              )}
            >
              {done[i] ? "✓" : d}
            </div>
            <span className="text-[7px] text-warm-400">{d}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-1.5">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" strokeWidth={2.5} />
        <p className="text-[8px] font-semibold text-emerald-700">4-day streak! Keep it up 💪</p>
      </div>
    </div>
  );
}

export function LandingJourneyMiniMock({
  variant,
  caption,
  className,
}: {
  variant: 0 | 1 | 2 | 3;
  caption: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-warm-200/80 bg-gradient-to-b from-white to-cream-50/80 p-3 shadow-inner sm:p-3.5",
        className,
      )}
    >
      <p className="mb-2.5 truncate text-[9px] font-bold uppercase tracking-widest text-rose-500">{caption}</p>
      {variant === 0 && <ChatMock />}
      {variant === 1 && <KanbanMock />}
      {variant === 2 && <XpMock />}
      {variant === 3 && <HabitsMock />}
    </div>
  );
}
