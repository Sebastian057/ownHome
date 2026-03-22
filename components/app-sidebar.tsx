"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Bell,
  CalendarDays,
  Car,
  ChevronDown,
  CreditCard,
  Home,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useUser } from "@/components/user-provider";

// ─── Nav items ────────────────────────────────────────────────────────────────

type NavChild = { label: string; href: string; icon: React.ElementType };
type NavItemDef = {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  children?: NavChild[];
};

const navItems: NavItemDef[] = [
  { label: "Dashboard", href: "/",        icon: LayoutDashboard },
  {
    label: "Budżet",    href: "/budget",   icon: Wallet,
    children: [
      { label: "Subskrypcje",  href: "/subscriptions", icon: CreditCard },
      { label: "Zobowiązania", href: "/obligations",   icon: TrendingUp },
    ],
  },
  { label: "Pojazdy",   href: "/vehicles", icon: Car },
  { label: "Kalendarz", href: "/calendar", icon: CalendarDays },
];

// ─── NavLink ──────────────────────────────────────────────────────────────────

function NavLink({
  href,
  icon: Icon,
  label,
  isActive,
  collapsed,
  badge,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  collapsed: boolean;
  badge?: number;
}) {
  const linkClass = cn(
    "relative flex h-10 items-center rounded-lg transition-colors duration-150",
    collapsed ? "w-10 justify-center" : "gap-3 px-3 w-full",
    isActive
      ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
      : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
  );

  const content = (
    <>
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {!collapsed && <span className="text-sm">{label}</span>}
      {/* Badge powiadomień */}
      {badge !== undefined && badge > 0 && (
        <span className={cn(
          "flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground px-1",
          collapsed ? "absolute -top-1 -right-1" : "ml-auto"
        )}>
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href={href} className={linkClass}>{content}</Link>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {label}{badge ? ` (${badge})` : ""}
        </TooltipContent>
      </Tooltip>
    );
  }

  return <Link href={href} className={linkClass}>{content}</Link>;
}

// ─── NavGroup — collapsible accordion ────────────────────────────────────────

function NavGroup({
  item,
  pathname,
  collapsed,
}: {
  item: NavItemDef & { children: NavChild[] };
  pathname: string;
  collapsed: boolean;
}) {
  const isAnyChildActive = item.children.some((c) => pathname === c.href);
  const isParentActive = pathname === item.href;
  const [open, setOpen] = useState(isAnyChildActive || isParentActive);

  if (collapsed) {
    return (
      <NavLink
        href={item.href}
        icon={item.icon}
        label={item.label}
        isActive={isParentActive || isAnyChildActive}
        collapsed={true}
      />
    );
  }

  const Icon = item.icon;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      {/* Trigger row — cały wiersz jest klikalny (toggle), ikonka i label to Link */}
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "relative flex h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 transition-colors duration-150",
            isParentActive || isAnyChildActive
              ? "bg-sidebar-primary/20 text-sidebar-foreground font-medium"
              : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <Icon className="h-[18px] w-[18px] shrink-0" />
          <Link
            href={item.href}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-left text-sm"
          >
            {item.label}
          </Link>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="collapsible-content">
        <div className="ml-[22px] mt-0.5 flex flex-col gap-0.5 border-l border-sidebar-border/40 pb-0.5 pl-3">
          {item.children.map((child) => (
            <NavLink
              key={child.href}
              href={child.href}
              icon={child.icon}
              label={child.label}
              isActive={pathname === child.href}
              collapsed={false}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Initials helper ──────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

// ─── UserCard ─────────────────────────────────────────────────────────────────

function UserCard({ collapsed }: { collapsed: boolean }) {
  const router = useRouter();
  const { profile } = useUser();

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = getInitials(profile?.fullName, profile?.email);
  const displayName = profile?.fullName ?? profile?.email ?? "…";
  const displaySub = profile?.fullName ? profile.email : null;

  const avatarEl = (
    <Avatar className="h-8 w-8 shrink-0">
      <AvatarImage src={profile?.avatarUrl ?? undefined} />
      <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
        {initials}
      </AvatarFallback>
    </Avatar>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleLogout}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            {avatarEl}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {displayName} · Wyloguj
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
      {avatarEl}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-sidebar-foreground truncate leading-tight">
          {displayName}
        </p>
        {displaySub && (
          <p className="text-[11px] text-sidebar-foreground/40 truncate leading-tight">
            {displaySub}
          </p>
        )}
      </div>
      <button
        onClick={handleLogout}
        title="Wyloguj"
        className="shrink-0 p-1.5 rounded-md text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors cursor-pointer"
      >
        <LogOut className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── AppSidebar ───────────────────────────────────────────────────────────────

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  // Powiadomienia — w przyszłości pobierane z /api/notifications
  const notificationCount = 0;

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col text-sidebar-foreground rounded-xl overflow-hidden transition-all duration-200 ease-in-out",
        collapsed ? "w-[60px]" : "w-56"
      )}
      style={{ background: "linear-gradient(to bottom, oklch(0.44 0 0), oklch(0.28 0 0))" }}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center py-5 px-3",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Home className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-sidebar-foreground truncate">
              OwnHome
            </span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          {collapsed
            ? <PanelLeftOpen className="h-4 w-4" />
            : <PanelLeftClose className="h-4 w-4" />
          }
        </button>
      </div>

      <div className="mx-3 h-px bg-sidebar-border" />

      {/* Main nav */}
      <nav className={cn(
        "flex-1 flex flex-col gap-0.5 py-3",
        collapsed ? "px-[10px]" : "px-2"
      )}>
        {navItems.map((item) =>
          item.children ? (
            <NavGroup
              key={item.href}
              item={item as NavItemDef & { children: NavChild[] }}
              pathname={pathname}
              collapsed={collapsed}
            />
          ) : (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              isActive={pathname === item.href}
              collapsed={collapsed}
            />
          )
        )}
      </nav>

      {/* Footer */}
      <div className={cn("flex flex-col gap-0.5 pb-4", collapsed ? "px-[10px]" : "px-2")}>
        <div className="mb-2 h-px bg-sidebar-border" />

        {/* Powiadomienia */}
        <NavLink
          href="/notifications"
          icon={Bell}
          label="Powiadomienia"
          isActive={pathname === "/notifications"}
          collapsed={collapsed}
          badge={notificationCount}
        />

        {/* Ustawienia */}
        <NavLink
          href="/settings"
          icon={Settings}
          label="Ustawienia"
          isActive={pathname.startsWith("/settings")}
          collapsed={collapsed}
        />

        <div className="my-2 h-px bg-sidebar-border" />

        {/* User card */}
        <UserCard collapsed={collapsed} />
      </div>
    </aside>
  );
}
