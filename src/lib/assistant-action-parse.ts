const ACTION_HEAD = "NIBBO_ACTION:";

export type AssistantActionsEnvelope = { actions: unknown[] };

function actionPayloadStartIndex(text: string, j: number): boolean {
  if (j === 0) return true;
  const c = text[j - 1]!;
  return c === "\n" || c === "\r" || c === " " || c === "\t";
}

function displayCutBeforeAction(text: string, j: number): number {
  if (j === 0) return 0;
  if (j >= 2 && text[j - 2] === "\r" && text[j - 1] === "\n") return j - 2;
  if (text[j - 1] === "\n" || text[j - 1] === "\r") return j - 1;
  if (text[j - 1] === " " || text[j - 1] === "\t") return j - 1;
  return j;
}

export function streamingActionCutIndex(text: string): number {
  let pos = 0;
  while (pos < text.length) {
    const j = text.indexOf(ACTION_HEAD, pos);
    if (j < 0) return -1;
    if (actionPayloadStartIndex(text, j)) return displayCutBeforeAction(text, j);
    pos = j + 1;
  }
  return -1;
}

export function stripAssistantActionFromText(text: string): {
  displayText: string;
  envelope: AssistantActionsEnvelope | null;
} {
  let pos = text.length;
  while (pos >= 0) {
    const j = text.lastIndexOf(ACTION_HEAD, pos);
    if (j < 0) return { displayText: text, envelope: null };
    if (!actionPayloadStartIndex(text, j)) {
      pos = j - 1;
      continue;
    }
    const jsonPart = text.slice(j + ACTION_HEAD.length).trim();
    try {
      const o = JSON.parse(jsonPart) as AssistantActionsEnvelope;
      if (!o || typeof o !== "object" || !Array.isArray(o.actions) || o.actions.length === 0) {
        pos = j - 1;
        continue;
      }
      const cut = displayCutBeforeAction(text, j);
      return { displayText: text.slice(0, cut).trimEnd(), envelope: o };
    } catch {
      pos = j - 1;
    }
  }
  return { displayText: text, envelope: null };
}
