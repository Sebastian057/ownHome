import { AppSidebar } from "@/components/app-sidebar";
import { UserProvider } from "@/components/user-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <div className="flex h-screen gap-3 p-3 overflow-hidden">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </UserProvider>
  );
}
