'use client';

import { useState, useEffect } from "react";
import {
  PlusIcon, PencilIcon, TrashIcon, ShieldIcon, CalendarIcon,
  CheckIcon, ChevronDownIcon, ChevronUpIcon, BanknoteIcon, RefreshCwIcon,
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
import { cn } from "@/lib/utils";
import type { ApiResponse } from "@/types/common.types";
import type { VehicleDetail, InsuranceView } from "./vehicles.types";
import { INSURANCE_TYPE_OPTIONS, CURRENCIES } from "./vehicles.constants";

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

function fmt(val: string | number | null | undefined, currency = "PLN") {
  if (val == null) return "—";
  return `${Number(val).toLocaleString("pl-PL", { minimumFractionDigits: 2 })} ${currency}`;
}

function fmtDate(val: string | null | undefined) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("pl-PL");
}

export function InsuranceStatusBadge({ status }: { status: "active" | "expiring" | "expired" }) {
  if (status === "active") return <Badge className="bg-success text-success-foreground">Aktywna</Badge>;
  if (status === "expiring") return <Badge className="bg-warning text-warning-foreground">Wygasa</Badge>;
  return <Badge variant="destructive">Wygasła</Badge>;
}

export function InsuranceFormDialog({
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

export function RenewInsuranceDialog({
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

export function InsuranceCard({
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
        <div className="flex items-center w-full">
          <CollapsibleTrigger asChild>
          <button type="button" className="flex-1 flex items-center gap-2 px-4 py-3 text-left cursor-pointer select-none min-w-0">
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
          </button>
          </CollapsibleTrigger>
          <div className="flex items-center gap-0.5 shrink-0 pr-2">
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => onRenew()}>
              <RefreshCwIcon className="size-3" />Odnów
            </Button>
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

export function VehicleInsuranceTab({ vehicle, onRefresh }: { vehicle: VehicleDetail; onRefresh: () => void }) {
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
