"use client";

import { useState } from "react";
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
import {
  Plus, Trash2, Pencil, TrendingUp, CheckCircle2, XCircle,
  AlertCircle, ChevronDown, ChevronUp, Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type RecurringTemplateListItem,
  type ObligationMonthItem,
} from "./obligations.types";
import { BILLING_CYCLE_LABELS } from "@/modules/subscriptions/subscriptions.types";
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

// ─── RecurringFormDialog — add / edit obligation template ─────────────────────

interface RecurringFormData {
  name: string;
  defaultAmount: string;
  currency: string;
  category: string;
  billingCycle: string;
  billingDay: string;
  notes: string;
}

const EMPTY_FORM: RecurringFormData = {
  name: "", defaultAmount: "", currency: "PLN", category: "",
  billingCycle: "MONTHLY", billingDay: "1", notes: "",
};

export function RecurringFormDialog({
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
  initial?: Partial<RecurringFormData>;
  editId?: string;
  categories?: BudgetCategoryView[];
}) {
  const [form, setForm] = useState<RecurringFormData>({ ...EMPTY_FORM, ...initial });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof RecurringFormData, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.defaultAmount || !form.category) return;
    setLoading(true);
    setError(null);

    const body = {
      name: form.name.trim(),
      defaultAmount: Number(form.defaultAmount),
      currency: form.currency,
      category: form.category,
      billingCycle: form.billingCycle,
      billingDay: Number(form.billingDay),
      notes: form.notes || null,
    };

    const url = editId ? `/api/recurring/${editId}` : "/api/recurring";
    const method = editId ? "PUT" : "POST";

    const res: ApiResponse<RecurringTemplateListItem> = await fetch(url, {
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
          <DialogTitle>{editId ? "Edytuj zobowiązanie" : "Nowe zobowiązanie"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-1">
          <div className="flex flex-col gap-1.5">
            <Label>Nazwa</Label>
            <Input placeholder="np. Kredyt hipoteczny" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Domyślna kwota</Label>
              <Input type="number" min="0.01" step="0.01" placeholder="0.00" value={form.defaultAmount} onChange={(e) => set("defaultAmount", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Waluta</Label>
              <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["PLN", "EUR", "USD"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
              <Label>Cykl</Label>
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
          <div className="flex flex-col gap-1.5">
            <Label>Notatki (opcjonalne)</Label>
            <Textarea placeholder="Dodatkowe informacje..." rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
          {error && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Anuluj</Button>
          <Button disabled={loading || !form.name.trim() || !form.defaultAmount || !form.category} onClick={handleSubmit}>
            {loading ? "Zapisywanie..." : editId ? "Zapisz zmiany" : "Dodaj zobowiązanie"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── ConfirmPaymentModal ──────────────────────────────────────────────────────

export function ConfirmPaymentModal({
  open,
  item,
  onClose,
  onSuccess,
  year,
  month,
}: {
  open: boolean;
  item: ObligationMonthItem | null;
  onClose: () => void;
  onSuccess: () => void;
  year: number;
  month: number;
}) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!item) return null;

  async function handleConfirm() {
    if (!item) return;
    setLoading(true);
    setError(null);
    const res: ApiResponse<ObligationMonthItem> = await fetch(
      `/api/recurring/${item.templateId}/confirm?year=${year}&month=${month}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amount ? Number(amount) : undefined,
          date,
        }),
      }
    ).then((r) => r.json());
    setLoading(false);
    if (res.error) { setError(res.error.message); return; }
    setAmount(""); setDate(new Date().toISOString().slice(0, 10));
    onSuccess();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Potwierdź płatność</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-1">
          <div className="rounded-lg bg-muted/50 px-3 py-2.5">
            <p className="text-sm font-medium">{item.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Termin: {item.dueDate.split("-").reverse().join(".")}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Kwota rzeczywista</Label>
            <Input
              type="number" min="0.01" step="0.01"
              placeholder={`Domyślnie: ${fmt(item.defaultAmount)} ${item.currency}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground">
              Zostaw puste, aby użyć kwoty domyślnej ({fmt(item.defaultAmount)} {item.currency})
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Data płatności</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          {error && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Anuluj</Button>
          <Button disabled={loading} onClick={handleConfirm}>
            {loading ? "Zapisywanie..." : "Potwierdź zapłatę"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── EditPaymentModal — edit or unconfirm a confirmed payment ─────────────────

export function EditPaymentModal({
  open,
  item,
  onClose,
  onSuccess,
  year,
  month,
}: {
  open: boolean;
  item: ObligationMonthItem | null;
  onClose: () => void;
  onSuccess: () => void;
  year: number;
  month: number;
}) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [unconfirmLoading, setUnconfirmLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!item) return null;

  async function handleSaveAmount() {
    if (!item || !amount) return;
    setLoading(true);
    setError(null);

    // Unconfirm first, then re-confirm with new amount
    const unconfirmRes = await fetch(
      `/api/recurring/${item.templateId}/unconfirm?year=${year}&month=${month}`,
      { method: "DELETE" }
    ).then((r) => r.json());

    if (unconfirmRes.error) { setError(unconfirmRes.error.message); setLoading(false); return; }

    const confirmRes: ApiResponse<ObligationMonthItem> = await fetch(
      `/api/recurring/${item.templateId}/confirm?year=${year}&month=${month}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount) }),
      }
    ).then((r) => r.json());

    setLoading(false);
    if (confirmRes.error) { setError(confirmRes.error.message); return; }
    setAmount("");
    onSuccess();
    onClose();
  }

  async function handleUnconfirm() {
    if (!item) return;
    setUnconfirmLoading(true);
    setError(null);
    const res = await fetch(
      `/api/recurring/${item.templateId}/unconfirm?year=${year}&month=${month}`,
      { method: "DELETE" }
    ).then((r) => r.json());
    setUnconfirmLoading(false);
    if (res.error) { setError(res.error.message); return; }
    onSuccess();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edytuj płatność</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-1">
          <div className="rounded-lg bg-muted/50 px-3 py-2.5">
            <p className="text-sm font-medium">{item.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Zapłacono: <span className="font-medium text-foreground">{Number(item.amount).toLocaleString("pl-PL", { minimumFractionDigits: 2 })} {item.currency}</span>
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Zmień kwotę</Label>
            <Input
              type="number" min="0.01" step="0.01"
              placeholder={`Obecna: ${Number(item.amount).toLocaleString("pl-PL", { minimumFractionDigits: 2 })} ${item.currency}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
          </div>
          {error && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{error}</p>}
          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground mb-2">lub cofnij potwierdzenie i oznacz jako oczekującą:</p>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-amber-600 border-amber-500/40 hover:bg-amber-500/10"
              disabled={unconfirmLoading}
              onClick={handleUnconfirm}
            >
              {unconfirmLoading ? "Cofanie..." : "Cofnij potwierdzenie → Wróć do «Do zapłaty»"}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Anuluj</Button>
          <Button disabled={loading || !amount} onClick={handleSaveAmount}>
            {loading ? "Zapisywanie..." : "Zapisz nową kwotę"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
