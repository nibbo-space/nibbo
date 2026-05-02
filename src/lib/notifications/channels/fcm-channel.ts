import { getFirebaseMessaging } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";
import { I18N, messageLocale, type AppLanguage } from "@/lib/i18n";
import type { TaskAssignedPushInput } from "./types";

export class FcmChannel {
  readonly kind = "fcm" as const;

  async sendTaskAssigned(
    input: TaskAssignedPushInput,
    resolveLang: (locale: string) => AppLanguage
  ): Promise<void> {
    const tokens = await prisma.mobilePushToken.findMany({
      where: { userId: input.assigneeUserId },
      select: { id: true, token: true },
    });
    if (tokens.length === 0) return;

    const messaging = getFirebaseMessaging();

    // Use a representative locale for FCM (no per-token locale stored)
    const lang = resolveLang("uk");
    const t = I18N[messageLocale(lang)].pushNotifications;
    const bell = I18N[messageLocale(lang)].notificationBell;
    const actor = input.actorLabel.trim() || bell.someone;
    const title = t.taskAssignedTitle;
    const body = t.taskAssignedBody.replace("{actor}", actor).replace("{title}", input.taskTitle);

    const staleTokenIds: string[] = [];

    for (const { id, token } of tokens) {
      try {
        await messaging.send({
          token,
          notification: { title, body },
          data: { taskId: input.taskId, url: input.tasksUrl },
          android: {
            priority: "high",
            notification: { channelId: "default", sound: "default" },
          },
        });
      } catch (e: unknown) {
        const code =
          typeof e === "object" && e !== null && "code" in e
            ? (e as { code?: string }).code
            : undefined;
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        ) {
          staleTokenIds.push(id);
        }
      }
    }

    if (staleTokenIds.length > 0) {
      await prisma.mobilePushToken.deleteMany({ where: { id: { in: staleTokenIds } } });
    }
  }
}
