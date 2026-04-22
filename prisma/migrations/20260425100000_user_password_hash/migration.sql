ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN "credentialSetupDeadline" TIMESTAMP(3);
