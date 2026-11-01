import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRICES, type BillingPeriod } from "@/components/Pricing";

type Sub = {
  id: string;
  user_id: string;
  business_id: string;
  period: string;
  status: string;
  starts_at: string;
  expires_at: string;
  created_at: string;
};

type Payment = {
  id: string;
  business_id: string;
  subscription_id: string;
  amount: number | string;
  paid_at: string;
  reference: string | null;
};

type SubRequest = {
  id: string;
  user_id: string;
  business_id: string;
  period: "monthly" | "yearly";
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type Biz = {
  id: string;
  business_name: string;
  slug: string;
  user_id: string;
};

type RowStatus = "active" | "expiring" | "expired" | "unpaid";

const DAY = 86_400_000;
const EXPIRING_SOON_DAYS = 14;

const STATUS_META: Record<RowStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-primary/15 text-primary" },
  expiring: { label: "Expiring soon", className: "bg-warning/15 text-warning" },
  expired: { label: "Expired", className: "bg-destructive/15 text-destructive" },
  unpaid: { label: "Unpaid", className: "bg-muted text-muted-foreground" },
};

function todayInput() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addMonths(from: Date, months: number) {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString();
}

type Row = {
  business: Biz;
  latest: Sub | null;
  status: RowStatus;
  payments: Payment[];
};

