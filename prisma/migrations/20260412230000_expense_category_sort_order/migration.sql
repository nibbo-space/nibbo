ALTER TABLE "ExpenseCategory" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "ExpenseCategory_familyId_sortOrder_idx" ON "ExpenseCategory"("familyId", "sortOrder");

WITH "ord" AS (
  SELECT id, (ROW_NUMBER() OVER (PARTITION BY "familyId" ORDER BY name ASC) - 1) AS rn
  FROM "ExpenseCategory"
)
UPDATE "ExpenseCategory" AS ec
SET "sortOrder" = "ord".rn
FROM "ord"
WHERE ec.id = "ord".id;
