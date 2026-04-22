export type OllamaAssistantModelOption = { id: string };

export const OLLAMA_ASSISTANT_MODEL_OPTIONS: readonly OllamaAssistantModelOption[] = [
  { id: "gpt-oss:20b-cloud" },
  { id: "gemini-3-flash-preview:cloud" },
  { id: "ministral-3:3b-cloud" },
  { id: "ministral-3:8b-cloud" },
  { id: "ministral-3:14b-cloud" },
  { id: "qwen3.5:cloud" },
  { id: "gpt-oss:120b-cloud" },
  { id: "qwen3-coder:480b-cloud" },
  { id: "deepseek-v3.1:671b-cloud" },
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
