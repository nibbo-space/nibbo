import type { AppLanguage } from "@/lib/i18n";

export type TaskAssignedPushInput = {
  assigneeUserId: string;
  taskId: string;
  taskTitle: string;
  actorLabel: string;
  tasksUrl: string;
};

export interface PushDeliveryChannel {
  readonly kind: "web_push";
  sendTaskAssigned(
    input: TaskAssignedPushInput,
    resolveLang: (locale: string) => AppLanguage
  ): Promise<void>;
}
