CREATE TYPE "MedicationScheduleMode" AS ENUM ('DAILY_TIMES', 'INTERVAL_DAYS');

CREATE TABLE "Medication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "scheduleMode" "MedicationScheduleMode" NOT NULL,
    "dailySlotMinutes" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "slotToleranceMin" INTEGER NOT NULL DEFAULT 45,
    "intervalDays" INTEGER,
    "intervalAnchorYmd" TEXT,
    "intervalWindowStartMin" INTEGER,
    "intervalWindowEndMin" INTEGER,
    "intervalLastFiredYmd" TEXT,
    "lastDailyPushJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MedicationIntake" (
    "id" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "dateYmd" TEXT NOT NULL,
    "slotIndex" INTEGER NOT NULL DEFAULT 0,
    "taken" BOOLEAN NOT NULL DEFAULT false,
    "takenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationIntake_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Medication_userId_familyId_idx" ON "Medication"("userId", "familyId");

CREATE UNIQUE INDEX "MedicationIntake_medicationId_dateYmd_slotIndex_key" ON "MedicationIntake"("medicationId", "dateYmd", "slotIndex");

CREATE INDEX "MedicationIntake_medicationId_dateYmd_idx" ON "MedicationIntake"("medicationId", "dateYmd");

ALTER TABLE "Medication" ADD CONSTRAINT "Medication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Medication" ADD CONSTRAINT "Medication_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MedicationIntake" ADD CONSTRAINT "MedicationIntake_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
