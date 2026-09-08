import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import type { ReactNode } from "react";

export function Brand({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`font-display text-xl font-bold tracking-tight ${className}`}>
      FLOW<span className="text-primary">ORA</span>
    </Link>
  );
}

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  const { data: auth } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <Brand />
            {title ? (
              <span className="hidden text-sm text-muted-foreground sm:inline">{title}</span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {auth?.isAdmin ? (
              <Button asChild variant="ghost" size="sm">
                <Link to="/admin">Admin</Link>
              </Button>
            ) : null}
            {auth && !auth.isAdmin ? (
              <Button asChild variant="ghost" size="sm">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : null}
            <span className="hidden text-xs text-muted-foreground md:inline">{auth?.email}</span>
            <Button variant="outline" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
