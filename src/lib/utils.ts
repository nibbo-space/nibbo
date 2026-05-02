import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { DEFAULT_TIME_ZONE } from "@/lib/calendar-tz";
import type { SupportedCurrency } from "@/lib/exchange-rates";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type DateTimeFormatOpts = { locale?: string; timeZone?: string };

export function formatDate(date: Date | string, opts?: DateTimeFormatOpts): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(opts?.locale ?? "uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(opts?.timeZone ? { timeZone: opts.timeZone } : {}),
  }).format(d);
}

export function formatTime(date: Date | string, opts?: DateTimeFormatOpts): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(opts?.locale ?? "uk-UA", {
    hour: "2-digit",
    minute: "2-digit",
    ...(opts?.timeZone ? { timeZone: opts.timeZone } : {}),
  }).format(d);
}

export function formatCurrency(amount: number, currency: SupportedCurrency = "UAH", locale = "uk-UA"): string {
  const loc =
    currency === "USD"
      ? "en-US"
      : currency === "EUR"
        ? "de-DE"
        : currency === "GBP"
          ? "en-GB"
          : currency === "JPY"
            ? "ja-JP"
            : locale;
  return new Intl.NumberFormat(loc, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function dashboardHeaderLabels(now: Date = new Date()) {
  const greetings = ["Привіт", "Вітаю", "Доброго дня"];
  const hour = parseInt(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: DEFAULT_TIME_ZONE,
    }).format(now),
    10
  );
  const greeting = greetings[Number.isFinite(hour) ? hour % greetings.length : 0];
  const dateLabel = new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: DEFAULT_TIME_ZONE,
  }).format(now);
  return { greeting, dateLabel };
}

export const PRIORITY_CONFIG = {
  LOW: { color: "bg-sage-100 text-sage-700", emoji: "" },
  MEDIUM: { color: "bg-sky-100 text-sky-700", emoji: "" },
  HIGH: { color: "bg-peach-100 text-peach-700", emoji: "" },
  URGENT: { color: "bg-rose-100 text-rose-700", emoji: "" },
} as const;

export const MEAL_TYPE_CONFIG = {
  BREAKFAST: { label: "Сніданок", emoji: "", color: "bg-cream-100" },
  LUNCH: { label: "Обід", emoji: "", color: "bg-peach-100" },
  DINNER: { label: "Вечеря", emoji: "", color: "bg-lavender-100" },
  SNACK: { label: "Перекус", emoji: "", color: "bg-sage-100" },
} as const;

export const USER_COLORS = [
  "#f43f5e", "#fb923c", "#facc15", "#4ade80",
  "#38bdf8", "#818cf8", "#c084fc", "#f472b6",
];

export const DEFAULT_USER_EMOJI = "🌸";

const LEGACY_EMOJI_TOKENS = new Set([
  "user",
  "board",
  "meal",
  "note",
  "category",
  "event",
  "shopping",
  "subscription",
]);

const EMOJI_TOKEN_TO_DISPLAY: Record<string, string> = {
  meal: "🍽️",
  board: "📋",
  shopping: "🛒",
  note: "📝",
  category: "💳",
  event: "📅",
  user: "🌸",
  subscription: "📆",
};

export const DEFAULT_RECIPE_EMOJI = "🍽️";

export function displayEmojiToken(value: string | null | undefined): string {
  if (value == null) return "";
  const v = value.trim();
  if (!v) return "";
  return EMOJI_TOKEN_TO_DISPLAY[v] ?? v;
}

export function normalizeProfileEmoji(value: string | null | undefined) {
  if (!value || LEGACY_EMOJI_TOKENS.has(value)) return DEFAULT_USER_EMOJI;
  return value;
}

export const USER_EMOJIS = [
  "🌸",
  "🍀",
  "⭐",
  "🌙",
  "🎀",
  "🦋",
  "🌺",
  "✨",
  "🐻",
  "🐱",
  "🐶",
  "🦊",
  "🐰",
  "🐼",
  "🦁",
  "☕",
  "🍰",
  "🎮",
  "📚",
  "🎧",
  "💻",
  "🏠",
  "❤️",
  "🌈",
  "🎈",
  "🍓",
  "🥐",
  "🌻",
  "🪴",
  "🎨",
  "✏️",
];

export const DEFAULT_NOTE_EMOJI = "📝";

export function normalizeNoteEmoji(value: string | null | undefined) {
  if (!value || value === "note") return DEFAULT_NOTE_EMOJI;
  return value;
}

export const NOTE_EMOJIS = [
  "📝",
  "📌",
  "💡",
  "✅",
  "📋",
  "📅",
  "⏰",
  "❤️",
  "🌟",
  "🔔",
  "📎",
  "✏️",
  "📖",
  "☕",
  "🏠",
  "💭",
  "📣",
  "✨",
  "🌈",
  "🎯",
  "📦",
  "🔖",
  "🗂️",
];

export const DEFAULT_NOTE_CATEGORY_EMOJI = "📁";

export function normalizeNoteCategoryEmoji(value: string | null | undefined) {
  if (!value || value === "category") return DEFAULT_NOTE_CATEGORY_EMOJI;
  return value;
}

export const NOTE_CATEGORY_EMOJIS = [
  "📁",
  "📂",
  "🏷️",
  "💼",
  "📚",
  "🎨",
  "📦",
  "🗂️",
  "⭐",
  "💡",
  "🌸",
  "✨",
  "🔖",
  "📌",
  "🎯",
  "🏠",
];
