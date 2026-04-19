import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const confirmEmail = String(body.confirmEmail || "").trim().toLowerCase();
  const transferOwnershipToUserId = body.transferOwnershipToUserId
    ? String(body.transferOwnershipToUserId)
    : "";

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, familyId: true, familyRole: true },
  });
  if (!me) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const myEmail = me.email?.trim().toLowerCase();
  if (!myEmail || confirmEmail !== myEmail) {
    return NextResponse.json({ error: "INVALID_EMAIL" }, { status: 400 });
  }

  if (me.familyId) {
    const others = await prisma.user.findMany({
      where: { familyId: me.familyId, id: { not: me.id } },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });

    if (me.familyRole === "OWNER" && others.length > 0) {
      if (!transferOwnershipToUserId || !others.some((o) => o.id === transferOwnershipToUserId)) {
        return NextResponse.json({ error: "NEED_SUCCESSOR" }, { status: 400 });
      }
    }

    try {
      await prisma.$transaction(async (tx) => {
        const familyId = me.familyId!;
        const othersInTx = await tx.user.findMany({
          where: { familyId, id: { not: me.id } },
          select: { id: true },
          orderBy: { createdAt: "asc" },
        });

        if (othersInTx.length === 0) {
          await tx.user.update({
            where: { id: me.id },
            data: { familyId: null, familyRole: "MEMBER" },
          });
          await tx.family.delete({ where: { id: familyId } });
          await tx.user.delete({ where: { id: me.id } });
          return;
        }

        let successorId: string;
        if (me.familyRole === "OWNER") {
          successorId = transferOwnershipToUserId;
          await tx.user.updateMany({
            where: { familyId, familyRole: "OWNER" },
            data: { familyRole: "MEMBER" },
          });
          await tx.user.update({
            where: { id: successorId },
            data: { familyRole: "OWNER" },
          });
        } else {
          const owner = await tx.user.findFirst({
            where: { familyId, familyRole: "OWNER" },
            select: { id: true },
          });
          if (!owner) {
            successorId = othersInTx[0]!.id;
            await tx.user.update({
              where: { id: successorId },
              data: { familyRole: "OWNER" },
            });
          } else {
            successorId = owner.id;
          }
        }

        await tx.task.updateMany({
          where: { assigneeId: me.id },
          data: { assigneeId: null },
        });
        await tx.task.updateMany({
          where: { creatorId: me.id },
          data: { creatorId: successorId },
        });
        await tx.event.updateMany({
          where: { assigneeId: me.id },
          data: { assigneeId: null },
        });
        await tx.mealPlan.updateMany({
          where: { cookId: me.id },
          data: { cookId: null },
        });
        await tx.note.updateMany({
          where: { authorId: me.id },
          data: { authorId: successorId },
        });
        await tx.expense.updateMany({
          where: { userId: me.id },
          data: { userId: successorId },
        });
        await tx.income.updateMany({
          where: { userId: me.id },
          data: { userId: successorId },
        });
        await tx.shoppingItem.updateMany({
          where: { addedById: me.id },
          data: { addedById: successorId },
        });

        await tx.user.update({
          where: { id: me.id },
          data: { familyId: null, familyRole: "MEMBER" },
        });
        await tx.user.delete({ where: { id: me.id } });
      });
    } catch {
      return NextResponse.json({ error: "DELETE_FAILED" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.task.updateMany({
        where: { assigneeId: me.id },
        data: { assigneeId: null },
      });
      await tx.task.deleteMany({ where: { creatorId: me.id } });
      await tx.event.updateMany({
        where: { assigneeId: me.id },
        data: { assigneeId: null },
      });
      await tx.mealPlan.updateMany({
        where: { cookId: me.id },
        data: { cookId: null },
      });
      await tx.note.deleteMany({ where: { authorId: me.id } });
      await tx.expense.deleteMany({ where: { userId: me.id } });
      await tx.income.deleteMany({ where: { userId: me.id } });
      await tx.shoppingItem.deleteMany({ where: { addedById: me.id } });
      await tx.user.delete({ where: { id: me.id } });
    });
  } catch {
    return NextResponse.json({ error: "DELETE_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
