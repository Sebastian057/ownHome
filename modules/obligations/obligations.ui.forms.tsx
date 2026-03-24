"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { AlertCircle } from "lucide-react";
import { type RecurringTemplateListItem, type ObligationMonthItem } from "./obligations.types";
import { BILLING_CYCLE_LABELS } from "@/modules/subscriptions/subscriptions.types";
import type { BudgetCategoryView } from "@/modules/budget/budget.types";
import type { BillingCycle } from "@prisma/client";
import type { ApiResponse } from "@/types/common.types";

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

  function fmt(val: string) {
    return Number(val).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

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
