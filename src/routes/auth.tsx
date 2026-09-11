import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchAuthState } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brand } from "@/components/AppShell";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Tapro portal" },
      {
        name: "description",
        content: "Sign in to the Tapro portal to manage your business portfolio.",
      },
      { property: "og:title", content: "Sign in — Tapro portal" },
      {
        property: "og:description",
        content: "Secure email and password sign-in for Tapro business owners and administrators.",
      },
    ],
  }),
  component: AuthPage,
});

type Mode = "login" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const state = await fetchAuthState();
      if (!state) return;
      if (state.isAdmin) navigate({ to: "/admin", replace: true });
      else if (state.status === "approved") navigate({ to: "/dashboard", replace: true });
      else navigate({ to: "/dashboard", replace: true });
    })();
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Reset link sent. Check your inbox.");
        setMode("login");
        return;
      }

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName.trim() },
          },
        });
        if (error) throw error;
        toast.success("Account requested. Confirm your email, then wait for Tapro approval.");
        setMode("login");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      const state = await fetchAuthState();
      if (state?.isAdmin) navigate({ to: "/admin", replace: true });
      else navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Brand className="text-2xl" />
          <p className="mt-2 text-sm text-muted-foreground">Managed business portfolio platform</p>
        </div>

        <div className="surface p-6 sm:p-8">
          <h1 className="text-2xl font-bold">
            {mode === "login" ? "Sign in" : mode === "signup" ? "Request access" : "Reset password"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login"
              ? "Use the email and password provided by Tapro."
              : mode === "signup"
                ? "New accounts stay pending until Tapro approves them."
                : "We'll email you a secure link to set a new password."}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "signup" ? (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  required
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.com"
                required
              />
            </div>

            {mode !== "forgot" ? (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy
                ? "Please wait…"
                : mode === "login"
                  ? "Login"
                  : mode === "signup"
                    ? "Request access"
                    : "Send reset link"}
            </Button>
          </form>

          <div className="mt-5 flex flex-col gap-2 text-sm">
            {mode === "login" ? (
              <>
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setMode("forgot")}
                >
                  Forgot Password?
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setMode("signup")}
                >
                  Need an account? Request access
                </button>
              </>
            ) : (
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setMode("login")}
              >
                Back to sign in
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Back to Tapro
          </Link>
        </p>
      </div>
    </div>
  );
}
