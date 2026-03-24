"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowUpRight,
  Plus,
  Trash2,
  Pencil,
} from "lucide-react";
import {
  type BudgetIncomeView,
} from "./budget.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: string | number) {
  return Number(amount).toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ─── IncomeSection ────────────────────────────────────────────────────────────

export function IncomeSection({
  periodId,
  incomes,
  onRefresh,
}: {
  periodId: string;
  incomes: BudgetIncomeView[];
  onRefresh: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addPlanned, setAddPlanned] = useState("");
  const [addActual, setAddActual] = useState("");
  const [loading, setLoading] = useState(false);

  // Full inline edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPlanned, setEditPlanned] = useState("");
  const [editActual, setEditActual] = useState("");

  function startEdit(inc: BudgetIncomeView) {
    setEditId(inc.id);
    setEditTitle(inc.title);
    setEditPlanned(Number(inc.planned).toFixed(2));
    setEditActual(inc.actual != null ? Number(inc.actual).toFixed(2) : "");
  }

  async function handleAdd() {
    if (!addTitle.trim() || !addPlanned) return;
    setLoading(true);
    const res = await fetch(`/api/budget/periods/${periodId}/incomes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: addTitle.trim(),
        planned: Number(addPlanned),
        actual: addActual ? Number(addActual) : null,
      }),
    }).then((r) => r.json());
    setLoading(false);
    if (res.error) {
      toast.error("Nie udało się dodać przychodu");
      return;
    }
    setAdding(false);
    setAddTitle("");
    setAddPlanned("");
    setAddActual("");
    toast.success("Przychód został dodany");
    onRefresh();
  }

  async function handleSaveEdit(id: string) {
    setLoading(true);
    const res = await fetch(`/api/budget/periods/${periodId}/incomes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editTitle.trim() || undefined,
        planned: editPlanned ? Number(editPlanned) : undefined,
        actual: editActual !== "" ? Number(editActual) : null,
      }),
    }).then((r) => r.json());
    setLoading(false);
    if (res.error) {
      toast.error("Nie udało się zaktualizować przychodu");
      return;
    }
    setEditId(null);
    toast.success("Przychód został zaktualizowany");
    onRefresh();
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/budget/periods/${periodId}/incomes/${id}`, {
      method: "DELETE",
    }).then((r) => r.json());
    if (res.error) {
      toast.error("Nie udało się usunąć przychodu");
      return;
    }
    toast.success("Przychód został usunięty");
    onRefresh();
  }

  const totalActual = incomes.reduce((s, i) => s + Number(i.actual ?? 0), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <ArrowUpRight className="h-4 w-4 text-green-600" />
            Przychody
          </CardTitle>
          {!adding && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAdding(true)}
              className="h-7 gap-1 text-xs border-primary/60 text-primary hover:bg-primary/10 hover:text-primary"
            >
              <Plus className="h-3 w-3" /> Dodaj
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pt-0">
        {incomes.map((inc) => (
          <div key={inc.id}>
            {editId === inc.id ? (
              /* ─── Inline edit form ─────────────────────────── */
              <div className="flex flex-col gap-2.5 rounded-lg border border-primary/25 bg-primary/5 p-3">
                <Input
                  placeholder="Nazwa przychodu"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="h-8 text-sm bg-background"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Planowana kwota
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={editPlanned}
                        onChange={(e) => setEditPlanned(e.target.value)}
                        className="h-8 text-sm pr-7 bg-background"
                        min="0"
                        step="0.01"
                      />
                      <span className="absolute right-2.5 top-1.5 text-xs text-muted-foreground pointer-events-none">
                        zł
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Wpłynęło
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={editActual}
                        onChange={(e) => setEditActual(e.target.value)}
                        className="h-8 text-sm pr-7 bg-background"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                      <span className="absolute right-2.5 top-1.5 text-xs text-muted-foreground pointer-events-none">
                        zł
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-8 text-xs flex-1"
                    disabled={loading || !editTitle.trim() || !editPlanned}
                    onClick={() => handleSaveEdit(inc.id)}
                  >
                    {loading ? "Zapisuję…" : "Zapisz zmiany"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => setEditId(null)}
                  >
                    Anuluj
                  </Button>
                </div>
              </div>
            ) : (
              /* ─── Read row ────────────────────────────────────── */
              <div className="flex items-center justify-between rounded-lg bg-muted/30 border border-border/40 px-3 py-2 gap-3 hover:bg-muted/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{inc.title}</p>
                  <div className="flex items-center gap-2.5 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      Plan: <span className="font-mono">{fmt(inc.planned)} zł</span>
                    </span>
                    {inc.actual != null ? (
                      <span className="text-xs font-medium text-green-600">
                        ✓ {fmt(inc.actual)} zł
                      </span>
                    ) : (
                      <span className="text-xs text-amber-500/90">oczekuje</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1 border-primary/60 text-primary hover:bg-primary/10 hover:text-primary"
                    onClick={() => startEdit(inc)}
                  >
                    <Pencil className="h-3 w-3" />
                    Edytuj
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(inc.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}

        {incomes.length === 0 && !adding && (
          <p className="text-xs text-muted-foreground text-center py-3">
            Brak przychodów — kliknij Dodaj, aby dodać pierwszy
          </p>
        )}

        {/* ─── Add form ─────────────────────────────────────── */}
        {adding && (
          <div className="flex flex-col gap-2.5 rounded-lg border border-primary/25 bg-primary/5 p-3">
            <Input
              placeholder="Nazwa (np. Wynagrodzenie)"
              value={addTitle}
              onChange={(e) => setAddTitle(e.target.value)}
              className="h-8 text-sm bg-background"
              autoFocus
            />
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Planowana kwota
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={addPlanned}
                    onChange={(e) => setAddPlanned(e.target.value)}
                    className="h-8 text-sm pr-7 bg-background"
                    min="0"
                    step="0.01"
                  />
                  <span className="absolute right-2.5 top-1.5 text-xs text-muted-foreground pointer-events-none">
                    zł
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Wpłynęło (opcjonalne)
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={addActual}
                    onChange={(e) => setAddActual(e.target.value)}
                    className="h-8 text-sm pr-7 bg-background"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                  <span className="absolute right-2.5 top-1.5 text-xs text-muted-foreground pointer-events-none">
                    zł
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-8 text-xs flex-1"
                disabled={loading || !addTitle.trim() || !addPlanned}
                onClick={handleAdd}
              >
                {loading ? "Dodaję…" : "Dodaj przychód"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => {
                  setAdding(false);
                  setAddTitle("");
                  setAddPlanned("");
                  setAddActual("");
                }}
              >
                Anuluj
              </Button>
            </div>
          </div>
        )}

        {/* ─── Total bar ──────────────────────────────────────── */}
        {incomes.length > 0 && (
          <div className="flex justify-between items-center border-t pt-2 mt-1">
            <span className="text-xs text-muted-foreground">Suma faktyczna</span>
            <span className="font-mono text-sm font-semibold text-green-600">
              {fmt(totalActual.toFixed(2))} zł
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
