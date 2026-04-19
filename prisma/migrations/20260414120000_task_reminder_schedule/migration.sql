ALTER TABLE "Task" ADD COLUMN "reminderCadenceDays" INTEGER;
ALTER TABLE "Task" ADD COLUMN "reminderWindowStartMin" INTEGER;
ALTER TABLE "Task" ADD COLUMN "reminderWindowEndMin" INTEGER;
ALTER TABLE "Task" ADD COLUMN "reminderAnchorYmd" TEXT;
ALTER TABLE "Task" ADD COLUMN "reminderLastFiredYmd" TEXT;

CREATE INDEX "Task_assigneeId_completed_reminderCadenceDays_idx" ON "Task"("assigneeId", "completed", "reminderCadenceDays");
