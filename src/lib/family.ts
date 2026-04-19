import { prisma } from "@/lib/prisma";

export async function ensureUserFamily(userId: string) {
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, familyId: true },
  });
  if (!current) return null;
  if (current.familyId) return current.familyId;

  const family = await prisma.family.create({
    data: { name: `${(current.name || "Моя").split(" ")[0]} Family` },
    select: { id: true },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { familyId: family.id, familyRole: "OWNER" },
  });

  return family.id;
}
