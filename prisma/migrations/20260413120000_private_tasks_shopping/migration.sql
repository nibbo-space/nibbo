ALTER TABLE "TaskBoard" ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TaskBoard" ADD COLUMN     "ownerUserId" TEXT;
ALTER TABLE "TaskBoard" ADD CONSTRAINT "TaskBoard_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "TaskBoard_familyId_isPrivate_idx" ON "TaskBoard"("familyId", "isPrivate");

ALTER TABLE "Task" ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Task_columnId_isPrivate_idx" ON "Task"("columnId", "isPrivate");

ALTER TABLE "ShoppingList" ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ShoppingList" ADD COLUMN     "ownerUserId" TEXT;
ALTER TABLE "ShoppingList" ADD CONSTRAINT "ShoppingList_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ShoppingItem" ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false;
