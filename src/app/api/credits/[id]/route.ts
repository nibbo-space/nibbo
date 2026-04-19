import { auth } from "@/lib/auth";
import { ensureUserFamily } from "@/lib/family";
import { prisma } from "@/lib/prisma";
import { CreditBank, CreditStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const banks = new Set<CreditBank>(["MONOBANK", "PRIVATBANK", "PUMB", "OTHER"]);
const statuses = new Set<CreditStatus>(["ACTIVE", "CLOSED"]);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.credit.findFirst({ where: { id, familyId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  const title = body.title !== undefined ? String(body.title).trim() : undefined;
  const bank = body.bank !== undefined ? (String(body.bank) as CreditBank) : undefined;
  const bankOtherName = body.bankOtherName !== undefined ? String(body.bankOtherName || "").trim() : undefined;
  const monthlyAmount = body.monthlyAmount !== undefined ? Number(body.monthlyAmount) : undefined;
  const paymentDay = body.paymentDay !== undefined ? Number(body.paymentDay) : undefined;
  const status = body.status !== undefined ? (String(body.status) as CreditStatus) : undefined;
  const note = body.note !== undefined ? String(body.note || "").trim() : undefined;
  const lastPaidAt =
    body.lastPaidAt !== undefined
      ? body.lastPaidAt
        ? new Date(String(body.lastPaidAt))
        : null
      : undefined;

  if (title !== undefined && !title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (bank !== undefined && !banks.has(bank)) return NextResponse.json({ error: "Invalid bank" }, { status: 400 });
  if (status !== undefined && !statuses.has(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  if (monthlyAmount !== undefined && (!Number.isFinite(monthlyAmount) || monthlyAmount <= 0)) {
    return NextResponse.json({ error: "Monthly amount must be greater than 0" }, { status: 400 });
  }
  if (paymentDay !== undefined && (!Number.isInteger(paymentDay) || paymentDay < 1 || paymentDay > 31)) {
    return NextResponse.json({ error: "Payment day must be between 1 and 31" }, { status: 400 });
  }

  const nextBank = bank ?? "OTHER";
  const nextBankOtherName = bankOtherName ?? "";
  if (nextBank === "OTHER" && bankOtherName !== undefined && !nextBankOtherName) {
    return NextResponse.json({ error: "Other bank name is required" }, { status: 400 });
  }

  const updated = await prisma.credit.update({
    where: { id },
    data: {
      title,
      bank,
      bankOtherName:
        bank === undefined
          ? bankOtherName === undefined
            ? undefined
            : bankOtherName || null
          : bank === "OTHER"
          ? nextBankOtherName || null
          : null,
      monthlyAmount,
      paymentDay,
      status,
      note: note === undefined ? undefined : note || null,
      lastPaidAt,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const familyId = await ensureUserFamily(session.user.id);
  if (!familyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.credit.findFirst({ where: { id, familyId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.credit.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
