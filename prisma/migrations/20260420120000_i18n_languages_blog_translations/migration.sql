CREATE TABLE "Language" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Language_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Language_code_key" ON "Language"("code");
CREATE INDEX "Language_isActive_sortOrder_idx" ON "Language"("isActive", "sortOrder");
CREATE UNIQUE INDEX "Language_single_default_idx" ON "Language"("isDefault") WHERE "isDefault" = true;

CREATE TABLE "BlogPostTranslation" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "languageId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "excerpt" TEXT,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BlogPostTranslation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BlogPostTranslation_postId_languageId_key" ON "BlogPostTranslation"("postId", "languageId");
CREATE INDEX "BlogPostTranslation_languageId_idx" ON "BlogPostTranslation"("languageId");

ALTER TABLE "BlogPostTranslation"
  ADD CONSTRAINT "BlogPostTranslation_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BlogPostTranslation"
  ADD CONSTRAINT "BlogPostTranslation_languageId_fkey"
  FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "I18nKey" (
  "id" TEXT NOT NULL,
  "namespace" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "I18nKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "I18nKey_key_key" ON "I18nKey"("key");
CREATE INDEX "I18nKey_namespace_idx" ON "I18nKey"("namespace");

CREATE TABLE "I18nValue" (
  "id" TEXT NOT NULL,
  "i18nKeyId" TEXT NOT NULL,
  "languageId" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "I18nValue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "I18nValue_i18nKeyId_languageId_key" ON "I18nValue"("i18nKeyId", "languageId");
CREATE INDEX "I18nValue_languageId_idx" ON "I18nValue"("languageId");

ALTER TABLE "I18nValue"
  ADD CONSTRAINT "I18nValue_i18nKeyId_fkey"
  FOREIGN KEY ("i18nKeyId") REFERENCES "I18nKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "I18nValue"
  ADD CONSTRAINT "I18nValue_languageId_fkey"
  FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Language" ("id", "code", "name", "isDefault", "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'uk', 'Ukrainian', true, true, 0, now(), now()),
  (gen_random_uuid()::text, 'en', 'English', false, true, 1, now(), now())
ON CONFLICT ("code") DO NOTHING;

WITH lang_uk AS (
  SELECT id FROM "Language" WHERE code = 'uk' LIMIT 1
),
lang_en AS (
  SELECT id FROM "Language" WHERE code = 'en' LIMIT 1
)
INSERT INTO "BlogPostTranslation" ("id", "postId", "languageId", "title", "excerpt", "body", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id, u.id, p."titleUk", p."excerptUk", p."bodyUk", now(), now()
FROM "BlogPost" p CROSS JOIN lang_uk u
ON CONFLICT ("postId", "languageId") DO NOTHING;

WITH lang_en AS (
  SELECT id FROM "Language" WHERE code = 'en' LIMIT 1
)
INSERT INTO "BlogPostTranslation" ("id", "postId", "languageId", "title", "excerpt", "body", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p.id, e.id, p."titleEn", p."excerptEn", p."bodyEn", now(), now()
FROM "BlogPost" p CROSS JOIN lang_en e
ON CONFLICT ("postId", "languageId") DO NOTHING;
