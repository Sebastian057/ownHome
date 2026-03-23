"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SubscriptionList,
  SubscriptionListSkeleton,
  SubscriptionFormDialog,
} from "@/modules/subscriptions/subscriptions.ui";
import type { SubscriptionListItem } from "@/modules/subscriptions/subscriptions.types";
import type { BudgetCategoryView } from "@/modules/budget/budget.types";
import type { ApiResponse } from "@/types/common.types";

function fmt(amount: string) {
  return Number(amount).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SubscriptionsPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<{ processed: number; booked: number } | null>(null);

  const { data: res, isLoading, mutate } = useSWR<ApiResponse<SubscriptionListItem[]>>(
    "/api/subscriptions"
  );

  const { data: categoriesRes } = useSWR<ApiResponse<BudgetCategoryView[]>>("/api/budget/categories");
  const categories = categoriesRes?.data ?? [];

  const subscriptions = res?.data ?? [];
  const active = subscriptions.filter((s) => s.isActive);
  const overdue = active.filter((s) => s.daysUntilBilling < 0);

  const totalMonthly = active.reduce((sum, s) => {
    const amount = Number(s.amount);
    switch (s.billingCycle) {
      case "WEEKLY":    return sum + amount * 4.33;
      case "MONTHLY":   return sum + amount;
      case "QUARTERLY": return sum + amount / 3;
      case "YEARLY":    return sum + amount / 12;
      default:          return sum;
    }
  }, 0);

  const upcoming7 = active.filter((s) => s.daysUntilBilling >= 0 && s.daysUntilBilling <= 7).length;

  async function handleProcessDue() {
    setProcessing(true);
    setProcessResult(null);
    try {
      const r = await fetch("/api/subscriptions/process-due", { method: "POST" });
      const json: ApiResponse<{ processed: number; booked: number }> = await r.json();
      if (json.data) setProcessResult(json.data);
      mutate();
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Subskrypcje</h1>
          <p className="text-sm text-muted-foreground">
            {active.length} aktywnych · ~{fmt(totalMonthly.toFixed(2))} zł/mies.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {upcoming7 > 0 && (
            <Badge variant="destructive" className="gap-1">
              <RefreshCw className="h-3 w-3" />
              {upcoming7} za ≤7 dni
            </Badge>
          )}
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Nowa subskrypcja
          </Button>
        </div>
      </div>

      {/* Overdue banner */}
      {overdue.length > 0 && (
        <div className={cn(
          "flex items-center justify-between gap-3 rounded-lg border px-4 py-3",
          "border-amber-500/40 bg-amber-500/8"
        )}>
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {overdue.length} {overdue.length === 1 ? "subskrypcja wymaga" : "subskrypcje wymagają"} zaksięgowania
              </p>
              <p className="text-xs text-amber-700/70 dark:text-amber-400/70">
                Data pobrania minęła — transakcje nie zostały jeszcze dodane do budżetu
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-amber-500/50 text-amber-700 hover:bg-amber-500/10 hover:text-amber-800 dark:text-amber-400"
            onClick={handleProcessDue}
            disabled={processing}
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", processing && "animate-spin")} />
            {processing ? "Przetwarzam…" : "Zaksięguj w budżecie"}
          </Button>
        </div>
      )}

      {/* Process result feedback */}
      {processResult && (
        <div className="flex items-center gap-2.5 rounded-lg border border-green-500/40 bg-green-500/8 px-4 py-3">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          <p className="text-sm text-green-800 dark:text-green-300">
            Przetworzono {processResult.processed} {processResult.processed === 1 ? "subskrypcję" : "subskrypcje"}.
            {processResult.booked > 0
              ? ` Dodano ${processResult.booked} ${processResult.booked === 1 ? "transakcję" : "transakcje"} do budżetu.`
              : " Brak odpowiednich okresów budżetowych — transakcje nie zostały dodane."}
          </p>
        </div>
      )}

      {/* Stats row */}
      {!isLoading && subscriptions.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Miesięcznie</p>
            <p className="mt-1 font-mono text-lg font-semibold">
              {fmt(totalMonthly.toFixed(2))} zł
            </p>
          </div>
          <div className="rounded-lg border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Rocznie</p>
            <p className="mt-1 font-mono text-lg font-semibold">
              {fmt((totalMonthly * 12).toFixed(2))} zł
            </p>
          </div>
          <div className="rounded-lg border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Aktywnych</p>
            <p className="mt-1 font-mono text-lg font-semibold flex items-center gap-2">
              {active.length}
              <span className="text-xs font-normal text-muted-foreground">subskrypcji</span>
            </p>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading && <SubscriptionListSkeleton />}

      {!isLoading && (
        <SubscriptionList subscriptions={subscriptions} categories={categories} onRefresh={() => mutate()} />
      )}

      {/* Add dialog */}
      <SubscriptionFormDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={() => { setShowAdd(false); mutate(); }}
        categories={categories}
      />
    </div>
  );
}
