"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Pencil, CreditCard, AlertCircle, Power } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BILLING_CYCLE_LABELS,
  type SubscriptionListItem,
} from "./subscriptions.types";
import type { BudgetCategoryView } from "@/modules/budget/budget.types";
import type { BillingCycle } from "@prisma/client";
import type { ApiResponse } from "@/types/common.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: string) {
  return Number(amount).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getCatLabel(categories: BudgetCategoryView[], slug: string): string {
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

// ─── SubscriptionFormDialog ───────────────────────────────────────────────────

interface SubFormData {
  name: string;
  amount: string;
  currency: string;
  category: string;
  billingCycle: string;
  billingDay: string;
  nextBillingDate: string;
  trialEndsAt: string;
  notes: string;
}

const EMPTY_FORM: SubFormData = {
  name: "", amount: "", currency: "PLN", category: "",
  billingCycle: "MONTHLY", billingDay: "1",
  nextBillingDate: new Date().toISOString().slice(0, 10),
  trialEndsAt: "", notes: "",
};

export function SubscriptionFormDialog({
  open,
  onClose,
  onSuccess,
  initial,
  editId,
  categories = [],
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initial?: Partial<SubFormData>;
  editId?: string;
  categories?: BudgetCategoryView[];
}) {
  const [form, setForm] = useState<SubFormData>({ ...EMPTY_FORM, ...initial });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof SubFormData, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.amount || !form.category) return;
    setLoading(true);
    setError(null);

    const body = {
      name: form.name.trim(),
      amount: Number(form.amount),
      currency: form.currency,
      category: form.category,
      billingCycle: form.billingCycle,
      billingDay: Number(form.billingDay),
      nextBillingDate: form.nextBillingDate,
      trialEndsAt: form.trialEndsAt || null,
      notes: form.notes || null,
    };

    const url = editId ? `/api/subscriptions/${editId}` : "/api/subscriptions";
    const method = editId ? "PUT" : "POST";

    const res: ApiResponse<SubscriptionListItem> = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.json());

    setLoading(false);
    if (res.error) { setError(res.error.message); return; }
    onSuccess();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editId ? "Edytuj subskrypcję" : "Nowa subskrypcja"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-1 max-h-[70vh] overflow-y-auto pr-1">
          <div className="flex flex-col gap-1.5">
            <Label>Nazwa</Label>
            <Input placeholder="np. Netflix" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Kwota</Label>
              <Input type="number" min="0.01" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => set("amount", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Waluta</Label>
              <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["PLN", "EUR", "USD", "GBP"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Kategoria</Label>
            <Select value={form.category} onValueChange={(v) => set("category", v)}>
              <SelectTrigger><SelectValue placeholder="Wybierz..." /></SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.slug} value={cat.slug}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Cykl rozliczeniowy</Label>
              <Select value={form.billingCycle} onValueChange={(v) => set("billingCycle", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(BILLING_CYCLE_LABELS) as BillingCycle[]).map((c) => (
                    <SelectItem key={c} value={c}>{BILLING_CYCLE_LABELS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Dzień miesiąca</Label>
              <Input type="number" min="1" max="28" value={form.billingDay} onChange={(e) => set("billingDay", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Następna data</Label>
              <Input type="date" value={form.nextBillingDate} onChange={(e) => set("nextBillingDate", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Koniec trialu (opcjonalne)</Label>
              <Input type="date" value={form.trialEndsAt} onChange={(e) => set("trialEndsAt", e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Notatki (opcjonalne)</Label>
            <Textarea placeholder="Dodatkowe informacje..." rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
          {error && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Anuluj</Button>
          <Button disabled={loading || !form.name.trim() || !form.amount || !form.category} onClick={handleSubmit}>
            {loading ? "Zapisywanie..." : editId ? "Zapisz zmiany" : "Dodaj subskrypcję"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
