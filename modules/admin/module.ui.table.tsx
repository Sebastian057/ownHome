"use client";

import { useState } from "react";
import type { ApiResponse } from "@/types/common.types";
import type { AdminUserView } from "./module.types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Shield, Trash2 } from "lucide-react";

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function fetchUsers(): Promise<ApiResponse<AdminUserView[]>> {
  const res = await fetch("/api/admin/users");
  return res.json();
}

async function updateUserRole(userId: string, role: string): Promise<ApiResponse<AdminUserView>> {
  const res = await fetch(`/api/admin/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  return res.json();
}

async function deleteUser(userId: string): Promise<ApiResponse<{ success: boolean }>> {
  const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
  return res.json();
}

// ─── UsersTable ───────────────────────────────────────────────────────────────

export function UsersTable({ users, onRefresh }: { users: AdminUserView[]; onRefresh: () => void }) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function handleToggleRole(user: AdminUserView) {
    setActionLoading(user.userId);
    const newRole = user.role === "admin" ? "user" : "admin";
    const res = await updateUserRole(user.userId, newRole);
    setActionLoading(null);
    if (res.error) { alert(res.error.message); return; }
    onRefresh();
  }

  async function handleDelete(user: AdminUserView) {
    const label = user.fullName ?? user.email ?? user.userId;
    if (!confirm(`Czy na pewno chcesz usunąć użytkownika ${label}?`)) return;
    setActionLoading(user.userId);
    const res = await deleteUser(user.userId);
    setActionLoading(null);
    if (res.error) { alert(res.error.message); return; }
    onRefresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Użytkownicy</CardTitle>
        <CardDescription>{users.length} kont w systemie</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary">
                  <User className="h-4 w-4 text-secondary-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.fullName ?? <span className="text-muted-foreground italic">Brak imienia</span>}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                  {user.role === "admin" ? "Admin" : "User"}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleRole(user)}
                  disabled={actionLoading === user.userId}
                  title={user.role === "admin" ? "Zmień na User" : "Zmień na Admin"}
                >
                  <Shield className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(user)}
                  disabled={actionLoading === user.userId}
                  title="Usuń użytkownika"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
