"use client";

import { useId } from "react";

type LandingFooterIllustrationProps = {
  variant: "hero" | "mark";
  className?: string;
};

export function LandingFooterIllustration({ variant, className }: LandingFooterIllustrationProps) {
  const raw = useId().replace(/:/g, "");

  if (variant === "mark") {
    return (
      <svg className={className} viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path
          d="M60 12L22 44V88H98V44L60 12Z"
          fill="#fff1f2"
          stroke="#fda4af"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path d="M42 88V58H78V88" fill="#fafaf9" stroke="#d6d3d1" strokeWidth="2" />
        <rect x="48" y="66" width="24" height="22" rx="3" fill="#ede9fe" stroke="#c4b5fd" strokeWidth="1.5" />
        <rect x="32" y="44" width="18" height="14" rx="2" fill="#e0f2fe" stroke="#7dd3fc" strokeWidth="1.2" />
        <rect x="70" y="44" width="18" height="14" rx="2" fill="#dcfce7" stroke="#86efac" strokeWidth="1.2" />
      </svg>
    );
  }

  const sky = `${raw}-sky`;
  const hill = `${raw}-hill`;
  const roof = `${raw}-roof`;

  return (
    <svg
      className={className}
      viewBox="0 0 360 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden
    >
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="360" y2="200" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fdfaf5" />
          <stop offset="0.45" stopColor="#f5f3ff" />
          <stop offset="1" stopColor="#fff1f4" />
        </linearGradient>
        <linearGradient id={hill} x1="180" y1="200" x2="180" y2="280" gradientUnits="userSpaceOnUse">
          <stop stopColor="#dcfce7" stopOpacity="0.95" />
          <stop offset="1" stopColor="#bbf7d0" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id={roof} x1="120" y1="52" x2="240" y2="130" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fecdd5" />
          <stop offset="1" stopColor="#fda4af" />
        </linearGradient>
      </defs>
      <rect width="360" height="280" rx="20" fill={`url(#${sky})`} />
      <ellipse cx="180" cy="248" rx="200" ry="48" fill={`url(#${hill})`} />
      <path
        d="M48 168C72 150 108 142 132 158C156 174 188 182 220 170C252 158 292 154 318 176"
        stroke="#fda4af"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="8 10"
        opacity="0.55"
      />
      <g transform="translate(24, 118)">
        <rect x="0" y="0" width="76" height="96" rx="12" fill="white" stroke="#e7e5e4" strokeWidth="2" />
        <rect x="12" y="14" width="52" height="6" rx="3" fill="#fecdd5" />
        <rect x="12" y="28" width="44" height="5" rx="2.5" fill="#f5f5f4" />
        <rect x="12" y="40" width="38" height="5" rx="2.5" fill="#f5f5f4" />
        <rect x="12" y="58" width="52" height="28" rx="6" fill="#fff1f2" stroke="#fecdd5" strokeWidth="1.5" />
        <path d="M22 72h32M22 80h24" stroke="#fb7185" strokeWidth="2.2" strokeLinecap="round" />
      </g>
      <g transform="translate(248, 88)">
        <rect x="0" y="0" width="88" height="100" rx="14" fill="white" stroke="#e7e5e4" strokeWidth="2" />
        <text x="44" y="24" textAnchor="middle" fill="#f43f5e" fontSize="12" fontWeight="700" fontFamily="ui-sans-serif, system-ui">
          12
        </text>
        <circle cx="28" cy="52" r="5" fill="#ede9fe" stroke="#c4b5fd" strokeWidth="1.2" />
        <circle cx="44" cy="52" r="5" fill="#fecdd5" stroke="#fb7185" strokeWidth="1.2" />
        <circle cx="60" cy="52" r="5" fill="#ede9fe" stroke="#c4b5fd" strokeWidth="1.2" />
        <circle cx="36" cy="72" r="5" fill="#bbf7d0" stroke="#86efac" strokeWidth="1.2" />
        <circle cx="52" cy="72" r="5" fill="#ede9fe" stroke="#c4b5fd" strokeWidth="1.2" />
        <rect x="16" y="86" width="56" height="6" rx="3" fill="#f5f5f4" />
      </g>
      <path
        transform="translate(168 22) scale(0.42)"
        fill="#f43f5e"
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      />
      <rect x="120" y="118" width="120" height="114" rx="10" fill="#fafaf9" stroke="#d6d3d1" strokeWidth="2" />
      <path d="M120 118L180 62L240 118Z" fill={`url(#${roof})`} stroke="#fb7185" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M168 232V176H192V232" fill="#fff1f2" stroke="#fda4af" strokeWidth="2" />
      <rect x="144" y="144" width="28" height="28" rx="5" fill="#ede9fe" stroke="#c4b5fd" strokeWidth="1.5" />
      <rect x="188" y="144" width="28" height="28" rx="5" fill="#e0f2fe" stroke="#7dd3fc" strokeWidth="1.5" />
      <line x1="150" y1="154" x2="166" y2="154" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" />
      <line x1="150" y1="162" x2="162" y2="162" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" />
      <line x1="194" y1="154" x2="210" y2="154" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
      <line x1="194" y1="162" x2="206" y2="162" stroke="#bae6fd" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
