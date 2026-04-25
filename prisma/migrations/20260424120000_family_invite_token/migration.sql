ALTER TABLE "FamilyInvitation" ADD COLUMN "inviteToken" TEXT;
CREATE UNIQUE INDEX "FamilyInvitation_inviteToken_key" ON "FamilyInvitation"("inviteToken");
