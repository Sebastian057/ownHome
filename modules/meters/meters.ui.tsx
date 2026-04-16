"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Droplets, Zap, Flame } from "lucide-react";
import type { MeterType } from "./meters.types";
import { MeterChartCard } from "./meters.ui.cards";
import { ReadingsTable } from "./meters.ui.table";
import { ReadingFormSheet } from "./meters.ui.form";
import type { MeterReadingWithConsumption } from "./meters.types";

// ─── Re-exports ───────────────────────────────────────────────────────────────

export { ReadingFormSheet } from "./meters.ui.form";
export { MeterChartCard } from "./meters.ui.cards";
export { ReadingsTable } from "./meters.ui.table";

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS: { type: MeterType; label: string; icon: React.ElementType }[] = [
  { type: "WATER", label: "Woda", icon: Droplets },
  { type: "ELECTRICITY", label: "Prąd", icon: Zap },
  { type: "GAS", label: "Gaz", icon: Flame },
];

// ─── MeterTab (per-type content) ──────────────────────────────────────────────

function MeterTab({ type }: { type: MeterType }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editReading, setEditReading] = useState<
    MeterReadingWithConsumption | undefined
  >();
  const [refreshKey, setRefreshKey] = useState(0);

  function handleAddReading() {
    setEditReading(undefined);
    setDialogOpen(true);
  }

  function handleEdit(reading: MeterReadingWithConsumption) {
    setEditReading(reading);
    setDialogOpen(true);
  }

  function handleSuccess() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <MeterChartCard
        type={type}
        onAddReading={handleAddReading}
        refreshKey={refreshKey}
      />

      <ReadingsTable
        type={type}
        refreshKey={refreshKey}
        onEdit={handleEdit}
        onDeleted={handleSuccess}
      />

      <ReadingFormSheet
        key={editReading?.id ?? "new"}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={handleSuccess}
        type={type}
        editReading={editReading}
      />
    </div>
  );
}

// ─── MetersPage ───────────────────────────────────────────────────────────────

export function MetersPage() {
  const [activeTab, setActiveTab] = useState<MeterType>("WATER");

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Liczniki</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Śledź zużycie wody, prądu i gazu na podstawie regularnych odczytów.
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as MeterType)}
      >
        <TabsList className="grid w-full grid-cols-3 max-w-sm">
          {TABS.map(({ type, label, icon: Icon }) => (
            <TabsTrigger
              key={type}
              value={type}
              className="flex items-center gap-1.5"
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map(({ type }) => (
          <TabsContent key={type} value={type} className="mt-6">
            <MeterTab type={type} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
