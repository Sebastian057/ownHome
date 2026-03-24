"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  PiggyBank,
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
