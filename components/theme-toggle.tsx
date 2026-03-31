"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ThemeToggle({ collapsed }: { collapsed: boolean }) {
  const { theme, setTheme } = useTheme();

  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  const buttonClass = cn(
    "flex h-10 items-center rounded-lg transition-colors duration-150",
    "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    collapsed ? "w-10 justify-center" : "gap-3 px-3 w-full"
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={toggle} className={buttonClass}>
            <Sun className="h-[18px] w-[18px] shrink-0 dark:hidden" />
            <Moon className="hidden h-[18px] w-[18px] shrink-0 dark:block" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          Zmień motyw
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <button onClick={toggle} className={buttonClass}>
      <Sun className="h-[18px] w-[18px] shrink-0 dark:hidden" />
      <Moon className="hidden h-[18px] w-[18px] shrink-0 dark:block" />
      <span className="text-sm">Motyw</span>
    </button>
  );
}
