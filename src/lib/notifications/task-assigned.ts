import { getMetadataBaseUrl } from "@/lib/site-url";
import { WebPushChannel } from "@/lib/notifications/channels/web-push-channel";
import type { AppLanguage } from "@/lib/i18n";
import { isWebPushConfigured } from "@/lib/push/vapid";
import { prisma } from "@/lib/prisma";

const webPush = new WebPushChannel();

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
  if (!isWebPushConfigured()) return;

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

  await webPush.sendTaskAssigned(
    {
      assigneeUserId: assigneeId,
      taskId: params.task.id,
      taskTitle: params.task.title,
      actorLabel,
      tasksUrl,
    },
    resolveLang
  );
}

export function fireAndForgetNotifyTaskAssigneeChanged(params: Parameters<typeof notifyTaskAssigneeChanged>[0]): void {
  void notifyTaskAssigneeChanged(params).catch(() => {});
}
