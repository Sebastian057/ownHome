"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import useSWR from "swr";
import { useUser } from "@/components/user-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { User, Mail, Phone, Lock, Sun, Moon, Shield, Trash2, UserPlus, Camera, Upload } from "lucide-react";
import type { ApiResponse } from "@/types/common.types";
import type { UserProfile } from "@/modules/profile/module.types";
import type { AdminUserView } from "@/modules/admin/module.types";
import type { BudgetTemplateView, BudgetCategoryView } from "@/modules/budget/budget.types";
import { BudgetTemplateEditor, CategoryManagerSection } from "@/modules/budget/budget.ui";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined, email: string | null | undefined) {
  if (name) {
    const p = name.trim().split(" ");
    return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : p[0].slice(0, 2).toUpperCase();
  }
  return email ? email.slice(0, 2).toUpperCase() : "?";
}

// ─── AvatarUploadDialog ───────────────────────────────────────────────────────

function AvatarUploadDialog({
  open,
  onClose,
  currentAvatarUrl,
  initials,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  currentAvatarUrl?: string | null;
  initials: string;
  onSuccess: (profile: UserProfile) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Dozwolone tylko pliki graficzne"); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Plik zbyt duży (max 5 MB)"); return; }
    setError(null);
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", selectedFile);
    const res: ApiResponse<UserProfile> = await fetch("/api/profile/avatar", {
      method: "POST",
      body: form,
    }).then((r) => r.json());
    setUploading(false);
    if (res.error) { setError(res.error.message); return; }
    onSuccess(res.data);
    handleClose();
  }

  function handleClose() {
    setPreview(null);
    setSelectedFile(null);
    setError(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Zmień avatar</DialogTitle>
          <DialogDescription>Wybierz zdjęcie profilowe (JPG, PNG, WebP — maks. 5 MB)</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <Avatar className="h-24 w-24">
            <AvatarImage src={preview ?? currentAvatarUrl ?? undefined} />
            <AvatarFallback className="bg-primary/20 text-primary text-2xl font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Wybierz plik
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {selectedFile && (
            <p className="text-xs text-muted-foreground">{selectedFile.name}</p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            Anuluj
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
            {uploading ? "Wysyłanie…" : "Zapisz"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tab: Profil ──────────────────────────────────────────────────────────────

function ProfileTab() {
  const { profile: ctxProfile, refresh } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(ctxProfile);
  const [fullName, setFullName] = useState(ctxProfile?.fullName ?? "");
  const [email, setEmail] = useState(ctxProfile?.email ?? "");
  const [phone, setPhone] = useState(ctxProfile?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileOk, setProfileOk] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  // Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwOk, setPwOk] = useState(false);

  useEffect(() => {
    if (ctxProfile) {
      setProfile(ctxProfile);
      setFullName(ctxProfile.fullName ?? "");
      setEmail(ctxProfile.email ?? "");
      setPhone(ctxProfile.phone ?? "");
    }
  }, [ctxProfile]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileOk(false);
    setSaving(true);
    const res: ApiResponse<UserProfile> = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: fullName || undefined,
        email: email !== profile?.email ? email : undefined,
        phone: phone || undefined,
      }),
    }).then((r) => r.json());
    setSaving(false);
    if (res.error) { setProfileError(res.error.message); return; }
    setProfile(res.data);
    refresh();
    setProfileOk(true);
    setTimeout(() => setProfileOk(false), 3000);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwOk(false);
    if (newPassword.length < 6) { setPwError("Hasło musi mieć minimum 6 znaków"); return; }
    if (newPassword !== confirmPassword) { setPwError("Hasła nie są identyczne"); return; }
    setPwSaving(true);
    const res: ApiResponse<{ success: boolean }> = await fetch("/api/profile/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    }).then((r) => r.json());
    setPwSaving(false);
    if (res.error) { setPwError(res.error.message); return; }
    setNewPassword("");
    setConfirmPassword("");
    setPwOk(true);
    setTimeout(() => setPwOk(false), 3000);
  }

  if (!profile) return <Skeleton className="h-64 w-full rounded-xl" />;

  const initials = getInitials(profile.fullName, profile.email);

  return (
    <div className="flex flex-col gap-6">
      {/* Avatar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Avatar</CardTitle>
          <CardDescription>Twoje zdjęcie profilowe widoczne w aplikacji</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-xl font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => setAvatarDialogOpen(true)}
                className="absolute -bottom-1 -right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/85"
                title="Zmień avatar"
              >
                <Camera className="h-3 w-3" />
              </button>
            </div>
            <div>
              <p className="text-sm font-medium">{profile.fullName ?? "Brak imienia"}</p>
              <p className="text-xs text-muted-foreground">{profile.email}</p>
              <Badge variant="secondary" className="mt-1">{profile.role}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <AvatarUploadDialog
        open={avatarDialogOpen}
        onClose={() => setAvatarDialogOpen(false)}
        currentAvatarUrl={profile.avatarUrl}
        initials={initials}
        onSuccess={(updated) => {
          setProfile(updated);
          refresh();
        }}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Dane osobowe */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dane osobowe</CardTitle>
            <CardDescription>Imię, email i telefon synchronizowane z kontem</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="s-fullName" className="text-sm font-medium">Imię i nazwisko</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="s-fullName" value={fullName} onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jan Kowalski" className="pl-9" maxLength={200} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="s-email" className="text-sm font-medium">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="s-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="jan@example.com" className="pl-9" maxLength={300} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="s-phone" className="text-sm font-medium">Telefon</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="s-phone" value={phone} onChange={(e) => setPhone(e.target.value)}
                    placeholder="+48 123 456 789" className="pl-9" maxLength={20} />
                </div>
              </div>
              {profileError && <p className="text-sm text-destructive">{profileError}</p>}
              {profileOk && <p className="text-sm text-green-600">Zapisano</p>}
              <Button type="submit" disabled={saving}>{saving ? "Zapisywanie…" : "Zapisz zmiany"}</Button>
            </form>
          </CardContent>
        </Card>

        {/* Zmiana hasła */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Zmiana hasła</CardTitle>
            <CardDescription>Ustaw nowe hasło do konta</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="s-pw1" className="text-sm font-medium">Nowe hasło</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="s-pw1" type="password" value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••" className="pl-9" minLength={6} required />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="s-pw2" className="text-sm font-medium">Potwierdź hasło</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="s-pw2" type="password" value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••" className="pl-9" minLength={6} required />
                </div>
              </div>
              {pwError && <p className="text-sm text-destructive">{pwError}</p>}
              {pwOk && <p className="text-sm text-green-600">Hasło zmienione</p>}
              <Button type="submit" disabled={pwSaving}>{pwSaving ? "Zapisywanie…" : "Zmień hasło"}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Tab: Preferencje ─────────────────────────────────────────────────────────

function PreferencesTab() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Wygląd</CardTitle>
          <CardDescription>Dostosuj wygląd aplikacji do swoich preferencji</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div className="flex items-center gap-3">
              {mounted && theme === "dark"
                ? <Moon className="h-4 w-4 text-muted-foreground" />
                : <Sun className="h-4 w-4 text-muted-foreground" />
              }
              <div>
                <p className="text-sm font-medium">Ciemny motyw</p>
                <p className="text-xs text-muted-foreground">
                  {mounted ? (theme === "dark" ? "Włączony" : "Wyłączony") : "…"}
                </p>
              </div>
            </div>
            <Switch
              checked={mounted ? theme === "dark" : false}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Użytkownicy (admin) ─────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<AdminUserView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  // Create form
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((res: ApiResponse<AdminUserView[]>) => {
        if (res.error) setError(res.error.message);
        else setUsers(res.data);
        setLoading(false);
      });
  }, [refreshKey]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    const res: ApiResponse<AdminUserView> = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, password }),
    }).then((r) => r.json());
    setCreating(false);
    if (res.error) { setCreateError(res.error.message); return; }
    setFullName(""); setEmail(""); setPassword("");
    setRefreshKey((k) => k + 1);
  }

  async function handleToggleRole(user: AdminUserView) {
    setActionLoading(user.userId);
    const newRole = user.role === "admin" ? "user" : "admin";
    await fetch(`/api/admin/users/${user.userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    setActionLoading(null);
    setRefreshKey((k) => k + 1);
  }

  async function handleDelete(user: AdminUserView) {
    if (!confirm(`Usunąć użytkownika ${user.fullName ?? user.email}?`)) return;
    setActionLoading(user.userId);
    await fetch(`/api/admin/users/${user.userId}`, { method: "DELETE" });
    setActionLoading(null);
    setRefreshKey((k) => k + 1);
  }

  if (loading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (error) return <p className="text-sm text-destructive">{error}</p>;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Formularz tworzenia */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dodaj użytkownika</CardTitle>
          <CardDescription>Utwórz nowe konto w systemie</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="u-name" className="text-sm font-medium">Imię i nazwisko</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="u-name" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jan Kowalski" className="pl-9" required maxLength={200} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="u-email" className="text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="u-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="jan@example.com" className="pl-9" required />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="u-pw" className="text-sm font-medium">Hasło</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="u-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" className="pl-9" required minLength={6} />
              </div>
            </div>
            {createError && <p className="text-sm text-destructive">{createError}</p>}
            <Button type="submit" disabled={creating}>
              <UserPlus className="mr-2 h-4 w-4" />
              {creating ? "Tworzenie…" : "Utwórz konto"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista użytkowników */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Użytkownicy</CardTitle>
          <CardDescription>{users.length} kont w systemie</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                      {getInitials(user.fullName, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user.fullName ?? <span className="italic text-muted-foreground">Brak imienia</span>}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                    {user.role === "admin" ? "Admin" : "User"}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => handleToggleRole(user)}
                    disabled={actionLoading === user.userId} title="Zmień rolę">
                    <Shield className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(user)}
                    disabled={actionLoading === user.userId} title="Usuń"
                    className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Budżet ──────────────────────────────────────────────────────────────

function BudgetTab() {
  const {
    data: templateRes,
    isLoading: templateLoading,
    mutate: mutateTemplate,
  } = useSWR<ApiResponse<BudgetTemplateView>>("/api/budget/template");

  const {
    data: categoriesRes,
    isLoading: categoriesLoading,
    mutate: mutateCategories,
  } = useSWR<ApiResponse<BudgetCategoryView[]>>("/api/budget/categories");

  const template = templateRes?.data ?? null;
  const categories = categoriesRes?.data ?? [];

  return (
    <Tabs defaultValue="template" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="template">Szablon budżetu</TabsTrigger>
        <TabsTrigger value="categories">Kategorie</TabsTrigger>
      </TabsList>

      <TabsContent value="template">
        {templateLoading ? (
          <Skeleton className="h-96 w-full rounded-xl" />
        ) : template ? (
          <BudgetTemplateEditor
            template={template}
            onRefresh={() => mutateTemplate()}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Brak szablonu.</p>
        )}
      </TabsContent>

      <TabsContent value="categories">
        {categoriesLoading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : (
          <CategoryManagerSection
            categories={categories}
            onRefresh={() => mutateCategories()}
          />
        )}
      </TabsContent>
    </Tabs>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { profile } = useUser();
  const isAdmin = profile?.role === "admin";

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Ustawienia</h1>
        <p className="text-sm text-muted-foreground">Zarządzaj kontem i preferencjami</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="preferences">Preferencje</TabsTrigger>
          <TabsTrigger value="budget">Budżet</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">Użytkownicy</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="preferences" className="mt-6">
          <PreferencesTab />
        </TabsContent>

        <TabsContent value="budget" className="mt-6">
          <BudgetTab />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="users" className="mt-6">
            <UsersTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
