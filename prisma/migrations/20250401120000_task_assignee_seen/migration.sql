ALTER TABLE "Task" ADD COLUMN "assigneeSeenAt" TIMESTAMP(3);

UPDATE "Task" SET "assigneeSeenAt" = NOW() WHERE "assigneeId" IS NOT NULL;
