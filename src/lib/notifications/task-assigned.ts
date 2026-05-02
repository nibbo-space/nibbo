import { getMetadataBaseUrl } from "@/lib/site-url";
import { WebPushChannel } from "@/lib/notifications/channels/web-push-channel";
import { FcmChannel } from "@/lib/notifications/channels/fcm-channel";
import type { AppLanguage } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

const webPush = new WebPushChannel();
const fcm = new FcmChannel();

function resolveLang(locale: string): AppLanguage {
  return locale === "en" ? "en" : "uk";
}

export async function notifyTaskAssigneeChanged(params: {
  actorUserId: string;
  previousAssigneeId: string | null;
  task: { id: string; title: string; assigneeId: string | null };
  actorDisplayName: string | null | undefined;
}): Promise<void> {
  const assigneeId = params.task.assigneeId;
  if (!assigneeId || assigneeId === params.actorUserId) return;
  if (params.previousAssigneeId === assigneeId) return;

  const origin = getMetadataBaseUrl().origin;
  const tasksUrl = `${origin}/tasks`;
  let actorLabel = params.actorDisplayName?.trim() || "";
  if (!actorLabel) {
    const u = await prisma.user.findUnique({
      where: { id: params.actorUserId },
      select: { name: true },
    });
    actorLabel = u?.name?.trim() || "";
  }

  const pushInput = {
    assigneeUserId: assigneeId,
    taskId: params.task.id,
    taskTitle: params.task.title,
    actorLabel,
    tasksUrl,
  };
  await Promise.allSettled([
    webPush.sendTaskAssigned(pushInput, resolveLang),
    fcm.sendTaskAssigned(pushInput, resolveLang),
  ]);
}

export function fireAndForgetNotifyTaskAssigneeChanged(params: Parameters<typeof notifyTaskAssigneeChanged>[0]): void {
  void notifyTaskAssigneeChanged(params).catch(() => {});
}
