'use client';

import { useState, useEffect } from "react";
import {
  CarIcon, PlusIcon, TrashIcon, ShieldIcon, CalendarIcon, WrenchIcon,
  ChevronRightIcon, GaugeIcon, ArrowLeftIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import type { ApiResponse } from "@/types/common.types";
import type { VehicleListItem, VehicleDetail, VehicleCostsSummary } from "./vehicles.types";
import { VehicleFormDialog } from "./vehicles.ui.form";
import { VehicleInfoTab } from "./vehicles.ui.info";
import { VehicleInsuranceTab, InsuranceStatusBadge } from "./vehicles.ui.insurance";
import { VehicleInspectionsTab, inspectionBadge } from "./vehicles.ui.inspections";
import { VehicleServiceTab } from "./vehicles.ui.service";
import { VehicleMaintenanceTab } from "./vehicles.ui.maintenance";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function fmt(val: string | number | null | undefined, currency = "PLN") {
  if (val == null) return "—";
  return `${Number(val).toLocaleString("pl-PL", { minimumFractionDigits: 2 })} ${currency}`;
}

export function fmtDate(val: string | null | undefined) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("pl-PL");
}

export { InsuranceStatusBadge, inspectionBadge };

// ─── Fetch functions ───────────────────────────────────────────────────────────

async function fetchVehicles(): Promise<ApiResponse<VehicleListItem[]>> {
  return fetch("/api/vehicles").then((r) => r.json());
}
async function deleteVehicle(id: string): Promise<ApiResponse<null>> {
  return fetch(`/api/vehicles/${id}`, { method: "DELETE" }).then((r) => r.json());
}
async function fetchVehicleDetail(id: string): Promise<ApiResponse<VehicleDetail>> {
  return fetch(`/api/vehicles/${id}`).then((r) => r.json());
}
async function fetchCosts(vehicleId: string, year: number): Promise<ApiResponse<VehicleCostsSummary>> {
  return fetch(`/api/vehicles/${vehicleId}/costs?year=${year}`).then((r) => r.json());
}

// ─── VehicleCard ──────────────────────────────────────────────────────────────

