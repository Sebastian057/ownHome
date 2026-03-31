'use client';

import { useState, useEffect } from "react";
import {
  PlusIcon, PencilIcon, TrashIcon, WrenchIcon,
  CalendarIcon, ChevronDownIcon, ChevronUpIcon, GaugeIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
import type { MaintenanceLogEntry } from "./vehicles.types";
import { MAINTENANCE_LOG_CATEGORIES, CURRENCIES } from "./vehicles.constants";

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

function fmtDate(val: string | null | undefined) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("pl-PL");
}

export function MaintenanceLogFormDialog({
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

export function MaintenanceLogEditDialog({
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

export function VehicleMaintenanceTab({ vehicleSlug }: { vehicleSlug: string }) {
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
