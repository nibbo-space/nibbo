CREATE TYPE "SubscriptionBillingCycle" AS ENUM ('MONTHLY', 'YEARLY');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED');
CREATE TYPE "SubscriptionMemberRole" AS ENUM ('USER', 'PAYER');

CREATE TABLE "FamilySubscription" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "billingCycle" "SubscriptionBillingCycle" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UAH',
    "nextBillingDate" TIMESTAMP(3) NOT NULL,
    "trialEndsAt" TIMESTAMP(3),
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "note" TEXT,
    "familyId" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FamilySubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FamilySubscriptionMember" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "SubscriptionMemberRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FamilySubscriptionMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FamilySubscriptionMember_subscriptionId_userId_key" ON "FamilySubscriptionMember"("subscriptionId", "userId");
CREATE INDEX "FamilySubscription_familyId_status_nextBillingDate_idx" ON "FamilySubscription"("familyId", "status", "nextBillingDate");
CREATE INDEX "FamilySubscription_ownerUserId_idx" ON "FamilySubscription"("ownerUserId");

ALTER TABLE "FamilySubscription"
ADD CONSTRAINT "FamilySubscription_familyId_fkey"
FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FamilySubscription"
ADD CONSTRAINT "FamilySubscription_ownerUserId_fkey"
FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FamilySubscriptionMember"
ADD CONSTRAINT "FamilySubscriptionMember_subscriptionId_fkey"
FOREIGN KEY ("subscriptionId") REFERENCES "FamilySubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FamilySubscriptionMember"
ADD CONSTRAINT "FamilySubscriptionMember_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
