"use client";

import { useState } from "react";
import type { ApiResponse } from "@/types/common.types";
import type { UserProfile, UpdateProfileDto, ChangePasswordDto } from "./module.types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User, Phone, Globe, Lock, Mail } from "lucide-react";

// ─── Fetch functions ──────────────────────────────────────────────────────────

export async function fetchProfile(): Promise<ApiResponse<UserProfile>> {
  const res = await fetch("/api/profile");
  return res.json();
}

async function updateProfile(data: UpdateProfileDto): Promise<ApiResponse<UserProfile>> {
  const res = await fetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function changePassword(data: ChangePasswordDto): Promise<ApiResponse<{ success: boolean }>> {
  const res = await fetch("/api/profile/password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

// ─── ProfileForm ──────────────────────────────────────────────────────────────

export function ProfileForm({ profile, onUpdate }: { profile: UserProfile; onUpdate: (p: UserProfile) => void }) {
  const [fullName, setFullName] = useState(profile.fullName ?? "");
  const [email, setEmail] = useState(profile.email ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [language, setLanguage] = useState(profile.language);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);

    const res = await updateProfile({
      fullName: fullName || undefined,
      email: email !== profile.email ? email : undefined,
      phone: phone || undefined,
      language: language as "pl" | "en",
    });

    setSaving(false);

    if (res.error) {
      setError(res.error.message);
      return;
    }

    onUpdate(res.data);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Dane osobowe</CardTitle>
        <CardDescription>Zaktualizuj swoje informacje — imię, email i telefon są synchronizowane z kontem</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="fullName" className="text-sm font-medium">
              Imię i nazwisko
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jan Kowalski"
                className="pl-9"
                maxLength={200}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jan@example.com"
                className="pl-9"
                maxLength={300}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="phone" className="text-sm font-medium">
              Telefon
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+48 123 456 789"
                className="pl-9"
                maxLength={20}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="language" className="text-sm font-medium">
              Język
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pl-9 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="pl">Polski</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-600">Profil zaktualizowany</p>}

          <Button type="submit" disabled={saving}>
            {saving ? "Zapisywanie..." : "Zapisz zmiany"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── ChangePasswordForm ───────────────────────────────────────────────────────

export function ChangePasswordForm() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 6) {
      setError("Hasło musi mieć minimum 6 znaków");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Hasła nie są identyczne");
      return;
    }

    setSaving(true);
    const res = await changePassword({ newPassword });
    setSaving(false);

    if (res.error) {
      setError(res.error.message);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Zmiana hasła</CardTitle>
        <CardDescription>Ustaw nowe hasło do swojego konta</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="newPassword" className="text-sm font-medium">Nowe hasło</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-9"
                minLength={6}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">Potwierdź hasło</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-9"
                minLength={6}
                required
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-600">Hasło zmienione pomyślnie</p>}

          <Button type="submit" disabled={saving}>
            {saving ? "Zapisywanie..." : "Zmień hasło"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
