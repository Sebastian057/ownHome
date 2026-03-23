"use client";

import { useState, useMemo } from "react";
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  PiggyBank,
  Search,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Pencil,
  X,
  Check,
  RotateCcw,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import {
  type BudgetPeriodDetail,
  type BudgetSummary,
  type TransactionView,
  type BudgetIncomeView,
  type CategorySummaryItem,
  type BudgetTemplateView,
  type TemplateIncomeView,
  type BudgetCategoryView,
  type BudgetCategoryPlanView,
  SOURCE_LABELS,
  type TransactionSortField,
  type SortDir,
  type TransactionPageSize,
} from "./budget.types";
import type { ApiResponse } from "@/types/common.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: string | number) {
  return Number(amount).toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "short",
  });
}

function getCategoryLabel(slug: string, categories: BudgetCategoryView[]) {
  return categories.find((c) => c.slug === slug)?.label ?? slug;
}

function getCategoryColor(slug: string, categories: BudgetCategoryView[]) {
  return categories.find((c) => c.slug === slug)?.color ?? "#6b7280";
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

// ─── SummaryCardsSkeleton ─────────────────────────────────────────────────────

export function SummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-3 w-28" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-7 w-36" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── SummaryCards (legacy, kept for API compat) ───────────────────────────────

export function SummaryCards({ summary }: { summary: BudgetSummary }) {
  return <ExtendedSummaryCards summary={summary} />;
}

// ─── ExtendedSummaryCards ─────────────────────────────────────────────────────

export function ExtendedSummaryCards({ summary }: { summary: BudgetSummary }) {
  const balance = Number(summary.balance);
  const plannedSavings = Number(summary.plannedIncome) - Number(summary.plannedExpenses);
  const actualSavings = Number(summary.actualIncome) - Number(summary.actualExpenses);

  const cards = [
    {
      label: "Saldo",
      value: balance,
      sub: `budżet: ${fmt(summary.totalPlannedBudget)} zł`,
      icon: <PiggyBank className="h-4 w-4" />,
      color: balance >= 0 ? "text-green-600" : "text-destructive",
      prefix: balance >= 0 ? "+" : "",
    },
    {
      label: "Zysk planowany",
      value: plannedSavings,
      sub: `przychody - wydatki`,
      icon: <TrendingUp className="h-4 w-4" />,
      color: plannedSavings >= 0 ? "text-green-600" : "text-destructive",
      prefix: plannedSavings >= 0 ? "+" : "",
    },
    {
      label: "Zysk rzeczywisty",
      value: actualSavings,
      sub: `na podstawie transakcji`,
      icon: <TrendingDown className="h-4 w-4" />,
      color: actualSavings >= 0 ? "text-green-600" : "text-destructive",
      prefix: actualSavings >= 0 ? "+" : "",
    },
    {
      label: "Przychód planowany",
      value: Number(summary.plannedIncome),
      sub:
        summary.carryOver !== "0.00"
          ? `+ ${fmt(summary.carryOver)} zł przeniesione`
          : "szablon budżetu",
      icon: <ArrowUpRight className="h-4 w-4 text-green-600" />,
      color: "text-foreground",
      prefix: "",
    },
    {
      label: "Przychód rzeczywisty",
      value: Number(summary.actualIncome),
      sub: `z planowanych ${fmt(summary.plannedIncome)} zł`,
      icon: <Wallet className="h-4 w-4 text-muted-foreground" />,
      color: "text-foreground",
      prefix: "",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="pb-1.5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {card.label}
              </CardTitle>
              {card.icon}
            </div>
          </CardHeader>
          <CardContent>
            <p className={cn("text-xl font-mono font-semibold", card.color)}>
              {card.prefix}
              {fmt(card.value.toFixed(2))} zł
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{card.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── CategoryPieChart ─────────────────────────────────────────────────────────

export function CategoryPieChart({ items }: { items: CategorySummaryItem[] }) {
  const data = items
    .filter((item) => Number(item.actual) > 0)
    .map((item) => ({
      name: item.label,
      value: Number(item.actual),
      color: item.color,
    }))
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Struktura wydatków</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground text-center py-8">
            Brak wydatków w tym miesiącu
          </p>
        </CardContent>
      </Card>
    );
  }

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Struktura wydatków</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <RechartsTooltip
              formatter={(value, name) => {
                const n = typeof value === "number" ? value : Number(value);
                return [`${fmt(n.toFixed(2))} zł (${((n / total) * 100).toFixed(1)}%)`, name];
              }}
              contentStyle={{
                fontSize: "12px",
                borderRadius: "8px",
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--card))",
                color: "hsl(var(--foreground))",
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span style={{ fontSize: "11px" }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── BudgetSummaryTable ───────────────────────────────────────────────────────

export function BudgetSummaryTable({ items }: { items: CategorySummaryItem[] }) {
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

// ─── CategoryTable (legacy — alias BudgetSummaryTable) ────────────────────────

export function CategoryTable({ items }: { items: CategorySummaryItem[] }) {
  return <BudgetSummaryTable items={items} />;
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
      return;
    }
    setEditing(false);
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

// ─── AddTransactionDialog ─────────────────────────────────────────────────────

export function AddTransactionDialog({
  open,
  periodId,
  onClose,
  onSuccess,
  categories,
}: {
  open: boolean;
  periodId: string;
  onClose: () => void;
  onSuccess: () => void;
  categories: BudgetCategoryView[];
}) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!title.trim() || !amount || !category || !date) return;
    setLoading(true);
    setError(null);
    const res: ApiResponse<unknown> = await fetch(
      `/api/budget/periods/${periodId}/transactions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          amount: Number(amount),
          date,
          category,
        }),
      }
    ).then((r) => r.json());
    setLoading(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    setTitle("");
    setAmount("");
    setCategory("");
    setDate(new Date().toISOString().slice(0, 10));
    onSuccess();
    onClose();
  }

  function handleClose() {
    setTitle("");
    setAmount("");
    setCategory("");
    setDate(new Date().toISOString().slice(0, 10));
    setError(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dodaj transakcję</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tx-title">Opis</Label>
            <Input
              id="tx-title"
              placeholder="np. Biedronka"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tx-amount">Kwota (zł)</Label>
              <Input
                id="tx-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tx-date">Data</Label>
              <Input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Kategoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz kategorię..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.slug} value={cat.slug}>
                    <div className="flex items-center gap-2">
                      <ColorDot color={cat.color} size={8} />
                      {cat.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Anuluj
          </Button>
          <Button
            disabled={
              loading || !title.trim() || !amount || !category || !date
            }
            onClick={handleSubmit}
          >
            {loading ? "Dodawanie..." : "Dodaj"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── EditTransactionDialog ────────────────────────────────────────────────────

export function EditTransactionDialog({
  open,
  transaction,
  periodId,
  onClose,
  onSuccess,
  categories,
}: {
  open: boolean;
  transaction: TransactionView | null;
  periodId: string;
  onClose: () => void;
  onSuccess: () => void;
  categories: BudgetCategoryView[];
}) {
  const [title, setTitle] = useState(transaction?.title ?? "");
  const [amount, setAmount] = useState(transaction?.amount ?? "");
  const [date, setDate] = useState(transaction?.date ?? "");
  const [category, setCategory] = useState(transaction?.category ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync when transaction changes
  useState(() => {
    if (transaction) {
      setTitle(transaction.title);
      setAmount(transaction.amount);
      setDate(transaction.date);
      setCategory(transaction.category);
    }
  });

  async function handleSubmit() {
    if (!transaction || !title.trim() || !amount || !category || !date) return;
    setLoading(true);
    setError(null);
    const res: ApiResponse<unknown> = await fetch(
      `/api/budget/periods/${periodId}/transactions/${transaction.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          amount: Number(amount),
          date,
          category,
        }),
      }
    ).then((r) => r.json());
    setLoading(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    onSuccess();
    onClose();
  }

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edytuj transakcję</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-title">Opis</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-amount">Kwota (zł)</Label>
              <Input
                id="edit-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-date">Data</Label>
              <Input
                id="edit-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Kategoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz kategorię..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.slug} value={cat.slug}>
                    <div className="flex items-center gap-2">
                      <ColorDot color={cat.color} size={8} />
                      {cat.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Anuluj
          </Button>
          <Button
            disabled={loading || !title.trim() || !amount || !category}
            onClick={handleSubmit}
          >
            {loading ? "Zapisywanie..." : "Zapisz"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── TransactionTable ─────────────────────────────────────────────────────────

export function TransactionTable({
  periodId,
  transactions,
  categories,
  onRefresh,
}: {
  periodId: string;
  transactions: TransactionView[];
  categories: BudgetCategoryView[];
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [sortBy, setSortBy] = useState<TransactionSortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<TransactionPageSize>(20);
  const [showAdd, setShowAdd] = useState(false);
  const [editTx, setEditTx] = useState<TransactionView | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  function toggleSort(field: TransactionSortField) {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir(field === "date" ? "desc" : "asc");
    }
    setPage(1);
  }

  const filtered = useMemo(() => {
    let result = transactions;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((tx) => tx.title.toLowerCase().includes(q));
    }
    if (filterCategory !== "all") {
      result = result.filter((tx) => tx.category === filterCategory);
    }
    if (filterSource !== "all") {
      result = result.filter((tx) => tx.source === filterSource);
    }
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "date") cmp = a.date.localeCompare(b.date);
      else if (sortBy === "amount") cmp = Number(a.amount) - Number(b.amount);
      else if (sortBy === "title") cmp = a.title.localeCompare(b.title);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [transactions, search, filterCategory, filterSource, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  function SortHeader({
    field,
    children,
  }: {
    field: TransactionSortField;
    children: React.ReactNode;
  }) {
    return (
      <button
        onClick={() => toggleSort(field)}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {children}
        {sortBy === field ? (
          sortDir === "asc" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    );
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    await fetch(`/api/budget/periods/${periodId}/transactions/${id}`, {
      method: "DELETE",
    });
    setDeleting(null);
    onRefresh();
  }

  // Deduplicate categories appearing in transactions
  const usedCategories = useMemo(() => {
    const slugs = new Set(transactions.map((t) => t.category));
    return categories.filter((c) => slugs.has(c.slug));
  }, [transactions, categories]);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">
              Transakcje ({filtered.length}
              {filtered.length !== transactions.length &&
                ` / ${transactions.length}`}
              )
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAdd(true)}
              className="h-7 gap-1 text-xs border-primary/60 text-primary hover:bg-primary/10 hover:text-primary"
            >
              <Plus className="h-3 w-3" /> Dodaj
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 pt-1">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Szukaj..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-8 pl-8 text-sm"
              />
            </div>
            <Select
              value={filterCategory}
              onValueChange={(v) => {
                setFilterCategory(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <SelectValue placeholder="Kategoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie kategorie</SelectItem>
                {usedCategories.map((cat) => (
                  <SelectItem key={cat.slug} value={cat.slug}>
                    <div className="flex items-center gap-1.5">
                      <ColorDot color={cat.color} size={8} />
                      {cat.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterSource}
              onValueChange={(v) => {
                setFilterSource(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue placeholder="Źródło" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                <SelectItem value="MANUAL">Ręczne</SelectItem>
                <SelectItem value="SUBSCRIPTION">Subskrypcje</SelectItem>
                <SelectItem value="RECURRING">Cykliczne</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {paginated.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              {filtered.length === 0 && transactions.length > 0
                ? "Brak wyników dla podanych filtrów"
                : "Brak transakcji"}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-xs text-muted-foreground">
                    <th className="text-left py-2 px-4 font-medium">
                      <SortHeader field="date">Data</SortHeader>
                    </th>
                    <th className="text-left py-2 px-4 font-medium">
                      <SortHeader field="title">Opis</SortHeader>
                    </th>
                    <th className="text-left py-2 px-4 font-medium hidden sm:table-cell">
                      Kategoria
                    </th>
                    <th className="text-left py-2 px-4 font-medium hidden md:table-cell">
                      Źródło
                    </th>
                    <th className="text-left py-2 px-4 font-medium">
                      <SortHeader field="amount">Kwota</SortHeader>
                    </th>
                    <th className="w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {paginated.map((tx) => {
                    const color = getCategoryColor(tx.category, categories);
                    const label = getCategoryLabel(tx.category, categories);
                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-muted/30 transition-colors group"
                      >
                        <td className="py-2.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                          {fmtDate(tx.date)}
                        </td>
                        <td className="py-2.5 px-4 max-w-[200px]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="truncate font-medium">
                              {tx.title}
                            </span>
                            {SOURCE_LABELS[tx.source] && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0 h-4 shrink-0"
                              >
                                {SOURCE_LABELS[tx.source]}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 hidden sm:table-cell">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <ColorDot color={color} size={8} />
                            {label}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 hidden md:table-cell text-xs text-muted-foreground">
                          {tx.source === "MANUAL"
                            ? "Ręczna"
                            : tx.source === "SUBSCRIPTION"
                            ? "Subskrypcja"
                            : "Cykliczna"}
                        </td>
                        <td className="py-2.5 px-4 text-left font-mono font-medium whitespace-nowrap">
                          {fmt(tx.amount)} zł
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {tx.source === "MANUAL" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                  onClick={() => setEditTx(tx)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                  disabled={deleting === tx.id}
                                  onClick={() => handleDelete(tx.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {filtered.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Wierszy na stronę:</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    setPageSize(Number(v) as TransactionPageSize);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-7 w-16 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {([20, 50, 100, 200] as const).map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {(page - 1) * pageSize + 1}–
                  {Math.min(page * pageSize, filtered.length)} z{" "}
                  {filtered.length}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ‹
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  ›
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AddTransactionDialog
        open={showAdd}
        periodId={periodId}
        onClose={() => setShowAdd(false)}
        onSuccess={onRefresh}
        categories={categories}
      />

      <EditTransactionDialog
        open={editTx !== null}
        transaction={editTx}
        periodId={periodId}
        onClose={() => setEditTx(null)}
        onSuccess={() => {
          setEditTx(null);
          onRefresh();
        }}
        categories={categories}
      />
    </>
  );
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
    await fetch(`/api/budget/periods/${periodId}/incomes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: addTitle.trim(),
        planned: Number(addPlanned),
        actual: addActual ? Number(addActual) : null,
      }),
    });
    setLoading(false);
    setAdding(false);
    setAddTitle("");
    setAddPlanned("");
    setAddActual("");
    onRefresh();
  }

  async function handleSaveEdit(id: string) {
    setLoading(true);
    await fetch(`/api/budget/periods/${periodId}/incomes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editTitle.trim() || undefined,
        planned: editPlanned ? Number(editPlanned) : undefined,
        actual: editActual !== "" ? Number(editActual) : null,
      }),
    });
    setLoading(false);
    setEditId(null);
    onRefresh();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/budget/periods/${periodId}/incomes/${id}`, {
      method: "DELETE",
    });
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

// ─── MonthlyReportTab ─────────────────────────────────────────────────────────

export function MonthlyReportTab({
  period,
  categories,
  onRefresh,
}: {
  period: BudgetPeriodDetail;
  categories: BudgetCategoryView[];
  onRefresh?: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <ExtendedSummaryCards summary={period.summary} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Dochód card — interaktywna sekcja przychodów */}
        <IncomeSection
          periodId={period.id}
          incomes={period.incomes}
          onRefresh={onRefresh ?? (() => {})}
        />

        {/* Wydatki card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowDownLeft className="h-4 w-4 text-destructive" />
              Wydatki
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm mb-3">
              <span className="text-muted-foreground">Zaplanowane</span>
              <span className="font-mono font-medium">
                {fmt(period.summary.plannedExpenses)} zł
              </span>
            </div>
            <div className="flex justify-between text-sm mb-3">
              <span className="text-muted-foreground">Rzeczywiste</span>
              <span className="font-mono font-medium text-destructive">
                {fmt(period.summary.actualExpenses)} zł
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  Number(period.summary.actualExpenses) >
                    Number(period.summary.plannedExpenses)
                    ? "bg-destructive"
                    : "bg-primary"
                )}
                style={{
                  width: `${Math.min(
                    100,
                    Number(period.summary.plannedExpenses) > 0
                      ? (Number(period.summary.actualExpenses) /
                          Number(period.summary.plannedExpenses)) *
                          100
                      : 0
                  )}%`,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {Number(period.summary.plannedExpenses) > 0
                ? `${Math.round(
                    (Number(period.summary.actualExpenses) /
                      Number(period.summary.plannedExpenses)) *
                      100
                  )}% zaplanowanego budżetu`
                : "Brak planowanych wydatków"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <BudgetSummaryTable items={period.summary.byCategory} />
        <CategoryPieChart items={period.summary.byCategory} />
      </div>
    </div>
  );
}

// ─── TransactionsTab ──────────────────────────────────────────────────────────

export function TransactionsTab({
  period,
  categories,
  onRefresh,
}: {
  period: BudgetPeriodDetail;
  categories: BudgetCategoryView[];
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <PlannedExpensesTable
        items={period.categoryPlans}
        periodId={period.id}
        categories={categories}
        onRefresh={onRefresh}
      />
      <TransactionTable
        periodId={period.id}
        transactions={period.transactions}
        categories={categories}
        onRefresh={onRefresh}
      />
    </div>
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
  const [editColor, setEditColor] = useState("#6b7280");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // New category form
  const [addLabel, setAddLabel] = useState("");
  const [addColor, setAddColor] = useState("#6b7280");
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

  async function handleSaveEdit(id: string) {
    if (!editLabel.trim()) return;
    setSaving(true);
    await fetch(`/api/budget/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: editLabel.trim(), color: editColor }),
    });
    setSaving(false);
    setEditingId(null);
    onRefresh();
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    await fetch(`/api/budget/categories/${id}`, { method: "DELETE" });
    setDeleting(null);
    onRefresh();
  }

  async function handleAdd() {
    if (!addLabel.trim()) return;
    const slug = generateSlug(addLabel);
    if (!slug) {
      setAddError("Nieprawidłowa nazwa — nie można wygenerować sluga");
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
      return;
    }
    setAddLabel("");
    setAddColor("#6b7280");
    onRefresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center gap-3 rounded-lg border px-4 py-2.5 hover:bg-muted/20 transition-colors"
          >
            {editingId === cat.id ? (
              <>
                <input
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="h-7 w-7 rounded cursor-pointer border border-input p-0.5 bg-transparent"
                  title="Wybierz kolor"
                />
                <Input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="h-8 flex-1 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit(cat.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  autoFocus
                />
                <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                  {cat.slug}
                </Badge>
                <Button
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={saving || !editLabel.trim()}
                  onClick={() => handleSaveEdit(cat.id)}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => setEditingId(null)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <>
                <ColorDot color={cat.color} size={12} />
                <span className="flex-1 text-sm font-medium">{cat.label}</span>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono shrink-0"
                >
                  {cat.slug}
                </Badge>
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
        ))}
      </div>

      {/* Add new category */}
      <div className="flex flex-col gap-2 rounded-lg border p-4">
        <p className="text-sm font-medium">Dodaj kategorię</p>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={addColor}
            onChange={(e) => setAddColor(e.target.value)}
            className="h-8 w-8 rounded cursor-pointer border border-input p-0.5 bg-transparent shrink-0"
            title="Wybierz kolor"
          />
          <Input
            placeholder="Nazwa kategorii"
            value={addLabel}
            onChange={(e) => setAddLabel(e.target.value)}
            className="h-8 text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          {addLabel.trim() && (
            <Badge
              variant="outline"
              className="text-[10px] font-mono shrink-0"
            >
              {generateSlug(addLabel) || "…"}
            </Badge>
          )}
          <Button
            size="sm"
            className="h-8 px-3 shrink-0"
            disabled={adding || !addLabel.trim()}
            onClick={handleAdd}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            {adding ? "Dodawanie..." : "Dodaj"}
          </Button>
        </div>
        {addError && <p className="text-xs text-destructive">{addError}</p>}
      </div>
    </div>
  );
}

// ─── CreatePeriodPrompt ───────────────────────────────────────────────────────

export function CreatePeriodPrompt({
  year,
  month,
  onCreated,
}: {
  year: number;
  month: number;
  onCreated: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("pl-PL", {
    month: "long",
    year: "numeric",
  });

  async function handleCreate() {
    setLoading(true);
    setError(null);
    const res: ApiResponse<BudgetPeriodDetail> = await fetch(
      "/api/budget/periods",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month }),
      }
    ).then((r) => r.json());
    setLoading(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    if (res.data) onCreated();
  }

  return (
    <Card className="max-w-md mx-auto mt-12">
      <CardHeader>
        <CardTitle>Brak budżetu na {monthLabel}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Utwórz budżet na ten miesiąc. System automatycznie skopiuje Twój
          szablon i zarezerwuje subskrypcje oraz płatności cykliczne.
        </p>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button onClick={handleCreate} disabled={loading} className="w-full">
          {loading ? "Tworzę budżet..." : `Utwórz budżet na ${monthLabel}`}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── MonthNavigation ──────────────────────────────────────────────────────────

export function MonthNavigation({
  year,
  month,
  onChange,
}: {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}) {
  const label = new Date(year, month - 1, 1).toLocaleDateString("pl-PL", {
    month: "long",
    year: "numeric",
  });
  const displayLabel = label.charAt(0).toUpperCase() + label.slice(1);

  function prev() {
    if (month === 1) onChange(year - 1, 12);
    else onChange(year, month - 1);
  }
  function next() {
    const now = new Date();
    const maxYear = now.getFullYear();
    const maxMonth = now.getMonth() + 4; // 3 miesiące do przodu
    const maxDate = maxMonth > 12
      ? { year: maxYear + 1, month: maxMonth - 12 }
      : { year: maxYear, month: maxMonth };

    const isAtMax =
      year > maxDate.year ||
      (year === maxDate.year && month >= maxDate.month);
    if (isAtMax) return;

    if (month === 12) onChange(year + 1, 1);
    else onChange(year, month + 1);
  }

  const now = new Date();
  const maxMonth = now.getMonth() + 4;
  const maxDate = maxMonth > 12
    ? { year: now.getFullYear() + 1, month: maxMonth - 12 }
    : { year: now.getFullYear(), month: maxMonth };
  const isAtMax =
    year > maxDate.year ||
    (year === maxDate.year && month >= maxDate.month);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={prev}
        className="h-8 w-8 p-0"
      >
        ‹
      </Button>
      <span className="text-sm font-medium min-w-[140px] text-center">
        {displayLabel}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={next}
        disabled={isAtMax}
        className="h-8 w-8 p-0"
      >
        ›
      </Button>
    </div>
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

// ─── TransactionList (legacy alias — redirects to TransactionTable) ────────────

export function TransactionList({
  periodId,
  transactions,
  onRefresh,
  categories = [],
}: {
  periodId: string;
  transactions: TransactionView[];
  onRefresh: () => void;
  categories?: BudgetCategoryView[];
}) {
  return (
    <TransactionTable
      periodId={periodId}
      transactions={transactions}
      categories={categories}
      onRefresh={onRefresh}
    />
  );
}
