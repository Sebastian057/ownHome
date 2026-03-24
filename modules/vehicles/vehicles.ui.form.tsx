'use client';

import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import type { VehicleFormState, VinLookupResult } from "./vehicles.types";
import { EMPTY_VEHICLE_FORM } from "./vehicles.types";
import { FUEL_TYPE_LABELS, TRANSMISSION_LABELS } from "./vehicles.constants";
import type { ApiResponse } from "@/types/common.types";

async function createVehicle(data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
  return fetch("/api/vehicles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json());
}
async function updateVehicle(id: string, data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
  return fetch(`/api/vehicles/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json());
}
async function vinLookup(vin: string): Promise<ApiResponse<VinLookupResult>> {
  return fetch("/api/vehicles/vin-lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vin }) }).then((r) => r.json());
}

export function VehicleFormDialog({
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
