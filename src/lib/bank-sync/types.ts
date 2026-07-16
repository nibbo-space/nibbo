export type BankTxDirection = "debit" | "credit";

export type NormalizedBankTx = {
  externalId: string;
  title: string;
  amountUah: number;
  date: Date;
  mcc: number | null;
  direction: BankTxDirection;
  note: string | null;
};

export type MonobankAccountPreview = {
  id: string;
  type: string;
  currencyCode: number;
  balance: number;
  maskedPan: string[];
  iban: string;
};

export type SyncFamilyResult = {
  familyId: string;
  importedExpenses: number;
  importedIncomes: number;
  skipped: number;
  error?: string;
  rateLimited?: boolean;
};

export const MONO_STATEMENT_MIN_INTERVAL_MS = 60_000;
export const BANK_SYNC_INTERVAL_MS = 10 * 60_000;
export const MONO_MAX_STATEMENT_WINDOW_SEC = 2_682_000;
