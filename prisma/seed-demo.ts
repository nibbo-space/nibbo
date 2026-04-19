import {
  PrismaClient,
  FamilyRole,
  Priority,
  MealType,
  WatchMediaType,
  WatchStatus,
  SubscriptionBillingCycle,
  SubscriptionStatus,
  SubscriptionMemberRole,
  MedicationScheduleMode,
} from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_PREFIX = "[demo]";
const EMAIL_DOMAIN = "demo.nibbo.local";
const REAL_OWNER_EMAIL = "bostonleek@gmail.com";

// Leaderboard is ranked by completed task count (each = 10 XP).
// Mitchell family gets the most to stay #1.
const LEADERBOARD_FAMILIES = [
  { name: "The Johnson Family",   emoji: "🐻", color: "#8b5cf6", members: 3, completedTasks: 124 },
  { name: "The Rodriguez Family", emoji: "🦋", color: "#ec4899", members: 4, completedTasks: 98  },
  { name: "The Kim Family",       emoji: "🌿", color: "#14b8a6", members: 2, completedTasks: 81  },
  { name: "The Thompson Family",  emoji: "⭐", color: "#eab308", members: 3, completedTasks: 67  },
  { name: "The Patel Family",     emoji: "🌸", color: "#f43f5e", members: 4, completedTasks: 49  },
  { name: "The Williams Family",  emoji: "🍋", color: "#22c55e", members: 2, completedTasks: 33  },
  { name: "The Chen Family",      emoji: "🫐", color: "#0ea5e9", members: 3, completedTasks: 18  },
];

