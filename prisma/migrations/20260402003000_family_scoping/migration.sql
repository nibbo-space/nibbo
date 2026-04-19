CREATE TABLE "Family" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Family_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FamilyInvitation" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "familyId" TEXT NOT NULL,
  "invitedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3),
  CONSTRAINT "FamilyInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FamilyInvitation_familyId_email_key" ON "FamilyInvitation"("familyId", "email");

ALTER TABLE "User" ADD COLUMN "familyId" TEXT;
ALTER TABLE "TaskBoard" ADD COLUMN "familyId" TEXT;
ALTER TABLE "Event" ADD COLUMN "familyId" TEXT;
ALTER TABLE "Recipe" ADD COLUMN "familyId" TEXT;
ALTER TABLE "MealPlan" ADD COLUMN "familyId" TEXT;
ALTER TABLE "Note" ADD COLUMN "familyId" TEXT;
ALTER TABLE "NoteCategory" ADD COLUMN "familyId" TEXT;
ALTER TABLE "ExpenseCategory" ADD COLUMN "familyId" TEXT;
ALTER TABLE "Expense" ADD COLUMN "familyId" TEXT;
ALTER TABLE "ShoppingList" ADD COLUMN "familyId" TEXT;

ALTER TABLE "User" ADD CONSTRAINT "User_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaskBoard" ADD CONSTRAINT "TaskBoard_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Event" ADD CONSTRAINT "Event_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Note" ADD CONSTRAINT "Note_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NoteCategory" ADD CONSTRAINT "NoteCategory_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShoppingList" ADD CONSTRAINT "ShoppingList_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyInvitation" ADD CONSTRAINT "FamilyInvitation_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyInvitation" ADD CONSTRAINT "FamilyInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
