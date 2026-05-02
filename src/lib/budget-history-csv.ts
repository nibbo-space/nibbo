import type { BudgetMonthHistoryDetail } from "@/lib/budget-month-history-detail";

export type BudgetHistoryCsvLabels = {
  sectionSummary: string;
  labelPeriodCode: string;
  labelMonthTitle: string;
  labelExpensesTotal: string;
  labelExpenseCount: string;
  labelIncomeTotal: string;
  labelBalance: string;
  sectionCategories: string;
  colCategory: string;
  colAmountUah: string;
  sectionExpenses: string;
  colDate: string;
  colTitle: string;
  colUser: string;
  colNote: string;
  sectionIncomes: string;
  colIncomeDate: string;
  colIncomeTitle: string;
  colIncomeAmountUah: string;
  colIncomeUser: string;
  colIncomeNote: string;
};

function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "number" && Number.isFinite(v) ? String(v) : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function line(cells: (string | number | null | undefined)[]): string {
  return cells.map(csvCell).join(",");
}

export function buildBudgetHistoryCsv(
  detail: BudgetMonthHistoryDetail,
  monthYm: string,
  monthTitle: string,
  categoryRows: { name: string; amountUah: number }[],
  uncategorized: { name: string; amountUah: number } | null,
  labels: BudgetHistoryCsvLabels
): string {
  const rows: string[] = [];
  const net = detail.incomeTotal - detail.expenseTotal;

  rows.push(line([labels.sectionSummary]));
  rows.push(line([labels.labelPeriodCode, monthYm]));
  rows.push(line([labels.labelMonthTitle, monthTitle]));
  rows.push(line([labels.labelExpensesTotal, detail.expenseTotal]));
  rows.push(line([labels.labelExpenseCount, detail.expenseCount]));
  rows.push(line([labels.labelIncomeTotal, detail.incomeTotal]));
  rows.push(line([labels.labelBalance, net]));
  rows.push("");
  rows.push(line([labels.sectionCategories]));
  rows.push(line([labels.colCategory, labels.colAmountUah]));
  for (const r of categoryRows) {
    rows.push(line([r.name, r.amountUah]));
  }
  if (uncategorized && uncategorized.amountUah > 0) {
    rows.push(line([uncategorized.name, uncategorized.amountUah]));
  }
  rows.push("");
  rows.push(line([labels.sectionExpenses]));
  rows.push(
    line([
      labels.colDate,
      labels.colTitle,
      labels.colCategory,
      labels.colAmountUah,
      labels.colUser,
      labels.colNote,
    ])
  );
  const expSorted = [...detail.expenses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  for (const e of expSorted) {
    const d = e.date.slice(0, 10);
    rows.push(
      line([
        d,
        e.title,
        e.category?.name ?? "",
        e.amount,
        e.user.name ?? "",
        e.note ?? "",
      ])
    );
  }
  rows.push("");
  rows.push(line([labels.sectionIncomes]));
  rows.push(
    line([
      labels.colIncomeDate,
      labels.colIncomeTitle,
      labels.colIncomeAmountUah,
      labels.colIncomeUser,
      labels.colIncomeNote,
    ])
  );
  const incSorted = [...detail.incomes].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  for (const i of incSorted) {
    rows.push(
      line([
        i.date.slice(0, 10),
        i.title,
        i.amount,
        i.user.name ?? "",
        i.note ?? "",
      ])
    );
  }

  return `\uFEFF${rows.join("\r\n")}`;
}

export function downloadTextFile(filename: string, text: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
