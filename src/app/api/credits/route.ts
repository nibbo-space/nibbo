import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { CreditBank, CreditStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const banks = new Set<CreditBank>(["MONOBANK", "PRIVATBANK", "PUMB", "OTHER"]);
const statuses = new Set<CreditStatus>(["ACTIVE", "CLOSED"]);

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const credits = await prisma.credit.findMany({
    where: { familyId },
    orderBy: [{ status: "asc" }, { paymentDay: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(credits);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  const title = String(body.title || "").trim();
  const bank = String(body.bank || "OTHER") as CreditBank;
  const bankOtherName = String(body.bankOtherName || "").trim();
  const monthlyAmount = Number(body.monthlyAmount);
  const paymentDay = Number(body.paymentDay);
  const status = String(body.status || "ACTIVE") as CreditStatus;
  const note = String(body.note || "").trim();
  const lastPaidAt = body.lastPaidAt ? new Date(String(body.lastPaidAt)) : null;

  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!banks.has(bank)) return NextResponse.json({ error: "Invalid bank" }, { status: 400 });
  if (!statuses.has(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  if (!Number.isFinite(monthlyAmount) || monthlyAmount <= 0) {
    return NextResponse.json({ error: "Monthly amount must be greater than 0" }, { status: 400 });
  }
  if (!Number.isInteger(paymentDay) || paymentDay < 1 || paymentDay > 31) {
    return NextResponse.json({ error: "Payment day must be between 1 and 31" }, { status: 400 });
  }
  if (bank === "OTHER" && !bankOtherName) {
    return NextResponse.json({ error: "Other bank name is required" }, { status: 400 });
  }

  const created = await prisma.credit.create({
    data: {
      title,
      bank,
      bankOtherName: bank === "OTHER" ? bankOtherName : null,
      monthlyAmount,
      paymentDay,
      lastPaidAt,
      status,
      note: note || null,
      familyId,
    },
  });

  return NextResponse.json(created);
}
