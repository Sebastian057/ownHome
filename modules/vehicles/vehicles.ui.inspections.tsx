'use client';

import { useState, useEffect } from "react";
import {
  PlusIcon, PencilIcon, TrashIcon, CalendarIcon,
  ChevronDownIcon, ChevronUpIcon, BanknoteIcon, GaugeIcon, BuildingIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { ApiResponse } from "@/types/common.types";
import type { VehicleDetail, InspectionView } from "./vehicles.types";
import { INSPECTION_RESULT_LABELS, CURRENCIES } from "./vehicles.constants";

async function createInspection(vehicleId: string, data: Record<string, unknown>): Promise<ApiResponse<InspectionView>> {
  return fetch(`/api/vehicles/${vehicleId}/inspections`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json());
}
async function updateInspection(vehicleId: string, id: string, data: Record<string, unknown>): Promise<ApiResponse<InspectionView>> {
  return fetch(`/api/vehicles/${vehicleId}/inspections/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json());
}
async function deleteInspection(vehicleId: string, id: string): Promise<ApiResponse<null>> {
  return fetch(`/api/vehicles/${vehicleId}/inspections/${id}`, { method: "DELETE" }).then((r) => r.json());
}

function fmt(val: string | number | null | undefined, currency = "PLN") {
  if (val == null) return "—";
  return `${Number(val).toLocaleString("pl-PL", { minimumFractionDigits: 2 })} ${currency}`;
}

function fmtDate(val: string | null | undefined) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("pl-PL");
}

export function inspectionBadge(result: string) {
  switch (result) {
    case "passed": return <Badge className="bg-success text-success-foreground text-xs">{INSPECTION_RESULT_LABELS[result]}</Badge>;
    case "passed_with_defects": return <Badge className="bg-warning text-warning-foreground text-xs">{INSPECTION_RESULT_LABELS[result]}</Badge>;
    default: return <Badge variant="destructive" className="text-xs">{INSPECTION_RESULT_LABELS[result] ?? result}</Badge>;
  }
}

export function InspectionFormDialog({
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

export function InspectionCard({
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
        <div className="flex items-center w-full">
        <CollapsibleTrigger asChild>
          <button type="button" className="flex-1 flex items-center gap-2 px-4 py-3 text-left cursor-pointer select-none min-w-0">
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
          </button>
        </CollapsibleTrigger>
          <div className="flex items-center gap-0.5 shrink-0 pr-2">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit()}>
              <PencilIcon className="size-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
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
        </div>
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

export function VehicleInspectionsTab({ vehicle, onRefresh }: { vehicle: VehicleDetail; onRefresh: () => void }) {
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
