import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { PortfolioEditor } from "@/components/PortfolioEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slugify } from "@/lib/floword";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Business dashboard — Tapro" },
      { name: "description", content: "Create, edit and publish your Tapro business portfolio." },
      { property: "og:title", content: "Business dashboard — Tapro" },
      {
        property: "og:description",
        content: "Create, edit and publish your Tapro business portfolio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const DENIED: Record<string, { title: string; body: string }> = {
  rejected: {
    title: "Access denied",
    body: "Your account was rejected. Contact Tapro if you think this is a mistake.",
  },
  suspended: {
    title: "Account suspended",
    body: "Your access has been suspended by Tapro. Contact us to restore your account.",
  },
  pending: {
    title: "Your account is being reviewed",
    body: "You'll be able to manage your portfolio as soon as the review finishes.",
  },
};

function Dashboard() {
  const { data: auth, isLoading } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");

  const { data: business, isLoading: loadingBusiness } = useQuery({
    queryKey: ["my-business", auth?.userId],
    enabled: Boolean(auth?.userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_profiles")
        .select("id, business_name, slug, published")
        .eq("user_id", auth!.userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const base = slugify(name) || "business";
      const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
      const { data, error } = await supabase
        .from("business_profiles")
        .insert({ business_name: name.trim(), slug, user_id: auth!.userId })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      toast.success("Portfolio created — add your details and publish when ready");
      void qc.invalidateQueries({ queryKey: ["my-business", auth?.userId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create portfolio"),
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
          <h1 className="text-xl font-semibold">You're signed in as the Tapro administrator</h1>
          <Button asChild className="mt-4">
            <Link to="/admin">Go to admin console</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  if (auth.status === "rejected" || auth.status === "suspended") {
    const info = DENIED[auth.status]!;
    return (
      <AppShell title="Dashboard">
        <div className="surface mx-auto max-w-lg p-8 text-center">
          <h1 className="text-2xl font-bold">{info.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{info.body}</p>
        </div>
      </AppShell>
    );
  }

  if (loadingBusiness) {
    return (
      <AppShell title="Your portfolio">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AppShell>
    );
  }

  if (!business) {
    return (
      <AppShell title="Your portfolio">
        <div className="surface mx-auto max-w-lg p-8">
          <h1 className="text-2xl font-bold">Create your portfolio</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Every account gets one business portfolio with its own public page and QR code.
          </p>
          <div className="mt-6 space-y-2">
            <Label htmlFor="bizname">Business name</Label>
            <Input
              id="bizname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Atlas Coffee"
            />
          </div>
          <Button
            className="mt-4 w-full"
            disabled={!name.trim() || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? "Creating…" : "Create portfolio"}
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Your portfolio">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{business.business_name}</h1>
          <p className="text-sm text-muted-foreground">
            /p/{business.slug} · {business.published ? "Live" : "Not published yet"}
          </p>
        </div>
        <Button variant="outline" asChild>
          <a href={`/p/${business.slug}`} target="_blank" rel="noreferrer">
            View public page
          </a>
        </Button>
      </div>
      <PortfolioEditor businessId={business.id} canPublish />
    </AppShell>
  );
}
