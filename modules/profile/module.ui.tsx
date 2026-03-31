"use client";

import { useState, useEffect } from "react";
import type { UserProfile } from "./module.types";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ProfileForm, ChangePasswordForm, fetchProfile } from "./module.ui.forms";

// Public re-exports — pages import from this file only
export { ProfileForm, ChangePasswordForm } from "./module.ui.forms";

// ─── ProfilePage ──────────────────────────────────────────────────────────────

export function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile().then((res) => {
      if (res.error) setError(res.error.message);
      else setProfile(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <p className="text-sm text-destructive">{error ?? "Nie udało się załadować profilu"}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Profil</h1>
        <p className="text-sm text-muted-foreground">
          {profile.fullName ?? profile.email ?? "Brak danych"} · <Badge variant="secondary">{profile.role}</Badge>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ProfileForm profile={profile} onUpdate={setProfile} />
        <ChangePasswordForm />
      </div>
    </div>
  );
}
