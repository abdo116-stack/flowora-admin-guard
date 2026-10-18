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
import { useMySubscription } from "@/components/Pricing";
import { publicPortfolioUrl, slugify, SITE_URL } from "@/lib/floword";
import { CreditCard, FolderOpen, LifeBuoy, QrCode, Settings } from "lucide-react";

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
          <a href={publicPortfolioUrl(business.slug)} target="_blank" rel="noreferrer">
            View public page
          </a>
        </Button>
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DashCard
          icon={<FolderOpen className="h-5 w-5 text-primary" />}
          title="My Portfolio"
          desc="Edit details, services, photos and design below."
        />
        <DashCard
          icon={<QrCode className="h-5 w-5 text-primary" />}
          title="Customize QR Code"
          desc="Style, colors, logo, frame and print downloads."
          to="/qr-studio"
        />
        <DashCard
          icon={<LifeBuoy className="h-5 w-5 text-primary" />}
          title="Help & Support"
          desc="softatlas38@gmail.com · 0681569749"
          href="mailto:softatlas38@gmail.com"
        />
        <AccountCard email={auth.email} />
      </div>

      <SubscriptionCard businessId={business.id} />

      <div className="mt-8">
        <PortfolioEditor businessId={business.id} canPublish />
      </div>
    </AppShell>
  );
}

function DashCard({
  icon,
  title,
  desc,
  to,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  to?: string;
  href?: string;
}) {
  const inner = (
    <div className="surface h-full p-4 transition hover:border-primary/50">
      {icon}
      <p className="mt-2 font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
    </div>
  );
  if (to) return <Link to={to}>{inner}</Link>;
  if (href)
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {inner}
      </a>
    );
  return inner;
}

function AccountCard({ email }: { email?: string }) {
  async function resetPassword() {
    if (!email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${SITE_URL}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent to your email");
  }
  return (
    <button type="button" onClick={() => void resetPassword()} className="text-left">
      <div className="surface h-full p-4 transition hover:border-primary/50">
        <Settings className="h-5 w-5 text-primary" />
        <p className="mt-2 font-semibold">Account Settings</p>
        <p className="mt-1 text-xs text-muted-foreground">Send yourself a password reset link.</p>
      </div>
    </button>
  );
}

function SubscriptionCard({ businessId }: { businessId: string }) {
  const { data: sub, isLoading } = useMySubscription(businessId);
  const s = sub?.subscription ?? null;
  const req = sub?.request ?? null;
  const active = s?.status === "active" && new Date(s.expires_at).getTime() > Date.now();
  const expired = s?.status === "active" && new Date(s.expires_at).getTime() <= Date.now();

  let status = "No subscription yet";
  let detail = "Request a plan to keep your portfolio on the TAPRO Business plan.";
  if (req?.status === "pending" && !active) {
    status = "Request pending";
    detail = `Your ${req.period} request is being reviewed — we'll contact you with payment instructions.`;
  } else if (active) {
    status = "Active";
    detail = `${s!.period === "yearly" ? "Yearly" : "Monthly"} plan · renews by ${new Date(
      s!.expires_at,
    ).toLocaleDateString()}.`;
  } else if (expired) {
    status = "Expired";
    detail = `Your subscription ended on ${new Date(
      s!.expires_at,
    ).toLocaleDateString()}. Your portfolio data is safe — renew to stay on the plan.`;
  }

  return (
    <div className="surface flex flex-wrap items-center justify-between gap-4 p-5">
      <div className="flex items-start gap-3">
        <CreditCard className="mt-0.5 h-5 w-5 text-primary" />
        <div>
          <p className="font-semibold">
            Subscription & Billing ·{" "}
            <span
              className={
                active ? "text-primary" : req?.status === "pending" ? "text-warning" : "text-muted-foreground"
              }
            >
              {isLoading ? "Loading…" : status}
            </span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
        </div>
      </div>
      <Button asChild variant={active ? "outline" : "default"} size="sm">
        <Link to="/pricing">{active ? "Manage plan" : "View plans & renew"}</Link>
      </Button>
    </div>
  );
}
