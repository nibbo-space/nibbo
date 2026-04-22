import { prisma } from "@/lib/prisma";

const EMAIL_MAGIC_PROVIDERS = new Set(["nodemailer", "email"]);

export function hasEmailMagicProvider(providers: readonly string[]) {
  return providers.some((p) => EMAIL_MAGIC_PROVIDERS.has(p));
}

export function deriveCredentialGate(row: {
  passwordHash: string | null;
  credentialSetupDeadline: Date | null;
  accounts: readonly { provider: string }[];
}) {
  const providers = row.accounts.map((a) => a.provider);
  const hasEmailMagic = hasEmailMagicProvider(providers);
  const emailLinkNoAccountRow = row.accounts.length === 0;
  const pendingPassword =
    !row.passwordHash &&
    (hasEmailMagic || Boolean(row.credentialSetupDeadline) || emailLinkNoAccountRow);
  const credentialExpired = Boolean(
    pendingPassword &&
      row.credentialSetupDeadline &&
      row.credentialSetupDeadline.getTime() < Date.now()
  );
  const mustSetPassword = pendingPassword && !credentialExpired;
  return { mustSetPassword, credentialExpired };
}

export async function deleteUserCascade(userId: string) {
  await prisma.user.delete({ where: { id: userId } });
}