function VehicleCard({
  vehicle, onSelect, onDelete,
}: {
  vehicle: VehicleListItem;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div
      className="group relative cursor-pointer rounded-xl overflow-hidden border bg-card shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-200"
      onClick={onSelect}
    >
      {/* Image area */}
      <div className="relative w-full h-48 overflow-hidden">
        {vehicle.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vehicle.photoUrl}
            alt={vehicle.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <CarIcon className="size-14 text-muted-foreground/30" />
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

        {/* License plate — absolute bottom-left */}
        <div className="absolute bottom-2.5 left-2.5">
          <span className="font-mono text-xs font-bold bg-white text-black px-2 py-0.5 rounded border border-gray-300/80 shadow-sm tracking-wider">
            {vehicle.licensePlate}
          </span>
        </div>

        {/* Delete button — top-right, hover reveal */}
        <div
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          onClick={(e) => { e.stopPropagation(); setDeleteOpen(true); }}
        >
          <Button variant="destructive" size="icon" className="size-7 shadow">
            <TrashIcon className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2.5">
        <div>
          <p className="font-semibold leading-tight">{vehicle.name}</p>
          {(vehicle.make || vehicle.model || vehicle.year) && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(" ")}
            </p>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <GaugeIcon className="size-3" />
            <span className="font-mono">{vehicle.mileage.toLocaleString("pl-PL")} km</span>
          </span>
          {vehicle.insuranceEndDate && (
            <span className="flex items-center gap-1">
              <ShieldIcon className="size-3" />
              <span>do {fmtDate(vehicle.insuranceEndDate)}</span>
            </span>
          )}
          {vehicle.nextInspectionDate && (
            <span className="flex items-center gap-1">
              <CalendarIcon className="size-3" />
              <span>{fmtDate(vehicle.nextInspectionDate)}</span>
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-border/50">
          <Button variant="ghost" size="sm" className="h-7 text-xs text-primary font-medium gap-1 px-2 hover:text-primary">
            Szczegóły <ChevronRightIcon className="size-3" />
          </Button>
        </div>
      </div>

      {/* Delete confirm dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usuń pojazd</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć <strong>{vehicle.name}</strong>? Tej operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── VehicleDetailPage ────────────────────────────────────────────────────────

export function VehicleDetailPage({
  vehicleId: vehicleSlug, onBack,
}: {
  vehicleId: string; onBack: () => void;
}) {
  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [costs, setCosts] = useState<VehicleCostsSummary | null>(null);
  const [activeTab, setActiveTab] = useState("info");

  async function load(silent = false) {
    if (!silent) setLoading(true);
    const [res, costsRes] = await Promise.all([
      fetchVehicleDetail(vehicleSlug),
      fetchCosts(vehicleSlug, new Date().getFullYear()),
    ]);
    if (res.error) { setError(res.error.message); if (!silent) setLoading(false); return; }
    setVehicle(res.data);
    if (!costsRes.error) setCosts(costsRes.data);
    if (!silent) setLoading(false);
  }

  useEffect(() => { load(); }, [vehicleSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex flex-col gap-8 p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="p-8">
        <Alert><AlertDescription>{error ?? "Nie znaleziono pojazdu."}</AlertDescription></Alert>
      </div>
    );
  }

  const activeInsurance = vehicle.insurances.find((i) => i.status === "active" || i.status === "expiring");
  const nextInspection = vehicle.inspections
    .filter((i) => i.nextDate)
    .sort((a, b) => new Date(a.nextDate!).getTime() - new Date(b.nextDate!).getTime())[0];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="-ml-2 mt-0.5">
          <ArrowLeftIcon className="size-5" />
        </Button>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{vehicle.name}</h1>
          <p className="text-muted-foreground">
            {[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(" ")}
            {" · "}
            <span className="font-mono text-sm">{vehicle.licensePlate}</span>
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <GaugeIcon className="size-3" /> Przebieg
            </span>
            <span className="font-mono font-medium">{vehicle.mileage.toLocaleString("pl-PL")} km</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <ShieldIcon className="size-3" /> Ubezpieczenie
            </span>
            {activeInsurance ? (
              <span className="text-sm font-medium">do {fmtDate(activeInsurance.endDate)}</span>
            ) : (
              <span className="text-sm text-muted-foreground">Brak</span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <CalendarIcon className="size-3" /> Przegląd
            </span>
            {nextInspection?.nextDate ? (
              <span className="text-sm font-medium">{fmtDate(nextInspection.nextDate)}</span>
            ) : (
              <span className="text-sm text-muted-foreground">Brak danych</span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto">
          <TabsList className="w-full justify-start min-w-max">
            <TabsTrigger value="info">Informacje</TabsTrigger>
            <TabsTrigger value="insurance">
              Ubezpieczenia
              {vehicle.insurances.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground px-1.5 py-px text-[10px] font-bold leading-none min-w-[16px]">{vehicle.insurances.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="inspections">
              Przeglądy
              {vehicle.inspections.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground px-1.5 py-px text-[10px] font-bold leading-none min-w-[16px]">{vehicle.inspections.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="service">
              Serwis
              {vehicle.serviceVisits.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground px-1.5 py-px text-[10px] font-bold leading-none min-w-[16px]">{vehicle.serviceVisits.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="maintenance">Eksploatacja</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="info" className="mt-4">
          <VehicleInfoTab vehicle={vehicle} onRefresh={() => load(true)} />
        </TabsContent>

        <TabsContent value="insurance" className="mt-4">
          <VehicleInsuranceTab vehicle={vehicle} onRefresh={() => load(true)} />
        </TabsContent>

        <TabsContent value="inspections" className="mt-4">
          <VehicleInspectionsTab vehicle={vehicle} onRefresh={() => load(true)} />
        </TabsContent>

        <TabsContent value="service" className="mt-4">
          <VehicleServiceTab vehicle={vehicle} onRefresh={() => load(true)} />
        </TabsContent>

        <TabsContent value="maintenance" className="mt-4">
          <VehicleMaintenanceTab vehicleSlug={vehicleSlug} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── VehicleListPage ──────────────────────────────────────────────────────────

export function VehicleListPage({ onSelectVehicle }: { onSelectVehicle: (id: string) => void }) {
  const [vehicles, setVehicles] = useState<VehicleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetchVehicles();
    if (res.error) setError(res.error.message);
    else setVehicles(res.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-8 p-8">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-72 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pojazdy</h1>
        <Button onClick={() => setFormOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          Dodaj pojazd
        </Button>
      </div>

      {error && <Alert><AlertDescription>{error}</AlertDescription></Alert>}

      {vehicles.length === 0 && !error ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><CarIcon /></EmptyMedia>
            <EmptyTitle>Brak pojazdów</EmptyTitle>
            <EmptyDescription>Dodaj swój pierwszy pojazd.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((v) => (
            <VehicleCard
              key={v.id}
              vehicle={v}
              onSelect={() => onSelectVehicle(v.slug)}
              onDelete={async () => {
                await deleteVehicle(v.slug);
                load();
              }}
            />
          ))}
        </div>
      )}

      <VehicleFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={() => { setFormOpen(false); load(); }}
      />
    </div>
  );
}
