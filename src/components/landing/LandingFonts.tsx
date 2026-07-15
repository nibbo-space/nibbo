import { Manrope, Unbounded } from "next/font/google";

export const landingDisplay = Unbounded({
  subsets: ["latin", "cyrillic"],
  variable: "--font-landing-display",
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

export const landingBody = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-landing-body",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});
