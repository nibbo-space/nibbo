import type { MonobankAccountPreview, NormalizedBankTx } from "@/lib/bank-sync/types";
import type { ExchangeRates, SupportedCurrency } from "@/lib/exchange-rates";
import { getNbuExchangeRates } from "@/lib/exchange-rates";

const MONO_BASE = "https://api.monobank.ua";

export class MonobankApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "MonobankApiError";
    this.status = status;
  }
}

type MonoClientInfo = {
  clientId: string;
  name: string;
  accounts: Array<{
    id: string;
    balance: number;
    creditLimit: number;
    type: string;
    currencyCode: number;
    maskedPan?: string[];
    iban?: string;
  }>;
};

type MonoStatementItem = {
  id: string;
  time: number;
  description: string;
  mcc?: number;
  originalMcc?: number;
  hold?: boolean;
  amount: number;
  operationAmount: number;
  currencyCode: number;
  comment?: string;
};

const ISO4217_TO_CURRENCY: Record<number, SupportedCurrency> = {
  980: "UAH",
  840: "USD",
  978: "EUR",
  826: "GBP",
  392: "JPY",
};

function minorToMajor(amountMinor: number): number {
  return Math.round(amountMinor) / 100;
}

async function amountToUah(amountMinor: number, currencyCode: number, rates: ExchangeRates): Promise<number> {
  const major = Math.abs(minorToMajor(amountMinor));
  const currency = ISO4217_TO_CURRENCY[currencyCode];
  if (!currency || currency === "UAH") return major;
  const rate = rates[currency];
  if (!rate || rate <= 0) return major;
  return major * rate;
}

async function monoFetch<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${MONO_BASE}${path}`, {
    headers: { "X-Token": token },
    cache: "no-store",
  });
  if (res.status === 429) {
    throw new MonobankApiError("Monobank rate limit", 429);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new MonobankApiError(text || `Monobank error ${res.status}`, res.status);
  }
  return (await res.json()) as T;
}

export async function fetchMonobankClientInfo(token: string): Promise<{
  clientId: string;
  name: string;
  accounts: MonobankAccountPreview[];
}> {
  const info = await monoFetch<MonoClientInfo>("/personal/client-info", token);
  return {
    clientId: info.clientId,
    name: info.name,
    accounts: (info.accounts ?? []).map((a) => ({
      id: a.id,
      type: a.type,
      currencyCode: a.currencyCode,
      balance: a.balance,
      maskedPan: a.maskedPan ?? [],
      iban: a.iban ?? "",
    })),
  };
}

export function defaultSelectableAccountIds(accounts: MonobankAccountPreview[]): string[] {
  return accounts
    .filter((a) => a.currencyCode === 980)
    .map((a) => a.id);
}

export async function fetchMonobankStatements(
  token: string,
  accountId: string,
  fromSec: number,
  toSec: number,
): Promise<MonoStatementItem[]> {
  const path = `/personal/statement/${encodeURIComponent(accountId)}/${fromSec}/${toSec}`;
  return monoFetch<MonoStatementItem[]>(path, token);
}

export async function normalizeMonobankStatements(
  items: MonoStatementItem[],
  rates?: ExchangeRates,
): Promise<NormalizedBankTx[]> {
  const exchange = rates ?? (await getNbuExchangeRates());
  const out: NormalizedBankTx[] = [];

  for (const item of items) {
    if (!item?.id) continue;
    const amountUah = await amountToUah(item.amount, item.currencyCode, exchange);
    if (!Number.isFinite(amountUah) || amountUah <= 0) continue;

    const title = String(item.description || "Monobank").trim().slice(0, 500) || "Monobank";
    const note = item.comment ? String(item.comment).trim().slice(0, 2000) : null;
    const mcc =
      typeof item.mcc === "number" && Number.isFinite(item.mcc)
        ? item.mcc
        : typeof item.originalMcc === "number" && Number.isFinite(item.originalMcc)
          ? item.originalMcc
          : null;

    out.push({
      externalId: item.id,
      title,
      amountUah,
      date: new Date(item.time * 1000),
      mcc,
      direction: item.amount < 0 ? "debit" : "credit",
      note,
    });
  }

  return out;
}
