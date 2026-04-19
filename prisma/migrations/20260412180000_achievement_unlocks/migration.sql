CREATE TABLE "FamilyAchievementUnlock" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyAchievementUnlock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FamilyAchievementUnlock_familyId_achievementId_key" ON "FamilyAchievementUnlock"("familyId", "achievementId");

CREATE INDEX "FamilyAchievementUnlock_familyId_idx" ON "FamilyAchievementUnlock"("familyId");

ALTER TABLE "FamilyAchievementUnlock" ADD CONSTRAINT "FamilyAchievementUnlock_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UserAchievementUnlock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAchievementUnlock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserAchievementUnlock_userId_achievementId_key" ON "UserAchievementUnlock"("userId", "achievementId");

CREATE INDEX "UserAchievementUnlock_userId_idx" ON "UserAchievementUnlock"("userId");

ALTER TABLE "UserAchievementUnlock" ADD CONSTRAINT "UserAchievementUnlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UserAchievementCounter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAchievementCounter_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserAchievementCounter_userId_key_key" ON "UserAchievementCounter"("userId", "key");

CREATE INDEX "UserAchievementCounter_userId_idx" ON "UserAchievementCounter"("userId");

ALTER TABLE "UserAchievementCounter" ADD CONSTRAINT "UserAchievementCounter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "FamilyAchievementUnlock" ("id", "familyId", "achievementId", "unlockedAt")
SELECT
    md5(fx."familyId" || ':' || aid."achievementId"),
    fx."familyId",
    aid."achievementId",
    CURRENT_TIMESTAMP
FROM (
    SELECT
        f."id" AS "familyId",
        (COUNT(t."id") * 10)::int AS "xp"
    FROM "Family" f
    LEFT JOIN "TaskBoard" b ON b."familyId" = f."id"
    LEFT JOIN "TaskColumn" c ON c."boardId" = b."id"
    LEFT JOIN "Task" t ON t."columnId" = c."id" AND t."completed" = true
    GROUP BY f."id"
) fx
CROSS JOIN (
    VALUES
        ('first-steps', 50),
        ('warm-routine', 300),
        ('cozy-family', 600),
        ('task-masters', 1200),
        ('legend', 2500),
        ('master-of-nibbo', 5000)
) AS aid("achievementId", "threshold")
WHERE fx."xp" >= aid."threshold"
ON CONFLICT ("familyId", "achievementId") DO NOTHING;
