-- CreateEnum
CREATE TYPE "BankProvider" AS ENUM ('MONOBANK');
CREATE TYPE "ExpenseSource" AS ENUM ('MANUAL', 'MONOBANK');

-- AlterTable Expense
ALTER TABLE "Expense" ADD COLUMN "source" "ExpenseSource" NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "Expense" ADD COLUMN "externalId" TEXT;
ALTER TABLE "Expense" ADD COLUMN "mcc" INTEGER;

-- AlterTable Income
ALTER TABLE "Income" ADD COLUMN "source" "ExpenseSource" NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "Income" ADD COLUMN "externalId" TEXT;
ALTER TABLE "Income" ADD COLUMN "mcc" INTEGER;

-- CreateTable
CREATE TABLE "BankConnection" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "provider" "BankProvider" NOT NULL,
    "tokenEnc" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "accountIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "connectedByUserId" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastStatementAt" TIMESTAMP(3),
    "lastError" TEXT,
    "syncFromAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BankCategoryMapping" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "provider" "BankProvider" NOT NULL,
    "mcc" INTEGER NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankCategoryMapping_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BankConnection_familyId_provider_key" ON "BankConnection"("familyId", "provider");
CREATE INDEX "BankConnection_enabled_lastSyncAt_idx" ON "BankConnection"("enabled", "lastSyncAt");

CREATE UNIQUE INDEX "BankCategoryMapping_familyId_provider_mcc_key" ON "BankCategoryMapping"("familyId", "provider", "mcc");
CREATE INDEX "BankCategoryMapping_familyId_provider_idx" ON "BankCategoryMapping"("familyId", "provider");

CREATE UNIQUE INDEX "Expense_familyId_source_externalId_key" ON "Expense"("familyId", "source", "externalId");
CREATE INDEX "Expense_familyId_date_idx" ON "Expense"("familyId", "date");
CREATE INDEX "Expense_familyId_source_idx" ON "Expense"("familyId", "source");

CREATE UNIQUE INDEX "Income_familyId_source_externalId_key" ON "Income"("familyId", "source", "externalId");
CREATE INDEX "Income_familyId_date_idx" ON "Income"("familyId", "date");
CREATE INDEX "Income_familyId_source_idx" ON "Income"("familyId", "source");

ALTER TABLE "BankConnection" ADD CONSTRAINT "BankConnection_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankConnection" ADD CONSTRAINT "BankConnection_connectedByUserId_fkey" FOREIGN KEY ("connectedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankCategoryMapping" ADD CONSTRAINT "BankCategoryMapping_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankCategoryMapping" ADD CONSTRAINT "BankCategoryMapping_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
