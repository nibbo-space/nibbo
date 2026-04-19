import { prisma } from "@/lib/prisma";
import { I18N, type AppLanguage } from "@/lib/i18n";
import {
  getVapidPrivateKey,
  getVapidPublicKey,
  getVapidSubject,
  isWebPushConfigured,
} from "@/lib/push/vapid";
import { getMetadataBaseUrl } from "@/lib/site-url";
import webpush from "web-push";

function resolveLang(locale: string): AppLanguage {
  return locale === "en" ? "en" : "uk";
}

export async function sendReminderDuePush(params: {
  userId: string;
  taskId: string;
  taskTitle: string;
}): Promise<void> {
  if (!isWebPushConfigured()) return;
  const pub = getVapidPublicKey();
  const priv = getVapidPrivateKey();
  if (!pub || !priv) return;
  webpush.setVapidDetails(getVapidSubject(), pub, priv);

  const subs = await prisma.pushSubscription.findMany({ where: { userId: params.userId } });
  if (subs.length === 0) return;

  const origin = getMetadataBaseUrl().origin;
  const url = `${origin}/tasks`;
  const tag = `reminder-${params.taskId}`;

  for (const sub of subs) {
    const lang = resolveLang(sub.locale);
    const t = I18N[lang].pushNotifications;
    const title = t.reminderDueTitle;
    const body = t.reminderDueBody.replace("{title}", params.taskTitle);
    const payload = JSON.stringify({ title, body, url, tag });
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload,
        { TTL: 86_400 }
      );
    } catch (e: unknown) {
      const status =
        typeof e === "object" && e !== null && "statusCode" in e
          ? (e as { statusCode?: number }).statusCode
          : undefined;
      if (status === 404 || status === 410) {
        await prisma.pushSubscription.deleteMany({ where: { id: sub.id } });
      }
    }
  }
}

export function fireAndForgetReminderDuePush(params: Parameters<typeof sendReminderDuePush>[0]): void {
  void sendReminderDuePush(params).catch(() => {});
}
