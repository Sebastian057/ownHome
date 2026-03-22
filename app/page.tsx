import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Car,
  CreditCard,
  TrendingUp,
  Wallet,
} from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Marzec 2026</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Saldo</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-mono font-semibold">12 450,00 PLN</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-success">
              <ArrowUpRight className="h-3 w-3" />
              +8,2% vs poprzedni miesiąc
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Wydatki (marzec)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-mono font-semibold">3 240,00 PLN</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
              <ArrowDownLeft className="h-3 w-3" />
              +12% vs poprzedni miesiąc
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Subskrypcje</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-mono font-semibold">349,90 PLN</p>
            <p className="mt-1 text-xs text-muted-foreground">8 aktywnych subskrypcji</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pojazdy</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-mono font-semibold">2</p>
            <p className="mt-1 text-xs text-muted-foreground">Następny serwis za 23 dni</p>
          </CardContent>
        </Card>
      </div>

      {/* Content row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Nadchodzące płatności */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nadchodzące płatności</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {[
              { name: "Spotify", amount: "23,99", date: "28 mar", status: "Za 6 dni" },
              { name: "Netflix", amount: "65,00", date: "01 kwi", status: "Za 10 dni" },
              { name: "Adobe CC", amount: "99,99", date: "05 kwi", status: "Za 14 dni" },
              { name: "Rata kredytu", amount: "1 200,00", date: "10 kwi", status: "Za 19 dni" },
            ].map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-xs">{item.status}</Badge>
                  <span className="font-mono text-sm font-medium">{item.amount} PLN</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Ostatnie transakcje */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ostatnie transakcje</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {[
              { name: "Biedronka", amount: "-87,43", type: "expense", date: "dziś" },
              { name: "Przelew przychodzący", amount: "+8 500,00", type: "income", date: "wczoraj" },
              { name: "Orlen — tankowanie", amount: "-245,00", type: "expense", date: "22 mar" },
              { name: "Lidl", amount: "-112,30", type: "expense", date: "21 mar" },
            ].map((item) => (
              <div key={item.name + item.date} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.date}</p>
                </div>
                <span
                  className={cn(
                    "font-mono text-sm font-medium",
                    item.type === "income" ? "text-success" : "text-foreground"
                  )}
                >
                  {item.amount} PLN
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming events */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Nadchodzące zdarzenia</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {[
            { label: "Przegląd techniczny — Audi A4", date: "15 kwi", badge: "Pojazd" },
            { label: "Ubezpieczenie OC — wygasa", date: "30 kwi", badge: "Ubezpieczenie" },
            { label: "Rata hipoteki", date: "10 kwi", badge: "Zobowiązanie" },
          ].map((event) => (
            <div key={event.label} className="flex flex-1 items-center justify-between rounded-lg border bg-card px-4 py-3 min-w-[240px]">
              <div>
                <p className="text-sm font-medium">{event.label}</p>
                <p className="text-xs text-muted-foreground">{event.date}</p>
              </div>
              <Badge variant="secondary">{event.badge}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

