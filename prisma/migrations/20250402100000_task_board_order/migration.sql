ALTER TABLE "TaskBoard" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

UPDATE "TaskBoard" b
SET "order" = s.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) - 1 AS rn FROM "TaskBoard"
) s
WHERE b.id = s.id;