export function AdminSubscriptions() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | RowStatus>("all");

  const { data: requests } = useQuery({
    queryKey: ["admin-sub-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_requests")
        .select("id, user_id, business_id, period, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SubRequest[];
    },
  });

  const { data: subs } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("id, user_id, business_id, period, status, starts_at, expires_at, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Sub[];
    },
  });

  const { data: payments } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_payments")
        .select("id, business_id, subscription_id, amount, paid_at, reference")
        .order("paid_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Payment[];
    },
  });

  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, email, full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: businesses } = useQuery({
    queryKey: ["admin-businesses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_profiles")
        .select("id, business_name, slug, user_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const emailOf = (id: string) => (users ?? []).find((u) => u.id === id)?.email ?? "—";

  const rows: Row[] = useMemo(() => {
    const now = Date.now();
    return (businesses ?? []).map((b) => {
      const bizSubs = (subs ?? []).filter((s) => s.business_id === b.id);
      const latest = bizSubs[0] ?? null;
      const active =
        !!latest && latest.status === "active" && new Date(latest.expires_at).getTime() > now;
      const expiring =
        active && new Date(latest.expires_at).getTime() <= now + EXPIRING_SOON_DAYS * DAY;
      const status: RowStatus = !latest
        ? "unpaid"
        : active
          ? expiring
            ? "expiring"
            : "active"
          : "expired";
      return {
        business: b,
        latest,
        status,
        payments: (payments ?? []).filter((p) => p.business_id === b.id),
      };
    });
  }, [businesses, subs, payments]);

  const summary = useMemo(() => {
    const now = Date.now();
    const activeSubs = (subs ?? []).filter(
      (s) => s.status === "active" && new Date(s.expires_at).getTime() > now,
    );
    const expiring = activeSubs.filter(
      (s) => new Date(s.expires_at).getTime() <= now + EXPIRING_SOON_DAYS * DAY,
    );
    const recorded = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
    const recurring = activeSubs.reduce(
      (sum, s) =>
        sum + (s.period === "yearly" ? PRICES.yearly.amount / 12 : PRICES.monthly.amount),
      0,
    );
    return {
      active: activeSubs.length,
      expiring: expiring.length,
      expired: rows.filter((r) => r.status === "expired").length,
      unpaid: rows.filter((r) => r.status === "unpaid").length,
      recorded,
      recurring,
    };
  }, [subs, payments, rows]);

  const decide = useMutation({
    mutationFn: async ({ req, approve }: { req: SubRequest; approve: boolean }) => {
      const { error } = await supabase
        .from("subscription_requests")
        .update({
          status: approve ? "approved" : "rejected",
          decided_at: new Date().toISOString(),
        })
        .eq("id", req.id)
        .eq("status", "pending");
      if (error) throw error;
      if (approve) {
        const months = req.period === "yearly" ? 12 : 1;
        const expires = addMonths(new Date(), months);
        const { error: e2 } = await supabase.from("subscriptions").insert({
          user_id: req.user_id,
          business_id: req.business_id,
          period: req.period,
          status: "active",
          expires_at: expires.toISOString(),
        });
        if (e2) throw e2;
      }
    },
    onSuccess: () => {
      toast.success("Request updated");
      void qc.invalidateQueries({ queryKey: ["admin-sub-requests"] });
      void qc.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update"),
  });

  const pending = (requests ?? []).filter((r) => r.status === "pending");
  const decided = (requests ?? []).filter((r) => r.status !== "pending");

  const shown = rows.filter((r) => {
    if (filter === "all") return true;
    if (filter === "active") return r.status === "active" || r.status === "expiring";
    return r.status === filter;
  });

  return (
    <div className="space-y-8">
      {/* Summary */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="Active subscriptions" value={String(summary.active)} tone="primary" />
        <SummaryCard label="Expiring soon" value={String(summary.expiring)} tone="warning" />
        <SummaryCard label="Expired" value={String(summary.expired)} tone="danger" />
        <SummaryCard label="Unpaid / no subscription" value={String(summary.unpaid)} />
        <SummaryCard
          label="Recorded revenue"
          value={`${summary.recorded} MAD`}
          note="Confirmed payments only"
          tone="primary"
        />
        <SummaryCard
          label="Estimated recurring"
          value={`${Math.round(summary.recurring)} MAD / month`}
          note="If every active subscription renews — not recorded payments"
        />
      </section>

      {/* Pending requests */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Pending requests</h2>
        <div className="space-y-3">
          {pending.map((r) => (
            <div key={r.id} className="surface flex flex-wrap items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium">
                  {(businesses ?? []).find((b) => b.id === r.business_id)?.business_name ??
                    "Unknown portfolio"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {emailOf(r.user_id)} ·{" "}
                  {r.period === "yearly"
                        ? `${PRICES.yearly.amount} MAD / year`
                        : `${PRICES.monthly.amount} MAD / month`}{" "}
                  · {fmtDate(r.created_at)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={decide.isPending}
                  onClick={() => decide.mutate({ req: r, approve: true })}
                >
                  Approve &amp; activate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={decide.isPending}
                  onClick={() => decide.mutate({ req: r, approve: false })}
                >
                  Reject
                </Button>
              </div>
            </div>
          ))}
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending requests.</p>
          ) : null}
        </div>
      </section>

      {/* Filters */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Users &amp; billing</h2>
        <div className="mb-4 flex flex-wrap gap-2">
          {(
            [
              ["all", "All"],
              ["active", "Active / paid"],
              ["expiring", "Expiring soon"],
              ["expired", "Expired"],
              ["unpaid", "Unpaid"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              size="sm"
              variant={filter === value ? "default" : "outline"}
              onClick={() => setFilter(value)}
            >
              {label}
            </Button>
          ))}
        </div>

        <div className="space-y-3">
          {shown.map((row) => (
            <SubRow
              key={row.business.id}
              row={row}
              email={emailOf(row.business.user_id)}
              onRefresh={() => {
                void qc.invalidateQueries({ queryKey: ["admin-subscriptions"] });
                void qc.invalidateQueries({ queryKey: ["admin-payments"] });
              }}
            />
          ))}
          {shown.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users in this filter.</p>
          ) : null}
        </div>
      </section>

      {decided.length > 0 ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Request history</h2>
          <div className="space-y-2">
            {decided.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-2 text-sm"
              >
                <span>
                  {(businesses ?? []).find((b) => b.id === r.business_id)?.business_name ??
                    "Unknown portfolio"}{" "}
                  · {r.period}
                </span>
                <Badge variant="secondary">{r.status}</Badge>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "primary" | "warning" | "danger";
}) {
  return (
    <div className="surface p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold ${
          tone === "primary"
            ? "text-primary"
            : tone === "warning"
              ? "text-warning"
              : tone === "danger"
                ? "text-destructive"
                : ""
        }`}
      >
        {value}
      </p>
      {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}

function SubRow({
  row,
  email,
  onRefresh,
}: {
  row: Row;
  email: string;
  onRefresh: () => void;
}) {
  const meta = STATUS_META[row.status];
  const hasActiveSub = row.latest?.status === "active";
  const paidForLatest = row.payments.some((p) => p.subscription_id === row.latest?.id);

  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const [start, setStart] = useState(todayInput());
  const [payOpen, setPayOpen] = useState(false);
  const [amount, setAmount] = useState(String(PRICES.monthly.amount));
  const [payDate, setPayDate] = useState(todayInput());
  const [reference, setReference] = useState("");

  const activate = useMutation({
    mutationFn: async () => {
      const startDate = new Date(`${start}T12:00:00`);
      const expires = addMonths(startDate, period === "yearly" ? 12 : 1);
      const { error } = await supabase.from("subscriptions").insert({
        user_id: row.business.user_id,
        business_id: row.business.id,
        period,
        status: "active",
        starts_at: startDate.toISOString(),
        expires_at: expires.toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(
        period === "yearly"
          ? "Yearly subscription active — expires in 12 months"
          : "Monthly subscription active — expires in 1 month",
      );
      onRefresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not activate"),
  });

  const markUnpaid = useMutation({
    mutationFn: async () => {
      if (!row.latest) throw new Error("No subscription to change");
      const { error } = await supabase
        .from("subscriptions")
        .update({ status: "cancelled" })
        .eq("id", row.latest.id)
        .eq("status", "active");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marked as unpaid / inactive");
      onRefresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update"),
  });

  const recordPayment = useMutation({
    mutationFn: async () => {
      if (!row.latest) throw new Error("Activate a subscription first");
      const { error } = await supabase.from("subscription_payments").insert({
        business_id: row.business.id,
        user_id: row.business.user_id,
        subscription_id: row.latest.id,
        amount: Number(amount),
        period: row.latest.period as BillingPeriod,
        paid_at: new Date(`${payDate}T12:00:00`).toISOString(),
        reference: reference.trim() || null,
      });
      if (error) {
        if ((error as { code?: string }).code === "23505") {
          throw new Error("A payment is already recorded for this subscription period");
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Payment recorded");
      setPayOpen(false);
      setReference("");
      onRefresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not record payment"),
  });

  return (
    <div className="surface space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">{row.business.business_name}</p>
          <p className="text-xs text-muted-foreground">
            {email} · /p/{row.business.slug}
          </p>
        </div>
        <Badge variant="secondary" className={meta.className}>
          {meta.label}
        </Badge>
      </div>

      {row.latest ? (
        <p className="text-xs text-muted-foreground">
          Latest: {row.latest.period === "yearly" ? "Yearly (12 months)" : "Monthly (1 month)"} ·{" "}
          {row.latest.status} · from {fmtDate(row.latest.starts_at)} · expires{" "}
          {fmtDate(row.latest.expires_at)}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">No subscription recorded yet.</p>
      )}

      {row.payments.length > 0 ? (
        <div className="space-y-1 rounded-lg border border-border/70 px-3 py-2">
          {row.payments.map((p) => (
            <p key={p.id} className="text-xs text-muted-foreground">
              Paid {Number(p.amount)} MAD on {fmtDate(p.paid_at)}
              {p.reference ? ` · ref ${p.reference}` : ""}
            </p>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Billing period</Label>
          <Select value={period} onValueChange={(v) => setPeriod(v as BillingPeriod)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly — 1 month</SelectItem>
              <SelectItem value="yearly">Yearly — 12 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Start date</Label>
          <Input
            type="date"
            className="w-40"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
        <Button size="sm" disabled={activate.isPending} onClick={() => activate.mutate()}>
          {activate.isPending ? "Saving…" : hasActiveSub ? "Renew" : "Activate"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!hasActiveSub || markUnpaid.isPending}
          onClick={() => markUnpaid.mutate()}
        >
          Set unpaid
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!row.latest || paidForLatest}
          onClick={() => {
            setAmount(
              String(
                (row.latest?.period ?? period) === "yearly"
                  ? PRICES.yearly.amount
                  : PRICES.monthly.amount,
              ),
            );
            setPayOpen((v) => !v);
          }}
        >
          {paidForLatest ? "Payment recorded" : "Record payment"}
        </Button>
      </div>

      {payOpen && row.latest ? (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border/70 p-3">
          <div className="space-y-1">
            <Label className="text-xs">Amount (MAD)</Label>
            <Input
              type="number"
              min="0"
              className="w-32"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Payment date</Label>
            <Input
              type="date"
              className="w-40"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Reference (optional)</Label>
            <Input
              className="w-48"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Transfer / receipt no."
            />
          </div>
          <Button size="sm" disabled={recordPayment.isPending} onClick={() => recordPayment.mutate()}>
            {recordPayment.isPending ? "Saving…" : "Save payment"}
          </Button>
          <p className="w-full text-xs text-muted-foreground">
            Recorded for the {row.latest.period} period starting {fmtDate(row.latest.starts_at)}.
            Revenue counts confirmed payments only.
          </p>
        </div>
      ) : null}
    </div>
  );
}
