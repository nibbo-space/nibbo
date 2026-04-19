import {
  DEFAULT_EVENT_TIME_ZONE,
  formatEventDayForAssistant,
  formatEventInstantForAssistant,
} from "@/lib/assistant-event-datetime";
import { prisma } from "@/lib/prisma";
import { AUTO_BILLING_MARKER } from "@/lib/subscription-calendar";

const MAX_LEN = 14000;

function monthRange(ref = new Date()) {
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function money(n: number) {
  if (!Number.isFinite(n)) return "0";
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

function dayStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function buildFamilyContextForAssistant(userId: string, familyId: string): Promise<string> {
  const now = new Date();
  const { start: monthStart, end: monthEnd } = monthRange(now);
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    openTasks,
    upcomingEvents,
    expenseSum,
    incomeSum,
    shoppingOpen,
    expensesMonth,
    incomesMonth,
    credits,
    subscriptions,
    shoppingSamples,
    viewer,
  ] = await Promise.all([
    prisma.task.findMany({
      where: { completed: false, assigneeId: userId, column: { board: { familyId } } },
      select: { title: true, dueDate: true, priority: true },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
      take: 18,
    }),
    prisma.event.findMany({
      where: {
        familyId,
        startDate: { gte: now, lte: weekLater },
        NOT: { description: { startsWith: AUTO_BILLING_MARKER } },
      },
      select: { title: true, startDate: true, allDay: true },
      orderBy: { startDate: "asc" },
      take: 12,
    }),
    prisma.expense.aggregate({
      where: { familyId, date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.income.aggregate({
      where: { familyId, date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.shoppingItem.count({ where: { checked: false, list: { familyId } } }),
    prisma.expense.findMany({
      where: { familyId, date: { gte: monthStart, lte: monthEnd } },
      select: {
        title: true,
        amount: true,
        date: true,
        note: true,
        category: { select: { name: true } },
      },
      orderBy: { date: "desc" },
      take: 45,
    }),
    prisma.income.findMany({
      where: { familyId, date: { gte: monthStart, lte: monthEnd } },
      select: { title: true, amount: true, date: true, note: true },
      orderBy: { date: "desc" },
      take: 22,
    }),
    prisma.credit.findMany({
      where: { familyId },
      select: {
        title: true,
        bank: true,
        bankOtherName: true,
        monthlyAmount: true,
        paymentDay: true,
        status: true,
        lastPaidAt: true,
        note: true,
      },
      orderBy: { status: "asc" },
      take: 14,
    }),
    prisma.familySubscription.findMany({
      where: { familyId },
      select: {
        title: true,
        amount: true,
        currency: true,
        billingCycle: true,
        nextBillingDate: true,
        status: true,
        category: true,
        note: true,
      },
      orderBy: [{ status: "asc" }, { nextBillingDate: "asc" }],
      take: 28,
    }),
    prisma.shoppingItem.findMany({
      where: { checked: false, list: { familyId } },
      select: { name: true, quantity: true, list: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { timeZone: true } }),
  ]);

  const tz = viewer?.timeZone?.trim() || DEFAULT_EVENT_TIME_ZONE;

  const catTotals = new Map<string, { sum: number; n: number }>();
  for (const ex of expensesMonth) {
    const key = ex.category?.name?.trim() || "Uncategorized";
    const cur = catTotals.get(key) ?? { sum: 0, n: 0 };
    cur.sum += ex.amount;
    cur.n += 1;
    catTotals.set(key, cur);
  }
  const catSorted = [...catTotals.entries()].sort((a, b) => b[1].sum - a[1].sum);

  const lines: string[] = [];
  lines.push(
    `Family workspace snapshot (user is addressee). Calendar month ${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}. Amounts on expenses/incomes are as stored in the app; subscriptions include their own currency.`
  );

  lines.push("--- Open tasks assigned to this user ---");
  lines.push(`Count: ${openTasks.length}`);
  for (const t of openTasks) {
    const due = t.dueDate ? dayStr(t.dueDate) : "no date";
    lines.push(`- [${t.priority}] ${t.title} (due ${due})`);
  }

  lines.push("--- Calendar: next 7 days (family) ---");
  for (const e of upcomingEvents) {
    const when = e.allDay
      ? formatEventDayForAssistant(e.startDate, tz)
      : formatEventInstantForAssistant(e.startDate, tz);
    lines.push(`- ${e.title} @ ${when}`);
  }
  if (upcomingEvents.length === 0) lines.push("- (none)");

  lines.push("--- Budget: this calendar month totals (family) ---");
  const spent = expenseSum._sum.amount ?? 0;
  const inc = incomeSum._sum.amount ?? 0;
  lines.push(`Expenses sum: ${money(spent)} | Income sum: ${money(inc)} | Net (income - expenses): ${money(inc - spent)}`);

  lines.push("--- Expenses this month by category (aggregated) ---");
  if (catSorted.length === 0) {
    lines.push("- (no expenses in range)");
  } else {
    for (const [name, { sum, n }] of catSorted.slice(0, 16)) {
      lines.push(`- ${name}: ${money(sum)} (${n} entries)`);
    }
    if (catSorted.length > 16) lines.push(`- … +${catSorted.length - 16} more categories`);
  }

  lines.push("--- Expense line items this month (newest first, capped) ---");
  for (const ex of expensesMonth) {
    const cat = ex.category?.name?.trim() || "Uncategorized";
    const note = ex.note?.trim() ? ` | note: ${ex.note.trim().slice(0, 80)}` : "";
    lines.push(`- ${dayStr(ex.date)} | ${cat} | ${money(ex.amount)} | ${ex.title}${note}`);
  }

  lines.push("--- Income line items this month (newest first) ---");
  if (incomesMonth.length === 0) {
    lines.push("- (none in range)");
  } else {
    for (const i of incomesMonth) {
      const note = i.note?.trim() ? ` | ${i.note.trim().slice(0, 80)}` : "";
      lines.push(`- ${dayStr(i.date)} | ${money(i.amount)} | ${i.title}${note}`);
    }
  }

  lines.push("--- Credits (family) ---");
  if (credits.length === 0) {
    lines.push("- (none)");
  } else {
    for (const c of credits) {
      const bank =
        c.bank === "OTHER" && c.bankOtherName?.trim()
          ? `OTHER:${c.bankOtherName.trim()}`
          : c.bank;
      const lp = c.lastPaidAt ? `lastPaid:${dayStr(c.lastPaidAt)}` : "lastPaid:—";
      const note = c.note?.trim() ? ` | ${c.note.trim().slice(0, 60)}` : "";
      lines.push(
        `- [${c.status}] ${c.title} | bank:${bank} | monthly:${money(c.monthlyAmount)} | dayOfMonth:${c.paymentDay} | ${lp}${note}`
      );
    }
  }

  lines.push("--- Subscriptions (family; includes paused/cancelled for visibility) ---");
  if (subscriptions.length === 0) {
    lines.push("- (none)");
  } else {
    for (const s of subscriptions) {
      const cat = s.category?.trim() ? ` | cat:${s.category.trim()}` : "";
      const note = s.note?.trim() ? ` | ${s.note.trim().slice(0, 50)}` : "";
      lines.push(
        `- [${s.status}] ${s.title} | ${money(s.amount)} ${s.currency}/${s.billingCycle === "MONTHLY" ? "mo" : "yr"} | next:${dayStr(s.nextBillingDate)}${cat}${note}`
      );
    }
  }

  lines.push("--- Shopping: unchecked items count (family) ---");
  lines.push(`Total unchecked: ${shoppingOpen}`);
  if (shoppingSamples.length > 0) {
    lines.push("Recent unchecked samples (list | item):");
    for (const it of shoppingSamples) {
      const q = it.quantity?.trim() ? ` x${it.quantity.trim()}` : "";
      lines.push(`- ${it.list.name}: ${it.name}${q}`);
    }
  }

  let text = lines.join("\n");
  if (text.length > MAX_LEN) text = text.slice(0, MAX_LEN) + "\n…(truncated)";
  return text;
}
