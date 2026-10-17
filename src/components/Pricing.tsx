import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

export const PLAN_FEATURES = [
  "Digital business portfolio",
  "Services, products, prices and photos",
  "Business contact information",
  "WhatsApp and social media links",
  "Business location",
  "Portfolio design customization",
  "QR Code Design Studio",
  "QR colors, styles, logo and frames",
  "QR downloads (PNG, SVG, print card)",
  "Save Contact button for visitors",
  "Review request button",
];

export type BillingPeriod = "monthly" | "yearly";
export const PRICES: Record<BillingPeriod, { amount: number; label: string }> = {
  monthly: { amount: 49, label: "MAD / month" },
  yearly: { amount: 490, label: "MAD / year" },
};

export function useMyBusiness() {
  const { data: auth } = useAuth();
  return useQuery({
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
}

export function useMySubscription(businessId: string | undefined) {
  return useQuery({
    queryKey: ["my-subscription", businessId],
    enabled: Boolean(businessId),
    queryFn: async () => {
      const [{ data: subs, error: e1 }, { data: reqs, error: e2 }] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("id, period, status, starts_at, expires_at")
          .eq("business_id", businessId!)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("subscription_requests")
          .select("id, period, status, created_at")
          .eq("business_id", businessId!)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      return { subscription: subs?.[0] ?? null, request: reqs?.[0] ?? null };
    },
  });
}

export function PricingCard({ showRequest = true }: { showRequest?: boolean }) {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const { data: business } = useMyBusiness();
  const { data: sub } = useMySubscription(business?.id);

  const request = useMutation({
    mutationFn: async () => {
      if (!auth?.userId || !business) throw new Error("Create your portfolio first");
      const { error } = await supabase.from("subscription_requests").insert({
        user_id: auth.userId,
        business_id: business.id,
        period,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Subscription request sent — we'll contact you with payment instructions");
      void qc.invalidateQueries({ queryKey: ["my-subscription", business?.id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not send the request"),
  });

  const pendingRequest = sub?.request?.status === "pending";
  const active =
    sub?.subscription?.status === "active" &&
    new Date(sub.subscription.expires_at).getTime() > Date.now();

  return (
    <div className="surface mx-auto max-w-md p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">TAPRO Business</h2>
        <Badge variant="secondary" className="bg-primary/15 text-primary">
          One plan, everything included
        </Badge>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2 rounded-lg border border-border p-1">
        {(["monthly", "yearly"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`rounded-md px-3 py-2 text-sm font-medium transition ${
              period === p ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {p === "monthly" ? "Monthly" : "Yearly"}
          </button>
        ))}
      </div>

      <p className="mt-6">
        <span className="text-5xl font-bold">{PRICES[period].amount}</span>{" "}
        <span className="text-muted-foreground">{PRICES[period].label}</span>
      </p>
      {period === "yearly" ? (
        <p className="mt-1 text-sm text-primary">Save 98 MAD compared with paying monthly.</p>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">
          Or 490 MAD / year — save 98 MAD.
        </p>
      )}

      <ul className="mt-6 space-y-2 text-sm">
        {PLAN_FEATURES.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {f}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">
        Every feature is included in both billing periods. No tiers, no add-ons.
      </p>

      {showRequest ? (
        <div className="mt-6">
          {!auth ? (
            <Button asChild className="w-full">
              <Link to="/auth">Get Started with TAPRO</Link>
            </Button>
          ) : !business ? (
            <Button asChild className="w-full">
              <Link to="/dashboard">Create your portfolio first</Link>
            </Button>
          ) : active ? (
            <p className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-center text-sm text-primary">
              Your subscription is active until{" "}
              {new Date(sub!.subscription!.expires_at).toLocaleDateString()}.
            </p>
          ) : pendingRequest ? (
            <p className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-center text-sm text-warning">
              Your {sub!.request!.period} request is pending — we'll contact you with payment
              instructions.
            </p>
          ) : (
            <Button
              className="w-full"
              disabled={request.isPending}
              onClick={() => request.mutate()}
            >
              {request.isPending
                ? "Sending…"
                : `Request Subscription — ${period === "monthly" ? "49 MAD / month" : "490 MAD / year"}`}
            </Button>
          )}
          <p className="mt-3 text-center text-xs text-muted-foreground">
            No card needed now. After your request, we verify payment and activate your
            subscription.
          </p>
        </div>
      ) : null}
    </div>
  );
}
