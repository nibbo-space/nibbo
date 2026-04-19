CREATE TYPE "WatchMediaType" AS ENUM ('MOVIE', 'TV');
CREATE TYPE "WatchStatus" AS ENUM ('WATCHING', 'PAUSED', 'FINISHED', 'DROPPED');

ALTER TABLE "Family" ADD COLUMN "shareWatchingFeed" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "WatchItem" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'tmdb',
    "externalId" TEXT NOT NULL,
    "mediaType" "WatchMediaType" NOT NULL,
    "title" TEXT NOT NULL,
    "posterPath" TEXT,
    "status" "WatchStatus" NOT NULL DEFAULT 'WATCHING',
    "season" INTEGER,
    "episode" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WatchItem_familyId_provider_externalId_key" ON "WatchItem"("familyId", "provider", "externalId");
CREATE INDEX "WatchItem_familyId_status_idx" ON "WatchItem"("familyId", "status");
CREATE INDEX "WatchItem_familyId_updatedAt_idx" ON "WatchItem"("familyId", "updatedAt");

ALTER TABLE "WatchItem" ADD CONSTRAINT "WatchItem_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WatchItem" ADD CONSTRAINT "WatchItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
