ALTER TABLE "Recipe" ADD COLUMN "calories" INTEGER;

CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecipeMarket" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "emoji" TEXT NOT NULL DEFAULT '🍽️',
    "prepTime" INTEGER,
    "cookTime" INTEGER,
    "servings" INTEGER NOT NULL DEFAULT 4,
    "category" TEXT NOT NULL DEFAULT 'Обід',
    "calories" INTEGER,
    "imageUrl" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecipeMarket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecipeMarketIngredient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "unit" TEXT,
    "recipeMarketId" TEXT NOT NULL,

    CONSTRAINT "RecipeMarketIngredient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Admin_userId_key" ON "Admin"("userId");

ALTER TABLE "Admin" ADD CONSTRAINT "Admin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecipeMarket" ADD CONSTRAINT "RecipeMarket_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RecipeMarketIngredient" ADD CONSTRAINT "RecipeMarketIngredient_recipeMarketId_fkey" FOREIGN KEY ("recipeMarketId") REFERENCES "RecipeMarket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
