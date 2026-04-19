import { PrismaClient, FamilyRole, Priority } from "@prisma/client";

const prisma = new PrismaClient();

function mulberry32(seed: number) {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function intBetween(rng: () => number, lo: number, hi: number) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

const ADJECTIVES = [
  "Затишна",
  "Швидка",
  "Тиха",
  "Яскрава",
  "Тепла",
  "Смілива",
  "Лінива",
  "Ранкова",
  "Вечірня",
  "Пружна",
] as const;

const NOUNS = [
  "оселя",
  "кухня",
  "диван",
  "гніздо",
  "зграя",
  "команда",
  "хата",
  "крила",
  "хмара",
  "бульбашка",
] as const;

const EMOJIS = ["🌸", "🐱", "🦊", "🐻", "🌿", "⭐", "🍋", "🫐", "🏠", "☕"] as const;

const COLORS = [
  "#f43f5e",
  "#8b5cf6",
  "#0ea5e9",
  "#22c55e",
  "#f97316",
  "#ec4899",
  "#14b8a6",
  "#eab308",
] as const;

const SEED_NAME_PREFIX = "[seed]";

async function clearSeedFamilies() {
  const families = await prisma.family.findMany({
    where: { name: { startsWith: SEED_NAME_PREFIX } },
    select: { id: true },
  });
  const ids = families.map((f) => f.id);
  if (ids.length === 0) return;

  const userIds = (
    await prisma.user.findMany({
      where: { familyId: { in: ids } },
      select: { id: true },
    })
  ).map((u) => u.id);

  await prisma.$transaction(async (tx) => {
    await tx.task.deleteMany({
      where: {
        OR: [
          { column: { board: { familyId: { in: ids } } } },
          { creatorId: { in: userIds } },
          { assigneeId: { in: userIds } },
        ],
      },
    });
    await tx.mealPlan.updateMany({
      where: { cookId: { in: userIds } },
      data: { cookId: null },
    });
    await tx.expense.deleteMany({ where: { userId: { in: userIds } } });
    await tx.income.deleteMany({ where: { userId: { in: userIds } } });
    await tx.note.deleteMany({
      where: {
        OR: [{ familyId: { in: ids } }, { authorId: { in: userIds } }],
      },
    });
    await tx.event.deleteMany({
      where: {
        OR: [{ familyId: { in: ids } }, { assigneeId: { in: userIds } }],
      },
    });
    await tx.familyInvitation.deleteMany({
      where: {
        OR: [{ familyId: { in: ids } }, { invitedById: { in: userIds } }],
      },
    });
    await tx.taskColumn.deleteMany({
      where: { board: { familyId: { in: ids } } },
    });
    await tx.taskBoard.deleteMany({ where: { familyId: { in: ids } } });
    await tx.user.deleteMany({ where: { familyId: { in: ids } } });
    await tx.family.deleteMany({ where: { id: { in: ids } } });
  });
}

async function main() {
  const seedNum = Number.parseInt(process.env.SEED ?? "42", 10) || 42;
  const familyCount = Math.max(
    1,
    Math.min(200, Number.parseInt(process.env.SEED_FAMILIES ?? "8", 10) || 8)
  );
  const membersPerFamily = Math.max(
    1,
    Math.min(10, Number.parseInt(process.env.SEED_MEMBERS_PER_FAMILY ?? "2", 10) || 2)
  );
  const reset =
    process.env.SEED_RESET === "1" ||
    process.env.SEED_RESET === "true" ||
    process.env.SEED_RESET === "yes";

  const rng = mulberry32(seedNum);

  if (reset) {
    await clearSeedFamilies();
    console.info(`[seed] cleared families named ${SEED_NAME_PREFIX}* (SEED_RESET=1)`);
  }

  const emailDomain = "seed.nibbo.local";

  for (let i = 0; i < familyCount; i += 1) {
    const tag = String(i).padStart(4, "0");
    const shareInLeaderboard = rng() > 0.15;
    const shareWatchingFeed = rng() > 0.5;
    const familyName = `${SEED_NAME_PREFIX} ${pick(rng, ADJECTIVES)} ${pick(rng, NOUNS)} ${tag}`;

    const family = await prisma.family.create({
      data: {
        name: familyName,
        shareInLeaderboard,
        shareWatchingFeed,
      },
    });

    const users: { id: string }[] = [];
    for (let m = 0; m < membersPerFamily; m += 1) {
      const email =
        m === 0
          ? `seed-owner-${tag}@${emailDomain}`
          : `seed-member-${tag}-${m}@${emailDomain}`;
      const user = await prisma.user.create({
        data: {
          email,
          name: m === 0 ? `Власник ${tag}` : `Учасник ${tag}-${m}`,
          familyId: family.id,
          familyRole: m === 0 ? FamilyRole.OWNER : FamilyRole.MEMBER,
          emoji: pick(rng, EMOJIS),
          color: pick(rng, COLORS),
        },
      });
      users.push(user);
    }

    const owner = users[0]!;
    const board = await prisma.taskBoard.create({
      data: {
        name: "Дошка seed",
        familyId: family.id,
        emoji: "📋",
        color: pick(rng, COLORS),
        order: 0,
      },
    });

    const colDone = await prisma.taskColumn.create({
      data: {
        boardId: board.id,
        name: "Зроблено",
        emoji: "✅",
        order: 0,
      },
    });

    await prisma.taskColumn.create({
      data: {
        boardId: board.id,
        name: "У черзі",
        emoji: "📝",
        order: 1,
      },
    });

    const completedCount = intBetween(rng, 3, 45);
    for (let t = 0; t < completedCount; t += 1) {
      await prisma.task.create({
        data: {
          title: `Seed task ${tag}-${t}`,
          columnId: colDone.id,
          creatorId: owner.id,
          assigneeId: owner.id,
          completed: true,
          completedAt: new Date(),
          priority: pick(rng, [
            Priority.LOW,
            Priority.MEDIUM,
            Priority.HIGH,
            Priority.URGENT,
          ]),
          labels: [],
          order: t,
        },
      });
    }

    console.info(
      `[seed] ${family.name} · users=${membersPerFamily} · leaderboard=${shareInLeaderboard} · doneTasks=${completedCount}`
    );
  }

  console.info(
    `[seed] done · families=${familyCount} · SEED=${seedNum} · logins: Google OAuth only; these emails are for DB fixtures (@${emailDomain})`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
