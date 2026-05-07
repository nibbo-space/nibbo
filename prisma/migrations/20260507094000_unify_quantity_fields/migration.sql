ALTER TABLE "Ingredient"
ADD COLUMN "quantity" TEXT NOT NULL DEFAULT '';

UPDATE "Ingredient"
SET "quantity" = TRIM(CONCAT(COALESCE("amount", ''), CASE WHEN COALESCE("unit", '') = '' THEN '' ELSE ' ' || "unit" END));

ALTER TABLE "Ingredient"
DROP COLUMN "amount",
DROP COLUMN "unit";

ALTER TABLE "FamilyIngredientCatalog"
ADD COLUMN "quantity" TEXT NOT NULL DEFAULT '';

UPDATE "FamilyIngredientCatalog"
SET "quantity" = TRIM(CONCAT(COALESCE("amount", ''), CASE WHEN COALESCE("unit", '') = '' THEN '' ELSE ' ' || "unit" END));

ALTER TABLE "FamilyIngredientCatalog"
DROP COLUMN "amount",
DROP COLUMN "unit";

ALTER TABLE "RecipeMarketIngredient"
ADD COLUMN "quantity" TEXT NOT NULL DEFAULT '';

UPDATE "RecipeMarketIngredient"
SET "quantity" = TRIM(CONCAT(COALESCE("amount", ''), CASE WHEN COALESCE("unit", '') = '' THEN '' ELSE ' ' || "unit" END));

ALTER TABLE "RecipeMarketIngredient"
DROP COLUMN "amount",
DROP COLUMN "unit";

UPDATE "ShoppingItem"
SET "quantity" = TRIM(CONCAT(COALESCE("quantity", ''), CASE WHEN COALESCE("unit", '') = '' THEN '' ELSE ' ' || "unit" END))
WHERE "unit" IS NOT NULL AND TRIM("unit") <> '';

ALTER TABLE "ShoppingItem"
DROP COLUMN "unit";
