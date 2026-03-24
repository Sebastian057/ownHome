"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Search,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type TransactionView,
  type BudgetCategoryView,
  SOURCE_LABELS,
  type TransactionSortField,
  type SortDir,
  type TransactionPageSize,
} from "./budget.types";
import type { ApiResponse } from "@/types/common.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: string | number) {
  return Number(amount).toLocaleString("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "short",
  });
}

function getCategoryLabel(slug: string, categories: BudgetCategoryView[]) {
  return categories.find((c) => c.slug === slug)?.label ?? slug;
}

function getCategoryColor(slug: string, categories: BudgetCategoryView[]) {
  return categories.find((c) => c.slug === slug)?.color ?? "#6b7280";
}

// ─── ColorDot ─────────────────────────────────────────────────────────────────

function ColorDot({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, backgroundColor: color }}
    />
  );
}

// ─── AddTransactionDialog ─────────────────────────────────────────────────────

export function AddTransactionDialog({
  open,
  periodId,
  onClose,
  onSuccess,
  categories,
}: {
  open: boolean;
  periodId: string;
  onClose: () => void;
  onSuccess: () => void;
  categories: BudgetCategoryView[];
}) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!title.trim() || !amount || !category || !date) return;
    setLoading(true);
    setError(null);
    const res: ApiResponse<unknown> = await fetch(
      `/api/budget/periods/${periodId}/transactions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          amount: Number(amount),
          date,
          category,
        }),
      }
    ).then((r) => r.json());
    setLoading(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    setTitle("");
    setAmount("");
    setCategory("");
    setDate(new Date().toISOString().slice(0, 10));
    onSuccess();
    onClose();
  }

  function handleClose() {
    setTitle("");
    setAmount("");
    setCategory("");
    setDate(new Date().toISOString().slice(0, 10));
    setError(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dodaj transakcję</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tx-title">Opis</Label>
            <Input
              id="tx-title"
              placeholder="np. Biedronka"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tx-amount">Kwota (zł)</Label>
              <Input
                id="tx-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tx-date">Data</Label>
              <Input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Kategoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz kategorię..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.slug} value={cat.slug}>
                    <div className="flex items-center gap-2">
                      <ColorDot color={cat.color} size={8} />
                      {cat.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Anuluj
          </Button>
          <Button
            disabled={
              loading || !title.trim() || !amount || !category || !date
            }
            onClick={handleSubmit}
          >
            {loading ? "Dodawanie..." : "Dodaj"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── EditTransactionDialog ────────────────────────────────────────────────────

export function EditTransactionDialog({
  open,
  transaction,
  periodId,
  onClose,
  onSuccess,
  categories,
}: {
  open: boolean;
  transaction: TransactionView | null;
  periodId: string;
  onClose: () => void;
  onSuccess: () => void;
  categories: BudgetCategoryView[];
}) {
  const [title, setTitle] = useState(transaction?.title ?? "");
  const [amount, setAmount] = useState(transaction?.amount ?? "");
  const [date, setDate] = useState(transaction?.date ?? "");
  const [category, setCategory] = useState(transaction?.category ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync when transaction changes
  useState(() => {
    if (transaction) {
      setTitle(transaction.title);
      setAmount(transaction.amount);
      setDate(transaction.date);
      setCategory(transaction.category);
    }
  });

  async function handleSubmit() {
    if (!transaction || !title.trim() || !amount || !category || !date) return;
    setLoading(true);
    setError(null);
    const res: ApiResponse<unknown> = await fetch(
      `/api/budget/periods/${periodId}/transactions/${transaction.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          amount: Number(amount),
          date,
          category,
        }),
      }
    ).then((r) => r.json());
    setLoading(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    onSuccess();
    onClose();
  }

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edytuj transakcję</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-title">Opis</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-amount">Kwota (zł)</Label>
              <Input
                id="edit-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-date">Data</Label>
              <Input
                id="edit-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Kategoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz kategorię..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.slug} value={cat.slug}>
                    <div className="flex items-center gap-2">
                      <ColorDot color={cat.color} size={8} />
                      {cat.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Anuluj
          </Button>
          <Button
            disabled={loading || !title.trim() || !amount || !category}
            onClick={handleSubmit}
          >
            {loading ? "Zapisywanie..." : "Zapisz"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── TransactionTable ─────────────────────────────────────────────────────────

export function TransactionTable({
  periodId,
  transactions,
  categories,
  onRefresh,
}: {
  periodId: string;
  transactions: TransactionView[];
  categories: BudgetCategoryView[];
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [sortBy, setSortBy] = useState<TransactionSortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<TransactionPageSize>(20);
  const [showAdd, setShowAdd] = useState(false);
  const [editTx, setEditTx] = useState<TransactionView | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  function toggleSort(field: TransactionSortField) {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir(field === "date" ? "desc" : "asc");
    }
    setPage(1);
  }

  const filtered = useMemo(() => {
    let result = transactions;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((tx) => tx.title.toLowerCase().includes(q));
    }
    if (filterCategory !== "all") {
      result = result.filter((tx) => tx.category === filterCategory);
    }
    if (filterSource !== "all") {
      result = result.filter((tx) => tx.source === filterSource);
    }
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "date") cmp = a.date.localeCompare(b.date);
      else if (sortBy === "amount") cmp = Number(a.amount) - Number(b.amount);
      else if (sortBy === "title") cmp = a.title.localeCompare(b.title);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [transactions, search, filterCategory, filterSource, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  function SortHeader({
    field,
    children,
  }: {
    field: TransactionSortField;
    children: React.ReactNode;
  }) {
    return (
      <button
        onClick={() => toggleSort(field)}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        {children}
        {sortBy === field ? (
          sortDir === "asc" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    );
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    await fetch(`/api/budget/periods/${periodId}/transactions/${id}`, {
      method: "DELETE",
    });
    setDeleting(null);
    onRefresh();
  }

  // Deduplicate categories appearing in transactions
  const usedCategories = useMemo(() => {
    const slugs = new Set(transactions.map((t) => t.category));
    return categories.filter((c) => slugs.has(c.slug));
  }, [transactions, categories]);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">
              Transakcje ({filtered.length}
              {filtered.length !== transactions.length &&
                ` / ${transactions.length}`}
              )
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAdd(true)}
              className="h-7 gap-1 text-xs border-primary/60 text-primary hover:bg-primary/10 hover:text-primary"
            >
              <Plus className="h-3 w-3" /> Dodaj
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 pt-1">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Szukaj..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-8 pl-8 text-sm"
              />
            </div>
            <Select
              value={filterCategory}
              onValueChange={(v) => {
                setFilterCategory(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <SelectValue placeholder="Kategoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie kategorie</SelectItem>
                {usedCategories.map((cat) => (
                  <SelectItem key={cat.slug} value={cat.slug}>
                    <div className="flex items-center gap-1.5">
                      <ColorDot color={cat.color} size={8} />
                      {cat.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterSource}
              onValueChange={(v) => {
                setFilterSource(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue placeholder="Źródło" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                <SelectItem value="MANUAL">Ręczne</SelectItem>
                <SelectItem value="SUBSCRIPTION">Subskrypcje</SelectItem>
                <SelectItem value="RECURRING">Cykliczne</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {paginated.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              {filtered.length === 0 && transactions.length > 0
                ? "Brak wyników dla podanych filtrów"
                : "Brak transakcji"}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-xs text-muted-foreground">
                    <th className="text-left py-2 px-4 font-medium">
                      <SortHeader field="date">Data</SortHeader>
                    </th>
                    <th className="text-left py-2 px-4 font-medium">
                      <SortHeader field="title">Opis</SortHeader>
                    </th>
                    <th className="text-left py-2 px-4 font-medium hidden sm:table-cell">
                      Kategoria
                    </th>
                    <th className="text-left py-2 px-4 font-medium hidden md:table-cell">
                      Źródło
                    </th>
                    <th className="text-left py-2 px-4 font-medium">
                      <SortHeader field="amount">Kwota</SortHeader>
                    </th>
                    <th className="w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {paginated.map((tx) => {
                    const color = getCategoryColor(tx.category, categories);
                    const label = getCategoryLabel(tx.category, categories);
                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-muted/30 transition-colors group"
                      >
                        <td className="py-2.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                          {fmtDate(tx.date)}
                        </td>
                        <td className="py-2.5 px-4 max-w-[200px]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="truncate font-medium">
                              {tx.title}
                            </span>
                            {SOURCE_LABELS[tx.source] && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0 h-4 shrink-0"
                              >
                                {SOURCE_LABELS[tx.source]}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 hidden sm:table-cell">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <ColorDot color={color} size={8} />
                            {label}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 hidden md:table-cell text-xs text-muted-foreground">
                          {tx.source === "MANUAL"
                            ? "Ręczna"
                            : tx.source === "SUBSCRIPTION"
                            ? "Subskrypcja"
                            : "Cykliczna"}
                        </td>
                        <td className="py-2.5 px-4 text-left font-mono font-medium whitespace-nowrap">
                          {fmt(tx.amount)} zł
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {tx.source === "MANUAL" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                  onClick={() => setEditTx(tx)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                  disabled={deleting === tx.id}
                                  onClick={() => handleDelete(tx.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {filtered.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Wierszy na stronę:</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    setPageSize(Number(v) as TransactionPageSize);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-7 w-16 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {([20, 50, 100, 200] as const).map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {(page - 1) * pageSize + 1}–
                  {Math.min(page * pageSize, filtered.length)} z{" "}
                  {filtered.length}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ‹
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  ›
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AddTransactionDialog
        open={showAdd}
        periodId={periodId}
        onClose={() => setShowAdd(false)}
        onSuccess={onRefresh}
        categories={categories}
      />

      <EditTransactionDialog
        open={editTx !== null}
        transaction={editTx}
        periodId={periodId}
        onClose={() => setEditTx(null)}
        onSuccess={() => {
          setEditTx(null);
          onRefresh();
        }}
        categories={categories}
      />
    </>
  );
}

// ─── TransactionList (legacy alias — redirects to TransactionTable) ────────────

export function TransactionList({
  periodId,
  transactions,
  onRefresh,
  categories = [],
}: {
  periodId: string;
  transactions: TransactionView[];
  onRefresh: () => void;
  categories?: BudgetCategoryView[];
}) {
  return (
    <TransactionTable
      periodId={periodId}
      transactions={transactions}
      categories={categories}
      onRefresh={onRefresh}
    />
  );
}
