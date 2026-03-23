"use client";

import { useState, useEffect, useRef } from "react";
import {
  CarIcon, PlusIcon, PencilIcon, TrashIcon, UploadIcon,
  ShieldIcon, CalendarIcon, WrenchIcon, ChevronRightIcon,
  SparklesIcon, CheckIcon, InfoIcon, ChevronDownIcon, ChevronUpIcon,
  ImageIcon, FileTextIcon, CameraIcon, RefreshCwIcon,
  ExternalLinkIcon, GaugeIcon, ArrowLeftIcon, XIcon,
  BanknoteIcon, BuildingIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import FsLightbox from "fslightbox-react";
import type { ApiResponse } from "@/types/common.types";
import type {
  VehicleListItem, VehicleDetail, InsuranceView, InspectionView,
  ServiceVisitView, ServiceVisitFileView, MaintenanceLogEntry,
  VehicleCostsSummary, VinLookupResult, VehicleFormState,
} from "./vehicles.types";
import { EMPTY_VEHICLE_FORM } from "./vehicles.types";
import {
  FUEL_TYPE_LABELS, TRANSMISSION_LABELS, INSURANCE_TYPE_OPTIONS,
  INSPECTION_RESULT_LABELS, MAINTENANCE_LOG_CATEGORIES, CURRENCIES,
} from "./vehicles.constants";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(val: string | number | null | undefined, currency = "PLN") {
  if (val == null) return "—";
  return `${Number(val).toLocaleString("pl-PL", { minimumFractionDigits: 2 })} ${currency}`;
}

function fmtDate(val: string | null | undefined) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("pl-PL");
}

function InsuranceStatusBadge({ status }: { status: "active" | "expiring" | "expired" }) {
  if (status === "active") return <Badge className="bg-success text-success-foreground">Aktywna</Badge>;
  if (status === "expiring") return <Badge className="bg-warning text-warning-foreground">Wygasa</Badge>;
  return <Badge variant="destructive">Wygasła</Badge>;
}

function inspectionBadge(result: string) {
  switch (result) {
    case "passed": return <Badge className="bg-success text-success-foreground text-xs">{INSPECTION_RESULT_LABELS[result]}</Badge>;
    case "passed_with_defects": return <Badge className="bg-warning text-warning-foreground text-xs">{INSPECTION_RESULT_LABELS[result]}</Badge>;
    default: return <Badge variant="destructive" className="text-xs">{INSPECTION_RESULT_LABELS[result] ?? result}</Badge>;
  }
}

// ─── Fetch functions ───────────────────────────────────────────────────────────

