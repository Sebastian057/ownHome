import type { Metadata } from 'next';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { Providers } from "./providers";
import { AppSidebar } from "@/components/app-sidebar";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'OwnHome',
  description: 'Personal life manager',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <body className="bg-zinc-200 dark:bg-zinc-900">
        <Providers>
          <div className="flex h-screen gap-3 p-3 overflow-hidden">
            <AppSidebar />
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
