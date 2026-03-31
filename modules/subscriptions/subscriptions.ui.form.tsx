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
import {
  BILLING_CYCLE_LABELS,
  type SubscriptionListItem,
} from "./subscriptions.types";
import type { BudgetCategoryView } from "@/modules/budget/budget.types";
import type { BillingCycle } from "@prisma/client";
import type { ApiResponse } from "@/types/common.types";

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
