import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cozy warm palette
        cream: {
          50: "#fdfaf5",
          100: "#faf3e0",
          200: "#f5e6c0",
          300: "#edd999",
          400: "#e5c96f",
          500: "#ddb947",
        },
        rose: {
          50: "#fff1f4",
          100: "#ffe4ea",
          200: "#fecdd5",
          300: "#fda4af",
          400: "#fb7185",
          500: "#f43f5e",
        },
        lavender: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
        },
        sage: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
        peach: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
        },
        sky: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
        },
        warm: {
          50: "#fafaf9",
          100: "#f5f5f4",
          200: "#e7e5e4",
          300: "#d6d3d1",
          400: "#a8a29e",
          500: "#78716c",
          600: "#57534e",
          700: "#44403c",
          800: "#292524",
          900: "#1c1917",
          950: "#0c0a09",
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-heading)", "var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "Cascadia Code", "monospace"],
      },
      boxShadow: {
        cozy: "0 4px 24px -4px rgba(0,0,0,0.06), 0 2px 8px -2px rgba(0,0,0,0.04)",
        "cozy-lg": "0 8px 40px -8px rgba(0,0,0,0.10), 0 4px 16px -4px rgba(0,0,0,0.06)",
        "cozy-hover": "0 12px 48px -8px rgba(0,0,0,0.14), 0 6px 24px -4px rgba(0,0,0,0.08)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          from: { opacity: "0", transform: "translateX(-16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-2deg)" },
          "50%": { transform: "rotate(2deg)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "fb-strike": {
          "0%": { transform: "translateX(-35%) scale(0.75) rotate(-8deg)", opacity: "0.95" },
          "45%": { transform: "translateX(6%) scale(1.12) rotate(4deg)", opacity: "1" },
          "100%": { transform: "translateX(0) scale(1) rotate(0)", opacity: "0" },
        },
        "fb-block": {
          "0%": { transform: "scale(0.55)", opacity: "0" },
          "35%": { transform: "scale(1.12)", opacity: "1" },
          "65%": { transform: "scale(0.98)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "0" },
        },
        "fb-parry": {
          "0%": { transform: "rotate(-28deg) scale(0.7)", opacity: "0" },
          "30%": { transform: "rotate(22deg) scale(1.08)", opacity: "1" },
          "55%": { transform: "rotate(-14deg) scale(1)", opacity: "1" },
          "100%": { transform: "rotate(0) scale(0.92)", opacity: "0" },
        },
        "fb-hit-shake": {
          "0%, 100%": { transform: "translate(0,0) rotate(0)" },
          "15%": { transform: "translate(-8px,3px) rotate(-2deg)" },
          "30%": { transform: "translate(8px,-3px) rotate(2deg)" },
          "45%": { transform: "translate(-6px,2px) rotate(-1deg)" },
          "60%": { transform: "translate(6px,-2px) rotate(1deg)" },
          "75%": { transform: "translate(-3px,1px)" },
          "90%": { transform: "translate(3px,-1px)" },
        },
        "fb-hit-flash": {
          "0%": { opacity: "0.5" },
          "100%": { opacity: "0" },
        },
        "fb-draw-clash": {
          "0%": { transform: "scale(1)" },
          "45%": { transform: "scale(1.03)" },
          "100%": { transform: "scale(1)" },
        },
        "fb-heart-row": {
          "0%, 100%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.12)" },
          "70%": { transform: "scale(0.96)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
        wiggle: "wiggle 0.5s ease-in-out",
        float: "float 3s ease-in-out infinite",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "fb-strike": "fb-strike 0.52s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "fb-block": "fb-block 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "fb-parry": "fb-parry 0.55s cubic-bezier(0.33, 1, 0.68, 1) forwards",
        "fb-hit-shake": "fb-hit-shake 0.58s ease-out",
        "fb-hit-flash": "fb-hit-flash 0.45s ease-out forwards",
        "fb-draw-clash": "fb-draw-clash 0.48s ease-out forwards",
        "fb-heart-row": "fb-heart-row 0.45s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
