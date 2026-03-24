"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Pencil,
  X,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  type BudgetCategoryView,
  type BudgetCategoryPlanView,
  type CategorySummaryItem,
} from "./budget.types";
import type { ApiResponse } from "@/types/common.types";

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

// ─── CategoryTable (legacy — alias BudgetSummaryTable) ────────────────────────

export function CategoryTable({ items }: { items: CategorySummaryItem[] }) {
  // Import BudgetSummaryTable from summary file to avoid duplication
  // This alias is kept for backwards compatibility
  const visible = items.filter(
    (i) => Number(i.planned) > 0 || Number(i.actual) > 0
  );

  if (visible.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Kategorie wydatków</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground text-center py-4">
            Brak kategorii z planem lub wydatkami
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalPlanned = visible.reduce((s, i) => s + Number(i.planned), 0);
  const totalActual = visible.reduce((s, i) => s + Number(i.actual), 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Kategorie wydatków</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 text-xs text-muted-foreground">
              <th className="text-left py-2 px-4 font-medium">Kategoria</th>
              <th className="text-right py-2 px-4 font-medium">Plan</th>
              <th className="text-right py-2 px-4 font-medium">Rzeczywiste</th>
              <th className="text-right py-2 px-4 font-medium">Różnica</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {visible.map((item) => {
              const diff = Number(item.difference);
              const isOverspent = diff > 0 && Number(item.planned) > 0;
              const progress =
                Number(item.planned) > 0
                  ? Math.min(100, (Number(item.actual) / Number(item.planned)) * 100)
                  : 0;

              return (
                <tr
                  key={item.category}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2">
                      <ColorDot color={item.color} />
                      <span>{item.label}</span>
                    </div>
                    {Number(item.planned) > 0 && (
                      <div className="mt-1 h-1 w-full max-w-[160px] bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            isOverspent ? "bg-destructive" : "bg-primary"
                          )}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-xs text-muted-foreground">
                    {Number(item.planned) > 0 ? `${fmt(item.planned)} zł` : "—"}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-xs">
                    {Number(item.actual) > 0 ? `${fmt(item.actual)} zł` : "—"}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-xs">
                    {Number(item.planned) > 0 && Number(item.actual) > 0 ? (
                      <span className={isOverspent ? "text-destructive font-medium" : "text-green-600"}>
                        {isOverspent ? "+" : ""}
                        {fmt(item.difference)} zł
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-muted/20 text-xs font-medium">
              <td className="py-2 px-4 text-muted-foreground">Suma</td>
              <td className="py-2 px-4 text-right font-mono">
                {fmt(totalPlanned.toFixed(2))} zł
              </td>
              <td className="py-2 px-4 text-right font-mono">
                {fmt(totalActual.toFixed(2))} zł
              </td>
              <td
                className={cn(
                  "py-2 px-4 text-right font-mono",
                  totalActual > totalPlanned ? "text-destructive" : "text-green-600"
                )}
              >
                {totalActual > totalPlanned ? "+" : ""}
                {fmt((totalActual - totalPlanned).toFixed(2))} zł
              </td>
            </tr>
          </tfoot>
        </table>
      </CardContent>
    </Card>
  );
}

// ─── PlannedExpensesTable ─────────────────────────────────────────────────────

export function PlannedExpensesTable({
  items,
  periodId,
  categories = [],
  onRefresh,
}: {
  items: BudgetCategoryPlanView[];
  periodId?: string;
  categories?: BudgetCategoryView[];
  onRefresh?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = items.filter((i) => Number(i.planned) > 0);
  const total = visible.reduce((s, i) => s + Number(i.planned), 0);

  // Resolve category info: merge existing plans + all available categories
  // so edit mode shows all categories, not just those with plans > 0
  const allCategoryRows = categories.length > 0 ? categories : items.map((i) => ({
    id: i.id,
    slug: i.category,
    label: i.label,
    color: i.color,
    isSystem: true,
    isActive: true,
    sortOrder: 0,
  }));

  function enterEditMode() {
    const init: Record<string, string> = {};
    allCategoryRows.forEach((cat) => {
      const plan = items.find((i) => i.category === cat.slug);
      init[cat.slug] = plan ? Number(plan.planned).toFixed(2) : "0";
    });
    setAmounts(init);
    setEditing(true);
    setOpen(true);
    setError(null);
  }

  function cancelEdit() {
    setEditing(false);
    setError(null);
  }

  async function handleSave() {
    if (!periodId) return;
    setSaving(true);
    setError(null);
    const plans = allCategoryRows
      .map((cat) => ({
        category: cat.slug,
        planned: parseFloat(amounts[cat.slug] ?? "0") || 0,
      }))
      .filter((p) => p.planned > 0);

    if (plans.length === 0) {
      setError("Wpisz co najmniej jedną kwotę większą od 0");
      setSaving(false);
      return;
    }

    const res: ApiResponse<unknown> = await fetch(
      `/api/budget/periods/${periodId}/plans`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plans }),
      }
    ).then((r) => r.json());

    setSaving(false);
    if (res.error) {
      setError(res.error.message);
      toast.error("Nie udało się zapisać planów");
      return;
    }
    setEditing(false);
    toast.success("Plany wydatków zostały zapisane");
    onRefresh?.();
  }

  return (
    <Collapsible open={open} onOpenChange={(v) => !editing && setOpen(v)}>
      <Card>
        <CardHeader className="px-4 py-3">
          <div className="flex w-full items-center justify-between gap-2">
            {/* Left: title */}
            <CardTitle className="text-sm font-medium leading-none">
              Zaplanowane wydatki
              {!editing && (
                <span className="font-normal text-muted-foreground ml-1.5">
                  ({visible.length} kategorii · {fmt(total.toFixed(2))} zł)
                </span>
              )}
            </CardTitle>

            {/* Right: actions + chevron */}
            <div className="flex items-center gap-1.5 shrink-0">
              {editing ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={cancelEdit}
                    disabled={saving}
                  >
                    Anuluj
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Zapisuję…" : "Zapisz"}
                  </Button>
                </>
              ) : (
                <>
                  {periodId && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs border-primary/60 text-primary hover:bg-primary/10 hover:text-primary"
                      onClick={enterEditMode}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edytuj
                    </Button>
                  )}
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    >
                      {open
                        ? <ChevronUp className="h-4 w-4" />
                        : <ChevronDown className="h-4 w-4" />
                      }
                    </Button>
                  </CollapsibleTrigger>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="p-0 pb-2">
            {editing ? (
              <div className="flex flex-col">
                <div className="px-4 py-2 bg-primary/5 border-b border-primary/15">
                  <p className="text-[11px] text-primary/80 font-medium">
                    Wpisz planowane kwoty dla każdej kategorii (0 = brak planu)
                  </p>
                </div>
                {allCategoryRows.map((cat, idx) => {
                  const val = parseFloat(amounts[cat.slug] ?? "0") || 0;
                  const hasValue = val > 0;
                  return (
                    <div
                      key={cat.slug}
                      className={cn(
                        "flex items-center justify-between px-4 py-2 gap-3 border-b border-border/20 last:border-0",
                        idx % 2 === 0 ? "bg-muted/10" : "bg-background",
                        hasValue && "bg-primary/5"
                      )}
                    >
                      <div className="flex items-center gap-2 text-sm flex-1 min-w-0">
                        <ColorDot color={cat.color} />
                        <span className={cn("truncate", hasValue ? "font-medium" : "text-muted-foreground")}>
                          {cat.label}
                        </span>
                      </div>
                      <div className="relative flex items-center shrink-0">
                        <Input
                          value={amounts[cat.slug] ?? "0"}
                          onChange={(e) =>
                            setAmounts((prev) => ({ ...prev, [cat.slug]: e.target.value }))
                          }
                          className={cn(
                            "h-8 w-32 text-sm font-mono pr-8 text-right bg-background",
                            hasValue && "border-primary/40 ring-1 ring-primary/20"
                          )}
                          type="number"
                          min="0"
                          step="0.01"
                        />
                        <span className="absolute right-2.5 text-xs text-muted-foreground pointer-events-none">
                          zł
                        </span>
                      </div>
                    </div>
                  );
                })}
                {error && (
                  <p className="px-4 py-2 text-xs text-destructive bg-destructive/5">{error}</p>
                )}
                <div className="flex justify-between items-center px-4 py-2.5 border-t bg-muted/20">
                  <span className="text-xs font-medium text-muted-foreground">Suma planowanych</span>
                  <span className="font-mono text-sm font-bold text-foreground">
                    {fmt(
                      Object.values(amounts)
                        .reduce((s, v) => s + (parseFloat(v) || 0), 0)
                        .toFixed(2)
                    )}{" "}
                    zł
                  </span>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {visible.map((item) => (
                  <div
                    key={item.category}
                    className="flex items-center justify-between px-4 py-2 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <ColorDot color={item.color} />
                      <span>{item.label}</span>
                    </div>
                    <span className="font-mono text-sm text-muted-foreground">
                      {fmt(item.planned)} zł
                    </span>
                  </div>
                ))}
                {visible.length === 0 && (
                  <p className="px-4 py-3 text-xs text-muted-foreground text-center">
                    Brak planowanych wydatków — kliknij Edytuj, aby dodać
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// ─── Preset colors ────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  // Reds
  "#fca5a5", "#f87171", "#ef4444", "#dc2626", "#b91c1c", "#991b1b", "#7f1d1d", "#450a0a",
  // Oranges
  "#fdba74", "#fb923c", "#f97316", "#ea580c", "#c2410c", "#9a3412", "#7c2d12", "#431407",
  // Ambers / Yellows
  "#fde68a", "#fcd34d", "#fbbf24", "#f59e0b", "#d97706", "#b45309", "#92400e", "#78350f",
  // Limes
  "#d9f99d", "#bef264", "#a3e635", "#84cc16", "#65a30d", "#4d7c0f", "#3f6212", "#365314",
  // Greens
  "#bbf7d0", "#86efac", "#4ade80", "#22c55e", "#16a34a", "#15803d", "#166534", "#052e16",
  // Teals / Cyans
  "#a5f3fc", "#67e8f9", "#22d3ee", "#06b6d4", "#0891b2", "#0e7490", "#155e75", "#083344",
  // Blues / Indigos
  "#bfdbfe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8", "#1e40af", "#1e3a8a",
  // Purples / Pinks / Neutrals
  "#e9d5ff", "#c4b5fd", "#a78bfa", "#8b5cf6", "#7c3aed", "#f9a8d4", "#ec4899", "#94a3b8",
];

// ─── ColorSwatchPicker ────────────────────────────────────────────────────────

function ColorSwatchPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (c: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function handleToggle() {
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.left });
    }
    setOpen((v) => !v);
  }

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        panelRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className={cn(
          "h-7 w-7 shrink-0 rounded-full border-2 transition-all hover:scale-110",
          open ? "border-foreground/70 scale-110" : "border-input hover:border-ring"
        )}
        style={{ backgroundColor: value }}
        title="Wybierz kolor"
      />
      {open && (
        <div
          ref={panelRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
          className="rounded-lg border border-border bg-popover p-2 shadow-xl"
        >
          <div className="grid grid-cols-8 gap-1">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => { onChange(color); setOpen(false); }}
                className={cn(
                  "h-5 w-5 rounded-full transition-transform hover:scale-125 focus:outline-none",
                  value === color && "ring-2 ring-offset-1 ring-foreground scale-110"
                )}
                style={{
                  backgroundColor: color,
                  boxShadow: "0 0 0 1px rgba(128,128,128,0.3)",
                }}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ─── CategoryManagerSection ───────────────────────────────────────────────────

export function CategoryManagerSection({
  categories,
  onRefresh,
}: {
  categories: BudgetCategoryView[];
  onRefresh: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editColor, setEditColor] = useState(PRESET_COLORS[4]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // New category form
  const [addLabel, setAddLabel] = useState("");
  const [addColor, setAddColor] = useState(PRESET_COLORS[4]);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  function generateSlug(label: string) {
    return label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ł/g, "l")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 50);
  }

  function startEdit(cat: BudgetCategoryView) {
    setEditingId(cat.id);
    setEditLabel(cat.label);
    setEditColor(cat.color);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleSaveEdit(id: string) {
    if (!editLabel.trim()) return;
    setSaving(true);
    const res: ApiResponse<unknown> = await fetch(`/api/budget/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: editLabel.trim(), color: editColor }),
    }).then((r) => r.json());
    setSaving(false);
    if (res.error) {
      toast.error("Nie udało się zapisać kategorii");
      return;
    }
    setEditingId(null);
    toast.success("Kategoria została zaktualizowana");
    onRefresh();
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    const res: ApiResponse<unknown> = await fetch(`/api/budget/categories/${id}`, {
      method: "DELETE",
    }).then((r) => r.json());
    setDeleting(null);
    if (res.error) {
      toast.error("Nie udało się usunąć kategorii");
      return;
    }
    toast.success("Kategoria została usunięta");
    onRefresh();
  }

  async function handleAdd() {
    if (!addLabel.trim()) return;
    const slug = generateSlug(addLabel);
    if (!slug) {
      toast.error("Nieprawidłowa nazwa kategorii");
      return;
    }
    setAdding(true);
    setAddError(null);
    const res: ApiResponse<unknown> = await fetch("/api/budget/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, label: addLabel.trim(), color: addColor }),
    }).then((r) => r.json());
    setAdding(false);
    if (res.error) {
      setAddError(res.error.message);
      toast.error(res.error.message);
      return;
    }
    setAddLabel("");
    setAddColor(PRESET_COLORS[4]);
    toast.success(`Kategoria „${addLabel.trim()}" została dodana`);
    onRefresh();
  }

  const sorted = [...categories].sort((a, b) =>
    a.label.localeCompare(b.label, "pl")
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Category list */}
      <div className="grid grid-cols-2 gap-1.5">
        {sorted.map((cat) => (
          <div
            key={cat.id}
            className="rounded-lg border transition-colors"
          >
            <div className="flex items-center gap-3 px-4 py-2.5">
              {editingId === cat.id ? (
                <>
                  <ColorSwatchPicker value={editColor} onChange={setEditColor} />
                  <Input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="h-8 flex-1 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit(cat.id);
                      if (e.key === "Escape") cancelEdit();
                    }}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    className="h-7 w-7 p-0 shrink-0"
                    disabled={saving || !editLabel.trim()}
                    onClick={() => handleSaveEdit(cat.id)}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 shrink-0"
                    onClick={cancelEdit}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <ColorDot color={cat.color} size={12} />
                  <span className="flex-1 text-sm font-medium">{cat.label}</span>
                  {cat.isSystem && (
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      system
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground shrink-0"
                    onClick={() => startEdit(cat)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {cat.isSystem ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground/40 cursor-not-allowed"
                            disabled
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        Nie można usunąć kategorii systemowej
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                      disabled={deleting === cat.id}
                      onClick={() => handleDelete(cat.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add new category */}
      <div className="rounded-lg border p-4">
        <p className="mb-3 text-sm font-medium">Dodaj kategorię</p>
        <div className="flex items-center gap-3">
          <ColorSwatchPicker value={addColor} onChange={setAddColor} />
          <Input
            placeholder="Nazwa kategorii"
            value={addLabel}
            onChange={(e) => setAddLabel(e.target.value)}
            className="h-8 flex-1 text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button
            size="sm"
            className="h-8 px-3 shrink-0"
            disabled={adding || !addLabel.trim()}
            onClick={handleAdd}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            {adding ? "Dodawanie…" : "Dodaj"}
          </Button>
        </div>
        {addError && <p className="mt-2 text-xs text-destructive">{addError}</p>}
      </div>
    </div>
  );
}
