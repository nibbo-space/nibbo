ALTER TABLE "Task" ADD COLUMN "completedAt" TIMESTAMP(3);

UPDATE "Task" SET "completedAt" = "updatedAt" WHERE completed = true;
