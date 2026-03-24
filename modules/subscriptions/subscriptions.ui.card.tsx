"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Trash2, Pencil, Power } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BILLING_CYCLE_LABELS,
  type SubscriptionListItem,
} from "./subscriptions.types";
import type { BudgetCategoryView } from "@/modules/budget/budget.types";
import type { BillingCycle } from "@prisma/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: string) {
  return Number(amount).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function getCatLabel(categories: BudgetCategoryView[], slug: string): string {
  return categories.find((c) => c.slug === slug)?.label ?? slug;
}

// ─── BillingBadge ─────────────────────────────────────────────────────────────

export function BillingBadge({
  daysUntilBilling,
  cycle,
}: {
  daysUntilBilling: number;
  cycle: BillingCycle;
}) {
  const urgent = daysUntilBilling <= 3;
  const soon = daysUntilBilling <= 7;

  return (
    <div className="flex flex-col items-end gap-0.5">
      <Badge
        variant={urgent ? "destructive" : soon ? "default" : "secondary"}
        className="text-[10px]"
      >
        {daysUntilBilling < 0
          ? "Zaległe"
          : daysUntilBilling === 0
          ? "Dziś"
          : daysUntilBilling === 1
          ? "Jutro"
          : `Za ${daysUntilBilling} dni`}
      </Badge>
      <span className="text-[10px] text-muted-foreground">{BILLING_CYCLE_LABELS[cycle]}</span>
    </div>
  );
}

// ─── SubscriptionCard ─────────────────────────────────────────────────────────

export function SubscriptionCard({
  sub,
  onDelete,
  onEdit,
  onToggleActive,
  categories = [],
}: {
  sub: SubscriptionListItem;
  onDelete: (id: string) => void;
  onEdit: (sub: SubscriptionListItem) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  categories?: BudgetCategoryView[];
}) {
  const [confirming, setConfirming] = useState(false);
  const isOverdue = sub.isActive && sub.daysUntilBilling < 0;

  return (
    <div className={cn(
      "flex items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-colors",
      !sub.isActive && "opacity-50",
      isOverdue && "border-amber-500/40 bg-amber-500/5"
    )}>
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
        isOverdue ? "bg-amber-500/15" : "bg-primary/10"
      )}>
        <CreditCard className={cn("h-4 w-4", isOverdue ? "text-amber-600" : "text-primary")} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{sub.name}</p>
          {!sub.isActive && <Badge variant="secondary" className="text-[10px]">Nieaktywna</Badge>}
          {isOverdue && <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-600">Do zaksięgowania</Badge>}
          {sub.trialEndsAt && <Badge variant="outline" className="text-[10px]">Trial</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">
          {getCatLabel(categories, sub.category)} · {sub.nextBillingDate.slice(0, 10).split("-").reverse().join(".")}
        </p>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <p className="font-mono text-sm font-semibold">
          {fmt(sub.amount)} {sub.currency}
        </p>
        <BillingBadge daysUntilBilling={sub.daysUntilBilling} cycle={sub.billingCycle} />
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "h-7 w-7 p-0",
              sub.isActive ? "text-green-600 hover:text-muted-foreground" : "text-muted-foreground hover:text-green-600"
            )}
            title={sub.isActive ? "Dezaktywuj" : "Aktywuj"}
            onClick={() => onToggleActive(sub.id, !sub.isActive)}
          >
            <Power className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onEdit(sub)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {confirming ? (
            <div className="flex items-center gap-1">
              <Button size="sm" variant="destructive" className="h-7 text-xs px-2" onClick={() => onDelete(sub.id)}>
                Usuń
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setConfirming(false)}>
                Nie
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => setConfirming(true)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
