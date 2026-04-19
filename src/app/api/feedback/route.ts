import { applyUserCounterIncrement } from "@/lib/achievements/evaluate";
import { FEEDBACK_BUG_COUNTER_KEY, FEEDBACK_SUGGESTION_COUNTER_KEY } from "@/lib/achievements/registry";
import { auth } from "@/lib/auth";
import {
  FEEDBACK_HONEYPOT_NAME,
  FEEDBACK_MAX_FILES,
  FEEDBACK_MAX_FILE_BYTES,
} from "@/lib/feedback-limits";
import {
  assertAllowedImageMime,
  feedbackClientIp,
  feedbackRateAllowed,
  parseOptionalContactEmail,
  reencodeFeedbackScreenshot,
  sanitizeFeedbackDescription,
  sanitizeFeedbackTitle,
  sendFeedbackMessage,
} from "@/lib/feedback-server";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ code: "bad_request" }, { status: 400 });
  }

  const honeypot = form.get(FEEDBACK_HONEYPOT_NAME);
  if (honeypot != null && String(honeypot).trim() !== "") {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const ip = feedbackClientIp(req.headers);
  if (!feedbackRateAllowed(ip)) {
    return NextResponse.json({ code: "rate_limit" }, { status: 429 });
  }

  const kindRaw = String(form.get("kind") ?? "").trim();
  if (kindRaw !== "bug" && kindRaw !== "suggestion") {
    return NextResponse.json({ code: "validation" }, { status: 400 });
  }
  const kind = kindRaw as "bug" | "suggestion";

  const title = sanitizeFeedbackTitle(String(form.get("title") ?? ""));
  const description = sanitizeFeedbackDescription(String(form.get("description") ?? ""));
  if (title.length < 3 || description.length < 10) {
    return NextResponse.json({ code: "validation" }, { status: 400 });
  }

  const rawContact = form.get("contactEmail");
  const contactEmail =
    typeof rawContact === "string" ? parseOptionalContactEmail(rawContact) : null;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ code: "unauthorized" }, { status: 401 });
  }
  const feedbackUserId = session.user.id;
  const reporterLine =
    [session.user.name, session.user.email].filter(Boolean).join(" · ").slice(0, 500) || null;

  const pngAttachments: Buffer[] = [];
  if (kind === "bug") {
    const files = form.getAll("screenshots");
    if (files.length > FEEDBACK_MAX_FILES) {
      return NextResponse.json({ code: "files" }, { status: 400 });
    }
    for (const item of files) {
      if (item == null || typeof item === "string") continue;
      const blob = item as Blob;
      if (typeof blob.arrayBuffer !== "function") continue;
      if (blob.size === 0) continue;
      if (blob.size > FEEDBACK_MAX_FILE_BYTES) {
        return NextResponse.json({ code: "files" }, { status: 400 });
      }
      try {
        assertAllowedImageMime(blob.type || "");
      } catch {
        return NextResponse.json({ code: "files" }, { status: 400 });
      }
      const ab = await blob.arrayBuffer();
      const buf = Buffer.from(ab);
      try {
        pngAttachments.push(await reencodeFeedbackScreenshot(buf));
      } catch {
        return NextResponse.json({ code: "files" }, { status: 400 });
      }
    }
  }

  try {
    await sendFeedbackMessage({
      kind,
      title,
      description,
      contactEmail,
      reporterLine,
      pngAttachments,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "mail_not_configured") {
      return NextResponse.json({ code: "mail" }, { status: 503 });
    }
    if (process.env.NODE_ENV === "development") {
      console.error("[feedback] sendMail failed:", e);
    }
    return NextResponse.json({ code: "send_failed" }, { status: 502 });
  }

  let newAchievementIds: string[] = [];
  if (feedbackUserId) {
    const counterKey = kind === "bug" ? FEEDBACK_BUG_COUNTER_KEY : FEEDBACK_SUGGESTION_COUNTER_KEY;
    const { newUnlockIds } = await applyUserCounterIncrement(feedbackUserId, counterKey, 1, 1);
    newAchievementIds = newUnlockIds;
  }

  return NextResponse.json({ ok: true, newAchievementIds });
}
