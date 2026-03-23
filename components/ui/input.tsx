import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-border/70 bg-background px-2.5 py-1 text-sm shadow-[inset_0_1px_2px_rgb(0_0_0/0.05)] transition-all outline-none placeholder:text-muted-foreground/60 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground hover:border-border focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:shadow-[inset_0_1px_2px_rgb(0_0_0/0.04),_0_0_0_3px_oklch(var(--ring)/0.12)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted/40 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:bg-input/20 dark:border-input dark:hover:border-input/80 dark:disabled:bg-input/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
