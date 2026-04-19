ALTER TABLE "Family" ADD COLUMN "googleCalendarSyncEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Family" ADD COLUMN "googleCalendarId" TEXT NOT NULL DEFAULT 'primary';
ALTER TABLE "Family" ADD COLUMN "googleCalendarSyncUserId" TEXT;
ALTER TABLE "Family" ADD COLUMN "googleCalendarLastSyncAt" TIMESTAMP(3);

ALTER TABLE "Family" ADD CONSTRAINT "Family_googleCalendarSyncUserId_fkey" FOREIGN KEY ("googleCalendarSyncUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Event" ADD COLUMN "googleEventId" TEXT;

CREATE UNIQUE INDEX "Event_googleEventId_key" ON "Event"("googleEventId");
