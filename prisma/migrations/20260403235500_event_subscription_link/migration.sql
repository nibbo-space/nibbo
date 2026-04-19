ALTER TABLE "Event" ADD COLUMN "subscriptionId" TEXT;

CREATE INDEX "Event_subscriptionId_idx" ON "Event"("subscriptionId");

ALTER TABLE "Event"
ADD CONSTRAINT "Event_subscriptionId_fkey"
FOREIGN KEY ("subscriptionId") REFERENCES "FamilySubscription"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
