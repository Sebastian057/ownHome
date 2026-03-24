"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ChevronDown, ChevronUp, Settings2, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { type RecurringTemplateListItem } from "./obligations.types";
import { BILLING_CYCLE_LABELS } from "@/modules/subscriptions/subscriptions.types";
import type { BudgetCategoryView } from "@/modules/budget/budget.types";
import { RecurringFormDialog } from "./obligations.ui.forms";
import { getCatLabel } from "./obligations.ui.card";

// Public re-exports — pages import from this file only
export { ObligationCard } from "./obligations.ui.card";
export { RecurringFormDialog, ConfirmPaymentModal, EditPaymentModal } from "./obligations.ui.forms";

// ─── Helpers (local) ──────────────────────────────────────────────────────────

function fmt(amount: string) {
  return Number(amount).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── TemplateRow — compact row inside ManageObligationsPanel ─────────────────

function TemplateRow({
  tpl,
  onDelete,
  onEdit,
  categories = [],
}: {
  tpl: RecurringTemplateListItem;
  onDelete: (id: string) => void;
  onEdit: (tpl: RecurringTemplateListItem) => void;
  categories?: BudgetCategoryView[];
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className={cn(
      "flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5",
      !tpl.isActive && "opacity-50"
    )}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium truncate">{tpl.name}</p>
          {!tpl.isActive && <Badge variant="secondary" className="text-[10px]">Nieaktywna</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">
          {getCatLabel(categories, tpl.category)} · {BILLING_CYCLE_LABELS[tpl.billingCycle]} · {tpl.billingDay}. dnia
        </p>
      </div>
      <span className="font-mono text-sm shrink-0">{fmt(tpl.defaultAmount)} {tpl.currency}</span>
      <div className="flex gap-1 shrink-0">
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onEdit(tpl)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        {confirming ? (
          <div className="flex gap-1">
            <Button size="sm" variant="destructive" className="h-7 text-xs px-2" onClick={() => onDelete(tpl.id)}>Usuń</Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setConfirming(false)}>Nie</Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => setConfirming(true)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── ManageObligationsPanel — collapsible add/edit/delete panel ───────────────

export function ManageObligationsPanel({
  templates,
  onRefresh,
  categories = [],
}: {
  templates: RecurringTemplateListItem[];
  onRefresh: () => void;
  categories?: BudgetCategoryView[];
}) {
  const [open, setOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editTpl, setEditTpl] = useState<RecurringTemplateListItem | null>(null);

  async function handleDelete(id: string) {
    await fetch(`/api/recurring/${id}`, { method: "DELETE" });
    onRefresh();
  }

  const active = templates.filter((t) => t.isActive);
  const inactive = templates.filter((t) => !t.isActive);

  return (
    <div className="rounded-lg border bg-card">
      {/* Toggle header */}
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Zarządzaj zobowiązaniami</span>
          <Badge variant="secondary" className="text-[10px]">{active.length} aktywnych</Badge>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {/* Expanded content */}
      {open && (
        <div className="border-t px-4 pb-4 pt-3 flex flex-col gap-2">
          {active.map((tpl) => (
            <TemplateRow key={tpl.id} tpl={tpl} onDelete={handleDelete} onEdit={setEditTpl} categories={categories} />
          ))}
          {inactive.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground mt-1 px-0.5">Nieaktywne ({inactive.length})</p>
              {inactive.map((tpl) => (
                <TemplateRow key={tpl.id} tpl={tpl} onDelete={handleDelete} onEdit={setEditTpl} categories={categories} />
              ))}
            </>
          )}
          {templates.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">Brak zobowiązań — dodaj pierwsze</p>
          )}
          <Button
            size="sm"
            variant="outline"
            className="mt-1 gap-1.5 self-start"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="h-3.5 w-3.5" /> Dodaj zobowiązanie
          </Button>
        </div>
      )}

      <RecurringFormDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={() => { setShowAdd(false); onRefresh(); }}
        categories={categories}
      />
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
          onSuccess={() => { setEditTpl(null); onRefresh(); }}
        />
      )}
    </div>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

export function RecurringListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border px-4 py-3">
          <Skeleton className="h-8 w-8 rounded-md" />
          <div className="flex-1 flex flex-col gap-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-7 w-24" />
        </div>
      ))}
    </div>
  );
}
