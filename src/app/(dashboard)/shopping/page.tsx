import { auth } from "@/lib/auth";
import { shoppingItemsVisibleWhere, shoppingListVisibleWhere } from "@/lib/family-private-scope";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import ShoppingView from "@/components/shopping/ShoppingView";

export default async function ShoppingPage() {
  const session = await auth();
  if (!session) return null;
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return null;
  const userId = session.user.id;

  const lists = await prisma.shoppingList.findMany({
    where: shoppingListVisibleWhere(familyId, userId),
    include: {
      items: {
        where: shoppingItemsVisibleWhere(userId),
        include: { addedBy: { select: { id: true, name: true, image: true, color: true, emoji: true } } },
        orderBy: [{ checked: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return <ShoppingView initialLists={lists} currentUserId={session.user.id} />;
}
