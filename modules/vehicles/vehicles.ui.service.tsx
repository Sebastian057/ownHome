'use client';

import { useState, useEffect, useRef } from "react";
import {
  PlusIcon, PencilIcon, TrashIcon, WrenchIcon,
  ChevronDownIcon, ChevronUpIcon, BanknoteIcon, GaugeIcon,
  ImageIcon, FileTextIcon, ExternalLinkIcon, UploadIcon, SparklesIcon,
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
import FsLightbox from "fslightbox-react";
import type { ApiResponse } from "@/types/common.types";
import type { VehicleDetail, ServiceVisitView, ServiceVisitFileView } from "./vehicles.types";
import { CURRENCIES } from "./vehicles.constants";

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

function fmt(val: string | number | null | undefined, currency = "PLN") {
  if (val == null) return "—";
  return `${Number(val).toLocaleString("pl-PL", { minimumFractionDigits: 2 })} ${currency}`;
}

function fmtDate(val: string | null | undefined) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("pl-PL");
}

export function ServiceVisitEditDialog({
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

export function ServiceVisitCard({
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
          <div className="flex items-center w-full">
            <CollapsibleTrigger asChild>
            <button type="button" className="flex-1 flex items-center gap-2 px-4 py-3 text-left cursor-pointer select-none min-w-0">
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
            </button>
            </CollapsibleTrigger>

            {/* Right: actions — outside trigger to avoid button-in-button */}
            <div className="flex items-center gap-0.5 shrink-0 pr-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title="Edytuj"
                onClick={() => setEditOpen(true)}
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
          </div>

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

export function ServiceVisitFormDialog({
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

export function VehicleServiceTab({ vehicle, onRefresh }: { vehicle: VehicleDetail; onRefresh: () => void }) {
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
