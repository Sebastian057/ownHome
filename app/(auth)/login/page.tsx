"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Home, Mail, Lock, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Nieprawidłowy email lub hasło");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });

    setLoading(false);

    if (resetError) {
      setError("Nie udało się wysłać linku. Sprawdź adres email.");
      return;
    }

    setForgotSent(true);
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Home className="h-5 w-5 text-primary-foreground" />
        </div>
        <CardTitle className="text-xl">OwnHome</CardTitle>
        <CardDescription>
          {forgotMode ? "Podaj email aby zresetować hasło" : "Zaloguj się do swojego konta"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {forgotSent ? (
          <div className="flex flex-col gap-4 text-center">
            <p className="text-sm text-muted-foreground">
              Link do zresetowania hasła został wysłany na <strong>{email}</strong>. Sprawdź skrzynkę.
            </p>
            <Button
              variant="ghost"
              onClick={() => {
                setForgotMode(false);
                setForgotSent(false);
              }}
            >
              Wróć do logowania
            </Button>
          </div>
        ) : forgotMode ? (
          <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="forgot-email" className="text-sm font-medium">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="jan@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" disabled={loading}>
              {loading ? "Wysyłanie..." : "Wyślij link"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setForgotMode(false);
                setError(null);
              }}
            >
              Wróć do logowania
            </Button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="jan@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-medium">
                Hasło
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" disabled={loading}>
              {loading ? "Logowanie..." : (
                <>
                  Zaloguj się
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => {
                setForgotMode(true);
                setError(null);
              }}
            >
              Zapomniałem hasła
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
