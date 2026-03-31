"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, CheckCircle2, XCircle, Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type ObligationMonthItem } from "./obligations.types";
import type { BudgetCategoryView } from "@/modules/budget/budget.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: string) {
  return Number(amount).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function getCatLabel(categories: BudgetCategoryView[], slug: string): string {
  return categories.find((c) => c.slug === slug)?.label ?? slug;
}

// ─── ObligationCard — single obligation row in monthly view ───────────────────

export function ObligationCard({
  item,
  onConfirm,
  onSkip,
  onEdit,
  onEditConfirmed,
  categories = [],
}: {
  item: ObligationMonthItem;
  onConfirm: (item: ObligationMonthItem) => void;
  onSkip: (item: ObligationMonthItem) => void;
  onEdit: (item: ObligationMonthItem) => void;
  onEditConfirmed: (item: ObligationMonthItem) => void;
  categories?: BudgetCategoryView[];
}) {
  const isPending = item.status === "PENDING";
  const isConfirmed = item.status === "CONFIRMED";
  const isSkipped = item.status === "SKIPPED";

  return (
    <div className={cn(
      "flex items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-colors",
      isConfirmed && "border-green-500/25 bg-green-500/5 opacity-80",
      isSkipped && "opacity-40",
    )}>
      {/* Status icon */}
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
        isPending && "bg-amber-500/15",
        isConfirmed && "bg-green-500/15",
        isSkipped && "bg-muted",
      )}>
        {isConfirmed ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ) : isSkipped ? (
          <XCircle className="h-4 w-4 text-muted-foreground" />
        ) : (
          <TrendingUp className="h-4 w-4 text-amber-600" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{item.name}</p>
          {isPending && (
            <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600 shrink-0">
              Do zapłaty
            </Badge>
          )}
          {isConfirmed && (
            <Badge variant="outline" className="text-[10px] border-green-500/40 text-green-600 shrink-0">
              Zapłacono
            </Badge>
          )}
          {isSkipped && (
            <Badge variant="secondary" className="text-[10px] shrink-0">Pominięto</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {getCatLabel(categories, item.category)} · termin: {item.dueDate.split("-").reverse().join(".")}
          {isConfirmed && item.confirmedAt && (
            <span className="ml-1.5 text-green-600/70">
              · zapłacono {new Date(item.confirmedAt).toLocaleDateString("pl-PL", { day: "numeric", month: "short" })}
            </span>
          )}
        </p>
      </div>

      {/* Amount + actions */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <p className={cn("font-mono text-sm font-semibold", isConfirmed && "text-green-700 dark:text-green-400")}>
            {fmt(isConfirmed ? item.amount : item.defaultAmount)} {item.currency}
          </p>
          {isConfirmed && item.amount !== item.defaultAmount && (
            <p className="text-[10px] text-muted-foreground line-through">{fmt(item.defaultAmount)}</p>
          )}
        </div>

        <div className="flex gap-1">
          {/* Template edit — always visible */}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="Edytuj zobowiązanie (szablon)"
            onClick={() => onEdit(item)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>

          {isPending && (
            <>
              <Button
                size="sm"
                className="h-7 text-xs px-3 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => onConfirm(item)}
              >
                Zapłacono
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs px-2 text-muted-foreground"
                onClick={() => onSkip(item)}
              >
                Pomiń
              </Button>
            </>
          )}

          {(isConfirmed || isSkipped) && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs px-2"
              onClick={() => onEditConfirmed(item)}
            >
              Zmień
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
