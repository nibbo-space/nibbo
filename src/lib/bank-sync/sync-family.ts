import {
  defaultSelectableAccountIds,
  fetchMonobankClientInfo,
  fetchMonobankStatements,
  MonobankApiError,
  normalizeMonobankStatements,
} from "@/lib/bank-sync/adapters/monobank";
import { resolveCategoryId } from "@/lib/bank-sync/map-category";
import {
  BANK_SYNC_INTERVAL_MS,
  MONO_FORCE_LOOKBACK_SEC,
  MONO_INITIAL_LOOKBACK_SEC,
  MONO_MAX_STATEMENT_WINDOW_SEC,
  MONO_STATEMENT_MIN_INTERVAL_MS,
  MONO_SYNC_OVERLAP_SEC,
  type SyncFamilyResult,
} from "@/lib/bank-sync/types";
import { getNbuExchangeRates } from "@/lib/exchange-rates";
import { prisma } from "@/lib/prisma";
import { decryptUserSecret } from "@/lib/user-secret-crypto";
import type { BankConnection } from "@prisma/client";

function clampFromSec(preferredFromSec: number, nowSec: number): number {
  const maxWindowStart = nowSec - MONO_MAX_STATEMENT_WINDOW_SEC;
  return Math.max(maxWindowStart, preferredFromSec);
}

function resolveFromSec(
  connection: BankConnection,
  nowSec: number,
  force: boolean,
): number {
  if (force) {
    return clampFromSec(nowSec - MONO_FORCE_LOOKBACK_SEC, nowSec);
  }
  if (connection.syncFromAt) {
    return clampFromSec(Math.floor(connection.syncFromAt.getTime() / 1000) - MONO_SYNC_OVERLAP_SEC, nowSec);
  }
  return clampFromSec(nowSec - MONO_INITIAL_LOOKBACK_SEC, nowSec);
}

async function loadLearnedMccMap(familyId: string): Promise<Map<number, string>> {
  const rows = await prisma.bankCategoryMapping.findMany({
    where: { familyId, provider: "MONOBANK" },
    select: { mcc: true, categoryId: true },
  });
  return new Map(rows.map((r) => [r.mcc, r.categoryId]));
}

