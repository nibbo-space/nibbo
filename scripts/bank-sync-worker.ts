import { BANK_SYNC_INTERVAL_MS } from "../src/lib/bank-sync/types";
import { syncDueMonobankConnections } from "../src/lib/bank-sync/sync-family";

async function runOnce() {
  const started = new Date().toISOString();
  try {
    const results = await syncDueMonobankConnections();
    const imported = results.reduce(
      (acc, r) => ({
        expenses: acc.expenses + r.importedExpenses,
        incomes: acc.incomes + r.importedIncomes,
        errors: acc.errors + (r.error ? 1 : 0),
      }),
      { expenses: 0, incomes: 0, errors: 0 },
    );
    console.log(
      `[bank-sync] ${started} families=${results.length} expenses=+${imported.expenses} incomes=+${imported.incomes} errors=${imported.errors}`,
    );
  } catch (err) {
    console.error(`[bank-sync] ${started} failed`, err);
  }
}

const intervalMs = Number(process.env.BANK_SYNC_WORKER_INTERVAL_MS) || BANK_SYNC_INTERVAL_MS;

console.log(`[bank-sync] worker started, interval=${Math.round(intervalMs / 60000)}m`);
void runOnce();
setInterval(() => {
  void runOnce();
}, intervalMs);
