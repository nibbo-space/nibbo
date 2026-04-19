import nodemailer from "nodemailer";
import sharp from "sharp";
import {
  FEEDBACK_ALLOWED_MIME,
  FEEDBACK_MAX_DESC_LEN,
  FEEDBACK_MAX_FILE_BYTES,
  FEEDBACK_MAX_TITLE_LEN,
  FEEDBACK_RATE_MAX_PER_WINDOW,
  FEEDBACK_RATE_WINDOW_MS,
} from "@/lib/feedback-limits";

const DEFAULT_TO = "bostonleek@gmail.com";

const rateBuckets = new Map<string, number[]>();

export function feedbackClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first.slice(0, 128);
  }
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 128);
  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf.slice(0, 128);
  return "unknown";
}

export function feedbackRateAllowed(ip: string): boolean {
  const now = Date.now();
  const list = rateBuckets.get(ip) ?? [];
  const pruned = list.filter((t) => now - t < FEEDBACK_RATE_WINDOW_MS);
  if (pruned.length >= FEEDBACK_RATE_MAX_PER_WINDOW) {
    rateBuckets.set(ip, pruned);
    return false;
  }
  pruned.push(now);
  rateBuckets.set(ip, pruned);
  return true;
}

export function sanitizeFeedbackTitle(raw: string): string {
  const s = raw.replace(/\r\n/g, "\n").replace(/[\x00-\x1F\x7F]/g, "").trim();
  return s.slice(0, FEEDBACK_MAX_TITLE_LEN);
}

export function sanitizeFeedbackDescription(raw: string): string {
  const s = raw.replace(/\r/g, "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
  return s.slice(0, FEEDBACK_MAX_DESC_LEN);
}

export function sanitizeEmailSubjectFragment(raw: string, max: number): string {
  return raw.replace(/[\r\n]/g, " ").slice(0, max);
}

export function parseOptionalContactEmail(raw: string | null): string | null {
  if (!raw) return null;
  const t = raw.trim().slice(0, 254);
  if (!t) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return null;
  if (/[\r\n]/.test(t)) return null;
  return t;
}

export function getFeedbackRecipient(): string {
  return (process.env.FEEDBACK_TO || DEFAULT_TO).trim() || DEFAULT_TO;
}

export function createFeedbackTransport() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) return null;
  const portRaw = Number(process.env.SMTP_PORT || "587");
  const port = Number.isFinite(portRaw) ? portRaw : 587;
  const envSecure = process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1";
  const implicitTlsPorts = new Set([465, 2465, 994]);
  const startTlsPorts = new Set([587, 25, 2525]);
  const secure = implicitTlsPorts.has(port) ? true : startTlsPorts.has(port) ? false : envSecure;
  const requireTLS = process.env.SMTP_REQUIRE_TLS === "true" || process.env.SMTP_REQUIRE_TLS === "1";
  return nodemailer.createTransport({
    host,
    port,
    secure,
    ...(requireTLS ? { requireTLS: true } : {}),
    auth: { user, pass },
  });
}

export async function reencodeFeedbackScreenshot(buf: Buffer): Promise<Buffer> {
  if (buf.length > FEEDBACK_MAX_FILE_BYTES) {
    throw new Error("file_too_large");
  }
  return sharp(buf)
    .rotate()
    .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 9, force: true })
    .toBuffer();
}

export function assertAllowedImageMime(mime: string): void {
  const m = mime.toLowerCase().trim();
  if (!(FEEDBACK_ALLOWED_MIME as readonly string[]).includes(m)) {
    throw new Error("bad_mime");
  }
}

export async function sendFeedbackMessage(input: {
  kind: "bug" | "suggestion";
  title: string;
  description: string;
  contactEmail: string | null;
  reporterLine: string | null;
  pngAttachments: Buffer[];
}): Promise<void> {
  const transport = createFeedbackTransport();
  if (!transport) {
    throw new Error("mail_not_configured");
  }
  const from = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER!.trim();
  const to = getFeedbackRecipient();
  const tag = input.kind === "bug" ? "Bug" : "Suggestion";
  const subject = sanitizeEmailSubjectFragment(`[Nibbo ${tag}] ${input.title}`, 200);
  const lines: string[] = [
    `Type: ${input.kind}`,
    `Title: ${input.title}`,
    "",
    input.reporterLine ? `Reporter: ${input.reporterLine}` : null,
    input.contactEmail ? `Reply-to: ${input.contactEmail}` : null,
    "",
    "Description:",
    input.description,
  ].filter((x): x is string => x !== null);
  const text = lines.join("\n");
  const attachments =
    input.pngAttachments.length > 0
      ? input.pngAttachments.map((buffer, i) => ({
          filename: `screenshot-${i + 1}.png`,
          content: buffer,
          contentType: "image/png",
        }))
      : undefined;
  await transport.sendMail({
    from,
    to,
    subject,
    text,
    replyTo: input.contactEmail || undefined,
    ...(attachments ? { attachments } : {}),
  });
}
