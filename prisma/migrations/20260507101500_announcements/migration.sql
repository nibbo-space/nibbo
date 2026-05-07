CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "authorAdminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserAnnouncementView" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAnnouncementView_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserAnnouncementView_userId_announcementId_key" ON "UserAnnouncementView"("userId", "announcementId");
CREATE INDEX "Announcement_published_publishedAt_idx" ON "Announcement"("published", "publishedAt");
CREATE INDEX "Announcement_authorAdminId_createdAt_idx" ON "Announcement"("authorAdminId", "createdAt");
CREATE INDEX "UserAnnouncementView_announcementId_idx" ON "UserAnnouncementView"("announcementId");
CREATE INDEX "UserAnnouncementView_userId_viewedAt_idx" ON "UserAnnouncementView"("userId", "viewedAt");

ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorAdminId_fkey"
FOREIGN KEY ("authorAdminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserAnnouncementView" ADD CONSTRAINT "UserAnnouncementView_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserAnnouncementView" ADD CONSTRAINT "UserAnnouncementView_announcementId_fkey"
FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
