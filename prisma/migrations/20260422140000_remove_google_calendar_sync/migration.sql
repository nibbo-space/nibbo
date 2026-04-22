ALTER TABLE "Family" DROP CONSTRAINT IF EXISTS "Family_googleCalendarSyncUserId_fkey";
DROP INDEX IF EXISTS "Event_googleEventId_key";
ALTER TABLE "Event" DROP COLUMN IF EXISTS "googleEventId";
ALTER TABLE "Family" DROP COLUMN IF EXISTS "googleCalendarSyncEnabled";
ALTER TABLE "Family" DROP COLUMN IF EXISTS "googleCalendarId";
ALTER TABLE "Family" DROP COLUMN IF EXISTS "googleCalendarSyncUserId";
ALTER TABLE "Family" DROP COLUMN IF EXISTS "googleCalendarLastSyncAt";
