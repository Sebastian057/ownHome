"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Bell,
  CalendarDays,
  Car,
  CreditCard,
  Gauge,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useUser } from "@/components/user-provider";

// ─── Nav data (mirrors app-sidebar.tsx) ──────────────────────────────────────

type NavChild = { label: string; href: string; icon: React.ElementType };
type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  children?: NavChild[];
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  {
    label: "Budżet",
    href: "/budget",
    icon: Wallet,
    children: [
      { label: "Przegląd", href: "/budget", icon: Wallet },
      { label: "Subskrypcje", href: "/subscriptions", icon: CreditCard },
      { label: "Zobowiązania", href: "/obligations", icon: TrendingUp },
    ],
  },
  { label: "Pojazdy", href: "/vehicles", icon: Car },
  { label: "Liczniki", href: "/meters", icon: Gauge },
  { label: "Kalendarz", href: "/calendar", icon: CalendarDays },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(
  name: string | null | undefined,
  email: string | null | undefined
): string {
  if (name) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

const linkBase =
  "flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors";
const linkActive = "bg-sidebar-primary text-sidebar-primary-foreground font-medium";
const linkIdle =
  "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";

// ─── MobileHeader ─────────────────────────────────────────────────────────────

export function MobileHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useUser();

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = getInitials(profile?.fullName, profile?.email);

  return (
    <>
      {/* ── Mobile top bar (hidden on md+) ─────────────────────────────── */}
      <header className="md:hidden flex items-center gap-3 px-3 py-2.5 border-b bg-background sticky top-0 z-10 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Link href="/" className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary">
            <Home className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold truncate">OwnHome</span>
        </Link>
      </header>

      {/* ── Mobile nav sheet ────────────────────────────────────────────── */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="w-64 p-0 flex flex-col border-0"
          style={{
            background:
              "linear-gradient(160deg, oklch(var(--sidebar-from)), oklch(var(--sidebar-to)))",
          }}
        >
          <SheetTitle className="sr-only">Nawigacja</SheetTitle>

          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-5 shrink-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Home className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
              OwnHome
            </span>
          </div>

          <div className="mx-4 h-px bg-sidebar-border shrink-0" />

          {/* Nav */}
          <nav className="flex-1 flex flex-col gap-0.5 px-2 py-3 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isAnyChildActive = item.children?.some(
                (c) => pathname === c.href
              );

              if (item.children) {
                return (
                  <div key={item.href}>
                    <div
                      className={cn(
                        "flex h-10 items-center gap-3 rounded-lg px-3 text-sm",
                        isAnyChildActive
                          ? "bg-sidebar-primary/20 text-sidebar-foreground font-medium"
                          : "text-sidebar-foreground/60"
                      )}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      {item.label}
                    </div>
                    <div className="ml-3 flex flex-col gap-0.5 border-l border-sidebar-border/40 pl-2">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        const isActive = pathname === child.href;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setOpen(false)}
                            className={cn(
                              linkBase,
                              isActive ? linkActive : linkIdle
                            )}
                          >
                            <ChildIcon className="h-[18px] w-[18px] shrink-0" />
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(linkBase, isActive ? linkActive : linkIdle)}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="flex flex-col gap-0.5 px-2 pb-4 shrink-0">
            <div className="mb-2 h-px bg-sidebar-border" />

            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className={cn(
                linkBase,
                pathname === "/notifications" ? linkActive : linkIdle
              )}
            >
              <Bell className="h-[18px] w-[18px] shrink-0" />
              Powiadomienia
            </Link>

            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className={cn(
                linkBase,
                pathname.startsWith("/settings") ? linkActive : linkIdle
              )}
            >
              <Settings className="h-[18px] w-[18px] shrink-0" />
              Ustawienia
            </Link>

            <div className="my-2 h-px bg-sidebar-border" />

            {/* User row */}
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={profile?.avatarUrl ?? undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate leading-tight">
                  {profile?.fullName ?? profile?.email ?? "…"}
                </p>
              </div>
              <button
                onClick={handleLogout}
                title="Wyloguj"
                className="shrink-0 p-1.5 rounded-md text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
