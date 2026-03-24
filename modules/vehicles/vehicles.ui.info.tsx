'use client';

import { useState, useRef } from "react";
import { CarIcon, PencilIcon, GaugeIcon, CameraIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import type { VehicleDetail } from "./vehicles.types";
import { FUEL_TYPE_LABELS, TRANSMISSION_LABELS } from "./vehicles.constants";
import { VehicleFormDialog } from "./vehicles.ui.form";
import type { ApiResponse } from "@/types/common.types";

async function uploadVehiclePhoto(vehicleId: string, file: File): Promise<ApiResponse<{ photoUrl: string }>> {
  const fd = new FormData();
  fd.append("file", file);
  return fetch(`/api/vehicles/${vehicleId}/photo`, { method: "POST", body: fd }).then((r) => r.json());
}

export function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
        {children}
      </div>
    </div>
  );
}

function fmtDate(val: string | null | undefined) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("pl-PL");
}

export function VehicleInfoTab({
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