const MEMBER_EMOJIS = ["🌸", "🐱", "🦊", "🐻", "🌿", "⭐", "🍋", "🫐", "🏠", "☕"] as const;
const MEMBER_COLORS = ["#f43f5e", "#8b5cf6", "#0ea5e9", "#22c55e", "#f97316", "#ec4899", "#14b8a6", "#eab308"] as const;

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateAt(days: number, hours: number, minutes = 0): Date {
  const d = daysFromNow(days);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

async function clearByPrefix(prefix: string) {
  const families = await prisma.family.findMany({
    where: { name: { startsWith: prefix } },
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
    await tx.medicationIntake.deleteMany({ where: { medication: { familyId: { in: ids } } } });
    await tx.medication.deleteMany({ where: { familyId: { in: ids } } });
    await tx.watchItem.deleteMany({ where: { familyId: { in: ids } } });
    await tx.shoppingItem.deleteMany({ where: { list: { familyId: { in: ids } } } });
    await tx.shoppingList.deleteMany({ where: { familyId: { in: ids } } });
    await tx.familySubscriptionMember.deleteMany({ where: { subscription: { familyId: { in: ids } } } });
    await tx.event.deleteMany({ where: { familyId: { in: ids } } });
    await tx.familySubscription.deleteMany({ where: { familyId: { in: ids } } });
    await tx.credit.deleteMany({ where: { familyId: { in: ids } } });
    await tx.expense.deleteMany({ where: { familyId: { in: ids } } });
    await tx.income.deleteMany({ where: { familyId: { in: ids } } });
    await tx.expenseCategory.deleteMany({ where: { familyId: { in: ids } } });
    await tx.mealPlan.deleteMany({ where: { familyId: { in: ids } } });
    await tx.ingredient.deleteMany({ where: { recipe: { familyId: { in: ids } } } });
    await tx.recipe.deleteMany({ where: { familyId: { in: ids } } });
    await tx.note.deleteMany({ where: { familyId: { in: ids } } });
    await tx.noteCategory.deleteMany({ where: { familyId: { in: ids } } });
    await tx.task.deleteMany({ where: { column: { board: { familyId: { in: ids } } } } });
    await tx.taskColumn.deleteMany({ where: { board: { familyId: { in: ids } } } });
    await tx.taskBoard.deleteMany({ where: { familyId: { in: ids } } });
    await tx.familyAchievementUnlock.deleteMany({ where: { familyId: { in: ids } } });
    await tx.userAchievementUnlock.deleteMany({ where: { userId: { in: userIds } } });
    await tx.userAchievementCounter.deleteMany({ where: { userId: { in: userIds } } });
    await tx.familyInvitation.deleteMany({ where: { familyId: { in: ids } } });
    // Real owner may belong to a demo family — detach instead of delete
    await tx.user.updateMany({ where: { email: REAL_OWNER_EMAIL, familyId: { in: ids } }, data: { familyId: null } });
    await tx.user.deleteMany({ where: { familyId: { in: ids }, NOT: { email: REAL_OWNER_EMAIL } } });
    await tx.family.deleteMany({ where: { id: { in: ids } } });
  });

  console.info(`[demo-seed] Cleared families with prefix "${prefix}" (${ids.length})`);
}

async function seedCompetingFamily(
  name: string,
  emoji: string,
  color: string,
  memberCount: number,
  completedTaskCount: number,
  index: number,
) {
  const family = await prisma.family.create({
    data: { name: `${DEMO_PREFIX} ${name}`, shareInLeaderboard: true, shareWatchingFeed: true },
  });

  const owner = await prisma.user.create({
    data: {
      email: `demo-f${index}-owner@${EMAIL_DOMAIN}`,
      name: `${name.replace("The ", "").replace(" Family", "")} Owner`,
      familyId: family.id,
      familyRole: FamilyRole.OWNER,
      emoji,
      color,
      onboardingCompletedAt: new Date(),
    },
  });

  for (let m = 1; m < memberCount; m++) {
    await prisma.user.create({
      data: {
        email: `demo-f${index}-member${m}@${EMAIL_DOMAIN}`,
        name: `${name.replace("The ", "").replace(" Family", "")} Member ${m}`,
        familyId: family.id,
        familyRole: FamilyRole.MEMBER,
        emoji: MEMBER_EMOJIS[m % MEMBER_EMOJIS.length]!,
        color: MEMBER_COLORS[m % MEMBER_COLORS.length]!,
        onboardingCompletedAt: new Date(),
      },
    });
  }

  const board = await prisma.taskBoard.create({
    data: { name: "Family Board", emoji: "📋", color, order: 0, familyId: family.id },
  });
  const doneCol = await prisma.taskColumn.create({
    data: { boardId: board.id, name: "Done", emoji: "✅", color: "#bbf7d0", order: 0 },
  });

  const taskTitles = [
    "Grocery run", "Pay bills", "Clean kitchen", "Laundry", "Call parents",
    "Fix garage door", "Book doctor", "Plan dinner", "Walk the dog", "Water plants",
    "Vacuum living room", "Buy birthday gift", "Take recycling out", "Check car tire pressure",
    "Schedule haircut", "Order prescriptions", "Set up family calendar", "Pay internet bill",
    "Buy school supplies", "Clean bathroom", "Sort mail", "Defrost freezer",
    "Book restaurant", "Buy flowers", "Change air filter",
  ];

  for (let t = 0; t < completedTaskCount; t++) {
    await prisma.task.create({
      data: {
        title: taskTitles[t % taskTitles.length]!,
        priority: [Priority.LOW, Priority.MEDIUM, Priority.HIGH][t % 3]!,
        columnId: doneCol.id,
        creatorId: owner.id,
        assigneeId: owner.id,
        completed: true,
        completedAt: daysFromNow(-(t % 60 + 1)),
        order: t,
        labels: [],
      },
    });
  }

  // Battle bonus XP — makes them look active but still below Mitchell
  await prisma.userAchievementCounter.create({
    data: { userId: owner.id, key: "family_battle_bonus_xp", value: Math.floor(completedTaskCount * 0.3) },
  });

  console.info(`[demo-seed] ${name}: ${completedTaskCount} tasks → ${completedTaskCount * 10} XP`);
}

async function main() {
  // ── CLEANUP ─────────────────────────────────────────────────────────────
  await clearByPrefix(DEMO_PREFIX);
  await clearByPrefix("[seed]");

  // ── MITCHELL FAMILY (#1 on leaderboard) ─────────────────────────────────
  const family = await prisma.family.create({
    data: {
      name: `${DEMO_PREFIX} The Mitchell Family`,
      shareInLeaderboard: true,
      shareWatchingFeed: true,
    },
  });

  // Upsert real owner so Google OAuth login still works
  const james = await prisma.user.upsert({
    where: { email: REAL_OWNER_EMAIL },
    update: {
      name: "James Mitchell",
      familyId: family.id,
      familyRole: FamilyRole.OWNER,
      emoji: "🦊",
      color: "#f97316",
      displayCurrency: "USD",
      timeZone: "America/New_York",
      onboardingCompletedAt: new Date(),
    },
    create: {
      email: REAL_OWNER_EMAIL,
      name: "James Mitchell",
      familyId: family.id,
      familyRole: FamilyRole.OWNER,
      emoji: "🦊",
      color: "#f97316",
      displayCurrency: "USD",
      timeZone: "America/New_York",
      onboardingCompletedAt: new Date(),
    },
  });

  const sarah = await prisma.user.create({
    data: {
      email: `demo-sarah@${EMAIL_DOMAIN}`,
      name: "Sarah Mitchell",
      familyId: family.id,
      familyRole: FamilyRole.MEMBER,
      emoji: "🌸",
      color: "#ec4899",
      displayCurrency: "USD",
      timeZone: "America/New_York",
      onboardingCompletedAt: new Date(),
    },
  });

  const ethan = await prisma.user.create({
    data: {
      email: `demo-ethan@${EMAIL_DOMAIN}`,
      name: "Ethan Mitchell",
      familyId: family.id,
      familyRole: FamilyRole.MEMBER,
      emoji: "⭐",
      color: "#0ea5e9",
      displayCurrency: "USD",
      timeZone: "America/New_York",
      onboardingCompletedAt: new Date(),
    },
  });

  const lily = await prisma.user.create({
    data: {
      email: `demo-lily@${EMAIL_DOMAIN}`,
      name: "Lily Mitchell",
      familyId: family.id,
      familyRole: FamilyRole.MEMBER,
      emoji: "🐱",
      color: "#22c55e",
      displayCurrency: "USD",
      timeZone: "America/New_York",
      onboardingCompletedAt: new Date(),
    },
  });

  const members = [james, sarah, ethan, lily];

  // ── TASK BOARDS ─────────────────────────────────────────────────────────
  const familyBoard = await prisma.taskBoard.create({
    data: { name: "Family Board", emoji: "🏠", color: "#f97316", order: 0, familyId: family.id },
  });

  const colBacklog = await prisma.taskColumn.create({
    data: { boardId: familyBoard.id, name: "Backlog", emoji: "📋", color: "#e7e5e4", order: 0 },
  });
  const colInProgress = await prisma.taskColumn.create({
    data: { boardId: familyBoard.id, name: "In Progress", emoji: "⚡", color: "#fef08a", order: 1 },
  });
  const colDone = await prisma.taskColumn.create({
    data: { boardId: familyBoard.id, name: "Done", emoji: "✅", color: "#bbf7d0", order: 2 },
  });

  // Backlog
  const backlogTasks = [
    { title: "Fix the leaky bathroom faucet", priority: Priority.HIGH, assigneeId: james.id },
    { title: "Order new curtains for living room", priority: Priority.LOW, assigneeId: sarah.id },
    { title: "Schedule car oil change", priority: Priority.MEDIUM, assigneeId: james.id },
    { title: "Book summer vacation hotel", priority: Priority.MEDIUM, assigneeId: sarah.id },
    { title: "Clean out the garage", priority: Priority.LOW, assigneeId: james.id },
    { title: "Renew home insurance", priority: Priority.HIGH, assigneeId: james.id },
  ];
  for (let i = 0; i < backlogTasks.length; i++) {
    const t = backlogTasks[i]!;
    await prisma.task.create({
      data: { title: t.title, priority: t.priority, columnId: colBacklog.id, creatorId: james.id, assigneeId: t.assigneeId, order: i, labels: [] },
    });
  }

  // In Progress
  const inProgressTasks = [
    { title: "Plan Ethan's birthday party", priority: Priority.HIGH, assigneeId: sarah.id, dueDate: daysFromNow(14) },
    { title: "Paint the front door", priority: Priority.MEDIUM, assigneeId: james.id, dueDate: undefined },
    { title: "Sort winter clothes to donate", priority: Priority.LOW, assigneeId: sarah.id, dueDate: undefined },
  ];
  for (let i = 0; i < inProgressTasks.length; i++) {
    const t = inProgressTasks[i]!;
    await prisma.task.create({
      data: { title: t.title, priority: t.priority, columnId: colInProgress.id, creatorId: sarah.id, assigneeId: t.assigneeId, dueDate: t.dueDate ?? null, order: i, labels: [] },
    });
  }

  // Done — 185 completed tasks → #1 on leaderboard (next closest is 124)
  const doneTaskTitles = [
    "Replace kitchen light bulbs", "Deep clean the oven", "Set up Lily's new tablet",
    "Pay property tax", "Buy Ethan's new school backpack", "Fix squeaky bedroom door",
    "Update family emergency contacts", "Service the lawnmower", "Book dentist for Lily",
    "Organize pantry shelves", "Install doorbell camera", "Sign Ethan up for soccer camp",
    "Grocery run", "Pay electricity bill", "Call the plumber",
    "Clean the bathrooms", "Take car for inspection", "Buy birthday cake",
    "Schedule annual checkup", "Clean the gutters", "Walk the dog",
    "Plant new flowers in garden", "Defrost the freezer", "Sort recycling",
    "Write thank-you cards", "Pick up dry cleaning", "Return library books",
    "Fix garden hose", "Vacuum all rooms", "Mop the kitchen floor",
    "Clean out fridge", "Buy new bath towels", "Replace shower head",
    "Pay internet bill", "Schedule school conference", "Oil squeaky gate",
    "Clean windows inside", "Rearrange Lily's bookshelf", "Frame family photos",
    "Buy new welcome mat", "Test smoke alarms", "Set up sprinkler timer",
    "Book summer camp for kids", "Buy new coffee maker", "Donate old toys",
    "Patch hole in fence", "Buy allergy medicine", "Schedule pest control",
    "Clean air vents", "Reseal bathroom tiles", "Buy new dish rack",
    "Fix broken porch step", "Donate winter coats", "Repair garden gate latch",
    "Organize kids' artwork", "Set up homework station", "Buy school uniforms",
    "Pick up prescriptions", "Plan menu for the week", "Grocery top-up run",
    "Wash the car", "Clean patio furniture", "Buy new garden hose nozzle",
    "Fix leaking garden tap", "Trim the hedges", "Rake the lawn",
    "Paint garden fence", "Buy potting soil", "Plant tomatoes",
    "Fix wobbly chair leg", "Replace mailbox numbers", "Organize utility closet",
    "Buy new bed linen", "Clean under the beds", "Fix curtain rail",
    "Organize home office", "Shred old documents", "Buy printer paper",
    "Set up new printer", "Fix broken drawer", "Buy new lamp for hallway",
    "Clean oven hood filter", "Descale coffee machine", "Buy new chopping board",
    "Sharpen kitchen knives", "Buy olive oil in bulk", "Order vitamins online",
    "Renew gym membership", "Buy new running shoes", "Sign Sarah up for yoga",
    "Book family photos session", "Order photo prints", "Buy new photo frame",
    "Assemble new bookshelf", "Buy new storage boxes", "Label all storage boxes",
    "Organize kids' room closet", "Donate outgrown clothes", "Buy new school shoes",
    "Schedule flu shots", "Pick up flu shot records", "Order contact lenses",
    "Buy new glasses case", "Schedule eye exam", "Fix broken blinds",
    "Buy new shower curtain", "Replace toilet seat", "Buy new bathroom scale",
    "Order a new mattress topper", "Buy blackout curtains for Lily",
    "Fix broken kitchen drawer", "Buy new mixing bowls", "Order pizza stone",
    "Buy new oven mitts", "Replace worn dish towels", "Buy new colander",
    "Order new cutting board set", "Buy new salad spinner", "Clean coffee maker",
    "Order new duvet covers", "Buy new pillow protectors",
    "Schedule boiler service", "Replace worn door mat", "Buy new coat hooks",
    "Fix front gate hinge", "Oil garden tools", "Buy new trowel",
    "Order new flower seeds", "Buy bird feeder", "Set up bird feeder",
    "Fix gate latch", "Buy new padlock for shed", "Organize shed shelves",
    "Buy new wheelbarrow tire", "Fix broken wheelbarrow", "Sharpen lawn mower blade",
    "Buy engine oil for mower", "Clean mower deck", "Winterize the garden",
    "Buy new garden kneeler", "Order new hose reel", "Set up compost bin",
    "Buy compost activator", "Turn compost pile", "Collect yard waste",
    "Book tree trimmer", "Buy new rose fertilizer", "Stake tall tomato plants",
    "Buy new plant labels", "Repot indoor plants", "Buy new potting mix",
    "Order grow lights", "Set up indoor herb garden", "Buy fresh herbs",
    "Order new recipe book", "Try new family recipe", "Meal prep Sunday",
    "Make Ethan's packed lunch", "Bake cookies with Lily", "Make homemade pizza",
    "Try taco night recipe", "Make pancakes Saturday", "Cook big batch of soup",
    "Organize fridge shelves", "Clean out freezer", "Stock up on frozen vegetables",
    "Buy new ice cube trays", "Order new water filter", "Replace water filter cartridge",
    "Buy new reusable bags", "Return bottle deposits", "Buy new lunch boxes",
    "Label kids' lunch boxes", "Buy new water bottles", "Order family board game",
    "Family movie night setup", "Set up outdoor movie night", "Buy popcorn supplies",
    "Order new streaming subscription", "Cancel unused subscription",
  ];

  let doneIdx = 0;
  for (const title of doneTaskTitles) {
    await prisma.task.create({
      data: {
        title,
        priority: [Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.URGENT][doneIdx % 4]!,
        columnId: colDone.id,
        creatorId: [james.id, sarah.id, ethan.id][doneIdx % 3]!,
        assigneeId: members[doneIdx % 4]!.id,
        completed: true,
        completedAt: daysFromNow(-(doneIdx % 90 + 1)),
        order: doneIdx,
        labels: [],
      },
    });
    doneIdx++;
  }

  // School board
  const schoolBoard = await prisma.taskBoard.create({
    data: { name: "School & Activities", emoji: "📚", color: "#0ea5e9", order: 1, familyId: family.id },
  });
  const schoolTodo = await prisma.taskColumn.create({
    data: { boardId: schoolBoard.id, name: "To Do", emoji: "📝", color: "#e7e5e4", order: 0 },
  });
  const schoolDone = await prisma.taskColumn.create({
    data: { boardId: schoolBoard.id, name: "Done", emoji: "✅", color: "#bbf7d0", order: 1 },
  });

  const schoolTasks = [
    { title: "Ethan: Math project due Friday", priority: Priority.HIGH, assigneeId: ethan.id, col: schoolTodo.id, done: false },
    { title: "Lily: Science fair registration", priority: Priority.MEDIUM, assigneeId: lily.id, col: schoolTodo.id, done: false },
    { title: "Ethan: Soccer practice gear packed", priority: Priority.MEDIUM, assigneeId: ethan.id, col: schoolTodo.id, done: false },
    { title: "Lily: Art class supplies bought", priority: Priority.LOW, assigneeId: lily.id, col: schoolDone.id, done: true },
    { title: "Ethan: History essay submitted", priority: Priority.HIGH, assigneeId: ethan.id, col: schoolDone.id, done: true },
    { title: "Lily: Library books returned", priority: Priority.LOW, assigneeId: lily.id, col: schoolDone.id, done: true },
  ];
  for (let i = 0; i < schoolTasks.length; i++) {
    const t = schoolTasks[i]!;
    await prisma.task.create({
      data: {
        title: t.title, priority: t.priority, columnId: t.col, creatorId: sarah.id,
        assigneeId: t.assigneeId, completed: t.done, completedAt: t.done ? daysFromNow(-3) : null,
        order: i, labels: [],
      },
    });
  }

  const mitchellDone = doneTaskTitles.length + schoolTasks.filter((t) => t.done).length;

  // Battle bonus XP — extra edge for Mitchell
  await prisma.userAchievementCounter.create({
    data: { userId: james.id, key: "family_battle_bonus_xp", value: 250 },
  });

  // ── CALENDAR EVENTS ──────────────────────────────────────────────────────
  const events = [
    { title: "Lily's Dentist Appointment", emoji: "🦷", color: "#0ea5e9", startDate: dateAt(3, 10), endDate: dateAt(3, 11), location: "Bright Smile Dental", assigneeId: lily.id, weeklyRepeat: false },
    { title: "Family Dinner — Friday Night", emoji: "🍽️", color: "#f97316", startDate: dateAt(4, 19), endDate: dateAt(4, 21), assigneeId: null, weeklyRepeat: false },
    { title: "James: Car Service", emoji: "🚗", color: "#8b5cf6", startDate: dateAt(6, 9), endDate: dateAt(6, 11), location: "QuickLube Auto", assigneeId: james.id, weeklyRepeat: false },
    { title: "Ethan: Soccer Practice", emoji: "⚽", color: "#22c55e", startDate: dateAt(2, 16), endDate: dateAt(2, 18), weeklyRepeat: true, weeklyDay: 3, location: "Riverside Park Field B", assigneeId: ethan.id },
    { title: "Sarah: Yoga Class", emoji: "🧘", color: "#ec4899", startDate: dateAt(1, 7), endDate: dateAt(1, 8), weeklyRepeat: true, weeklyDay: 1, location: "Harmony Yoga Studio", assigneeId: sarah.id },
    { title: "Birthday Party Planning", emoji: "🎂", color: "#eab308", startDate: dateAt(7, 15), endDate: dateAt(7, 16), assigneeId: sarah.id, weeklyRepeat: false },
    { title: "Lily: Piano Lesson", emoji: "🎹", color: "#14b8a6", startDate: dateAt(5, 16), endDate: dateAt(5, 17), weeklyRepeat: true, weeklyDay: 5, location: "Music Academy", assigneeId: lily.id },
  ];
  for (const ev of events) {
    await prisma.event.create({
      data: {
        title: ev.title, emoji: ev.emoji, color: ev.color,
        startDate: ev.startDate, endDate: ev.endDate,
        weeklyRepeat: ev.weeklyRepeat ?? false, weeklyDay: (ev as { weeklyDay?: number }).weeklyDay ?? null,
        location: (ev as { location?: string }).location ?? null,
        assigneeId: ev.assigneeId ?? null, familyId: family.id,
      },
    });
  }

  // ── RECIPES ──────────────────────────────────────────────────────────────
  const spaghetti = await prisma.recipe.create({
    data: {
      name: "Spaghetti Bolognese", description: "Classic Italian meat sauce pasta — a family favorite!",
      emoji: "🍝", prepTime: 15, cookTime: 45, servings: 4, category: "Dinner", calories: 520,
      familyId: family.id,
      ingredients: { create: [
        { name: "Spaghetti", amount: "400", unit: "g" }, { name: "Ground beef", amount: "500", unit: "g" },
        { name: "Tomato sauce", amount: "400", unit: "ml" }, { name: "Onion", amount: "1", unit: "large" },
        { name: "Garlic cloves", amount: "3" }, { name: "Olive oil", amount: "2", unit: "tbsp" },
        { name: "Parmesan", amount: "50", unit: "g" },
      ]},
    },
  });

  const chickenStirFry = await prisma.recipe.create({
    data: {
      name: "Chicken Stir-Fry", description: "Quick and healthy weeknight dinner",
      emoji: "🥢", prepTime: 10, cookTime: 15, servings: 4, category: "Dinner", calories: 380,
      familyId: family.id,
      ingredients: { create: [
        { name: "Chicken breast", amount: "600", unit: "g" }, { name: "Mixed vegetables", amount: "300", unit: "g" },
        { name: "Soy sauce", amount: "3", unit: "tbsp" }, { name: "Ginger", amount: "1", unit: "tsp" },
        { name: "Sesame oil", amount: "1", unit: "tbsp" }, { name: "Rice", amount: "2", unit: "cups" },
      ]},
    },
  });

  const pancakes = await prisma.recipe.create({
    data: {
      name: "Blueberry Pancakes", description: "Fluffy weekend breakfast the whole family loves",
      emoji: "🥞", prepTime: 5, cookTime: 20, servings: 4, category: "Breakfast", calories: 290,
      familyId: family.id,
      ingredients: { create: [
        { name: "Flour", amount: "2", unit: "cups" }, { name: "Eggs", amount: "2" },
        { name: "Milk", amount: "1.5", unit: "cups" }, { name: "Blueberries", amount: "1", unit: "cup" },
        { name: "Baking powder", amount: "2", unit: "tsp" }, { name: "Butter", amount: "2", unit: "tbsp" },
        { name: "Maple syrup", amount: "4", unit: "tbsp" },
      ]},
    },
  });

  const tacos = await prisma.recipe.create({
    data: {
      name: "Beef Tacos", description: "Friday night taco tradition!",
      emoji: "🌮", prepTime: 10, cookTime: 20, servings: 4, category: "Dinner", calories: 450,
      familyId: family.id,
      ingredients: { create: [
        { name: "Ground beef", amount: "500", unit: "g" }, { name: "Taco shells", amount: "12" },
        { name: "Cheddar cheese", amount: "150", unit: "g" }, { name: "Lettuce", amount: "1", unit: "head" },
        { name: "Tomatoes", amount: "2" }, { name: "Sour cream", amount: "100", unit: "ml" },
        { name: "Taco seasoning", amount: "1", unit: "pack" },
      ]},
    },
  });

  const greekSalad = await prisma.recipe.create({
    data: {
      name: "Greek Salad", description: "Fresh and light Mediterranean salad",
      emoji: "🥗", prepTime: 10, cookTime: 0, servings: 4, category: "Lunch", calories: 220,
      familyId: family.id,
      ingredients: { create: [
        { name: "Cucumber", amount: "1", unit: "large" }, { name: "Tomatoes", amount: "3" },
        { name: "Feta cheese", amount: "200", unit: "g" }, { name: "Olives", amount: "80", unit: "g" },
        { name: "Red onion", amount: "0.5" }, { name: "Olive oil", amount: "3", unit: "tbsp" },
        { name: "Oregano", amount: "1", unit: "tsp" },
      ]},
    },
  });

  // ── MEAL PLANS ───────────────────────────────────────────────────────────
  const mealPlans = [
    { days: 0, mealType: MealType.BREAKFAST, recipe: pancakes, cookId: sarah.id },
    { days: 0, mealType: MealType.DINNER, recipe: spaghetti, cookId: james.id },
    { days: 1, mealType: MealType.LUNCH, recipe: greekSalad, cookId: sarah.id },
    { days: 1, mealType: MealType.DINNER, recipe: chickenStirFry, cookId: james.id },
    { days: 2, mealType: MealType.DINNER, recipe: tacos, cookId: james.id },
    { days: 3, mealType: MealType.BREAKFAST, recipe: pancakes, cookId: sarah.id },
    { days: 3, mealType: MealType.DINNER, recipe: spaghetti, cookId: sarah.id },
    { days: 4, mealType: MealType.LUNCH, recipe: greekSalad, cookId: sarah.id },
    { days: 5, mealType: MealType.DINNER, recipe: tacos, cookId: james.id },
    { days: 6, mealType: MealType.BREAKFAST, recipe: pancakes, cookId: james.id },
    { days: 6, mealType: MealType.DINNER, recipe: chickenStirFry, cookId: sarah.id },
  ];
  for (const mp of mealPlans) {
    await prisma.mealPlan.create({
      data: { date: daysFromNow(mp.days), mealType: mp.mealType, recipeId: mp.recipe.id, cookId: mp.cookId, familyId: family.id },
    });
  }

  // ── NOTES ────────────────────────────────────────────────────────────────
  await prisma.note.create({
    data: {
      title: "House Rules", emoji: "📌", color: "#fef9c3", pinned: true,
      authorId: james.id, familyId: family.id, tags: ["rules", "family"],
      content: "1. Everyone cleans up after themselves in the kitchen.\n2. No screens at dinner time.\n3. Homework done before video games.\n4. Lights out by 9pm for kids on school nights.\n5. Weekly family meeting every Sunday at 6pm.",
    },
  });
  await prisma.note.create({
    data: {
      title: "Emergency Contacts", emoji: "🆘", color: "#fee2e2", pinned: true,
      authorId: sarah.id, familyId: family.id, tags: ["emergency", "contacts"],
      content: "Dr. Chen (family doctor): (555) 234-5678\nDr. Patel (dentist): (555) 345-6789\nPoison Control: 1-800-222-1222\nNeighbor Jane (spare key): (555) 456-7890\nPlumber Mike: (555) 567-8901",
    },
  });
  await prisma.note.create({
    data: {
      title: "Summer Vacation 2026 — Ideas", emoji: "🏖️", color: "#dbeafe", pinned: false,
      authorId: sarah.id, familyId: family.id, tags: ["vacation", "planning"],
      content: "## Top picks\n- **Beach house** — Cape Cod, 2 weeks in July\n- **National Park** — Yellowstone\n- **City break** — Washington DC\n\n## Budget: $3,000–$4,500\n\n## Kids' votes\n- Ethan: Beach (surfing!)\n- Lily: Yellowstone (she wants to see bison)",
    },
  });
  await prisma.note.create({
    data: {
      title: "Ethan's Weekly Schedule", emoji: "📅", color: "#f0fdf4", pinned: false,
      authorId: sarah.id, familyId: family.id, tags: ["schedule", "ethan"],
      content: "**Mon** — School, Homework 4–5pm\n**Tue** — School, Chess Club 3:30pm\n**Wed** — School, Soccer 4–6pm\n**Thu** — School, Homework\n**Fri** — School, free time\n**Sat** — Soccer game\n**Sun** — Family day",
    },
  });

  // ── BUDGET ───────────────────────────────────────────────────────────────
  const catGroceries  = await prisma.expenseCategory.create({ data: { name: "Groceries",    emoji: "🛒", color: "#22c55e", budget: 800, sortOrder: 0, familyId: family.id } });
  const catUtilities  = await prisma.expenseCategory.create({ data: { name: "Utilities",    emoji: "💡", color: "#f97316", budget: 300, sortOrder: 1, familyId: family.id } });
  const catEntertain  = await prisma.expenseCategory.create({ data: { name: "Entertainment",emoji: "🎬", color: "#8b5cf6", budget: 200, sortOrder: 2, familyId: family.id } });
  const catTransport  = await prisma.expenseCategory.create({ data: { name: "Transport",    emoji: "🚗", color: "#0ea5e9", budget: 400, sortOrder: 3, familyId: family.id } });
  const catHealth     = await prisma.expenseCategory.create({ data: { name: "Health",       emoji: "💊", color: "#ec4899", budget: 250, sortOrder: 4, familyId: family.id } });
  const catDining     = await prisma.expenseCategory.create({ data: { name: "Dining Out",   emoji: "🍕", color: "#eab308", budget: 300, sortOrder: 5, familyId: family.id } });

  const expenseData = [
    { title: "Whole Foods weekly shop", amount: 187.5, cat: catGroceries, user: sarah, daysAgo: 1 },
    { title: "Gas station fill-up", amount: 68.0, cat: catTransport, user: james, daysAgo: 2 },
    { title: "Electric bill", amount: 124.0, cat: catUtilities, user: james, daysAgo: 3 },
    { title: "Pizza night delivery", amount: 45.8, cat: catDining, user: james, daysAgo: 4 },
    { title: "Trader Joe's grocery run", amount: 96.2, cat: catGroceries, user: sarah, daysAgo: 5 },
    { title: "Movie tickets (family of 4)", amount: 56.0, cat: catEntertain, user: james, daysAgo: 7 },
    { title: "Pharmacy — vitamins", amount: 38.5, cat: catHealth, user: sarah, daysAgo: 8 },
    { title: "Water bill", amount: 67.0, cat: catUtilities, user: james, daysAgo: 9 },
    { title: "Costco bulk shopping", amount: 243.0, cat: catGroceries, user: sarah, daysAgo: 11 },
    { title: "Dinner at The Olive Garden", amount: 89.6, cat: catDining, user: james, daysAgo: 12 },
    { title: "Ethan's soccer cleats", amount: 79.99, cat: catEntertain, user: sarah, daysAgo: 13 },
    { title: "Internet bill", amount: 79.99, cat: catUtilities, user: james, daysAgo: 14 },
    { title: "Lily's piano lesson", amount: 60.0, cat: catEntertain, user: sarah, daysAgo: 16 },
    { title: "Grocery run — Target", amount: 134.8, cat: catGroceries, user: sarah, daysAgo: 18 },
    { title: "Co-pay — doctor visit", amount: 30.0, cat: catHealth, user: james, daysAgo: 20 },
    { title: "Sushi night", amount: 76.4, cat: catDining, user: james, daysAgo: 21 },
    { title: "Phone bill", amount: 95.0, cat: catUtilities, user: james, daysAgo: 22 },
    { title: "Weekend groceries", amount: 112.3, cat: catGroceries, user: sarah, daysAgo: 23 },
    { title: "Museum tickets", amount: 48.0, cat: catEntertain, user: sarah, daysAgo: 24 },
    { title: "Dentist co-pay", amount: 45.0, cat: catHealth, user: sarah, daysAgo: 26 },
    { title: "Brunch at The Corner Cafe", amount: 52.2, cat: catDining, user: sarah, daysAgo: 28 },
    { title: "Weekly groceries", amount: 165.4, cat: catGroceries, user: sarah, daysAgo: 29 },
  ];
  for (const e of expenseData) {
    await prisma.expense.create({
      data: { title: e.title, amount: e.amount, categoryId: e.cat.id, userId: e.user.id, familyId: family.id, date: daysFromNow(-e.daysAgo) },
    });
  }

  await prisma.income.createMany({
    data: [
      { title: "James — Monthly Salary", amount: 5800, userId: james.id, familyId: family.id, date: daysFromNow(-1) },
      { title: "Sarah — Freelance Design Project", amount: 1200, userId: sarah.id, familyId: family.id, date: daysFromNow(-5) },
      { title: "Tax Refund", amount: 840, userId: james.id, familyId: family.id, date: daysFromNow(-15) },
      { title: "James — Monthly Salary", amount: 5800, userId: james.id, familyId: family.id, date: daysFromNow(-31) },
    ],
  });

  // ── SUBSCRIPTIONS ─────────────────────────────────────────────────────────
  const netflix = await prisma.familySubscription.create({
    data: { title: "Netflix", category: "Streaming", billingCycle: SubscriptionBillingCycle.MONTHLY, amount: 15.99, currency: "USD", nextBillingDate: daysFromNow(12), status: SubscriptionStatus.ACTIVE, familyId: family.id, ownerUserId: james.id },
  });
  await prisma.familySubscriptionMember.createMany({ data: members.map((m) => ({ subscriptionId: netflix.id, userId: m.id, role: m.id === james.id ? SubscriptionMemberRole.PAYER : SubscriptionMemberRole.USER })) });

  const spotify = await prisma.familySubscription.create({
    data: { title: "Spotify Family", category: "Music", billingCycle: SubscriptionBillingCycle.MONTHLY, amount: 16.99, currency: "USD", nextBillingDate: daysFromNow(7), status: SubscriptionStatus.ACTIVE, familyId: family.id, ownerUserId: james.id },
  });
  await prisma.familySubscriptionMember.createMany({ data: members.map((m) => ({ subscriptionId: spotify.id, userId: m.id, role: m.id === james.id ? SubscriptionMemberRole.PAYER : SubscriptionMemberRole.USER })) });

  const disney = await prisma.familySubscription.create({
    data: { title: "Disney+", category: "Streaming", billingCycle: SubscriptionBillingCycle.MONTHLY, amount: 13.99, currency: "USD", nextBillingDate: daysFromNow(18), status: SubscriptionStatus.ACTIVE, familyId: family.id, ownerUserId: james.id },
  });
  await prisma.familySubscriptionMember.createMany({ data: [james, sarah, lily].map((m) => ({ subscriptionId: disney.id, userId: m.id, role: m.id === james.id ? SubscriptionMemberRole.PAYER : SubscriptionMemberRole.USER })) });

  // ── SHOPPING ─────────────────────────────────────────────────────────────
  const groceryList = await prisma.shoppingList.create({
    data: { name: "Weekly Groceries", emoji: "🛒", sortOrder: 0, familyId: family.id },
  });
  const groceryItems = [
    { name: "Whole milk", quantity: "1", unit: "gallon", category: "Dairy", checked: false },
    { name: "Eggs", quantity: "12", unit: "pack", category: "Dairy", checked: true },
    { name: "Sourdough bread", quantity: "1", unit: "loaf", category: "Bakery", checked: false },
    { name: "Chicken breast", quantity: "2", unit: "lbs", category: "Meat", checked: false },
    { name: "Blueberries", quantity: "1", unit: "pint", category: "Fruit", checked: false },
    { name: "Greek yogurt", quantity: "4", unit: "cups", category: "Dairy", checked: false },
    { name: "Pasta", quantity: "2", unit: "boxes", category: "Pantry", checked: false },
    { name: "Tomato sauce", quantity: "2", unit: "jars", category: "Pantry", checked: true },
    { name: "Olive oil", quantity: "1", unit: "bottle", category: "Pantry", checked: false },
    { name: "Bananas", quantity: "1", unit: "bunch", category: "Fruit", checked: true },
    { name: "Orange juice", quantity: "1", unit: "carton", category: "Beverages", checked: false },
  ];
  for (const item of groceryItems) {
    await prisma.shoppingItem.create({ data: { ...item, listId: groceryList.id, addedById: sarah.id } });
  }

  const hardwareList = await prisma.shoppingList.create({
    data: { name: "Hardware Store", emoji: "🔧", sortOrder: 1, familyId: family.id },
  });
  for (const item of [
    { name: "Faucet repair kit", quantity: "1", unit: undefined, category: "Plumbing", checked: false },
    { name: "LED bulbs (E26, warm white)", quantity: "6", unit: undefined, category: "Electrical", checked: false },
    { name: "Paint roller set", quantity: "1", unit: undefined, category: "Painting", checked: true },
    { name: "WD-40", quantity: "1", unit: "can", category: "Maintenance", checked: false },
  ]) {
    await prisma.shoppingItem.create({ data: { ...item, listId: hardwareList.id, addedById: james.id } });
  }

  // ── WATCH ITEMS ───────────────────────────────────────────────────────────
  const watchItems = [
    { title: "Stranger Things", mediaType: WatchMediaType.TV, status: WatchStatus.WATCHING, externalId: "66732", season: 4, userId: james.id },
    { title: "The Bear", mediaType: WatchMediaType.TV, status: WatchStatus.WATCHING, externalId: "136315", season: 2, userId: sarah.id },
    { title: "Oppenheimer", mediaType: WatchMediaType.MOVIE, status: WatchStatus.FINISHED, externalId: "872585", userId: james.id, completedAt: daysFromNow(-10) },
    { title: "Dune: Part Two", mediaType: WatchMediaType.MOVIE, status: WatchStatus.WATCHING, externalId: "693134", userId: sarah.id },
    { title: "Bluey", mediaType: WatchMediaType.TV, status: WatchStatus.WATCHING, externalId: "89555", season: 3, userId: lily.id },
    { title: "The Last of Us", mediaType: WatchMediaType.TV, status: WatchStatus.PAUSED, externalId: "100088", season: 1, userId: sarah.id },
  ];
  for (const w of watchItems) {
    await prisma.watchItem.create({
      data: {
        title: w.title, mediaType: w.mediaType, status: w.status, externalId: w.externalId,
        season: (w as { season?: number }).season ?? null,
        completedAt: (w as { completedAt?: Date }).completedAt ?? null,
        userId: w.userId, familyId: family.id,
      },
    });
  }

  // ── MEDICATIONS ───────────────────────────────────────────────────────────
  const vitaminD = await prisma.medication.create({
    data: {
      name: "Vitamin D", notes: "1 tablet with breakfast",
      scheduleMode: MedicationScheduleMode.DAILY_TIMES, dailySlotMinutes: [480], slotToleranceMin: 60,
      userId: lily.id, familyId: family.id,
    },
  });
  for (let d = 0; d < 7; d++) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    await prisma.medicationIntake.create({
      data: {
        medicationId: vitaminD.id, dateYmd: date.toISOString().slice(0, 10),
        slotIndex: 0, taken: d > 0,
        takenAt: d > 0 ? new Date(new Date(date).setHours(8, 10, 0, 0)) : null,
      },
    });
  }

  // ── ACHIEVEMENTS ──────────────────────────────────────────────────────────
  for (const id of ["first_task", "first_meal_plan", "first_budget", "week_streak", "team_of_four"]) {
    await prisma.familyAchievementUnlock.create({ data: { familyId: family.id, achievementId: id } });
  }
  const userAchievements = [
    { userId: james.id, ids: ["first_task_done", "task_master", "budget_keeper"] },
    { userId: sarah.id, ids: ["first_task_done", "meal_planner", "note_keeper"] },
    { userId: ethan.id, ids: ["first_task_done"] },
    { userId: lily.id,  ids: ["first_task_done"] },
  ];
  for (const { userId, ids } of userAchievements) {
    for (const achievementId of ids) {
      await prisma.userAchievementUnlock.create({ data: { userId, achievementId } });
    }
  }
  await prisma.userAchievementCounter.createMany({
    data: [
      { userId: james.id, key: "tasks_completed", value: 142 },
      { userId: james.id, key: "expenses_logged", value: 78 },
      { userId: sarah.id, key: "tasks_completed", value: 118 },
      { userId: sarah.id, key: "meal_plans_created", value: 34 },
      { userId: ethan.id, key: "tasks_completed", value: 23 },
      { userId: lily.id,  key: "tasks_completed", value: 12 },
    ],
  });

  console.info(`[demo-seed] ✅ Mitchell Family: ${mitchellDone} completed tasks → ${mitchellDone * 10} XP → #1`);

  // ── COMPETING FAMILIES ────────────────────────────────────────────────────
  console.info("[demo-seed] Seeding competing leaderboard families...");
  for (let i = 0; i < LEADERBOARD_FAMILIES.length; i++) {
    const f = LEADERBOARD_FAMILIES[i]!;
    await seedCompetingFamily(f.name, f.emoji, f.color, f.members, f.completedTasks, i);
  }

  console.info("\n[demo-seed] ─── Leaderboard preview ───────────────────────");
  console.info(`  #1  The Mitchell Family       ${mitchellDone * 10} XP  ← bostonleek@gmail.com`);
  let rank = 2;
  for (const f of LEADERBOARD_FAMILIES) {
    console.info(`  #${rank++}  ${f.name.padEnd(26)} ${f.completedTasks * 10} XP`);
  }
  console.info("[demo-seed] ────────────────────────────────────────────────");
  console.info("[demo-seed] Re-seed: DEMO_RESET=1 npm run db:seed-demo");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
