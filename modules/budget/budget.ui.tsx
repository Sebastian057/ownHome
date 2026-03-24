"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type BudgetPeriodDetail,
  type BudgetCategoryView,
} from "./budget.types";
import type { ApiResponse } from "@/types/common.types";

// ─── Imports from section files (also re-exported below) ─────────────────────

import {
  SummaryCards,
  SummaryCardsSkeleton,
  ExtendedSummaryCards,
  CategoryPieChart,
  BudgetSummaryTable,
} from "./budget.ui.summary";

import {
  TransactionTable,
  AddTransactionDialog,
  EditTransactionDialog,
  TransactionList,
} from "./budget.ui.transactions";

import { IncomeSection } from "./budget.ui.income";
import { BudgetTemplateEditor } from "./budget.ui.template";

import {
  CategoryManagerSection,
  CategoryTable,
  PlannedExpensesTable,
} from "./budget.ui.categories";

// ─── Re-exports for consumers of budget.ui.tsx ───────────────────────────────

export {
  SummaryCards,
  SummaryCardsSkeleton,
  ExtendedSummaryCards,
  CategoryPieChart,
  BudgetSummaryTable,
  TransactionTable,
  AddTransactionDialog,
  EditTransactionDialog,
  TransactionList,
  IncomeSection,
  BudgetTemplateEditor,
  CategoryManagerSection,
  CategoryTable,
  PlannedExpensesTable,
};

// ─── MonthNavigation ──────────────────────────────────────────────────────────

export function MonthNavigation({
  year,
  month,
  onChange,
}: {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}) {
  const label = new Date(year, month - 1, 1).toLocaleDateString("pl-PL", {
    month: "long",
    year: "numeric",
  });
  const displayLabel = label.charAt(0).toUpperCase() + label.slice(1);

  function prev() {
    if (month === 1) onChange(year - 1, 12);
    else onChange(year, month - 1);
  }
  function next() {
    const now = new Date();
    const maxYear = now.getFullYear();
    const maxMonth = now.getMonth() + 4; // 3 miesiące do przodu
    const maxDate = maxMonth > 12
      ? { year: maxYear + 1, month: maxMonth - 12 }
      : { year: maxYear, month: maxMonth };

    const isAtMax =
      year > maxDate.year ||
      (year === maxDate.year && month >= maxDate.month);
    if (isAtMax) return;

    if (month === 12) onChange(year + 1, 1);
    else onChange(year, month + 1);
  }

  const now = new Date();
  const maxMonth = now.getMonth() + 4;
  const maxDate = maxMonth > 12
    ? { year: now.getFullYear() + 1, month: maxMonth - 12 }
    : { year: now.getFullYear(), month: maxMonth };
  const isAtMax =
    year > maxDate.year ||
    (year === maxDate.year && month >= maxDate.month);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={prev}
        className="h-8 w-8 p-0"
      >
        ‹
      </Button>
      <span className="text-sm font-medium min-w-[140px] text-center">
        {displayLabel}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={next}
        disabled={isAtMax}
        className="h-8 w-8 p-0"
      >
        ›
      </Button>
    </div>
  );
}

// ─── CreatePeriodPrompt ───────────────────────────────────────────────────────

export function CreatePeriodPrompt({
  year,
  month,
  onCreated,
}: {
  year: number;
  month: number;
  onCreated: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("pl-PL", {
    month: "long",
    year: "numeric",
  });

  async function handleCreate() {
    setLoading(true);
    setError(null);
    const res: ApiResponse<BudgetPeriodDetail> = await fetch(
      "/api/budget/periods",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month }),
      }
    ).then((r) => r.json());
    setLoading(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    if (res.data) onCreated();
  }

  return (
    <Card className="max-w-md mx-auto mt-12">
      <CardHeader>
        <CardTitle>Brak budżetu na {monthLabel}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Utwórz budżet na ten miesiąc. System automatycznie skopiuje Twój
          szablon i zarezerwuje subskrypcje oraz płatności cykliczne.
        </p>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button onClick={handleCreate} disabled={loading} className="w-full">
          {loading ? "Tworzę budżet..." : `Utwórz budżet na ${monthLabel}`}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── MonthlyReportTab ─────────────────────────────────────────────────────────

export function MonthlyReportTab({
  period,
  categories,
  onRefresh,
}: {
  period: BudgetPeriodDetail;
  categories: BudgetCategoryView[];
  onRefresh?: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <ExtendedSummaryCards summary={period.summary} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Dochód card — interaktywna sekcja przychodów */}
        <IncomeSection
          periodId={period.id}
          incomes={period.incomes}
          onRefresh={onRefresh ?? (() => {})}
        />

        {/* Wydatki card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowDownLeft className="h-4 w-4 text-destructive" />
              Wydatki
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm mb-3">
              <span className="text-muted-foreground">Zaplanowane</span>
              <span className="font-mono font-medium">
                {Number(period.summary.plannedExpenses).toLocaleString("pl-PL", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} zł
              </span>
            </div>
            <div className="flex justify-between text-sm mb-3">
              <span className="text-muted-foreground">Rzeczywiste</span>
              <span className="font-mono font-medium text-destructive">
                {Number(period.summary.actualExpenses).toLocaleString("pl-PL", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} zł
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  Number(period.summary.actualExpenses) >
                    Number(period.summary.plannedExpenses)
                    ? "bg-destructive"
                    : "bg-primary"
                )}
                style={{
                  width: `${Math.min(
                    100,
                    Number(period.summary.plannedExpenses) > 0
                      ? (Number(period.summary.actualExpenses) /
                          Number(period.summary.plannedExpenses)) *
                          100
                      : 0
                  )}%`,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {Number(period.summary.plannedExpenses) > 0
                ? `${Math.round(
                    (Number(period.summary.actualExpenses) /
                      Number(period.summary.plannedExpenses)) *
                      100
                  )}% zaplanowanego budżetu`
                : "Brak planowanych wydatków"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <BudgetSummaryTable items={period.summary.byCategory} />
        <CategoryPieChart items={period.summary.byCategory} />
      </div>
    </div>
  );
}

// ─── TransactionsTab ──────────────────────────────────────────────────────────

export function TransactionsTab({
  period,
  categories,
  onRefresh,
}: {
  period: BudgetPeriodDetail;
  categories: BudgetCategoryView[];
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <PlannedExpensesTable
        items={period.categoryPlans}
        periodId={period.id}
        categories={categories}
        onRefresh={onRefresh}
      />
      <TransactionTable
        periodId={period.id}
        transactions={period.transactions}
        categories={categories}
        onRefresh={onRefresh}
      />
    </div>
  );
}
