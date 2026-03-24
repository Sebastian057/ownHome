"use client";

import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SWRConfig } from "swr";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error('API error'), { status: res.status, data: body });
  }
  return res.json();
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <SWRConfig value={{ fetcher, revalidateOnFocus: false }}>
          {children}
        </SWRConfig>
      </TooltipProvider>
    </ThemeProvider>
  );
}