export async function syncFamilyMonobank(
  connection: BankConnection,
  opts?: { force?: boolean },
): Promise<SyncFamilyResult> {
  const now = new Date();
  const force = Boolean(opts?.force);
  const result: SyncFamilyResult = {
    familyId: connection.familyId,
    importedExpenses: 0,
    importedIncomes: 0,
    skipped: 0,
    fetched: 0,
  };

  if (!connection.enabled && !force) {
    result.error = "disabled";
    return result;
  }

  if (
    connection.lastStatementAt &&
    now.getTime() - connection.lastStatementAt.getTime() < MONO_STATEMENT_MIN_INTERVAL_MS
  ) {
    result.rateLimited = true;
    result.error = "rate_limited";
    return result;
  }

  const token = decryptUserSecret(connection.tokenEnc);
  if (!token) {
    await prisma.bankConnection.update({
      where: { id: connection.id },
      data: { lastSyncAt: now, lastError: "invalid_token" },
    });
    result.error = "invalid_token";
    return result;
  }

  try {
    let accountIds = connection.accountIds.filter(Boolean);
    let accountCurrencyById = new Map<string, number>();

    const needsClientInfo = accountIds.length === 0;
    if (needsClientInfo) {
      const client = await fetchMonobankClientInfo(token);
      accountCurrencyById = new Map(client.accounts.map((a) => [a.id, a.currencyCode]));
      accountIds = defaultSelectableAccountIds(client.accounts);
      if (accountIds.length === 0) {
        await prisma.bankConnection.update({
          where: { id: connection.id },
          data: { lastSyncAt: now, lastError: "empty_accounts" },
        });
        result.error = "empty_accounts";
        return result;
      }
    } else {
      accountCurrencyById = new Map(accountIds.map((id) => [id, 980]));
    }

    const nowSec = Math.floor(now.getTime() / 1000);
    const fromSec = resolveFromSec(connection, nowSec, force);
    if (fromSec >= nowSec) {
      result.error = "invalid_window";
      return result;
    }

    const rates = await getNbuExchangeRates();
    const categories = await prisma.expenseCategory.findMany({
      where: { familyId: connection.familyId },
      select: { id: true, name: true },
    });
    const learned = await loadLearnedMccMap(connection.familyId);

    const allTx = [];
    for (let i = 0; i < accountIds.length; i += 1) {
      if (i > 0) {
        await new Promise((r) => setTimeout(r, MONO_STATEMENT_MIN_INTERVAL_MS));
      }
      const accountId = accountIds[i]!;
      const items = await fetchMonobankStatements(token, accountId, fromSec, nowSec);
      await prisma.bankConnection.update({
        where: { id: connection.id },
        data: { lastStatementAt: new Date() },
      });
      const accountCurrency = accountCurrencyById.get(accountId) ?? 980;
      const normalized = normalizeMonobankStatements(items, accountCurrency, rates);
      result.fetched += normalized.length;
      allTx.push(...normalized);
    }

    for (const tx of allTx) {
      const categoryId = resolveCategoryId({
        mcc: tx.mcc,
        learnedByMcc: learned,
        categories,
      });

      if (tx.direction === "debit") {
        const existing = await prisma.expense.findFirst({
          where: {
            familyId: connection.familyId,
            source: "MONOBANK",
            externalId: tx.externalId,
          },
          select: { id: true, amount: true, categoryId: true },
        });
        if (existing) {
          const amountChanged = Math.abs(existing.amount - tx.amountUah) > 0.009;
          if (amountChanged || existing.categoryId == null) {
            await prisma.expense.update({
              where: { id: existing.id },
              data: {
                title: tx.title,
                amount: tx.amountUah,
                date: tx.date,
                note: tx.note,
                mcc: tx.mcc,
                ...(existing.categoryId == null && categoryId ? { categoryId } : {}),
              },
            });
            if (amountChanged) result.importedExpenses += 1;
            else result.skipped += 1;
          } else {
            result.skipped += 1;
          }
          continue;
        }
        try {
          await prisma.expense.create({
            data: {
              title: tx.title,
              amount: tx.amountUah,
              date: tx.date,
              note: tx.note,
              categoryId,
              userId: connection.connectedByUserId,
              familyId: connection.familyId,
              source: "MONOBANK",
              externalId: tx.externalId,
              mcc: tx.mcc,
            },
          });
          result.importedExpenses += 1;
        } catch {
          result.skipped += 1;
        }
      } else {
        const existing = await prisma.income.findFirst({
          where: {
            familyId: connection.familyId,
            source: "MONOBANK",
            externalId: tx.externalId,
          },
          select: { id: true, amount: true },
        });
        if (existing) {
          if (Math.abs(existing.amount - tx.amountUah) > 0.009) {
            await prisma.income.update({
              where: { id: existing.id },
              data: {
                title: tx.title,
                amount: tx.amountUah,
                date: tx.date,
                note: tx.note,
                mcc: tx.mcc,
              },
            });
            result.importedIncomes += 1;
          } else {
            result.skipped += 1;
          }
          continue;
        }
        try {
          await prisma.income.create({
            data: {
              title: tx.title,
              amount: tx.amountUah,
              date: tx.date,
              note: tx.note,
              userId: connection.connectedByUserId,
              familyId: connection.familyId,
              source: "MONOBANK",
              externalId: tx.externalId,
              mcc: tx.mcc,
            },
          });
          result.importedIncomes += 1;
        } catch {
          result.skipped += 1;
        }
      }
    }

    await prisma.bankConnection.update({
      where: { id: connection.id },
      data: {
        lastSyncAt: now,
        lastSuccessAt: now,
        lastError: null,
        syncFromAt: now,
        accountIds,
      },
    });

    return result;
  } catch (err) {
    const message =
      err instanceof MonobankApiError
        ? err.status === 429
          ? "rate_limited"
          : err.status === 401 || err.status === 403
            ? "invalid_token"
            : `mono_${err.status}`
        : "sync_failed";
    if (err instanceof MonobankApiError && err.status === 429) {
      result.rateLimited = true;
    }
    await prisma.bankConnection.update({
      where: { id: connection.id },
      data: {
        lastError: message,
        ...(message === "rate_limited" ? { lastStatementAt: now } : { lastSyncAt: now }),
      },
    });
    result.error = message;
    return result;
  }
}

export async function syncDueMonobankConnections(): Promise<SyncFamilyResult[]> {
  const cutoff = new Date(Date.now() - BANK_SYNC_INTERVAL_MS);
  const connections = await prisma.bankConnection.findMany({
    where: {
      provider: "MONOBANK",
      enabled: true,
      OR: [{ lastSyncAt: null }, { lastSyncAt: { lt: cutoff } }],
    },
  });

  const results: SyncFamilyResult[] = [];
  for (const connection of connections) {
    results.push(await syncFamilyMonobank(connection));
  }
  return results;
}

export async function learnBankCategoryMapping(params: {
  familyId: string;
  mcc: number;
  categoryId: string | null;
}): Promise<void> {
  const { familyId, mcc, categoryId } = params;
  if (categoryId == null) {
    await prisma.bankCategoryMapping.deleteMany({
      where: { familyId, provider: "MONOBANK", mcc },
    });
    return;
  }
  await prisma.bankCategoryMapping.upsert({
    where: {
      familyId_provider_mcc: { familyId, provider: "MONOBANK", mcc },
    },
    create: { familyId, provider: "MONOBANK", mcc, categoryId },
    update: { categoryId },
  });
}
