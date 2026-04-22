import { deleteUserCascade, deriveCredentialGate } from "@/lib/auth-gate";
import { prisma } from "@/lib/prisma";

export async function loadCredentialGate(userId: string) {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      passwordHash: true,
      credentialSetupDeadline: true,
      accounts: { select: { provider: true } },
    },
  });
  if (!row) return null;
  return deriveCredentialGate(row);
}

export async function deleteUserIfCredentialExpired(userId: string): Promise<boolean> {
  const gate = await loadCredentialGate(userId);
  if (!gate?.credentialExpired) return false;
  await deleteUserCascade(userId);
  return true;
}
