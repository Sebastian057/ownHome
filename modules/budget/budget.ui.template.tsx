"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Trash2,
} from "lucide-react";
import {
  type BudgetTemplateView,
  type TemplateIncomeView,
} from "./budget.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: string | number) {
  return Number(amount).toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─── ColorDot ─────────────────────────────────────────────────────────────────

function ColorDot({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, backgroundColor: color }}
    />
  );
}

// ─── BudgetTemplateEditor ─────────────────────────────────────────────────────

export function BudgetTemplateEditor({
  template,
  onRefresh,
}: {
  template: BudgetTemplateView;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <TemplateIncomesSection template={template} onRefresh={onRefresh} />
      <TemplateExpensesSection template={template} onRefresh={onRefresh} />
    </div>
  );
}

// ─── TemplateIncomesSection ───────────────────────────────────────────────────

function TemplateIncomesSection({
  template,
  onRefresh,
}: {
  template: BudgetTemplateView;
  onRefresh: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAmount, setEditAmount] = useState("");

  async function handleAdd() {
    const amount = parseFloat(addAmount);
    if (!addTitle.trim() || isNaN(amount) || amount <= 0) return;
    setSaving(true);
    await fetch("/api/budget/template/incomes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: addTitle.trim(), amount }),
    });
    setSaving(false);
    setAddTitle("");
    setAddAmount("");
    setShowAdd(false);
    onRefresh();
  }

  function startEdit(inc: TemplateIncomeView) {
    setEditingId(inc.id);
    setEditTitle(inc.title);
    setEditAmount(inc.amount);
  }

  async function handleEditSave(id: string) {
    const amount = parseFloat(editAmount);
    if (!editTitle.trim() || isNaN(amount) || amount <= 0) return;
    setSaving(true);
    await fetch(`/api/budget/template/incomes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle.trim(), amount }),
    });
    setSaving(false);
    setEditingId(null);
    onRefresh();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/budget/template/incomes/${id}`, { method: "DELETE" });
    onRefresh();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-green-600" />
            Planowane przychody
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAdd(true)}
            className="h-7 gap-1 text-xs"
          >
            <Plus className="h-3 w-3" /> Dodaj
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {template.incomes.length === 0 && !showAdd && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Brak zaplanowanych przychodów. Dodaj pierwsze źródło przychodu.
          </p>
        )}

        {template.incomes.map((inc) => (
          <div key={inc.id} className="flex items-center gap-2 py-1">
            {editingId === inc.id ? (
              <>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="h-8 flex-1 text-sm"
                  placeholder="Nazwa przychodu"
                />
                <Input
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="h-8 w-28 text-sm font-mono"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Kwota"
                />
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={() => handleEditSave(inc.id)}
                  disabled={saving}
                >
                  Zapisz
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2"
                  onClick={() => setEditingId(null)}
                >
                  Anuluj
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm">{inc.title}</span>
                <span className="font-mono text-sm text-green-700 dark:text-green-400">
                  {fmt(inc.amount)} zł
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() => startEdit(inc)}
                >
                  Edytuj
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(inc.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        ))}

        {showAdd && (
          <div className="flex items-center gap-2 py-1 mt-1 border-t pt-3">
            <Input
              value={addTitle}
              onChange={(e) => setAddTitle(e.target.value)}
              className="h-8 flex-1 text-sm"
              placeholder="Nazwa przychodu (np. Wynagrodzenie)"
              autoFocus
            />
            <Input
              value={addAmount}
              onChange={(e) => setAddAmount(e.target.value)}
              className="h-8 w-28 text-sm font-mono"
              type="number"
              min="0"
              step="0.01"
              placeholder="Kwota"
            />
            <Button
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={handleAdd}
              disabled={saving}
            >
              {saving ? "..." : "Dodaj"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2"
              onClick={() => setShowAdd(false)}
            >
              Anuluj
            </Button>
          </div>
        )}

        {template.incomes.length > 0 && (
          <div className="flex justify-end border-t pt-2 mt-1">
            <span className="text-sm font-medium">
              Suma:{" "}
              <span className="font-mono text-green-700 dark:text-green-400">
                {fmt(
                  template.incomes
                    .reduce((s, i) => s + Number(i.amount), 0)
                    .toFixed(2)
                )}{" "}
                zł
              </span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── TemplateExpensesSection ──────────────────────────────────────────────────

function TemplateExpensesSection({
  template,
  onRefresh,
}: {
  template: BudgetTemplateView;
  onRefresh: () => void;
}) {
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(template.expenses.map((e) => [e.category, e.amount]))
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleChange(category: string, value: string) {
    setAmounts((prev) => ({ ...prev, [category]: value }));
    setDirty(true);
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    const expenses = template.expenses.map((exp) => ({
      category: exp.category,
      amount: parseFloat(amounts[exp.category] ?? "0") || 0,
    }));
    await fetch("/api/budget/template/expenses", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expenses }),
    });
    setSaving(false);
    setDirty(false);
    setSaved(true);
    onRefresh();
    setTimeout(() => setSaved(false), 2000);
  }

  const total = template.expenses.reduce(
    (s, exp) => s + (parseFloat(amounts[exp.category] ?? "0") || 0),
    0
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowDownLeft className="h-4 w-4 text-destructive" />
            Planowane wydatki per kategoria
          </CardTitle>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!dirty || saving}
            className="h-7 px-3 text-xs"
          >
            {saving ? "Zapisywanie..." : saved ? "✓ Zapisano" : "Zapisz zmiany"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Wpisz 0 aby pominąć kategorię. Kwoty są automatycznie kopiowane do
          nowego miesiąca.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {template.expenses.map((exp) => (
            <div key={exp.category} className="flex items-center gap-3 py-1">
              <ColorDot color={exp.color} size={8} />
              <span className="text-sm flex-1 min-w-0 truncate">{exp.label}</span>
              <div className="relative flex items-center">
                <Input
                  value={amounts[exp.category] ?? "0"}
                  onChange={(e) => handleChange(exp.category, e.target.value)}
                  className="h-8 w-28 text-sm font-mono pr-8"
                  type="number"
                  min="0"
                  step="0.01"
                />
                <span className="absolute right-2 text-xs text-muted-foreground pointer-events-none">
                  zł
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center border-t pt-3 mt-3">
          <span className="text-sm text-muted-foreground">
            Suma planowanych wydatków
          </span>
          <span className="font-mono font-semibold text-destructive">
            {fmt(total.toFixed(2))} zł
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
