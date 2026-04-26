CREATE TYPE "XpEventType" AS ENUM (
  'TASK_COMPLETED',
  'SUBSCRIPTION_DELETED',
  'CREDIT_CLOSED',
  'SHOPPING_ITEM_CLOSED',
  'MEDICATION_TAKEN',
  'NOTE_CREATED'
);

CREATE TABLE "XpLedgerEntry" (
  "id" TEXT NOT NULL,
  "familyId" TEXT NOT NULL,
  "userId" TEXT,
  "eventType" "XpEventType" NOT NULL,
  "points" INTEGER NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "XpLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "XpLedgerEntry_dedupeKey_key" ON "XpLedgerEntry"("dedupeKey");
CREATE INDEX "XpLedgerEntry_familyId_createdAt_idx" ON "XpLedgerEntry"("familyId", "createdAt");
CREATE INDEX "XpLedgerEntry_familyId_eventType_createdAt_idx" ON "XpLedgerEntry"("familyId", "eventType", "createdAt");
CREATE INDEX "XpLedgerEntry_userId_createdAt_idx" ON "XpLedgerEntry"("userId", "createdAt");

ALTER TABLE "XpLedgerEntry"
ADD CONSTRAINT "XpLedgerEntry_familyId_fkey"
FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "XpLedgerEntry"
ADD CONSTRAINT "XpLedgerEntry_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "XpLedgerEntry" ("id", "familyId", "userId", "eventType", "points", "sourceType", "sourceId", "dedupeKey", "createdAt")
SELECT
  CONCAT('legacy_task_', t."id"),
  b."familyId",
  t."creatorId",
  'TASK_COMPLETED'::"XpEventType",
  10,
  'task',
  t."id",
  CONCAT('task_completed:task:', t."id"),
  COALESCE(t."completedAt", t."updatedAt", CURRENT_TIMESTAMP)
FROM "Task" t
JOIN "TaskColumn" c ON c."id" = t."columnId"
JOIN "TaskBoard" b ON b."id" = c."boardId"
WHERE t."completed" = true
  AND b."familyId" IS NOT NULL
ON CONFLICT ("dedupeKey") DO NOTHING;
