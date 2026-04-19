"use client";

import { useHasMounted, useLandingReducedMotion } from "@/lib/landing-motion";
import { cn } from "@/lib/utils";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export function LandingParallaxSection({
  children,
  className,
  depth = 1,
}: {
  children: React.ReactNode;
  className?: string;
  depth?: number;
}) {
  const mounted = useHasMounted();
  const reduced = useLandingReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const px = 64 * depth;
  const y = useTransform(scrollYProgress, [0, 1], [reduced ? 0 : px, reduced ? 0 : -px]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <motion.div style={mounted ? { y } : undefined} className="will-change-transform">
        {children}
      </motion.div>
    </div>
  );
}
