"use client";

import { cn } from "@/lib/utils";

export function LandingHudCorners({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const s = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-8 w-8" : "h-6 w-6";
  const inset = size === "sm" ? "0.5rem" : size === "lg" ? "1rem" : "0.65rem";

  return (
    <div className={cn("pointer-events-none absolute inset-0 rounded-[inherit]", className)} aria-hidden>
      <span
        className={cn("absolute border-l-2 border-t-2 border-rose-400/60", s)}
        style={{ left: inset, top: inset }}
      />
      <span
        className={cn("absolute border-r-2 border-t-2 border-rose-400/60", s)}
        style={{ right: inset, top: inset }}
      />
      <span
        className={cn("absolute border-b-2 border-l-2 border-rose-400/60", s)}
        style={{ left: inset, bottom: inset }}
      />
      <span
        className={cn("absolute border-b-2 border-r-2 border-rose-400/60", s)}
        style={{ right: inset, bottom: inset }}
      />
    </div>
  );
}
