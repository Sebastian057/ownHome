"use client";

import { useState } from "react";
import type { ApiResponse } from "@/types/common.types";
import type { AdminUserView, CreateUserDto } from "./module.types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserPlus, Mail, Lock, User } from "lucide-react";

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function createUser(data: CreateUserDto): Promise<ApiResponse<AdminUserView>> {
  const res = await fetch("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

// ─── CreateUserForm ───────────────────────────────────────────────────────────

export function CreateUserForm({ onSuccess }: { onSuccess: () => void }) {
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
