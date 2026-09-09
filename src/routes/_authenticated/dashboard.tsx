import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { PortfolioEditor } from "@/components/PortfolioEditor";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Business dashboard — FLOWORA" },
      { name: "description", content: "Manage your FLOWORA business portfolio." },
      { property: "og:title", content: "Business dashboard — FLOWORA" },
      { property: "og:description", content: "Manage your FLOWORA business portfolio." },
    ],
  }),
  component: Dashboard,
});

const DENIED: Record<string, { title: string; body: string }> = {
  pending: {
    title: "Your account is awaiting approval",
    body: "FLOWORA is reviewing your request. You'll be able to manage your portfolio as soon as it is approved.",
  },
  rejected: {
    title: "Access denied",
    body: "Your account request was rejected. Contact FLOWORA if you think this is a mistake.",
  },
  suspended: {
    title: "Account suspended",
    body: "Your access has been suspended by FLOWORA. Contact us to restore your account.",
  },
};

function Dashboard() {
  const { data: auth, isLoading } = useAuth();

  const { data: business } = useQuery({
    queryKey: ["my-business", auth?.userId],
    enabled: Boolean(auth?.userId) && auth?.status === "approved",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_profiles")
        .select("id, business_name")
        .eq("user_id", auth!.userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading || !auth) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AppShell>
    );
  }

  if (auth.isAdmin) {
    return (
      <AppShell title="Dashboard">
        <div className="surface p-6">
          <h1 className="text-xl font-semibold">You're signed in as the FLOWORA administrator</h1>
          <Button asChild className="mt-4">
            <Link to="/admin">Go to admin console</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  if (auth.status !== "approved") {
    const info = DENIED[auth.status] ?? DENIED["pending"]!;
    return (
      <AppShell title="Dashboard">
        <div className="surface mx-auto max-w-lg p-8 text-center">
          <h1 className="text-2xl font-bold">{info.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{info.body}</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Your portfolio">
      {business ? (
        <>
          <h1 className="mb-6 text-2xl font-bold">{business.business_name}</h1>
          <PortfolioEditor businessId={business.id} canPublish={false} />
        </>
      ) : (
        <div className="surface mx-auto max-w-lg p-8 text-center">
          <h1 className="text-2xl font-bold">No portfolio yet</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            FLOWORA is preparing your business portfolio. It will appear here once created.
          </p>
        </div>
      )}
    </AppShell>
  );
}
