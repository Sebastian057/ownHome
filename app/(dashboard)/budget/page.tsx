"use client";

import { useState } from "react";
import useSWR from "swr";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Trash2 } from "lucide-react";
import {
  SummaryCardsSkeleton,
  CreatePeriodPrompt,
  MonthNavigation,
  MonthlyReportTab,
  TransactionsTab,
} from "@/modules/budget/budget.ui";
import type { BudgetPeriodDetail, BudgetCategoryView } from "@/modules/budget/budget.types";
import type { ApiResponse } from "@/types/common.types";

export default function BudgetPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // Confirmation dialog state
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const periodKey = `/api/budget/periods?year=${year}&month=${month}`;
  const {
    data: periodRes,
    isLoading: periodLoading,
    mutate: mutatePeriod,
  } = useSWR<ApiResponse<BudgetPeriodDetail | null>>(periodKey);

  const {
    data: categoriesRes,
    isLoading: categoriesLoading,
  } = useSWR<ApiResponse<BudgetCategoryView[]>>("/api/budget/categories");

  const period = periodRes?.data ?? null;
  const categories = categoriesRes?.data ?? [];
  const isLoading = periodLoading || categoriesLoading;
  const notFound = !periodLoading && periodRes !== undefined && period === null;

  function handleMonthChange(y: number, m: number) {
    setYear(y);
    setMonth(m);
  }

  async function handleReset() {
    if (!period) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/budget/periods/${period.id}/reset`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Błąd resetowania okresu");
      setShowResetDialog(false);
      await mutatePeriod();
    } catch {
      // TODO: toast error
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReplaceWithTemplate() {
    if (!period) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/budget/periods/${period.id}/replace-template`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Błąd zastępowania szablonem");
      setShowReplaceDialog(false);
      await mutatePeriod();
    } catch {
      // TODO: toast error
    } finally {
      setActionLoading(false);
    }
  }

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("pl-PL", {
    month: "long",
    year: "numeric",
  });
  const displayLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Budżet</h1>
          <p className="text-sm text-muted-foreground">{displayLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {period && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReplaceDialog(true)}
                className="gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Zastąp szablonem
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResetDialog(true)}
                className="gap-1.5 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Resetuj miesiąc
              </Button>
            </>
          )}
          <MonthNavigation year={year} month={month} onChange={handleMonthChange} />
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <>
          <SummaryCardsSkeleton />
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Skeleton className="h-96 rounded-xl" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </>
      )}

      {/* No period for this month */}
      {notFound && (
        <CreatePeriodPrompt
          year={year}
          month={month}
          onCreated={() => mutatePeriod()}
        />
      )}

      {/* Period loaded */}
      {!isLoading && period && (
        <Tabs defaultValue="report" className="w-full">
          <TabsList className="mb-2">
            <TabsTrigger value="report">Raport miesięczny</TabsTrigger>
            <TabsTrigger value="transactions">Wydatki / Transakcje</TabsTrigger>
          </TabsList>

          <TabsContent value="report">
            <MonthlyReportTab
              period={period}
              categories={categories}
              onRefresh={() => mutatePeriod()}
            />
          </TabsContent>

          <TabsContent value="transactions">
            <TransactionsTab
              period={period}
              categories={categories}
              onRefresh={() => mutatePeriod()}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Confirm: Replace with template */}
      <Dialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zastąp szablonem</DialogTitle>
            <DialogDescription>
              Ta operacja usunie wszystkie istniejące dane budżetu na{" "}
              <strong>{displayLabel}</strong> (przychody, plany kategorii,
              transakcje) i zastąpi je aktualnymi danymi z szablonu.
              <br />
              <br />
              Tej operacji nie można cofnąć.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReplaceDialog(false)}
              disabled={actionLoading}
            >
              Anuluj
            </Button>
            <Button
              onClick={handleReplaceWithTemplate}
              disabled={actionLoading}
            >
              {actionLoading ? "Zastępuję…" : "Zastąp szablonem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm: Reset period */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetuj miesiąc</DialogTitle>
            <DialogDescription>
              Ta operacja <strong>trwale usunie</strong> wszystkie dane budżetu
              na <strong>{displayLabel}</strong> — przychody, plany kategorii,
              transakcje oraz sam okres budżetowy.
              <br />
              <br />
              Tej operacji nie można cofnąć.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResetDialog(false)}
              disabled={actionLoading}
            >
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={handleReset}
              disabled={actionLoading}
            >
              {actionLoading ? "Resetuję…" : "Resetuj miesiąc"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
