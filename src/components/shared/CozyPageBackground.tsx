"use client";

import { motion } from "framer-motion";
import {
  CalendarDays,
  CreditCard,
  NotebookPen,
  ShoppingCart,
  SquareKanban,
  UtensilsCrossed,
} from "lucide-react";
import type { ReactNode } from "react";

const COZY_ICONS = [
  SquareKanban,
  CalendarDays,
  UtensilsCrossed,
  NotebookPen,
  CreditCard,
  ShoppingCart,
] as const;

const cozyGridItems = Array.from({ length: 36 }, (_, index) => {
  const Icon = COZY_ICONS[index % COZY_ICONS.length];
  const col = index % 6;
  const row = Math.floor(index / 6);
  const left = 6 + col * 17 + ((index * 7) % 9) - 4;
  const top = 5 + row * 16 + ((index * 11) % 7) - 3;
  const size = 18 + (index % 4) * 8;
  return {
    Icon,
    left,
    top,
    size,
    duration: 4.5 + (index % 6) * 0.6,
    delay: (index % 8) * 0.25,
    rotate: (index % 2 === 0 ? 1 : -1) * (5 + (index % 3) * 4),
    opacity: 0.12 + (index % 4) * 0.05,
  };
});

const cozyAccentItems = [
  { Icon: NotebookPen, left: "10%", top: "12%", size: 96, opacity: 0.08 },
  { Icon: CalendarDays, left: "78%", top: "16%", size: 120, opacity: 0.07 },
  { Icon: ShoppingCart, left: "70%", top: "72%", size: 110, opacity: 0.07 },
  { Icon: CreditCard, left: "18%", top: "74%", size: 88, opacity: 0.08 },
] as const;

export function CozyPageBackground({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-cream-50 via-rose-50/40 to-lavender-50/30">
      {cozyAccentItems.map((item, i) => (
        <motion.div
          key={`cozy-accent-${i}`}
          className="pointer-events-none absolute text-rose-300/70"
          style={{ left: item.left, top: item.top, opacity: item.opacity }}
          animate={{ y: [0, -14, 0], rotate: [-4, 4, -4], scale: [1, 1.04, 1] }}
          transition={{ duration: 9 + i * 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <item.Icon size={item.size} strokeWidth={1.25} />
        </motion.div>
      ))}
      {cozyGridItems.map((item, i) => (
        <motion.div
          key={`cozy-grid-${i}`}
          className="pointer-events-none absolute select-none text-rose-300/70"
          style={{ left: `${item.left}%`, top: `${item.top}%`, opacity: item.opacity }}
          animate={{
            y: [0, -16, 0],
            rotate: [-item.rotate, item.rotate, -item.rotate],
            scale: [1, 1.08, 1],
            opacity: [item.opacity, item.opacity + 0.12, item.opacity],
          }}
          transition={{
            duration: item.duration,
            repeat: Infinity,
            delay: item.delay,
            ease: "easeInOut",
          }}
        >
          <item.Icon size={item.size} />
        </motion.div>
      ))}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
