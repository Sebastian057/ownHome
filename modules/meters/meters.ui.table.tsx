"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { MeterType } from "./meters.types";
import type { MeterReadingWithConsumption } from "./meters.types";
import type { ApiResponse, PaginationMeta } from "@/types/common.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const UNIT: Record<MeterType, string> = {
  WATER: "m³",
  ELECTRICITY: "kWh",
  GAS: "m³",
};

function fmtDate(date: Date | string) {
  return new Date(date).toLocaleDateString("pl-PL");
}

function fmtValue(v: string | number) {
  return parseFloat(String(v)).toFixed(3);
}

// ─── ReadingsTable ────────────────────────────────────────────────────────────

interface ReadingsTableProps {
  type: MeterType;
  refreshKey: number;
  onEdit: (reading: MeterReadingWithConsumption) => void;
  onDeleted: () => void;
}

interface Filters {
  dateFrom: string;
  dateTo: string;
}

const PAGE_SIZE = 20;

export function ReadingsTable({ type, refreshKey, onEdit, onDeleted }: ReadingsTableProps) {
  const [readings, setReadings] = useState<MeterReadingWithConsumption[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [filters, setFilters] = useState<Filters>({ dateFrom: "", dateTo: "" });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const unit = UNIT[type];

  const fetchReadings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type,
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);

      const res = await fetch(`/api/meters/readings?${params.toString()}`);
      const json: ApiResponse<MeterReadingWithConsumption[]> = await res.json();
      if (json.data) {
        setReadings(json.data);
        setMeta(json.meta ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [type, page, filters, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchReadings();
  }, [fetchReadings]);

  // Reset page when type or filters change
  useEffect(() => {
    setPage(1);
  }, [type, filters]);

  function setFilter(key: keyof Filters, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/meters/readings/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Odczyt usunięty");
      onDeleted();
      fetchReadings();
    } else {
      toast.error("Nie udało się usunąć odczytu");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Od:</span>
          <Input
            type="date"
            className="w-auto"
            value={filters.dateFrom}
            onChange={(e) => setFilter("dateFrom", e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Do:</span>
          <Input
            type="date"
            className="w-auto"
            value={filters.dateTo}
            onChange={(e) => setFilter("dateTo", e.target.value)}
          />
        </div>
        {(filters.dateFrom || filters.dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters({ dateFrom: "", dateTo: "" })}
          >
            Wyczyść
          </Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton />
      ) : readings.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Brak odczytów</EmptyTitle>
            <EmptyDescription>Brak odczytów spełniających kryteria.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Odczyt ({unit})</TableHead>
                <TableHead className="text-right">Zużycie</TableHead>
                <TableHead className="hidden md:table-cell">Notatki</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {readings.map((r) => (
                <ReadingRow
                  key={r.id}
                  reading={r}
                  unit={unit}
                  onEdit={() => onEdit(r)}
                  onDelete={() => handleDelete(r.id)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {meta && meta.total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, meta.total)} z {meta.total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
            >
              Poprzednia
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!meta.hasNext}
            >
              Następna
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ReadingRow ───────────────────────────────────────────────────────────────

function ReadingRow({
  reading,
  unit,
  onEdit,
  onDelete,
}: {
  reading: MeterReadingWithConsumption;
  unit: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{fmtDate(reading.readingDate)}</TableCell>

      <TableCell className="text-right font-mono">
        {fmtValue(reading.value)}
      </TableCell>

      <TableCell className="text-right">
        {reading.consumption === null ? (
          <span className="text-muted-foreground text-sm">—</span>
        ) : (
          <span className={cn("font-mono text-sm font-medium flex items-center justify-end gap-1.5")}>
            <span
              className={cn(
                reading.isAnomaly ? "text-destructive" : "text-foreground"
              )}
            >
              {reading.consumption >= 0 ? "+" : ""}
              {reading.consumption.toFixed(3)} {unit}
            </span>
            {reading.isAnomaly && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                Anomalia
              </Badge>
            )}
          </span>
        )}
      </TableCell>

      <TableCell className="hidden md:table-cell text-muted-foreground text-sm max-w-48 truncate">
        {reading.notes ?? "—"}
      </TableCell>

      <TableCell>
        <AlertDialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Akcje</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Edytuj
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={(e) => e.preventDefault()}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Usuń
                </DropdownMenuItem>
              </AlertDialogTrigger>
            </DropdownMenuContent>
          </DropdownMenu>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Usunąć odczyt?</AlertDialogTitle>
              <AlertDialogDescription>
                Odczyt z dnia <strong>{fmtDate(reading.readingDate)}</strong> (
                {fmtValue(reading.value)}) zostanie trwale usunięty.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anuluj</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Usuń
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead className="text-right">Odczyt</TableHead>
            <TableHead className="text-right">Zużycie</TableHead>
            <TableHead className="hidden md:table-cell">Notatki</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
              <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-6 w-6" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
