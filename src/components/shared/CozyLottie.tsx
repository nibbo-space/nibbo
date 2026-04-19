"use client";

import { useEffect, useMemo, useRef } from "react";
import Lottie, { LottieRefCurrentProps } from "lottie-react";
import { useCozyConfig } from "@/hooks/useCozyConfig";

interface CozyLottieProps {
  animationData: object;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
  baseSpeed?: number;
}

export default function CozyLottie({
  animationData,
  className,
  loop = true,
  autoplay = true,
  baseSpeed = 1,
}: CozyLottieProps) {
  const { config } = useCozyConfig();
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const speed = useMemo(() => Math.max(0.2, baseSpeed * config.speed), [baseSpeed, config.speed]);
  const style = useMemo(() => ({ opacity: 0.65 + config.intensity * 0.35 }), [config.intensity]);

  useEffect(() => {
    lottieRef.current?.setSpeed(speed);
  }, [speed]);

  return (
    <Lottie
      lottieRef={lottieRef}
      animationData={animationData}
      className={className}
      loop={loop}
      autoplay={autoplay}
      style={style}
      rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
    />
  );
}
