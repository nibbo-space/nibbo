CREATE TYPE "FamilyBattleStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

CREATE TYPE "FamilyBattleOutcome" AS ENUM ('WIN', 'LOSS');

CREATE TABLE "FamilyBattle" (
    "id" TEXT NOT NULL,
    "playerUserId" TEXT NOT NULL,
    "playerFamilyId" TEXT NOT NULL,
    "opponentFamilyId" TEXT NOT NULL,
    "playerMaxLives" INTEGER NOT NULL,
    "opponentMaxLives" INTEGER NOT NULL,
    "status" "FamilyBattleStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "outcome" "FamilyBattleOutcome",
    "xpAwarded" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "FamilyBattle_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FamilyBattle_playerUserId_status_idx" ON "FamilyBattle"("playerUserId", "status");

CREATE INDEX "FamilyBattle_playerFamilyId_startedAt_idx" ON "FamilyBattle"("playerFamilyId", "startedAt");

ALTER TABLE "FamilyBattle" ADD CONSTRAINT "FamilyBattle_playerUserId_fkey" FOREIGN KEY ("playerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
