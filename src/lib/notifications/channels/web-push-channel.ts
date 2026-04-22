import { prisma } from "@/lib/prisma";
import { messageLocale, I18N, type AppLanguage } from "@/lib/i18n";
import {
  getVapidPrivateKey,
  getVapidPublicKey,
  getVapidSubject,
  isWebPushConfigured,
} from "@/lib/push/vapid";
import webpush from "web-push";
import type { PushDeliveryChannel, TaskAssignedPushInput } from "./types";

export class WebPushChannel implements PushDeliveryChannel {
  readonly kind = "web_push" as const;

  async sendTaskAssigned(
    input: TaskAssignedPushInput,
    resolveLang: (locale: string) => AppLanguage
  ): Promise<void> {
    if (!isWebPushConfigured()) return;
    const pub = getVapidPublicKey();
    const priv = getVapidPrivateKey();
    if (!pub || !priv) return;

    webpush.setVapidDetails(getVapidSubject(), pub, priv);

    const subs = await prisma.pushSubscription.findMany({
      where: { userId: input.assigneeUserId },
    });
    if (subs.length === 0) return;

    const url = input.tasksUrl;
    const tag = `task-${input.taskId}`;

    for (const sub of subs) {
      const lang = resolveLang(sub.locale);
      const t = I18N[messageLocale(lang)].pushNotifications;
      const bell = I18N[messageLocale(lang)].notificationBell;
      const actor = input.actorLabel.trim() || bell.someone;
      const title = t.taskAssignedTitle;
      const body = t.taskAssignedBody.replace("{actor}", actor).replace("{title}", input.taskTitle);
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
}
