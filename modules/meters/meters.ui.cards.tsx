"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Droplets,
  Zap,
  Flame,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MeterType, MonthlyConsumption } from "./meters.types";
import type { ApiResponse } from "@/types/common.types";

// ─── Config ───────────────────────────────────────────────────────────────────

export const METER_CONFIG: Record<
  MeterType,
  {
    label: string;
    unit: string;
    icon: React.ElementType;
    color: string;
    bgClass: string;
    textClass: string;
  }
> = {
  WATER: {
    label: "Woda",
    unit: "m³",
    icon: Droplets,
    color: "#2549D9",
    bgClass: "bg-blue-100 dark:bg-blue-950",
    textClass: "text-blue-600 dark:text-blue-400",
  },
  ELECTRICITY: {
    label: "Prąd",
    unit: "kWh",
    icon: Zap,
    color: "#ca8a04",
    bgClass: "bg-yellow-100 dark:bg-yellow-950",
    textClass: "text-yellow-600 dark:text-yellow-400",
  },
  GAS: {
    label: "Gaz",
    unit: "m³",
    icon: Flame,
    color: "#ea580c",
    bgClass: "bg-orange-100 dark:bg-orange-950",
    textClass: "text-orange-600 dark:text-orange-400",
  },
};

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: Array<{ payload: MonthlyConsumption }>;
  unit: string;
}) {
  if (!active || !payload?.length || payload[0].payload.consumption == null)
    return null;
  const entry = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
      <p className="text-xs font-medium text-foreground">{entry.label}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {entry.consumption!.toFixed(3)} {unit}
      </p>
    </div>
  );
}

// ─── MeterChartCard ───────────────────────────────────────────────────────────

interface MeterChartCardProps {
  type: MeterType;
  onAddReading: () => void;
  refreshKey: number;
}

export function MeterChartCard({
  type,
  onAddReading,
  refreshKey,
}: MeterChartCardProps) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<MonthlyConsumption[] | null>(null);
  const [loading, setLoading] = useState(true);

  const cfg = METER_CONFIG[type];
  const Icon = cfg.icon;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/meters/stats?type=${type}&year=${year}`);
      const json: ApiResponse<MonthlyConsumption[]> = await res.json();
      if (json.data) setData(json.data);
    } finally {
      setLoading(false);
    }
  }, [type, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const hasAnyData = data?.some((m) => m.consumption !== null) ?? false;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          {/* Icon + label */}
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex items-center justify-center rounded-lg w-9 h-9",
                cfg.bgClass
              )}
            >
              <Icon className={cn("w-5 h-5", cfg.textClass)} />
            </div>
            <span className="font-semibold text-base">{cfg.label}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Year selector */}
            <div className="flex items-center gap-0.5">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setYear((y) => y - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="text-sm font-medium tabular-nums w-10 text-center">
                {year}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setYear((y) => y + 1)}
                disabled={year >= currentYear}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={onAddReading}
              className="gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Odczyt
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : !hasAnyData ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Brak odczytów za {year} rok.
            </p>
            <Button size="sm" variant="secondary" onClick={onAddReading}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Dodaj odczyt
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2 px-2">
            <div className="h-44 min-w-[540px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data ?? []}
                  margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
                  barCategoryGap="28%"
                >
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "currentColor" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "currentColor" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                    }
                    width={36}
                  />
                  <RechartsTooltip
                    cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
                    content={<ChartTooltip unit={cfg.unit} />}
                  />
                  <Bar dataKey="consumption" radius={[3, 3, 0, 0]}>
                    {(data ?? []).map((entry, i) => (
                      <Cell
                        key={i}
                        fill={
                          entry.consumption != null
                            ? cfg.color
                            : "hsl(var(--muted-foreground) / 0.12)"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
