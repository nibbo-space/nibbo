import { prisma } from "@/lib/prisma";

export async function isUserAdmin(userId: string) {
  const admin = await prisma.admin.findFirst({
    where: { userId },
    select: { id: true },
  });
  return Boolean(admin);
}

export async function getAdminIdByUser(userId: string) {
  const admin = await prisma.admin.findFirst({
    where: { userId },
    select: { id: true },
  });
  return admin?.id ?? null;
}
