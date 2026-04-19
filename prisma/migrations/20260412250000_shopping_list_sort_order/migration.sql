ALTER TABLE "ShoppingList" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "ShoppingList_familyId_sortOrder_idx" ON "ShoppingList"("familyId", "sortOrder");

WITH "ord" AS (
  SELECT id, (ROW_NUMBER() OVER (PARTITION BY "familyId" ORDER BY "updatedAt" DESC) - 1) AS rn
  FROM "ShoppingList"
)
UPDATE "ShoppingList" AS sl
SET "sortOrder" = "ord".rn
FROM "ord"
WHERE sl.id = "ord".id;