async function fetchVehicles(): Promise<ApiResponse<VehicleListItem[]>> {
  return fetch("/api/vehicles").then((r) => r.json());
}
async function createVehicle(data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
  return fetch("/api/vehicles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json());
}
async function updateVehicle(id: string, data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
  return fetch(`/api/vehicles/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json());
}
async function deleteVehicle(id: string): Promise<ApiResponse<null>> {
  return fetch(`/api/vehicles/${id}`, { method: "DELETE" }).then((r) => r.json());
}
async function fetchVehicleDetail(id: string): Promise<ApiResponse<VehicleDetail>> {
  return fetch(`/api/vehicles/${id}`).then((r) => r.json());
}
async function vinLookup(vin: string): Promise<ApiResponse<VinLookupResult>> {
  return fetch("/api/vehicles/vin-lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vin }) }).then((r) => r.json());
}
async function uploadVehiclePhoto(vehicleId: string, file: File): Promise<ApiResponse<{ photoUrl: string }>> {
  const fd = new FormData();
  fd.append("file", file);
  return fetch(`/api/vehicles/${vehicleId}/photo`, { method: "POST", body: fd }).then((r) => r.json());
}
async function createInsurance(vehicleId: string, data: Record<string, unknown>): Promise<ApiResponse<InsuranceView>> {
  return fetch(`/api/vehicles/${vehicleId}/insurance`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json());
}
async function updateInsurance(vehicleId: string, id: string, data: Record<string, unknown>): Promise<ApiResponse<InsuranceView>> {
  return fetch(`/api/vehicles/${vehicleId}/insurance/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json());
}
async function deleteInsurance(vehicleId: string, id: string): Promise<ApiResponse<null>> {
  return fetch(`/api/vehicles/${vehicleId}/insurance/${id}`, { method: "DELETE" }).then((r) => r.json());
}
async function renewInsurance(vehicleId: string, id: string, data: Record<string, unknown>): Promise<ApiResponse<InsuranceView>> {
  return fetch(`/api/vehicles/${vehicleId}/insurance/${id}/renew`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json());
}
async function createInspection(vehicleId: string, data: Record<string, unknown>): Promise<ApiResponse<InspectionView>> {
  return fetch(`/api/vehicles/${vehicleId}/inspections`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json());
}
async function updateInspection(vehicleId: string, id: string, data: Record<string, unknown>): Promise<ApiResponse<InspectionView>> {
  return fetch(`/api/vehicles/${vehicleId}/inspections/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json());
}
async function deleteInspection(vehicleId: string, id: string): Promise<ApiResponse<null>> {
  return fetch(`/api/vehicles/${vehicleId}/inspections/${id}`, { method: "DELETE" }).then((r) => r.json());
}
async function createServiceVisit(vehicleId: string, data: Record<string, unknown>): Promise<ApiResponse<ServiceVisitView>> {
  return fetch(`/api/vehicles/${vehicleId}/service-visits`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json());
}
async function updateServiceVisit(vehicleId: string, id: string, data: Record<string, unknown>): Promise<ApiResponse<ServiceVisitView>> {
  return fetch(`/api/vehicles/${vehicleId}/service-visits/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json());
}
async function deleteServiceVisit(vehicleId: string, id: string): Promise<ApiResponse<null>> {
  return fetch(`/api/vehicles/${vehicleId}/service-visits/${id}`, { method: "DELETE" }).then((r) => r.json());
}
async function uploadServiceVisitFile(vehicleId: string, visitId: string, file: File): Promise<ApiResponse<ServiceVisitFileView>> {
  const fd = new FormData();
  fd.append("file", file);
  return fetch(`/api/vehicles/${vehicleId}/service-visits/${visitId}/files`, { method: "POST", body: fd }).then((r) => r.json());
}
async function deleteServiceVisitFile(vehicleId: string, visitId: string, fileId: string): Promise<ApiResponse<null>> {
  return fetch(`/api/vehicles/${vehicleId}/service-visits/${visitId}/files/${fileId}`, { method: "DELETE" }).then((r) => r.json());
}
async function fetchMaintenanceLogs(vehicleId: string): Promise<ApiResponse<MaintenanceLogEntry[]>> {
  return fetch(`/api/vehicles/${vehicleId}/maintenance/log`).then((r) => r.json());
}
async function createMaintenanceLog(vehicleId: string, data: Record<string, unknown>): Promise<ApiResponse<MaintenanceLogEntry>> {
  return fetch(`/api/vehicles/${vehicleId}/maintenance/log`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json());
}
async function updateMaintenanceLog(vehicleId: string, id: string, data: Record<string, unknown>): Promise<ApiResponse<MaintenanceLogEntry>> {
  return fetch(`/api/vehicles/${vehicleId}/maintenance/log/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json());
}
async function deleteMaintenanceLog(vehicleId: string, id: string): Promise<ApiResponse<null>> {
  return fetch(`/api/vehicles/${vehicleId}/maintenance/log/${id}`, { method: "DELETE" }).then((r) => r.json());
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

// ─── VehicleFormDialog ─────────────────────────────────────────────────────────

function VehicleFormDialog({
  open, onClose, onSuccess, initial, editId,
}: {
  open: boolean; onClose: () => void; onSuccess: () => void;
  initial?: Partial<VehicleFormState>; editId?: string;
}) {
  const [form, setForm] = useState<VehicleFormState>({ ...EMPTY_VEHICLE_FORM, ...initial });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vinLoading, setVinLoading] = useState(false);

  // Reset form when dialog opens or target vehicle changes
  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_VEHICLE_FORM, ...initial });
      setError(null);
    }
  }, [open, editId]); // eslint-disable-line react-hooks/exhaustive-deps

  function set(key: keyof VehicleFormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleVinLookup() {
    if (form.vin.length !== 17) return;
    setVinLoading(true);
    const res = await vinLookup(form.vin);
    setVinLoading(false);
    if (res.error) return;
    const d = res.data;
    setForm((f) => ({
      ...f,
      make: d.make ?? f.make,
      model: d.model ?? f.model,
      year: d.year?.toString() ?? f.year,
      engineCapacity: d.engineCapacity ?? f.engineCapacity,
      fuelType: d.fuelType ?? f.fuelType,
      transmissionType: d.transmissionType ?? f.transmissionType,
      bodyType: d.bodyType ?? f.bodyType,
    }));
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.licensePlate.trim()) return;
    setLoading(true);
    setError(null);
    const body: Record<string, unknown> = {
      name: form.name.trim(),
      licensePlate: form.licensePlate.trim(),
      mileage: Number(form.mileage) || 0,
      ...(form.vin && { vin: form.vin.trim() }),
      ...(form.make && { make: form.make.trim() }),
      ...(form.model && { model: form.model.trim() }),
      ...(form.year && { year: Number(form.year) }),
      ...(form.color && { color: form.color.trim() }),
      ...(form.engineType && { engineType: form.engineType.trim() }),
      ...(form.engineCapacity && { engineCapacity: form.engineCapacity.trim() }),
      ...(form.fuelType && { fuelType: form.fuelType }),
      ...(form.transmissionType && { transmissionType: form.transmissionType }),
      ...(form.bodyType && { bodyType: form.bodyType.trim() }),
      ...(form.registrationExpiry && { registrationExpiry: form.registrationExpiry }),
    };
    const res = editId ? await updateVehicle(editId, body) : await createVehicle(body);
    setLoading(false);
    if (res.error) { setError(res.error.message); return; }
    onSuccess();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editId ? "Edytuj pojazd" : "Dodaj pojazd"}</DialogTitle>
          <DialogDescription>Uzupełnij dane pojazdu.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Nazwa *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="np. Mój samochód" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Nr rejestracyjny *</Label>
            <Input value={form.licensePlate} onChange={(e) => set("licensePlate", e.target.value)} placeholder="np. WA12345" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>VIN</Label>
            <div className="flex gap-2">
              <Input value={form.vin} onChange={(e) => set("vin", e.target.value)} placeholder="17 znaków" maxLength={17} />
              <Button type="button" variant="outline" size="sm" onClick={handleVinLookup} disabled={form.vin.length !== 17 || vinLoading}>
                {vinLoading ? <Spinner /> : "Szukaj"}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Marka</Label>
              <Input value={form.make} onChange={(e) => set("make", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Model</Label>
              <Input value={form.model} onChange={(e) => set("model", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Rok produkcji</Label>
              <Input value={form.year} onChange={(e) => set("year", e.target.value)} type="number" placeholder="2020" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Kolor</Label>
              <Input value={form.color} onChange={(e) => set("color", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Rodzaj paliwa</Label>
              <Select value={form.fuelType} onValueChange={(v) => set("fuelType", v)}>
                <SelectTrigger><SelectValue placeholder="Wybierz" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FUEL_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Skrzynia biegów</Label>
              <Select value={form.transmissionType} onValueChange={(v) => set("transmissionType", v)}>
                <SelectTrigger><SelectValue placeholder="Wybierz" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TRANSMISSION_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Pojemność silnika</Label>
              <Input value={form.engineCapacity} onChange={(e) => set("engineCapacity", e.target.value)} placeholder="np. 1.6" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Typ silnika</Label>
              <Input value={form.engineType} onChange={(e) => set("engineType", e.target.value)} placeholder="np. 1.6 TDI" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Typ nadwozia</Label>
              <Input value={form.bodyType} onChange={(e) => set("bodyType", e.target.value)} placeholder="np. Sedan" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Przebieg (km)</Label>
              <Input value={form.mileage} onChange={(e) => set("mileage", e.target.value)} type="number" min="0" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Ważność dowodu rejestracyjnego</Label>
            <Input value={form.registrationExpiry} onChange={(e) => set("registrationExpiry", e.target.value)} type="date" />
          </div>
          {error && <Alert><AlertDescription>{error}</AlertDescription></Alert>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Anuluj</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Spinner data-icon="inline-start" />}
            {editId ? "Zapisz zmiany" : "Dodaj pojazd"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Insurance ────────────────────────────────────────────────────────────────

function InsuranceFormDialog({
  open, onClose, onSuccess, vehicleId, editItem,
}: {
  open: boolean; onClose: () => void; onSuccess: () => void;
  vehicleId: string; editItem?: InsuranceView;
}) {
  const [provider, setProvider] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["oc"]);
  const [amount, setAmount] = useState<string | number>("");
  const [currency, setCurrency] = useState("PLN");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setProvider(editItem?.provider ?? "");
      setPolicyNumber(editItem?.policyNumber ?? "");
      setSelectedTypes(editItem?.types ?? ["oc"]);
      setAmount(editItem?.amount ?? "");
      setCurrency(editItem?.currency ?? "PLN");
      setStartDate(editItem?.startDate?.slice(0, 10) ?? "");
      setEndDate(editItem?.endDate?.slice(0, 10) ?? "");
      setNotes(editItem?.notes ?? "");
      setError(null);
    }
  }, [open, editItem]);

  function toggleType(type: string) {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  async function handleSubmit() {
    if (!provider.trim() || selectedTypes.length === 0 || !startDate || !endDate) return;
    setLoading(true);
    setError(null);
    const body: Record<string, unknown> = {
      provider: provider.trim(),
      types: selectedTypes,
      amount: Number(amount),
      currency,
      startDate,
      endDate,
      ...(policyNumber && { policyNumber: policyNumber.trim() }),
      notes: notes.trim() || null,
    };
    const res = editItem
      ? await updateInsurance(vehicleId, editItem.id, body)
      : await createInsurance(vehicleId, body);
    setLoading(false);
    if (res.error) { setError(res.error.message); return; }
    onSuccess();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle>{editItem ? "Edytuj polisę" : "Dodaj ubezpieczenie"}</DialogTitle>
          <DialogDescription>Uzupełnij dane polisy ubezpieczeniowej.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 flex-1">
          <div className="flex flex-col gap-1.5">
            <Label>Ubezpieczyciel *</Label>
            <Input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="np. PZU, WARTA" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Numer polisy</Label>
            <Input value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} placeholder="np. PL123456789" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Rodzaje ubezpieczenia *</Label>
            <div className="flex flex-wrap gap-2">
              {INSURANCE_TYPE_OPTIONS.map(({ value, label }) => {
                const selected = selectedTypes.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleType(value)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-medium transition-colors",
                      selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:border-primary/50 text-foreground"
                    )}
                  >
                    {selected && <CheckIcon className="size-3.5" />}
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Data od *</Label>
              <Input value={startDate} onChange={(e) => setStartDate(e.target.value)} type="date" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Data do *</Label>
              <Input value={endDate} onChange={(e) => setEndDate(e.target.value)} type="date" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>Składka</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" step="0.01" placeholder="0.00" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Waluta</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Notatki</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          {error && <Alert><AlertDescription>{error}</AlertDescription></Alert>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Anuluj</Button>
          <Button onClick={handleSubmit} disabled={loading || selectedTypes.length === 0}>
            {loading && <Spinner data-icon="inline-start" />}
            {editItem ? "Zapisz" : "Dodaj"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RenewInsuranceDialog({
  open, onClose, onSuccess, vehicleId, insurance,
}: {
  open: boolean; onClose: () => void; onSuccess: () => void;
  vehicleId: string; insurance: InsuranceView;
}) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [amount, setAmount] = useState(insurance.amount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!startDate || !endDate) return;
    setLoading(true);
    setError(null);
    const res = await renewInsurance(vehicleId, insurance.id, {
      startDate,
      endDate,
      ...(amount && { amount: Number(amount) }),
    });
    setLoading(false);
    if (res.error) { setError(res.error.message); return; }
    onSuccess();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Odnów ubezpieczenie</DialogTitle>
          <DialogDescription>
            {insurance.provider} — {insurance.types.map((t) => INSURANCE_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t).join(", ")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Nowa data od *</Label>
              <Input value={startDate} onChange={(e) => setStartDate(e.target.value)} type="date" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Nowa data do *</Label>
              <Input value={endDate} onChange={(e) => setEndDate(e.target.value)} type="date" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Składka ({insurance.currency})</Label>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" step="0.01" />
          </div>
          {error && <Alert><AlertDescription>{error}</AlertDescription></Alert>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Anuluj</Button>
          <Button onClick={handleSubmit} disabled={loading || !startDate || !endDate}>
            {loading && <Spinner data-icon="inline-start" />}
            Odnów
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VehicleInsuranceTab({ vehicle, onRefresh }: { vehicle: VehicleDetail; onRefresh: () => void }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<InsuranceView | undefined>(undefined);
  const [renewItem, setRenewItem] = useState<InsuranceView | undefined>(undefined);

  const sorted = [...vehicle.insurances].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{sorted.length} {sorted.length === 1 ? "polisa" : "polisy/polis"}</p>
        <Button size="sm" onClick={() => { setEditItem(undefined); setFormOpen(true); }}>
          <PlusIcon data-icon="inline-start" />
          Dodaj
        </Button>
      </div>

      {sorted.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><ShieldIcon /></EmptyMedia>
            <EmptyTitle>Brak ubezpieczeń</EmptyTitle>
            <EmptyDescription>Dodaj pierwszą polisę.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((ins) => (
            <InsuranceCard
              key={ins.id}
              ins={ins}
              vehicleSlug={vehicle.slug}
              onEdit={() => { setEditItem(ins); setFormOpen(true); }}
              onRenew={() => setRenewItem(ins)}
              onDelete={onRefresh}
            />
          ))}
        </div>
      )}

      <InsuranceFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditItem(undefined); }}
        onSuccess={onRefresh}
        vehicleId={vehicle.slug}
        editItem={editItem}
      />
      {renewItem && (
        <RenewInsuranceDialog
          open={true}
          onClose={() => setRenewItem(undefined)}
          onSuccess={() => { setRenewItem(undefined); onRefresh(); }}
          vehicleId={vehicle.slug}
          insurance={renewItem}
        />
      )}
    </div>
  );
}

// ─── Insurance card ─────────────────────────────────────────────────────────

function InsuranceCard({
  ins, vehicleSlug, onEdit, onRenew, onDelete,
}: {
  ins: InsuranceView;
  vehicleSlug: string;
  onEdit: () => void;
  onRenew: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const hasDetails = !!(ins.notes);

  return (
    <Card className="overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex items-center gap-2 px-4 py-3 w-full cursor-pointer select-none">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-semibold">{ins.provider}</span>
              <InsuranceStatusBadge status={ins.status} />
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-3">
              {ins.types.map((t) => (
                <Badge key={t} variant="secondary" className="text-xs py-0">
                  {INSURANCE_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t}
                </Badge>
              ))}
              {ins.policyNumber && (
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground font-mono border border-border/40 rounded px-2 py-0.5 bg-muted/60 select-all cursor-pointer hover:bg-muted/90 transition"
                  title="Kliknij, aby skopiować"
                  onClick={() => { navigator.clipboard.writeText(ins.policyNumber ?? ''); }}
                >
                  {ins.policyNumber}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" className="size-3 ml-1 opacity-60"><path d="M5.5 2A1.5 1.5 0 0 0 4 3.5v7A1.5 1.5 0 0 0 5.5 12H6v-1h-.5a.5.5 0 0 1-.5-.5v-7a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5V4h1v-.5A1.5 1.5 0 0 0 10.5 2h-5ZM7 5.5A1.5 1.5 0 0 1 8.5 4h3A1.5 1.5 0 0 1 13 5.5v7A1.5 1.5 0 0 1 11.5 14h-3A1.5 1.5 0 0 1 7 12.5v-7ZM8.5 5a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.5-.5h-3Z" fill="currentColor"/></svg>
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-2 min-w-[120px]">
                <CalendarIcon className="size-3" />
                <span className="font-medium text-foreground/80">Okres:</span>
                {fmtDate(ins.startDate)} – {fmtDate(ins.endDate)}
              </span>
              <span className="flex items-center gap-2 min-w-[100px]">
                <BanknoteIcon className="size-3" />
                <span className="font-medium text-foreground/80">Kwota:</span>
                {fmt(ins.amount, ins.currency)}
              </span>
            </div>
            {/* Notatki tylko po rozwinięciu */}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" onClick={(e) => { e.stopPropagation(); onRenew(); }}>
              <RefreshCwIcon className="size-3" />Odnów
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <PencilIcon className="size-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={(e) => e.stopPropagation()}>
                  <TrashIcon className="size-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Usuń polisę</AlertDialogTitle>
                  <AlertDialogDescription>Czy na pewno usunąć polisę {ins.provider}?</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Anuluj</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={async () => { await deleteInsurance(vehicleSlug, ins.id); onDelete(); }}>
                    Usuń
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {hasDetails && (
              <span className="h-7 w-7 flex items-center justify-center text-muted-foreground pointer-events-none">
                {open ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
              </span>
            )}
          </div>
          </button>
        </CollapsibleTrigger>
        {hasDetails && (
          <CollapsibleContent>
            <div className="px-4 pb-3 border-t pt-3">
              {ins.notes && <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{ins.notes}</p>}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </Card>
  );
}

// ─── Inspections ──────────────────────────────────────────────────────────────

function InspectionFormDialog({
  open, onClose, onSuccess, vehicleId, editItem,
}: {
  open: boolean; onClose: () => void; onSuccess: () => void;
  vehicleId: string; editItem?: InspectionView;
}) {
  const [date, setDate] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [stationName, setStationName] = useState("");
  const [result, setResult] = useState<string>("passed");
  const [mileage, setMileage] = useState("");
  const [cost, setCost] = useState("");
  const [currency, setCurrency] = useState("PLN");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDate(editItem?.date?.slice(0, 10) ?? "");
      setNextDate(editItem?.nextDate?.slice(0, 10) ?? "");
      setStationName(editItem?.stationName ?? "");
      setResult(editItem?.result ?? "passed");
      setMileage(editItem?.mileageAtService?.toString() ?? "");
      setCost(editItem?.cost ?? "");
      setCurrency(editItem?.currency ?? "PLN");
      setNotes(editItem?.notes ?? "");
      setError(null);
    }
  }, [open, editItem]);

  async function handleSubmit() {
    if (!date || !result) return;
    setLoading(true);
    setError(null);
    const body: Record<string, unknown> = {
      date,
      result,
      currency,
      ...(nextDate && { nextDate }),
      ...(stationName && { stationName: stationName.trim() }),
      ...(mileage && { mileageAtService: Number(mileage) }),
      ...(cost && { cost: Number(cost) }),
      notes: notes.trim() || null,
    };
    const res = editItem
      ? await updateInspection(vehicleId, editItem.id, body)
      : await createInspection(vehicleId, body);
    setLoading(false);
    if (res.error) { setError(res.error.message); return; }
    onSuccess();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle>{editItem ? "Edytuj przegląd" : "Dodaj przegląd"}</DialogTitle>
          <DialogDescription>Uzupełnij dane przeglądu technicznego.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Data przeglądu *</Label>
              <Input value={date} onChange={(e) => setDate(e.target.value)} type="date" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Następny przegląd</Label>
              <Input value={nextDate} onChange={(e) => setNextDate(e.target.value)} type="date" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Stacja kontroli</Label>
            <Input value={stationName} onChange={(e) => setStationName(e.target.value)} placeholder="np. SKP Warszawa Mokotów" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Wynik *</Label>
            <Select value={result} onValueChange={setResult}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(INSPECTION_RESULT_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Przebieg (km)</Label>
              <Input value={mileage} onChange={(e) => setMileage(e.target.value)} type="number" min="0" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Koszt</Label>
              <div className="flex gap-2">
                <Input value={cost} onChange={(e) => setCost(e.target.value)} type="number" step="0.01" placeholder="0.00" />
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Notatki</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          {error && <Alert><AlertDescription>{error}</AlertDescription></Alert>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Anuluj</Button>
          <Button onClick={handleSubmit} disabled={loading || !date}>
            {loading && <Spinner data-icon="inline-start" />}
            {editItem ? "Zapisz" : "Dodaj"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VehicleInspectionsTab({ vehicle, onRefresh }: { vehicle: VehicleDetail; onRefresh: () => void }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<InspectionView | undefined>(undefined);

  const sorted = [...vehicle.inspections].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{sorted.length} {sorted.length === 1 ? "przegląd" : "przeglądów"}</p>
        <Button size="sm" onClick={() => { setEditItem(undefined); setFormOpen(true); }}>
          <PlusIcon data-icon="inline-start" />
          Dodaj
        </Button>
      </div>

      {sorted.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><CalendarIcon /></EmptyMedia>
            <EmptyTitle>Brak przeglądów</EmptyTitle>
            <EmptyDescription>Dodaj pierwszy przegląd techniczny.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((ins) => (
            <InspectionCard
              key={ins.id}
              ins={ins}
              vehicleSlug={vehicle.slug}
              onEdit={() => { setEditItem(ins); setFormOpen(true); }}
              onDelete={onRefresh}
            />
          ))}
        </div>
      )}

      <InspectionFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditItem(undefined); }}
        onSuccess={onRefresh}
        vehicleId={vehicle.slug}
        editItem={editItem}
      />
    </div>
  );
}

// ─── Inspection card ─────────────────────────────────────────────────────────

function InspectionCard({
  ins, vehicleSlug, onEdit, onDelete,
}: {
  ins: InspectionView;
  vehicleSlug: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const hasDetails = !!(ins.notes);

  return (
    <Card className="overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex items-center gap-2 px-4 py-3 w-full cursor-pointer select-none">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold tabular-nums">{fmtDate(ins.date)}</span>
              {inspectionBadge(ins.result)}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 text-xs text-muted-foreground">
              {ins.stationName && (
                <span className="flex items-center gap-2 min-w-[120px]">
                  <BuildingIcon className="size-3 shrink-0" />
                  <span className="font-medium text-foreground/80">Stacja:</span>
                  {ins.stationName}
                </span>
              )}
              {ins.mileageAtService != null && (
                <span className="flex items-center gap-2 min-w-[100px]">
                  <GaugeIcon className="size-3" />
                  <span className="font-medium text-foreground/80">Przebieg:</span>
                  {ins.mileageAtService.toLocaleString("pl-PL")} km
                </span>
              )}
              {ins.cost && (
                <span className="flex items-center gap-2 min-w-[100px]">
                  <BanknoteIcon className="size-3" />
                  <span className="font-medium text-foreground/80">Koszt:</span>
                  {fmt(ins.cost, ins.currency)}
                </span>
              )}
              {ins.nextDate && (
                <span className="flex items-center gap-2 min-w-[120px]">
                  <CalendarIcon className="size-3" />
                  <span className="font-medium text-foreground/80">Następny:</span>
                  {fmtDate(ins.nextDate)}
                </span>
              )}
            </div>
            {/* Notatki tylko po rozwinięciu */}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <PencilIcon className="size-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={(e) => e.stopPropagation()}>
                  <TrashIcon className="size-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Usuń przegląd</AlertDialogTitle>
                  <AlertDialogDescription>Czy na pewno usunąć przegląd z {fmtDate(ins.date)}?</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Anuluj</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={async () => { await deleteInspection(vehicleSlug, ins.id); onDelete(); }}>
                    Usuń
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {hasDetails && (
              <span className="h-7 w-7 flex items-center justify-center text-muted-foreground pointer-events-none">
                {open ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
              </span>
            )}
          </div>
          </button>
        </CollapsibleTrigger>
        {hasDetails && (
          <CollapsibleContent>
            <div className="px-4 pb-3 border-t pt-3">
              {ins.notes && <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{ins.notes}</p>}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </Card>
  );
}

// ─── Service Visits ───────────────────────────────────────────────────────────


function ServiceVisitEditDialog({
  open, onClose, onSuccess, vehicleId, visit,
}: {
  open: boolean; onClose: () => void; onSuccess: () => void;
  vehicleId: string; visit: ServiceVisitView;
}) {
  const [date, setDate] = useState("");
  const [shopName, setShopName] = useState("");
  const [mileage, setMileage] = useState("");
  const [cost, setCost] = useState<string>("");
  const [currency, setCurrency] = useState("PLN");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDate(visit.date.slice(0, 10));
      setShopName(visit.shopName ?? "");
      setMileage(visit.mileageAtService?.toString() ?? "");
      setCost(visit.totalCost ?? "");
      setCurrency(visit.currency);
      setNotes(visit.notes ?? "");
      setError(null);
    }
  }, [open, visit]);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    const body: Record<string, unknown> = {
      date,
      currency,
      ...(shopName && { shopName: shopName.trim() }),
      ...(mileage && { mileageAtService: Number(mileage) }),
      ...(cost && { totalCost: Number(cost) }),
      notes: notes.trim() || null,
    };
    const res = await updateServiceVisit(vehicleId, visit.id, body);
    setLoading(false);
    if (res.error) { setError(res.error.message); return; }
    onSuccess();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle>Edytuj wizytę serwisową</DialogTitle>
          <DialogDescription>Zmień dane wizyty serwisowej.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 flex-1">
          <div className="flex flex-col gap-1.5">
            <Label>Data *</Label>
            <Input value={date} onChange={(e) => setDate(e.target.value)} type="date" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Serwis / Warsztat</Label>
            <Input value={shopName} onChange={(e) => setShopName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Przebieg (km)</Label>
              <Input value={mileage} onChange={(e) => setMileage(e.target.value)} type="number" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Koszt</Label>
              <div className="flex gap-2">
                <Input value={cost} onChange={(e) => setCost(e.target.value)} type="number" step="0.01" />
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Notatki</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          {error && <Alert><AlertDescription>{error}</AlertDescription></Alert>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Anuluj</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Spinner data-icon="inline-start" />}
            Zapisz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ServiceVisitCard({
  visit, vehicleId, onRefresh,
}: {
  visit: ServiceVisitView; vehicleId: string; onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [lbToggler, setLbToggler] = useState(false);
  const [lbIndex, setLbIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const imageFiles = (visit.files ?? []).filter((f) => f.fileType === "image");
  const pdfFiles = (visit.files ?? []).filter((f) => f.fileType === "pdf");
  const imageSources = imageFiles.map((f) => f.fileUrl);

  function openLightbox(index: number) {
    setLbIndex(index);
    setLbToggler((t) => !t);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    await uploadServiceVisitFile(vehicleId, visit.id, file);
    setUploading(false);
    onRefresh();
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <>
      <Card className="overflow-hidden">
        <Collapsible open={open} onOpenChange={setOpen}>
          {/* Header — always visible */}
          <CollapsibleTrigger asChild>
            <button type="button" className="flex items-center gap-2 px-4 py-3 w-full cursor-pointer select-none">
            {/* Left: date + meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold tabular-nums">{fmtDate(visit.date)}</span>
                {visit.shopName && (
                  <span className="text-sm text-muted-foreground truncate max-w-[160px]">{visit.shopName}</span>
                )}
                {visit.aiSuggestions && visit.aiSuggestions.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] gap-1 py-0">
                    <SparklesIcon className="size-3" />AI
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 text-xs text-muted-foreground">
                {visit.mileageAtService != null && (
                  <span className="flex items-center gap-2 min-w-[100px]">
                    <GaugeIcon className="size-3" />
                    <span className="font-medium text-foreground/80">Przebieg:</span>
                    {visit.mileageAtService.toLocaleString("pl-PL")} km
                  </span>
                )}
                {visit.totalCost && (
                  <span className="flex items-center gap-2 min-w-[100px]">
                    <BanknoteIcon className="size-3" />
                    <span className="font-medium text-foreground/80">Koszt:</span>
                    {fmt(visit.totalCost, visit.currency)}
                  </span>
                )}
                {imageFiles.length > 0 && (
                  <span className="flex items-center gap-2 min-w-[80px]">
                    <ImageIcon className="size-3" />
                    <span className="font-medium text-foreground/80">Zdjęć:</span>
                    {imageFiles.length}
                  </span>
                )}
                {pdfFiles.length > 0 && (
                  <span className="flex items-center gap-2 min-w-[80px]">
                    <FileTextIcon className="size-3" />
                    <span className="font-medium text-foreground/80">PDF:</span>
                    {pdfFiles.length}
                  </span>
                )}
              </div>
              {/* Notatki tylko po rozwinięciu */}
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-0.5 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title="Edytuj"
                onClick={(e) => { e.stopPropagation(); setEditOpen(true); }}
              >
                <PencilIcon className="size-3.5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    title="Usuń"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <TrashIcon className="size-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Usuń wizytę serwisową</AlertDialogTitle>
                    <AlertDialogDescription>
                      Czy na pewno usunąć wizytę z {fmtDate(visit.date)}?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Anuluj</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={async () => { await deleteServiceVisit(vehicleId, visit.id); onRefresh(); }}
                    >
                      Usuń
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <span className="h-7 w-7 flex items-center justify-center text-muted-foreground pointer-events-none">
                {open ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
              </span>
            </div>
            </button>
          </CollapsibleTrigger>

          {/* Expanded content */}
          <CollapsibleContent>
            <div className="px-4 pb-3 flex flex-col gap-3 border-t pt-3">
              {/* Notes — full */}
              {visit.notes && (
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{visit.notes}</p>
              )}

              {/* Image strip */}
              {imageFiles.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {imageFiles.map((f, idx) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => openLightbox(idx)}
                      className="relative h-12 w-12 shrink-0 rounded-md overflow-hidden border bg-muted hover:ring-2 hover:ring-primary/50 transition-all"
                      title={f.fileName}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f.fileUrl} alt={f.fileName} className="w-full h-full object-cover" />
                    </button>
                  ))}
                  {imageFiles.length > 1 && (
                    <span className="text-xs text-muted-foreground ml-1">
                      {imageFiles.length} zdjęć · kliknij aby otworzyć
                    </span>
                  )}
                </div>
              )}

              {/* PDF files */}
              {pdfFiles.length > 0 && (
                <div className="flex flex-col gap-1">
                  {pdfFiles.map((f) => (
                    <a
                      key={f.id}
                      href={f.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors p-1.5 -mx-1.5 rounded hover:bg-muted"
                    >
                      <FileTextIcon className="size-3.5 shrink-0" />
                      <span className="truncate">{f.fileName}</span>
                      <ExternalLinkIcon className="size-3 ml-auto shrink-0" />
                    </a>
                  ))}
                </div>
              )}

              {/* Upload */}
              <div className="border-t pt-2.5">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Spinner data-icon="inline-start" /> : <UploadIcon data-icon="inline-start" />}
                  Dodaj zdjęcie / dokument
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <ServiceVisitEditDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={onRefresh}
        vehicleId={vehicleId}
        visit={visit}
      />

      {imageSources.length > 0 && (
        <FsLightbox
          toggler={lbToggler}
          sources={imageSources}
          sourceIndex={lbIndex}
        />
      )}
    </>
  );
}

function ServiceVisitFormDialog({
  open, onClose, onSuccess, vehicleId,
}: {
  open: boolean; onClose: () => void; onSuccess: () => void; vehicleId: string;
}) {
  const [date, setDate] = useState("");
  const [shopName, setShopName] = useState("");
  const [mileage, setMileage] = useState("");
  const [cost, setCost] = useState("");
  const [currency, setCurrency] = useState("PLN");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!date) return;
    setLoading(true);
    setError(null);
    const body: Record<string, unknown> = {
      date,
      currency,
      ...(shopName && { shopName: shopName.trim() }),
      ...(mileage && { mileageAtService: Number(mileage) }),
      ...(cost && { totalCost: Number(cost) }),
      notes: notes.trim() || null,
    };
    const res = await createServiceVisit(vehicleId, body);
    setLoading(false);
    if (res.error) { setError(res.error.message); return; }
    onSuccess();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dodaj wizytę serwisową</DialogTitle>
          <DialogDescription>Uzupełnij dane wizyty w serwisie.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Data *</Label>
            <Input value={date} onChange={(e) => setDate(e.target.value)} type="date" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Serwis / Warsztat</Label>
            <Input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="np. Auto Serwis Kowalski" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Przebieg (km)</Label>
              <Input value={mileage} onChange={(e) => setMileage(e.target.value)} type="number" min="0" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Koszt</Label>
              <div className="flex gap-2">
                <Input value={cost} onChange={(e) => setCost(e.target.value)} type="number" step="0.01" placeholder="0.00" />
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Notatki</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          {error && <Alert><AlertDescription>{error}</AlertDescription></Alert>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Anuluj</Button>
          <Button onClick={handleSubmit} disabled={loading || !date}>
            {loading && <Spinner data-icon="inline-start" />}
            Dodaj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VehicleServiceTab({ vehicle, onRefresh }: { vehicle: VehicleDetail; onRefresh: () => void }) {
  const [formOpen, setFormOpen] = useState(false);

  const sorted = [...vehicle.serviceVisits].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{sorted.length} {sorted.length === 1 ? "wizyta" : "wizyt"}</p>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          Dodaj
        </Button>
      </div>

      {sorted.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><WrenchIcon /></EmptyMedia>
            <EmptyTitle>Brak wizyt serwisowych</EmptyTitle>
            <EmptyDescription>Dodaj pierwszą wizytę w serwisie.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((visit) => (
            <ServiceVisitCard
              key={visit.id}
              visit={visit}
              vehicleId={vehicle.slug}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}

      <ServiceVisitFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={onRefresh}
        vehicleId={vehicle.slug}
      />
    </div>
  );
}

// ─── Maintenance Log ──────────────────────────────────────────────────────────

function MaintenanceLogFormDialog({
  open, onClose, onSuccess, vehicleId,
}: {
  open: boolean; onClose: () => void; onSuccess: () => void; vehicleId: string;
}) {
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [label, setLabel] = useState("");
  const [date, setDate] = useState("");
  const [mileage, setMileage] = useState("");
  const [cost, setCost] = useState("");
  const [currency, setCurrency] = useState("PLN");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCustom = category === "Inne";
  const effectiveCategory = isCustom ? customCategory.trim() : category;

  async function handleSubmit() {
    if (!effectiveCategory || !date) return;
    setLoading(true);
    setError(null);
    const body: Record<string, unknown> = {
      category: effectiveCategory,
      date,
      currency,
      ...(label && { label: label.trim() }),
      ...(mileage && { mileage: Number(mileage) }),
      ...(cost && { cost: Number(cost) }),
      notes: notes.trim() || null,
    };
    const res = await createMaintenanceLog(vehicleId, body);
    setLoading(false);
    if (res.error) { setError(res.error.message); return; }
    onSuccess();
    onClose();
    // Reset
    setCategory(""); setCustomCategory(""); setLabel(""); setDate("");
    setMileage(""); setCost(""); setNotes("");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dodaj wpis eksploatacyjny</DialogTitle>
          <DialogDescription>Zarejestruj wykonaną czynność serwisową lub wymianę części.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Kategoria *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Wybierz kategorię" /></SelectTrigger>
              <SelectContent>
                {MAINTENANCE_LOG_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isCustom && (
            <div className="flex flex-col gap-1.5">
              <Label>Własna kategoria *</Label>
              <Input value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} placeholder="np. Układ kierowniczy" />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label>Opis / etykieta</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="np. Wymiana oleju 5W-30" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Data *</Label>
            <Input value={date} onChange={(e) => setDate(e.target.value)} type="date" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Przebieg (km)</Label>
              <Input value={mileage} onChange={(e) => setMileage(e.target.value)} type="number" min="0" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Koszt</Label>
              <div className="flex gap-2">
                <Input value={cost} onChange={(e) => setCost(e.target.value)} type="number" step="0.01" placeholder="0.00" />
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Notatki</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Dodatkowe uwagi..." />
          </div>
          {error && <Alert><AlertDescription>{error}</AlertDescription></Alert>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Anuluj</Button>
          <Button onClick={handleSubmit} disabled={loading || !effectiveCategory || !date}>
            {loading && <Spinner data-icon="inline-start" />}
            Dodaj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MaintenanceLogEditDialog({
  open, onClose, onSuccess, vehicleId, entry,
}: {
  open: boolean; onClose: () => void; onSuccess: () => void;
  vehicleId: string; entry: MaintenanceLogEntry;
}) {
  const [label, setLabel] = useState(entry.label ?? "");
  const [date, setDate] = useState(entry.date?.slice(0, 10) ?? "");
  const [mileage, setMileage] = useState(entry.mileage?.toString() ?? "");
  const [cost, setCost] = useState(entry.cost ?? "");
  const [currency, setCurrency] = useState(entry.currency ?? "PLN");
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLabel(entry.label ?? "");
      setDate(entry.date?.slice(0, 10) ?? "");
      setMileage(entry.mileage?.toString() ?? "");
      setCost(entry.cost ?? "");
      setCurrency(entry.currency ?? "PLN");
      setNotes(entry.notes ?? "");
      setError(null);
    }
  }, [open, entry]);

  async function handleSubmit() {
    if (!date) return;
    setLoading(true);
    setError(null);
    const body: Record<string, unknown> = {
      date,
      currency,
      ...(label && { label: label.trim() }),
      ...(mileage && { mileage: Number(mileage) }),
      ...(cost && { cost: Number(cost) }),
      notes: notes.trim() || null,
    };
    const res = await updateMaintenanceLog(vehicleId, entry.id, body);
    setLoading(false);
    if (res.error) { setError(res.error.message); return; }
    onSuccess();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edytuj wpis — {entry.category}</DialogTitle>
          <DialogDescription>Zmień szczegóły wpisu eksploatacyjnego.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Opis / etykieta</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="np. Wymiana oleju 5W-30" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Data *</Label>
            <Input value={date} onChange={(e) => setDate(e.target.value)} type="date" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Przebieg (km)</Label>
              <Input value={mileage} onChange={(e) => setMileage(e.target.value)} type="number" min="0" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Koszt</Label>
              <div className="flex gap-2">
                <Input value={cost} onChange={(e) => setCost(e.target.value)} type="number" step="0.01" placeholder="0.00" />
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Notatki</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          {error && <Alert><AlertDescription>{error}</AlertDescription></Alert>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Anuluj</Button>
          <Button onClick={handleSubmit} disabled={loading || !date}>
            {loading && <Spinner data-icon="inline-start" />}
            Zapisz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VehicleMaintenanceTab({ vehicleSlug }: { vehicleSlug: string }) {
  const [logs, setLogs] = useState<MaintenanceLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<MaintenanceLogEntry | null>(null);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    const res = await fetchMaintenanceLogs(vehicleSlug);
    if (res.error) setError(res.error.message);
    else setLogs(res.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [vehicleSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleCategory(cat: string) {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  if (loading) return <Skeleton className="h-48 w-full" />;
  if (error) return <Alert><AlertDescription>{error}</AlertDescription></Alert>;

  // Group by category
  const grouped = logs.reduce<Record<string, MaintenanceLogEntry[]>>((acc, log) => {
    (acc[log.category] ??= []).push(log);
    return acc;
  }, {});

  // Sort entries within each group by date desc
  for (const cat of Object.keys(grouped)) {
    grouped[cat].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  const categories = Object.keys(grouped).sort((a, b) => {
    const latestA = grouped[a][0].date;
    const latestB = grouped[b][0].date;
    return new Date(latestB).getTime() - new Date(latestA).getTime();
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {logs.length} {logs.length === 1 ? "wpis" : "wpisów"} w {categories.length} {categories.length === 1 ? "kategorii" : "kategoriach"}
          </p>
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Dodaj
          </Button>
        </div>

        {categories.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><WrenchIcon /></EmptyMedia>
              <EmptyTitle>Brak wpisów</EmptyTitle>
              <EmptyDescription>Dodaj pierwszy wpis eksploatacyjny.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col gap-3">
            {categories.map((cat) => {
              const entries = grouped[cat];
              const latest = entries[0];
              const isOpen = openCategories.has(cat);

              return (
                <Card key={cat} className="overflow-hidden">
                  <Collapsible open={isOpen} onOpenChange={() => toggleCategory(cat)}>
                    <CollapsibleTrigger asChild>
                      <button type="button" className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-muted/30 transition-colors cursor-pointer select-none">
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="font-medium text-base">{cat}</span>
                          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-2 min-w-[120px]">
                              <CalendarIcon className="size-3" />
                              <span className="font-medium text-foreground/80">Ostatnio:</span>
                              {fmtDate(latest.date)}
                            </span>
                            {latest.mileage != null && (
                              <span className="flex items-center gap-2 min-w-[100px]">
                                <GaugeIcon className="size-3" />
                                <span className="font-medium text-foreground/80">Przebieg:</span>
                                {latest.mileage.toLocaleString("pl-PL")} km
                              </span>
                            )}
                            {/* koszt usunięty */}
                            <Badge variant="secondary" className="text-xs">{entries.length}x</Badge>
                          </div>
                        </div>
                        <div className="shrink-0 text-muted-foreground pointer-events-none">
                          {isOpen ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t">
                        {entries.map((entry, idx) => (
                          <div
                            key={entry.id}
                            className={cn(
                              "px-4 py-3 flex items-start justify-between gap-3",
                              idx < entries.length - 1 && "border-b border-border/50"
                            )}
                          >
                            <div className="flex flex-col gap-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium tabular-nums">{fmtDate(entry.date)}</span>
                                {entry.label && (
                                  <span className="text-xs text-muted-foreground truncate max-w-[180px]">{entry.label}</span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 text-xs text-muted-foreground">
                                {entry.mileage != null && (
                                  <span className="flex items-center gap-2 min-w-[100px]">
                                    <GaugeIcon className="size-3" />
                                    <span className="font-medium text-foreground/80">Przebieg:</span>
                                    {entry.mileage.toLocaleString("pl-PL")} km
                                  </span>
                                )}
                                {/* koszt usunięty */}
                              </div>
                              {entry.notes && (
                                <p className="mt-1 text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{entry.notes}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <Button
                                variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground"
                                onClick={() => setEditEntry(entry)}
                              >
                                <PencilIcon className="size-3.5" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive">
                                    <TrashIcon className="size-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Usuń wpis</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Czy na pewno usunąć wpis z {fmtDate(entry.date)}?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={async () => { await deleteMaintenanceLog(vehicleSlug, entry.id); load(); }}
                                    >
                                      Usuń
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        )}

        <MaintenanceLogFormDialog
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSuccess={load}
          vehicleId={vehicleSlug}
        />
        {editEntry && (
          <MaintenanceLogEditDialog
            open={true}
            onClose={() => setEditEntry(null)}
            onSuccess={() => { setEditEntry(null); load(); }}
            vehicleId={vehicleSlug}
            entry={editEntry}
          />
        )}
      </div>
  );
}

// ─── VehicleInfoTab ───────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
        {children}
      </div>
    </div>
  );
}

function VehicleInfoTab({
  vehicle, onRefresh,
}: {
  vehicle: VehicleDetail; onRefresh: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    const res = await uploadVehiclePhoto(vehicle.slug, file);
    setPhotoUploading(false);
    if (!res.error) onRefresh();
    if (photoRef.current) photoRef.current.value = "";
  }

  const editInitial = {
    name: vehicle.name,
    licensePlate: vehicle.licensePlate,
    vin: vehicle.vin ?? "",
    make: vehicle.make ?? "",
    model: vehicle.model ?? "",
    year: vehicle.year?.toString() ?? "",
    color: vehicle.color ?? "",
    engineType: vehicle.engineType ?? "",
    engineCapacity: vehicle.engineCapacity ?? "",
    fuelType: vehicle.fuelType ?? "",
    transmissionType: vehicle.transmissionType ?? "",
    bodyType: vehicle.bodyType ?? "",
    mileage: vehicle.mileage.toString(),
    registrationExpiry: vehicle.registrationExpiry?.slice(0, 10) ?? "",
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dane pojazdu</h2>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <PencilIcon data-icon="inline-start" />
          Edytuj dane
        </Button>
      </div>

      {/* Photo + key stats row */}
      <div className="flex items-stretch gap-4">
        <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        <div
          className="group relative h-24 w-24 shrink-0 rounded-xl overflow-hidden bg-muted border cursor-pointer"
          onClick={() => photoRef.current?.click()}
        >
          {vehicle.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={vehicle.photoUrl} alt={vehicle.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <CarIcon className="size-10 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/50 transition-colors rounded-xl">
            {photoUploading ? (
              <Spinner className="size-5 text-white" />
            ) : (
              <CameraIcon className="size-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        </div>
        <div className="flex flex-col justify-center gap-1 min-w-0">
          <p className="text-base font-semibold leading-tight">{vehicle.name}</p>
          {(vehicle.make || vehicle.model || vehicle.year) && (
            <p className="text-sm text-muted-foreground">{[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(" ")}</p>
          )}
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1 font-mono">
              <GaugeIcon className="size-3" />{vehicle.mileage.toLocaleString("pl-PL")} km
            </span>
            <span className="flex items-center gap-1 font-mono border border-border/50 rounded px-1.5 py-0.5 bg-muted/50">
              {vehicle.licensePlate}
            </span>
            {vehicle.fuelType && (
              <span>{FUEL_TYPE_LABELS[vehicle.fuelType]}</span>
            )}
          </div>
        </div>
      </div>

      {/* Sections */}
      <InfoSection title="Identyfikacja">
        <InfoRow label="Nazwa" value={vehicle.name} />
        <InfoRow label="Nr rejestracyjny" value={vehicle.licensePlate} />
        <InfoRow label="VIN" value={vehicle.vin} />
        <InfoRow label="Kolor" value={vehicle.color} />
        {vehicle.registrationExpiry && (
          <InfoRow label="Dowód rejestracyjny" value={fmtDate(vehicle.registrationExpiry)} />
        )}
      </InfoSection>

      <Separator />

      <InfoSection title="Producent">
        <InfoRow label="Marka" value={vehicle.make} />
        <InfoRow label="Model" value={vehicle.model} />
        <InfoRow label="Rok produkcji" value={vehicle.year} />
        <InfoRow label="Typ nadwozia" value={vehicle.bodyType} />
      </InfoSection>

      <Separator />

      <InfoSection title="Silnik i napęd">
        <InfoRow label="Rodzaj paliwa" value={vehicle.fuelType ? FUEL_TYPE_LABELS[vehicle.fuelType] : undefined} />
        <InfoRow label="Skrzynia biegów" value={vehicle.transmissionType ? TRANSMISSION_LABELS[vehicle.transmissionType] : undefined} />
        <InfoRow label="Pojemność" value={vehicle.engineCapacity} />
        <InfoRow label="Typ silnika" value={vehicle.engineType} />
      </InfoSection>

      <Separator />

      <InfoSection title="Stan">
        <InfoRow label="Przebieg" value={`${vehicle.mileage.toLocaleString("pl-PL")} km`} />
      </InfoSection>

      <VehicleFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={() => { setEditOpen(false); onRefresh(); }}
        initial={editInitial}
        editId={vehicle.slug}
      />
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
        <Card>
          <CardContent className="p-3 flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <WrenchIcon className="size-3" /> Koszty {new Date().getFullYear()}
            </span>
            {costs ? (
              <span className="font-mono font-medium text-destructive">
                {fmt(costs.totalCost, costs.currency)}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
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
