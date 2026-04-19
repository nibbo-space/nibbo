import { syncFamilyMemberUnlocks } from "@/lib/achievements/evaluate";
import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { parseDisabledAppModules } from "@/lib/family-app-modules";
import { prisma } from "@/lib/prisma";
import { POINTS_PER_TASK_COMPLETION } from "@/lib/task-points";
import { userCreditedTaskWhere } from "@/lib/task-xp";
import { NextRequest, NextResponse } from "next/server";

async function getCurrentFamilyUser(userId: string, familyId: string) {
  return prisma.user.findFirst({
    where: { id: userId, familyId },
    select: { id: true, familyId: true, familyRole: true },
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const currentUser = await getCurrentFamilyUser(session.user.id, familyId);
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const family = await prisma.family.findUnique({
    where: { id: familyId },
    select: {
      id: true,
      name: true,
      shareInLeaderboard: true,
      shareWatchingFeed: true,
      disabledAppModules: true,
      modulesSetupCompletedAt: true,
    },
  });

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  });

  const [members, invitations, incomingInvitations] = await Promise.all([
    prisma.user.findMany({
      where: { familyId },
      select: { id: true, name: true, email: true, image: true, color: true, emoji: true, familyRole: true },
      orderBy: { name: "asc" },
    }),
    prisma.familyInvitation.findMany({
      where: { familyId, acceptedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, createdAt: true },
    }),
    me?.email
      ? prisma.familyInvitation.findMany({
          where: { email: me.email.toLowerCase(), acceptedAt: null, NOT: { familyId } },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            email: true,
            familyId: true,
            createdAt: true,
            family: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const memberIds = members.map((member) => member.id);
  const pointsPerMember = await Promise.all(
    memberIds.map(async (memberId) => {
      const completedTasks = await prisma.task.count({
        where: {
          ...userCreditedTaskWhere(memberId),
          completed: true,
          column: { board: { familyId } },
        },
      });
      return [memberId, completedTasks * POINTS_PER_TASK_COMPLETION] as const;
    })
  );
  const pointsByMemberId = Object.fromEntries(pointsPerMember);
  const membersWithPoints = members.map((member) => ({
    ...member,
    points: pointsByMemberId[member.id] ?? 0,
  }));

  return NextResponse.json({
    family,
    members: membersWithPoints,
    invitations,
    incomingInvitations,
    currentUserRole: currentUser.familyRole,
    currentUserId: currentUser.id,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const currentUser = await getCurrentFamilyUser(session.user.id, familyId);
  if (!currentUser || currentUser.familyRole !== "OWNER") {
    return NextResponse.json({ error: "Only owner can invite" }, { status: 403 });
  }
  const body = await req.json();
  const email = String(body.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const existingUser = await prisma.user.findFirst({
    where: { email },
    select: { id: true, familyId: true },
  });

  if (existingUser?.familyId && existingUser.familyId === familyId) {
    return NextResponse.json({ error: "User is already in your family" }, { status: 409 });
  }

  const invite = await prisma.familyInvitation.upsert({
    where: { familyId_email: { familyId, email } },
    update: { invitedById: session.user.id, acceptedAt: null },
    create: { familyId, invitedById: session.user.id, email },
    select: { id: true, email: true, createdAt: true },
  });

  return NextResponse.json(invite);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const currentUser = await getCurrentFamilyUser(session.user.id, familyId);
  if (body.memberId && String(body.memberId) === session.user.id) {
    if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (currentUser.familyRole === "OWNER") {
      const otherMembers = await prisma.user.findMany({
        where: { familyId, id: { not: session.user.id } },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });
      await prisma.$transaction(async (tx) => {
        if (otherMembers.length > 0) {
          await tx.user.update({
            where: { id: otherMembers[0].id },
            data: { familyRole: "OWNER" },
          });
        }
        await tx.user.update({
          where: { id: session.user.id },
          data: { familyId: null, familyRole: "MEMBER" },
        });
        if (otherMembers.length === 0) {
          await tx.family.delete({ where: { id: familyId } });
        }
      });
      return NextResponse.json({ success: true, ownerLeft: true, reassignedOwner: otherMembers[0]?.id ?? null });
    }
    await prisma.user.update({
      where: { id: session.user.id },
      data: { familyId: null, familyRole: "MEMBER" },
    });
    return NextResponse.json({ success: true, ownerLeft: false });
  }

  if (!currentUser || currentUser.familyRole !== "OWNER") {
    return NextResponse.json({ error: "Only owner can manage family" }, { status: 403 });
  }
  if (body.inviteId) {
    await prisma.familyInvitation.deleteMany({
      where: { id: String(body.inviteId), familyId, acceptedAt: null },
    });
    return NextResponse.json({ success: true });
  }

  if (!body.memberId) return NextResponse.json({ error: "memberId or inviteId required" }, { status: 400 });
  const memberId = String(body.memberId);
  if (memberId === session.user.id) {
    return NextResponse.json({ error: "Owner cannot remove self" }, { status: 400 });
  }

  const target = await prisma.user.findFirst({
    where: { id: memberId, familyId },
    select: { id: true, familyRole: true },
  });
  if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  await prisma.user.update({
    where: { id: target.id },
    data: { familyId: null, familyRole: "MEMBER" },
  });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  if (body.acceptInviteId) {
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, familyId: true, familyRole: true },
    });
    if (!me?.email) return NextResponse.json({ error: "User email required" }, { status: 400 });
    const invite = await prisma.familyInvitation.findFirst({
      where: { id: String(body.acceptInviteId), email: me.email.toLowerCase(), acceptedAt: null },
      select: { id: true, familyId: true },
    });
    if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });

    if (me.familyId === invite.familyId) {
      await prisma.familyInvitation.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
      const newAchievementIds = await syncFamilyMemberUnlocks(invite.familyId);
      return NextResponse.json({ success: true, switched: false, newAchievementIds });
    }

    const currentFamilyId = me.familyId;
    if (!currentFamilyId) {
      await prisma.user.update({
        where: { id: me.id },
        data: { familyId: invite.familyId, familyRole: "MEMBER" },
      });
      await prisma.familyInvitation.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
      const newAchievementIds = await syncFamilyMemberUnlocks(invite.familyId);
      return NextResponse.json({
        success: true,
        switched: true,
        previousFamilyDeleted: false,
        newAchievementIds,
      });
    }

    const [membersCount, isOwner] = await Promise.all([
      prisma.user.count({ where: { familyId: currentFamilyId } }),
      Promise.resolve(me.familyRole === "OWNER"),
    ]);
    if (isOwner && membersCount > 1) {
      return NextResponse.json(
        { error: "Ти власник сім'ї з іншими учасниками. Передай власність або видали учасників перед переходом." },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: me.id },
        data: { familyId: invite.familyId, familyRole: "MEMBER" },
      });
      await tx.familyInvitation.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
      const leftMembers = await tx.user.count({ where: { familyId: currentFamilyId } });
      if (leftMembers === 0) {
        await tx.family.delete({ where: { id: currentFamilyId } });
      }
    });

    const newAchievementIds = await syncFamilyMemberUnlocks(invite.familyId);
    return NextResponse.json({ success: true, switched: true, newAchievementIds });
  }

  const currentUser = await getCurrentFamilyUser(session.user.id, familyId);
  if (body.type === "settings") {
    if (!currentUser || currentUser.familyRole !== "OWNER") {
      return NextResponse.json({ error: "Only owner can update settings" }, { status: 403 });
    }
    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ error: "Family name required" }, { status: 400 });
    if (name.length > 64) return NextResponse.json({ error: "Family name is too long" }, { status: 400 });
    const shareInLeaderboard = Boolean(body.shareInLeaderboard);
    const shareWatchingFeed = Boolean(body.shareWatchingFeed);
    const family = await prisma.family.update({
      where: { id: familyId },
      data: { name, shareInLeaderboard, shareWatchingFeed },
      select: { id: true, name: true, shareInLeaderboard: true, shareWatchingFeed: true },
    });
    return NextResponse.json({ success: true, family });
  }

  if (body.type === "modules") {
    if (!currentUser || currentUser.familyRole !== "OWNER") {
      return NextResponse.json({ error: "Only owner can update modules" }, { status: 403 });
    }
    const raw = body.disabledAppModules;
    if (!Array.isArray(raw)) {
      return NextResponse.json({ error: "disabledAppModules must be an array" }, { status: 400 });
    }
    const disabledAppModules = parseDisabledAppModules(raw.map((x: unknown) => String(x)));
    const completeModulesSetup = Boolean(body.completeModulesSetup);
    const family = await prisma.family.update({
      where: { id: familyId },
      data: {
        disabledAppModules,
        ...(completeModulesSetup ? { modulesSetupCompletedAt: new Date() } : {}),
      },
      select: { id: true, disabledAppModules: true, modulesSetupCompletedAt: true },
    });
    return NextResponse.json({ success: true, family });
  }

  if (!currentUser || currentUser.familyRole !== "OWNER") {
    return NextResponse.json({ error: "Only owner can transfer ownership" }, { status: 403 });
  }
  const nextOwnerId = String(body.ownerId || "");
  if (!nextOwnerId) return NextResponse.json({ error: "ownerId required" }, { status: 400 });
  if (nextOwnerId === session.user.id) return NextResponse.json({ success: true });

  const nextOwner = await prisma.user.findFirst({
    where: { id: nextOwnerId, familyId },
    select: { id: true },
  });
  if (!nextOwner) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.user.updateMany({ where: { familyId, familyRole: "OWNER" }, data: { familyRole: "MEMBER" } }),
    prisma.user.update({ where: { id: nextOwner.id }, data: { familyRole: "OWNER" } }),
  ]);

  return NextResponse.json({ success: true });
}
