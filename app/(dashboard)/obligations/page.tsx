"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp } from "lucide-react";
import {
  ObligationCard,
  ConfirmPaymentModal,
  EditPaymentModal,
  ManageObligationsPanel,
  RecurringListSkeleton,
  RecurringFormDialog,
} from "@/modules/obligations/obligations.ui";
import type { ObligationMonthItem, RecurringTemplateListItem } from "@/modules/obligations/obligations.types";
import type { BudgetCategoryView } from "@/modules/budget/budget.types";
import type { ApiResponse } from "@/types/common.types";

const MONTH_NAMES = [
  "", "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

export default function ObligationsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [confirmItem, setConfirmItem] = useState<ObligationMonthItem | null>(null);
  const [editConfirmedItem, setEditConfirmedItem] = useState<ObligationMonthItem | null>(null);
  const [editTpl, setEditTpl] = useState<RecurringTemplateListItem | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const { data: itemsRes, isLoading, mutate: mutateItems } =
    useSWR<ApiResponse<ObligationMonthItem[]>>(
      `/api/recurring/pending?year=${year}&month=${month}`
    );

  const { data: templatesRes, mutate: mutateTemplates } =
    useSWR<ApiResponse<RecurringTemplateListItem[]>>("/api/recurring");

  const { data: categoriesRes } = useSWR<ApiResponse<BudgetCategoryView[]>>("/api/budget/categories");

  const items = itemsRes?.data ?? [];
  const templates = templatesRes?.data ?? [];
  const categories = categoriesRes?.data ?? [];

  const pending = items.filter((i) => i.status === "PENDING");
  const confirmed = items.filter((i) => i.status === "CONFIRMED");
  const skipped = items.filter((i) => i.status === "SKIPPED");

  const totalConfirmed = confirmed.reduce((s, i) => s + Number(i.amount), 0);
  const totalPending = pending.reduce((s, i) => s + Number(i.defaultAmount), 0);

  function fmtPLN(n: number) {
    return n.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  async function handleSkip(item: ObligationMonthItem) {
    await fetch(`/api/recurring/${item.templateId}/skip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, month }),
    });
    mutateItems();
  }

  function handleEdit(item: ObligationMonthItem) {
    const tpl = templates.find((t) => t.id === item.templateId);
    if (tpl) setEditTpl(tpl);
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Zobowiązania</h1>
          <p className="text-sm text-muted-foreground">
            Płatności cykliczne — kredyt, rachunki, raty
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Nowe zobowiązanie
        </Button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center gap-3">
        <Button size="sm" variant="outline" onClick={prevMonth} className="h-8 w-8 p-0">‹</Button>
        <span className="text-sm font-medium min-w-[130px] text-center">
          {MONTH_NAMES[month]} {year}
        </span>
        <Button size="sm" variant="outline" onClick={nextMonth} className="h-8 w-8 p-0">›</Button>
      </div>

      {/* Summary cards */}
      {!isLoading && items.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Do zapłaty</p>
            <p className="mt-1 font-mono text-lg font-semibold text-amber-600">
              {pending.length > 0 ? `${fmtPLN(totalPending)} zł` : "—"}
            </p>
            <p className="text-[11px] text-muted-foreground">{pending.length} {pending.length === 1 ? "pozycja" : "pozycji"}</p>
          </div>
          <div className="rounded-lg border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Zapłacono</p>
            <p className="mt-1 font-mono text-lg font-semibold text-green-600">
              {confirmed.length > 0 ? `${fmtPLN(totalConfirmed)} zł` : "—"}
            </p>
            <p className="text-[11px] text-muted-foreground">{confirmed.length} {confirmed.length === 1 ? "pozycja" : "pozycji"}</p>
          </div>
          <div className="rounded-lg border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Łącznie w miesiącu</p>
            <p className="mt-1 font-mono text-lg font-semibold">
              {fmtPLN(totalConfirmed + totalPending)} zł
            </p>
            <p className="text-[11px] text-muted-foreground">{items.length} zobowiązań</p>
          </div>
        </div>
      )}

      {/* Obligations list */}
      {isLoading && <RecurringListSkeleton />}

      {!isLoading && items.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border bg-card py-12 text-muted-foreground">
          <TrendingUp className="h-10 w-10 opacity-20" />
          <div className="text-center">
            <p className="text-sm font-medium">Brak zobowiązań na {MONTH_NAMES[month]}</p>
            <p className="text-xs mt-1">Dodaj pierwsze zobowiązanie klikając przycisk powyżej</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowAdd(true)} className="gap-1.5 mt-1">
            <Plus className="h-3.5 w-3.5" /> Dodaj zobowiązanie
          </Button>
        </div>
      )}

      {!isLoading && pending.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 px-0.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Do zapłaty</p>
            <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600">{pending.length}</Badge>
          </div>
          {pending.map((item) => (
            <ObligationCard
              key={item.paymentId ?? item.templateId}
              item={item}
              onConfirm={setConfirmItem}
              onSkip={handleSkip}
              onEdit={handleEdit}
              onEditConfirmed={setEditConfirmedItem}
              categories={categories}
            />
          ))}
        </div>
      )}

      {!isLoading && confirmed.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-0.5">
            Zapłacone ({confirmed.length})
          </p>
          {confirmed.map((item) => (
            <ObligationCard
              key={item.paymentId ?? item.templateId}
              item={item}
              onConfirm={setConfirmItem}
              onSkip={handleSkip}
              onEdit={handleEdit}
              onEditConfirmed={setEditConfirmedItem}
              categories={categories}
            />
          ))}
        </div>
      )}

      {!isLoading && skipped.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-0.5">
            Pominięte ({skipped.length})
          </p>
          {skipped.map((item) => (
            <ObligationCard
              key={item.paymentId ?? item.templateId}
              item={item}
              onConfirm={setConfirmItem}
              onSkip={handleSkip}
              onEdit={handleEdit}
              onEditConfirmed={setEditConfirmedItem}
              categories={categories}
            />
          ))}
        </div>
      )}

      {/* Manage panel (collapsible) */}
      {templates.length > 0 && (
        <ManageObligationsPanel
          templates={templates}
          categories={categories}
          onRefresh={() => { mutateTemplates(); mutateItems(); }}
        />
      )}

      {/* Add dialog (from header button) */}
      <RecurringFormDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={() => { setShowAdd(false); mutateTemplates(); mutateItems(); }}
        categories={categories}
      />

      {/* Confirm modal */}
      <ConfirmPaymentModal
        open={!!confirmItem}
        item={confirmItem}
        year={year}
        month={month}
        onClose={() => setConfirmItem(null)}
        onSuccess={() => { setConfirmItem(null); mutateItems(); }}
      />

      {/* Edit confirmed payment modal */}
      <EditPaymentModal
        open={!!editConfirmedItem}
        item={editConfirmedItem}
        year={year}
        month={month}
        onClose={() => setEditConfirmedItem(null)}
        onSuccess={() => { setEditConfirmedItem(null); mutateItems(); }}
      />

      {/* Edit template dialog (from pencil icon on card) */}
      {editTpl && (
        <RecurringFormDialog
          open={!!editTpl}
          editId={editTpl.id}
          categories={categories}
          initial={{
            name: editTpl.name,
            defaultAmount: editTpl.defaultAmount,
            currency: editTpl.currency,
            category: editTpl.category,
            billingCycle: editTpl.billingCycle,
            billingDay: String(editTpl.billingDay),
            notes: editTpl.notes ?? "",
          }}
          onClose={() => setEditTpl(null)}
          onSuccess={() => { setEditTpl(null); mutateTemplates(); mutateItems(); }}
        />
      )}
    </div>
  );
}
