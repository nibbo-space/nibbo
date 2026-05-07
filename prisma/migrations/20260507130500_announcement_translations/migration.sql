ALTER TABLE "Announcement"
ADD COLUMN "titleUk" TEXT NOT NULL DEFAULT '',
ADD COLUMN "titleEn" TEXT NOT NULL DEFAULT '',
ADD COLUMN "bodyUk" TEXT NOT NULL DEFAULT '',
ADD COLUMN "bodyEn" TEXT NOT NULL DEFAULT '';

UPDATE "Announcement"
SET
  "titleUk" = COALESCE("title", ''),
  "titleEn" = COALESCE("title", ''),
  "bodyUk" = COALESCE("body", ''),
  "bodyEn" = COALESCE("body", '');

ALTER TABLE "Announcement"
DROP COLUMN "title",
DROP COLUMN "body";

CREATE TABLE "AnnouncementTranslation" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "AnnouncementTranslation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AnnouncementTranslation_announcementId_languageId_key" ON "AnnouncementTranslation"("announcementId", "languageId");
CREATE INDEX "AnnouncementTranslation_languageId_idx" ON "AnnouncementTranslation"("languageId");

ALTER TABLE "AnnouncementTranslation" ADD CONSTRAINT "AnnouncementTranslation_announcementId_fkey"
FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AnnouncementTranslation" ADD CONSTRAINT "AnnouncementTranslation_languageId_fkey"
FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;
