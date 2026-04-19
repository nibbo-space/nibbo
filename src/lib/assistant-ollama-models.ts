export type OllamaAssistantModelOption = {
  id: string;
  labelUk: string;
  labelEn: string;
};

export const OLLAMA_ASSISTANT_MODEL_OPTIONS: readonly OllamaAssistantModelOption[] = [
  {
    id: "gpt-oss:20b-cloud",
    labelUk: "gpt-oss 20B (хмара)",
    labelEn: "gpt-oss 20B (cloud)",
  },
  {
    id: "gemini-3-flash-preview:cloud",
    labelUk: "Gemini 3 Flash (хмара)",
    labelEn: "Gemini 3 Flash (cloud)",
  },
  {
    id: "ministral-3:3b-cloud",
    labelUk: "Ministral 3 3B (хмара)",
    labelEn: "Ministral 3 3B (cloud)",
  },
  {
    id: "ministral-3:8b-cloud",
    labelUk: "Ministral 3 8B (хмара)",
    labelEn: "Ministral 3 8B (cloud)",
  },
  {
    id: "ministral-3:14b-cloud",
    labelUk: "Ministral 3 14B (хмара)",
    labelEn: "Ministral 3 14B (cloud)",
  },
  {
    id: "qwen3.5:cloud",
    labelUk: "Qwen 3.5 (хмара)",
    labelEn: "Qwen 3.5 (cloud)",
  },
  {
    id: "gpt-oss:120b-cloud",
    labelUk: "gpt-oss 120B (хмара)",
    labelEn: "gpt-oss 120B (cloud)",
  },
  {
    id: "qwen3-coder:480b-cloud",
    labelUk: "Qwen3 Coder 480B (хмара)",
    labelEn: "Qwen3 Coder 480B (cloud)",
  },
  {
    id: "deepseek-v3.1:671b-cloud",
    labelUk: "DeepSeek V3.1 671B (хмара)",
    labelEn: "DeepSeek V3.1 671B (cloud)",
  },
] as const;

const ALLOWED_IDS = new Set(OLLAMA_ASSISTANT_MODEL_OPTIONS.map((o) => o.id));

export const DEFAULT_ASSISTANT_OLLAMA_MODEL = "gpt-oss:20b-cloud";

export const OLLAMA_CLOUD_API_KEYS_URL = "https://ollama.com/settings/keys";

export function isAllowedAssistantOllamaModel(id: string): boolean {
  return ALLOWED_IDS.has(id);
}

export function resolveAssistantOllamaModel(
  stored: string | null | undefined,
  envFallback?: string | null
): string {
  const s = String(stored || "").trim();
  if (isAllowedAssistantOllamaModel(s)) return s;
  const e = String(envFallback || "").trim();
  if (isAllowedAssistantOllamaModel(e)) return e;
  return DEFAULT_ASSISTANT_OLLAMA_MODEL;
}
