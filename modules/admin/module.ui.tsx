"use client";

import { useState, useEffect } from "react";
import type { AdminUserView } from "./module.types";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateUserForm } from "./module.ui.form";
import { UsersTable, fetchUsers } from "./module.ui.table";

// Public re-exports — pages import from this file only
export { CreateUserForm } from "./module.ui.form";
export { UsersTable } from "./module.ui.table";

// ─── AdminUsersPage ───────────────────────────────────────────────────────────

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetchUsers().then((res) => {
      if (res.error) setError(res.error.message);
      else setUsers(res.data);
      setLoading(false);
    });
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <h1 className="text-2xl font-semibold">Zarządzanie użytkownikami</h1>
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Zarządzanie użytkownikami</h1>
        <p className="text-sm text-muted-foreground">Tworzenie kont i zarządzanie rolami</p>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CreateUserForm onSuccess={() => setRefreshKey((k) => k + 1)} />
        <UsersTable users={users} onRefresh={() => setRefreshKey((k) => k + 1)} />
      </div>
    </div>
  );
}
