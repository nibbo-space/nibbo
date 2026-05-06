-- CreateTable
CREATE TABLE "FamilyIngredientCatalog" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "amount" TEXT NOT NULL DEFAULT '',
    "unit" TEXT,
    "referenceAmount" TEXT,
    "referenceUnit" TEXT,
    "protein" DOUBLE PRECISION,
    "fat" DOUBLE PRECISION,
    "saturatedFat" DOUBLE PRECISION,
    "carbs" DOUBLE PRECISION,
    "sugar" DOUBLE PRECISION,
    "salt" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyIngredientCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FamilyIngredientCatalog_familyId_idx" ON "FamilyIngredientCatalog"("familyId");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyIngredientCatalog_familyId_nameKey_key" ON "FamilyIngredientCatalog"("familyId", "nameKey");

-- AddForeignKey
ALTER TABLE "FamilyIngredientCatalog" ADD CONSTRAINT "FamilyIngredientCatalog_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
