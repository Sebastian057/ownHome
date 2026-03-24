"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  PiggyBank,
  Landmark,
  PencilIcon,
  Check,
  X,
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
  type BudgetSummary,
  type CategorySummaryItem,
  type BudgetPeriodDetail,
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
  // Saldo konta: otwarcie + faktyczne przychody − faktyczne wydatki (gdy otwarcie ustawione)
  // Fallback: plan budżetu − faktyczne wydatki
  const hasRealBalance = summary.expectedBalance !== null;
  const balanceValue = hasRealBalance
    ? Number(summary.expectedBalance)
    : Number(summary.balance);

  const plannedSavings = Number(summary.plannedIncome) - Number(summary.plannedExpenses);
  const actualSavings = Number(summary.actualIncome) - Number(summary.actualExpenses);

  const cards = [
    {
      label: "Saldo konta",
      value: balanceValue,
      sub: hasRealBalance
        ? `otwarcie + przychody − wydatki`
        : `brak salda otwarcia — ustaw w polu "Stan konta"`,
      icon: <PiggyBank className="h-4 w-4" />,
      color: balanceValue >= 0 ? "text-green-600" : "text-destructive",
      prefix: balanceValue >= 0 ? "+" : "",
    },
    {
      label: "Zysk planowany",
      value: plannedSavings,
      sub: `przychody − wydatki planowane`,
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
          ? `+ ${fmt(summary.carryOver)} zł przeniesione z poprzedniego miesiąca`
          : "suma z sekcji Przychody",
      icon: <ArrowUpRight className="h-4 w-4 text-green-600" />,
      color: "text-foreground",
      prefix: "",
    },
    {
      label: "Przychód rzeczywisty",
      value: Number(summary.actualIncome),
      sub: `z planowanych ${fmt(summary.plannedIncome)} zł`,
      icon: <ArrowUpRight className="h-4 w-4 text-muted-foreground" />,
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

// ─── BalanceCard ──────────────────────────────────────────────────────────────

function BalanceField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string | null;
  onSave: (v: number | null) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(value ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const parsed = input.trim() === "" ? null : Number(input.replace(",", "."));
    if (input.trim() !== "" && (isNaN(parsed!) || parsed! < 0)) {
      setSaving(false);
      return;
    }
    await onSave(parsed);
    setSaving(false);
    setEditing(false);
  }

  function handleCancel() {
    setInput(value ?? "");
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
        <Input
          type="number"
          min="0"
          step="0.01"
          className="h-7 text-xs font-mono w-32"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancel(); }}
          autoFocus
        />
        <Button size="icon" variant="ghost" className="h-6 w-6" disabled={saving} onClick={handleSave}>
          <Check className="h-3 w-3 text-green-600" />
        </Button>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancel}>
          <X className="h-3 w-3 text-muted-foreground" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className={cn("text-sm font-mono font-medium", value === null && "text-muted-foreground")}>
          {value !== null ? `${fmt(value)} zł` : "—"}
        </span>
        <Button
          size="icon"
          variant="ghost"
          className="h-5 w-5"
          onClick={() => { setInput(value ?? ""); setEditing(true); }}
        >
          <PencilIcon className="size-2.5" />
        </Button>
      </div>
    </div>
  );
}

export function BalanceCard({
  period,
  onRefresh,
}: {
  period: BudgetPeriodDetail;
  onRefresh: () => void;
}) {
  async function patch(field: "openingBalance" | "closingBalance", value: number | null) {
    const res = await fetch(`/api/budget/periods/${period.id}/balance`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    }).then((r) => r.json());
    if (res.error) {
      toast.error("Nie udało się zapisać salda");
      return;
    }
    const label = field === "openingBalance" ? "Otwarcie" : "Zamknięcie";
    toast.success(`${label} miesiąca zaktualizowane`);
    onRefresh();
  }

  const { expectedBalance, discrepancy } = period.summary;
  const discrepancyNum = discrepancy !== null ? Number(discrepancy) : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm">Stan konta</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          Rzeczywiste saldo rachunku — niezależnie od transakcji w budżecie
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        <BalanceField
          label="Otwarcie miesiąca"
          value={period.openingBalance}
          onSave={(v) => patch("openingBalance", v)}
        />
        <BalanceField
          label="Zamknięcie miesiąca"
          value={period.closingBalance}
          onSave={(v) => patch("closingBalance", v)}
        />

        {expectedBalance !== null && (
          <>
            <div className="border-t border-border/50 pt-2 mt-0.5" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Oczekiwane zamknięcie</span>
              <span className="text-sm font-mono font-medium">{fmt(expectedBalance)} zł</span>
            </div>
            <p className="text-[10px] text-muted-foreground -mt-1.5">
              otwarcie + przychody − wydatki
            </p>
          </>
        )}

        {discrepancyNum !== null && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Różnica</span>
            <span className={cn(
              "text-sm font-mono font-semibold",
              Math.abs(discrepancyNum) < 0.01
                ? "text-green-600"
                : discrepancyNum > 0
                ? "text-green-600"
                : "text-destructive"
            )}>
              {discrepancyNum > 0 ? "+" : ""}{fmt(discrepancy!)} zł
            </span>
          </div>
        )}

        {period.openingBalance === null && period.closingBalance === null && (
          <p className="text-xs text-muted-foreground text-center py-1">
            Kliknij <PencilIcon className="size-2.5 inline" /> przy wartości, aby ustawić saldo konta
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── CategoryPieChart ─────────────────────────────────────────────────────────

interface PieEntry {
  name: string;
  value: number;
  color: string;
}

function PieTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: PieEntry }>;
  total: number;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
      <div className="flex items-center gap-2">
        <span
          className="inline-block shrink-0 rounded-full"
          style={{ width: 8, height: 8, backgroundColor: entry.payload.color }}
        />
        <span className="text-xs font-medium text-foreground">{entry.name}</span>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {fmt(entry.value.toFixed(2))} zł ({((entry.value / total) * 100).toFixed(1)}%)
      </p>
    </div>
  );
}

function PieLegend({ payload }: { payload?: Array<{ value: string; color: string }> }) {
  if (!payload?.length) return null;
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2">
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span
            className="inline-block shrink-0 rounded-full"
            style={{ width: 10, height: 10, backgroundColor: entry.color }}
          />
          <span className="text-[11px] text-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function CategoryPieChart({ items }: { items: CategorySummaryItem[] }) {
  const data: PieEntry[] = items
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
            <RechartsTooltip content={<PieTooltip total={total} />} />
            <Legend content={<PieLegend />} />
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
