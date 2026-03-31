"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, Plus } from "lucide-react";
import { type SubscriptionListItem } from "./subscriptions.types";
import type { BudgetCategoryView } from "@/modules/budget/budget.types";
import { SubscriptionCard } from "./subscriptions.ui.card";
import { SubscriptionFormDialog } from "./subscriptions.ui.form";

// Public re-exports — pages import from this file only
export { BillingBadge, SubscriptionCard } from "./subscriptions.ui.card";
export { SubscriptionFormDialog } from "./subscriptions.ui.form";

// ─── SubscriptionList ─────────────────────────────────────────────────────────

export function SubscriptionList({
  subscriptions,
  onRefresh,
  categories = [],
}: {
  subscriptions: SubscriptionListItem[];
  onRefresh: () => void;
  categories?: BudgetCategoryView[];
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editSub, setEditSub] = useState<SubscriptionListItem | null>(null);

  async function handleDelete(id: string) {
    await fetch(`/api/subscriptions/${id}`, { method: "DELETE" });
    onRefresh();
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    await fetch(`/api/subscriptions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    onRefresh();
  }

  const active = subscriptions.filter((s) => s.isActive);
  const inactive = subscriptions.filter((s) => !s.isActive);

  return (
    <>
      <div className="flex flex-col gap-2">
        {active.map((sub) => (
          <SubscriptionCard
            key={sub.id}
            sub={sub}
            onDelete={handleDelete}
            onEdit={(s) => setEditSub(s)}
            onToggleActive={handleToggleActive}
            categories={categories}
          />
        ))}
        {inactive.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground mt-2 px-1">Nieaktywne ({inactive.length})</p>
            {inactive.map((sub) => (
              <SubscriptionCard
                key={sub.id}
                sub={sub}
                onDelete={handleDelete}
                onEdit={(s) => setEditSub(s)}
                onToggleActive={handleToggleActive}
                categories={categories}
              />
            ))}
          </>
        )}
        {subscriptions.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <CreditCard className="h-8 w-8 opacity-30" />
            <p className="text-sm">Brak subskrypcji</p>
            <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Dodaj pierwszą
            </Button>
          </div>
        )}
      </div>

      <SubscriptionFormDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={() => { setShowAdd(false); onRefresh(); }}
        categories={categories}
      />
      {editSub && (
        <SubscriptionFormDialog
          open={!!editSub}
          editId={editSub.id}
          categories={categories}
          initial={{
            name: editSub.name,
            amount: editSub.amount,
            currency: editSub.currency,
            category: editSub.category,
            billingCycle: editSub.billingCycle,
            billingDay: String(editSub.billingDay),
            nextBillingDate: editSub.nextBillingDate,
            trialEndsAt: editSub.trialEndsAt ?? "",
            notes: editSub.notes ?? "",
          }}
          onClose={() => setEditSub(null)}
          onSuccess={() => { setEditSub(null); onRefresh(); }}
        />
      )}
    </>
  );
}

// ─── SubscriptionListSkeleton ─────────────────────────────────────────────────

export function SubscriptionListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border px-4 py-3">
          <Skeleton className="h-8 w-8 rounded-md" />
          <div className="flex-1 flex flex-col gap-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}
