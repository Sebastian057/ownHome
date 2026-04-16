"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MeterType } from "./meters.types";
import type { MeterReadingWithConsumption } from "./meters.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const UNIT_LABEL: Record<MeterType, string> = {
  WATER: "m³",
  ELECTRICITY: "kWh",
  GAS: "m³",
};

// ─── ReadingFormSheet ─────────────────────────────────────────────────────────

interface ReadingFormSheetProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  type: MeterType;
  /** When provided, enters edit mode */
  editReading?: MeterReadingWithConsumption;
}

interface FormData {
  readingDate: string;
  value: string;
  notes: string;
}

const emptyForm = (): FormData => ({
  readingDate: todayIso(),
  value: "",
  notes: "",
});

export function ReadingFormSheet({
  open,
  onClose,
  onSuccess,
  type,
  editReading,
}: ReadingFormSheetProps) {
  const isEdit = !!editReading;

  const [form, setForm] = useState<FormData>(() =>
    editReading
      ? {
          readingDate: new Date(editReading.readingDate).toISOString().slice(0, 10),
          value: parseFloat(editReading.value).toString(),
          notes: editReading.notes ?? "",
        }
      : emptyForm()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      onClose();
      setError(null);
      if (!isEdit) setForm(emptyForm());
    }
  }

  async function handleSubmit() {
    const value = parseFloat(form.value);
    if (!form.readingDate || isNaN(value) || value <= 0) {
      setError("Wypełnij datę i wartość odczytu.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = isEdit
        ? `/api/meters/readings/${editReading!.id}`
        : "/api/meters/readings";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          value,
          readingDate: form.readingDate,
          notes: form.notes.trim() || undefined,
        }),
      });

      const json: { error?: { message?: string } } = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? "Coś poszło nie tak.");
        return;
      }

      onSuccess();
      handleOpenChange(false);
    } catch {
      setError("Błąd połączenia. Spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  }

  const unit = UNIT_LABEL[type];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edytuj odczyt" : "Nowy odczyt"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          {/* Date */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="readingDate">Data odczytu</Label>
            <Input
              id="readingDate"
              type="date"
              value={form.readingDate}
              onChange={(e) => set("readingDate", e.target.value)}
            />
          </div>

          {/* Value */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="value">
              Stan licznika ({unit})
            </Label>
            <Input
              id="value"
              type="number"
              step="0.001"
              min="0"
              placeholder="np. 1234.567"
              value={form.value}
              onChange={(e) => set("value", e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">
              Notatki <span className="text-muted-foreground">(opcjonalnie)</span>
            </Label>
            <Textarea
              id="notes"
              placeholder="Np. po naprawie wodomierza..."
              rows={3}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            Anuluj
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Zapisuję..." : isEdit ? "Zapisz zmiany" : "Dodaj odczyt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
