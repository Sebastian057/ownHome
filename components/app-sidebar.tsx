"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  CalendarDays,
  Car,
  CreditCard,
  Home,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  TrendingUp,
  User,
  Wallet,
} from "lucide-react";

const navItems = [
  { label: "Dashboard",     href: "/",              icon: LayoutDashboard },
  { label: "Budżet",        href: "/budget",        icon: Wallet },
  { label: "Subskrypcje",   href: "/subscriptions", icon: CreditCard },
  { label: "Zobowiązania",  href: "/obligations",   icon: TrendingUp },
  { label: "Pojazdy",       href: "/vehicles",      icon: Car },
  { label: "Kalendarz",     href: "/calendar",      icon: CalendarDays },
];

const bottomItems = [
  { label: "Profil",     href: "/profile",  icon: User },
  { label: "Ustawienia", href: "/settings", icon: Settings },
];

function NavLink({
  href,
  icon: Icon,
  label,
  isActive,
  collapsed,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  collapsed: boolean;
}) {
  const linkClass = cn(
    "flex h-10 items-center rounded-lg transition-colors duration-150",
    collapsed ? "w-10 justify-center" : "gap-3 px-3 w-full",
    isActive
      ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
      : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href={href} className={linkClass}>
            <Icon className="h-[18px] w-[18px] shrink-0" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link href={href} className={linkClass}>
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span className="text-sm">{label}</span>
    </Link>
  );
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col bg-sidebar text-sidebar-foreground rounded-xl overflow-hidden transition-all duration-200 ease-in-out",
        collapsed ? "w-[60px]" : "w-56"
      )}
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
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
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
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            isActive={pathname === item.href}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className={cn("flex flex-col gap-0.5 pb-4", collapsed ? "px-[10px]" : "px-2")}>
        <div className="mb-2 h-px bg-sidebar-border" />
        {bottomItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            isActive={pathname === item.href}
            collapsed={collapsed}
          />
        ))}
      </div>
    </aside>
  );
}
