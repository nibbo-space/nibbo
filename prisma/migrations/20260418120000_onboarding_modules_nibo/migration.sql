ALTER TABLE "Family" ADD COLUMN "modulesSetupCompletedAt" TIMESTAMP(3);

ALTER TABLE "User" ADD COLUMN "niboWelcomeCompletedAt" TIMESTAMP(3);

UPDATE "Family" SET "modulesSetupCompletedAt" = "createdAt" WHERE "modulesSetupCompletedAt" IS NULL;

UPDATE "User" SET "niboWelcomeCompletedAt" = "createdAt" WHERE "niboWelcomeCompletedAt" IS NULL;
