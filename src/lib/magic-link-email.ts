import { createTransport } from "nodemailer";
import type { Theme } from "@auth/core/types";
import type { NodemailerConfig } from "@auth/core/providers/nodemailer";

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildMagicLinkHtml(opts: { appName: string; origin: string; email: string; url: string }) {
  const { appName, origin, email, url } = opts;
  const logoUrl = `${origin}/favicon.svg`;
  return `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(appName)}</title>
</head>
<body style="margin:0;background:#fdf8f3;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Ukraine,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fdf8f3;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background:#ffffff;border-radius:24px;border:1px solid #fce7f3;box-shadow:0 12px 40px rgba(244,63,94,0.08);">
<tr><td style="padding:36px 28px 32px;text-align:center;">
<img src="${esc(logoUrl)}" alt="" width="72" height="72" style="display:block;margin:0 auto 20px;border-radius:16px;">
<p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#44403c;">${esc(appName)}</p>
<p style="margin:0 0 24px;font-size:14px;line-height:1.55;color:#78716b;">Твоє посилання для входу готове. Натисни кнопку нижче — відкриється Nibbo.<br><span style="color:#a8a29e;font-size:13px;">Your sign-in link is ready. Tap the button below.</span></p>
<p style="margin:0 0 20px;font-size:12px;color:#a8a29e;">${esc(email)}</p>
<table role="presentation" cellspacing="0" cellpadding="0" align="center"><tr><td style="border-radius:16px;background:#e11d48;">
<a href="${esc(url)}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:16px;">Увійти в Nibbo</a>
</td></tr></table>
<p style="margin:28px 0 0;font-size:12px;line-height:1.5;color:#a8a29e;">Якщо ти не запитував лист — просто ігноруй його.<br>If you did not request this email, you can safely ignore it.</p>
<p style="margin:16px 0 0;font-size:11px;color:#d6d3d1;">${esc(origin)}</p>
</td></tr></table>
</td></tr></table>
</body>
</html>`;
}

function buildMagicLinkText(opts: { appName: string; origin: string; url: string }) {
  return `${opts.appName} — посилання для входу / sign-in link\n\n${opts.url}\n\n${opts.origin}\n\nЯкщо ти не запитував лист — ігноруй. If you did not request this, ignore.`;
}

export async function sendNibboMagicLinkEmail(params: {
  identifier: string;
  url: string;
  expires: Date;
  provider: NodemailerConfig;
  token: string;
  theme: Theme;
  request: Request;
}) {
  const { identifier, url, provider } = params;
  const origin = new URL(url).origin;
  const appName = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Nibbo";
  const transport = createTransport(provider.server);
  const subject = `${appName} · посилання для входу`;
  const result = await transport.sendMail({
    to: identifier,
    from: provider.from,
    subject,
    text: buildMagicLinkText({ appName, origin, url }),
    html: buildMagicLinkHtml({ appName, origin, email: identifier, url }),
  });
  const rejected = result.rejected || [];
  const pending = result.pending || [];
  const failed = rejected.concat(pending).filter(Boolean);
  if (failed.length) {
    throw new Error(`Email (${failed.join(", ")}) could not be sent`);
  }
}
