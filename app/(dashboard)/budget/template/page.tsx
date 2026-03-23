"use client";

import useSWR from "swr";
import { BudgetTemplateEditor } from "@/modules/budget/budget.ui";
import type { BudgetTemplateView } from "@/modules/budget/budget.types";
import type { ApiResponse } from "@/types/common.types";
import { Skeleton } from "@/components/ui/skeleton";

export default function BudgetTemplatePage() {
  const { data: res, isLoading, mutate } = useSWR<ApiResponse<BudgetTemplateView>>(
    "/api/budget/template"
  );

  return (
    <div className="flex flex-col gap-5 p-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">Szablon budżetu</h1>
        <p className="text-sm text-muted-foreground">
          Ustaw domyślne kwoty przychodów i wydatków per kategoria. Szablon jest kopiowany przy tworzeniu nowego miesiąca.
        </p>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      )}

      {!isLoading && res?.data && (
        <BudgetTemplateEditor template={res.data} onRefresh={() => mutate()} />
      )}
    </div>
  );
}
