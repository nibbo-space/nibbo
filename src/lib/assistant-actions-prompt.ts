import type { AppLanguage } from "@/lib/i18n";

export function buildAssistantActionsPrompt(language: AppLanguage, mode: "default" | "tamagotchi"): string {
  const uk = language === "uk";
  const tone =
    mode === "tamagotchi"
      ? uk
        ? "Ти можеш допомогти створити, змінити або видалити подію в календарі, створити чи змінити задачу, а також витрату — лише після уточнень і явної згоди («так», «додай», «видали», «ок» тощо). Видалення події — лише з id з довідника подій. Для нової чи зміненої події збирай усі згадані деталі: назва, дата й час або «на весь день», опис, місце, хто відповідальний — і передавай їх у JSON (не вигадуй від себе)."
        : "You can help create, update, or delete a calendar event; create or update a task; or handle an expense — only after clarifying and the user clearly agrees (yes, add it, delete it, ok, etc.). Deleting an event requires an event id from the reference list. For new or updated events, capture title, date/time or all-day, description, location, assignee — pass them in JSON (do not invent details)."
      : uk
        ? "Ти можеш запропонувати зафіксувати або видалити подію в календарі, задачу чи витрату в Nibbo: уточни важливі поля; для видалення події — переконайся, яку саме (за id у довіднику), потім попроси явне підтвердження."
        : "You can offer to add, change, or remove a calendar event, task, or expense in Nibbo: clarify what matters; for deleting an event, confirm which one (by id from the reference), then ask for explicit confirmation.";

  const jsonRules = uk
    ? `Коли користувач підтвердив і всі поля зрозумілі, в ОСТАННЬОМУ рядку повідомлення (без Markdown-огорожі) додай РІВНО один рядок:
NIBBO_ACTION:{"actions":[...]}
Максимум 6 дій за раз. Дозволені op:
- task_create: { "op":"task_create", "title":"...", "columnId?":"...", "dueDate?":"YYYY-MM-DD|null", "priority?":"LOW|MEDIUM|HIGH|URGENT", "assigneeId?":"userId|null" }
- task_update: { "op":"task_update", "id":"taskId", "title?":"...", "completed?":true|false, "dueDate?":"YYYY-MM-DD|null", "priority?":"..." }
- event_create: { "op":"event_create", "title":"...", "startDate":"ISO", "endDate":"ISO", "allDay?":true|false, "description?":"...", "location?":"...", "assigneeId?":"userId" }
- event_update: { "op":"event_update", "id":"eventId", "title?":"...", "description?":"...", "startDate?":"ISO", "endDate?":"ISO", "allDay?":bool, "location?":"...", "assigneeId?":"userId|null" }
- event_delete: { "op":"event_delete", "id":"eventId" }
- expense_create: { "op":"expense_create", "title":"...", "amount":123.45, "date?":"YYYY-MM-DD", "categoryId?":"id|null", "note?":"..." }
- expense_update: { "op":"expense_update", "id":"expenseId", "title?":"...", "amount?":number, "date?":"YYYY-MM-DD", "categoryId?":"id|null" }
Час подій у JSON: краще ISO з явним зсувом (наприклад ...+03:00), як у знімку подій; рядок дати-часу без Z і без зсуву = локальний час профілю користувача в застосунку (не UTC).
Якщо користувач назвав опис, місце або відповідального для події — поля description, location і assigneeId у event_create / event_update мають відображати саме це (assigneeId лише з рядків «user …» у довіднику). Для event_delete використовуй id події з рядків «event …». Використовуй тільки id з блоку "Action reference". Якщо бракує обов’язкових даних — не додавай NIBBO_ACTION; продовж діалог.`
    : `When the user confirmed and fields are clear, add EXACTLY one final line to your reply (no markdown fence):
NIBBO_ACTION:{"actions":[...]}
Up to 6 actions. Allowed op:
- task_create: { "op":"task_create", "title":"...", "columnId?":"...", "dueDate?":"YYYY-MM-DD|null", "priority?":"LOW|MEDIUM|HIGH|URGENT", "assigneeId?":"userId|null" }
- task_update: { "op":"task_update", "id":"taskId", "title?":"...", "completed?":true|false, "dueDate?":"YYYY-MM-DD|null", "priority?":"..." }
- event_create: { "op":"event_create", "title":"...", "startDate":"ISO", "endDate":"ISO", "allDay?":true|false, "description?":"...", "location?":"...", "assigneeId?":"userId" }
- event_update: { "op":"event_update", "id":"eventId", "title?":"...", "description?":"...", "startDate?":"ISO", "endDate?":"ISO", "allDay?":bool, "location?":"...", "assigneeId?":"userId|null" }
- event_delete: { "op":"event_delete", "id":"eventId" }
- expense_create: { "op":"expense_create", "title":"...", "amount":123.45, "date?":"YYYY-MM-DD", "categoryId?":"id|null", "note?":"..." }
- expense_update: { "op":"expense_update", "id":"expenseId", "title?":"...", "amount?":number, "date?":"YYYY-MM-DD", "categoryId?":"id|null" }
Event datetimes in JSON: prefer ISO with explicit offset (e.g. ...+03:00) matching the snapshot; a datetime without Z/offset is the user's app-profile local time (not UTC).
If the user gave a description, location, or assignee for an event, include description, location, and assigneeId in event_create / event_update accordingly (assigneeId only from "user …" lines in the reference). For event_delete use the event id from "event …" lines. Use only ids from the "Action reference" snapshot. If required data is missing — do not add NIBBO_ACTION; keep asking.`;

  return `\n\n--- Nibbo actions (machine-readable) ---\n${tone}\n${jsonRules}\n`;
}
