import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { kyivCalendarYmd, kyivCalendarYmdMinusDays, kyivRangeUtcFromCalendarYmd } from "@/lib/kyiv-range";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const untilRaw = req.nextUrl.searchParams.get("until");
  const daysRaw = req.nextUrl.searchParams.get("days");
  const days = Math.min(31, Math.max(1, Number(daysRaw) || 7));
  const tz = session.user.timeZone || "Europe/Kyiv";
  const until = untilRaw && YMD.test(untilRaw) ? untilRaw : kyivCalendarYmd(new Date(), tz);
  const startYmd = kyivCalendarYmdMinusDays(until, days, tz);
  const { start, end } = kyivRangeUtcFromCalendarYmd(startYmd, until, tz);

  const rows = await prisma.expense.findMany({
    where: { familyId, date: { gte: start, lte: end } },
    include: {
      category: true,
      user: { select: { id: true, name: true, image: true, color: true, emoji: true } },
    },
    orderBy: { date: "desc" },
  });

  const expenses = rows.map((e) => ({
    id: e.id,
    title: e.title,
    amount: e.amount,
    date: e.date.toISOString(),
    note: e.note,
    category: e.category,
    user: e.user,
  }));

  return NextResponse.json({
    expenses,
    range: { startYmd, until },
  });
}
