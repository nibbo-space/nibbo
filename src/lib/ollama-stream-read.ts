export async function readOllamaStream(
  body: ReadableStream<Uint8Array> | null,
  onDelta: (chunk: string) => void
): Promise<void> {
  if (!body) return;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const s = line.trim();
      if (!s) continue;
      try {
        const j = JSON.parse(s) as { message?: { content?: string } };
        if (j.message) {
          const c = j.message.content;
          onDelta(typeof c === "string" ? c : "");
        }
      } catch {
        continue;
      }
    }
  }
  const tail = buf.trim();
  if (tail) {
    try {
      const j = JSON.parse(tail) as { message?: { content?: string } };
      if (j.message) {
        const c = j.message.content;
        onDelta(typeof c === "string" ? c : "");
      }
    } catch {
      /* ignore */
    }
  }
}
