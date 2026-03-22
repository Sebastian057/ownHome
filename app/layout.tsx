import type { Metadata } from 'next';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { Providers } from "./providers";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

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
      <body className="bg-background">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
