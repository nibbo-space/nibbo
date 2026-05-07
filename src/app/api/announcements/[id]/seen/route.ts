import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const announcement = await prisma.announcement.findFirst({
    where: { id, published: true },
    select: { id: true },
  });
  if (!announcement) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.userAnnouncementView.upsert({
    where: {
      userId_announcementId: {
        userId: session.user.id,
        announcementId: id,
      },
    },
    create: {
      userId: session.user.id,
      announcementId: id,
      viewedAt: new Date(),
    },
    update: {},
  });

  return NextResponse.json({ ok: true });
}
