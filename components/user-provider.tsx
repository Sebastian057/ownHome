"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { UserProfile } from "@/modules/profile/module.types";
import type { ApiResponse } from "@/types/common.types";

interface UserContextType {
  profile: UserProfile | null;
  loading: boolean;
  refresh: () => void;
}

const UserContext = createContext<UserContextType>({
  profile: null,
  loading: true,
  refresh: () => {},
});

export function useUser() {
  return useContext(UserContext);
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((res: ApiResponse<UserProfile>) => {
        if (!res.error) setProfile(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [refreshKey]);

  return (
    <UserContext value={{
      profile,
      loading,
      refresh: () => setRefreshKey((k) => k + 1),
    }}>
      {children}
    </UserContext>
  );
}
