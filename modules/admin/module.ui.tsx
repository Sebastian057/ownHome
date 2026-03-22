"use client";

import { useState, useEffect } from "react";
import type { ApiResponse } from "@/types/common.types";
import type { AdminUserView, CreateUserDto } from "./module.types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus, Mail, Lock, User, Shield, Trash2 } from "lucide-react";

// ─── Fetch functions ──────────────────────────────────────────────────────────

async function fetchUsers(): Promise<ApiResponse<AdminUserView[]>> {
  const res = await fetch("/api/admin/users");
  return res.json();
}

async function createUser(data: CreateUserDto): Promise<ApiResponse<AdminUserView>> {
  const res = await fetch("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
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

// ─── Create User Form ─────────────────────────────────────────────────────────

function CreateUserForm({ onSuccess }: { onSuccess: () => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const res = await createUser({ fullName, email, password });
    setSaving(false);

    if (res.error) {
      setError(res.error.message);
      return;
    }

    setFullName("");
    setEmail("");
    setPassword("");
    onSuccess();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Dodaj użytkownika</CardTitle>
        <CardDescription>Utwórz nowe konto w systemie</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="fullName" className="text-sm font-medium">Imię i nazwisko</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jan Kowalski"
                className="pl-9"
                required
                maxLength={200}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="user-email" className="text-sm font-medium">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="user-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jan@example.com"
                className="pl-9"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="user-password" className="text-sm font-medium">Hasło</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="user-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-9"
                required
                minLength={6}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={saving}>
            <UserPlus className="mr-2 h-4 w-4" />
            {saving ? "Tworzenie..." : "Utwórz konto"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Users Table ──────────────────────────────────────────────────────────────

function UsersTable({ users, onRefresh }: { users: AdminUserView[]; onRefresh: () => void }) {
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

// ─── Admin Users Page ─────────────────────────────────────────────────────────

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
