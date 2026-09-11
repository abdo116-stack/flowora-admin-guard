import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { adminCreateUser, adminDeleteUser } from "@/lib/admin.functions";
import { slugify, STATUS_LABEL, type UserStatus } from "@/lib/floword";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Admin console — Tapro" },
      { name: "description", content: "Tapro administrator console for users and portfolios." },
      { property: "og:title", content: "Admin console — Tapro" },
      { property: "og:description", content: "Manage Tapro users and business portfolios." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { data: auth, isLoading } = useAuth();

  if (isLoading) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AppShell>
    );
  }

  if (!auth?.isAdmin) {
    return (
      <AppShell title="Admin">
        <div className="surface mx-auto max-w-lg p-8 text-center">
          <h1 className="text-2xl font-bold">Access denied</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This area is reserved for the Tapro administrator.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Admin console">
      <h1 className="mb-6 text-2xl font-bold">Admin console</h1>
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="businesses">Portfolios</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6">
          <OverviewPanel />
        </TabsContent>
        <TabsContent value="users" className="mt-6">
          <UsersPanel />
        </TabsContent>
        <TabsContent value="businesses" className="mt-6">
          <BusinessesPanel />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

const STATUSES: UserStatus[] = ["pending", "approved", "rejected", "suspended"];

function statusTone(status: UserStatus) {
  if (status === "approved") return "bg-primary/15 text-primary";
  if (status === "pending") return "bg-warning/15 text-warning";
  if (status === "suspended") return "bg-muted text-muted-foreground";
  return "bg-destructive/15 text-destructive";
}

function UsersPanel() {
  const qc = useQueryClient();
  const { data: auth } = useAuth();
  const createUser = useServerFn(adminCreateUser);
  const deleteUser = useServerFn(adminDeleteUser);
  const [filter, setFilter] = useState<"all" | UserStatus>("all");
  const [draft, setDraft] = useState({ email: "", fullName: "" });

  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: UserStatus }) => {
      const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update"),
  });

  const rename = useMutation({
    mutationFn: async ({ id, full_name }: { id: string; full_name: string }) => {
      const { error } = await supabase.from("profiles").update({ full_name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("User updated");
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const create = useMutation({
    mutationFn: async () =>
      createUser({ data: { email: draft.email.trim(), fullName: draft.fullName.trim() } }),
    onSuccess: () => {
      toast.success("Account created. Send them a password link to get started.");
      setDraft({ email: "", fullName: "" });
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create account"),
  });

  const remove = useMutation({
    mutationFn: async (userId: string) => deleteUser({ data: { userId } }),
    onSuccess: () => {
      toast.success("User deleted");
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
      void qc.invalidateQueries({ queryKey: ["admin-businesses"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete user"),
  });

  async function sendPasswordLink(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success(`Password link sent to ${email}`);
  }

  const shown = (users ?? []).filter((u) => filter === "all" || u.status === filter);

  return (
    <div className="space-y-6">
      <div className="surface grid gap-3 p-5 sm:grid-cols-4">
        <div className="space-y-2 sm:col-span-1">
          <Label>Full name</Label>
          <Input
            value={draft.fullName}
            onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Email</Label>
          <Input
            type="email"
            value={draft.email}
            onChange={(e) => setDraft({ ...draft, email: e.target.value })}
          />
        </div>
        <div className="flex items-end">
          <Button
            className="w-full"
            onClick={() => create.mutate()}
            disabled={!draft.email || create.isPending}
          >
            {create.isPending ? "Creating…" : "Create approved user"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", ...STATUSES] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? "default" : "outline"}
            onClick={() => setFilter(s)}
          >
            {s === "all" ? "All" : STATUS_LABEL[s]}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {shown.map((u) => (
          <div key={u.id} className="surface flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="min-w-48">
              <div className="flex items-center gap-2">
                <p className="font-medium">{u.full_name || "Unnamed"}</p>
                <Badge className={statusTone(u.status as UserStatus)} variant="secondary">
                  {STATUS_LABEL[u.status as UserStatus]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{u.email}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={u.status}
                onValueChange={(v) => setStatus.mutate({ id: u.id, status: v as UserStatus })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const name = window.prompt("Full name", u.full_name ?? "");
                  if (name !== null) rename.mutate({ id: u.id, full_name: name });
                }}
              >
                Edit
              </Button>
              <Button size="sm" variant="outline" onClick={() => void sendPasswordLink(u.email)}>
                Password link
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                disabled={u.id === auth?.userId}
                onClick={() => {
                  if (window.confirm(`Delete ${u.email}? This cannot be undone.`))
                    remove.mutate(u.id);
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
        {shown.length === 0 ? <p className="text-sm text-muted-foreground">No users here.</p> : null}
      </div>
    </div>
  );
}

function BusinessesPanel() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [draft, setDraft] = useState({ name: "", userId: "" });

  const { data: businesses } = useQuery({
    queryKey: ["admin-businesses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_profiles")
        .select("id, business_name, slug, published, user_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, status")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const base = slugify(draft.name);
      const slug = (businesses ?? []).some((b) => b.slug === base)
        ? `${base}-${Math.random().toString(36).slice(2, 6)}`
        : base;
      const { data, error } = await supabase
        .from("business_profiles")
        .insert({ business_name: draft.name, slug, user_id: draft.userId })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Portfolio created");
      setDraft({ name: "", userId: "" });
      void qc.invalidateQueries({ queryKey: ["admin-businesses"] });
      navigate({ to: "/admin/business/$id", params: { id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create portfolio"),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase.from("business_profiles").update({ published }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-businesses"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("business_profiles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Portfolio deleted");
      void qc.invalidateQueries({ queryKey: ["admin-businesses"] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="surface grid gap-3 p-5 sm:grid-cols-4">
        <div className="space-y-2 sm:col-span-2">
          <Label>Business name</Label>
          <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Owner</Label>
          <Select value={draft.userId} onValueChange={(v) => setDraft({ ...draft, userId: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select owner" />
            </SelectTrigger>
            <SelectContent>
              {(users ?? []).map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name || u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button
            className="w-full"
            disabled={!draft.name || !draft.userId || create.isPending}
            onClick={() => create.mutate()}
          >
            Create portfolio
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {(businesses ?? []).map((b) => (
          <div key={b.id} className="surface flex flex-wrap items-center justify-between gap-4 p-4">
            <div>
              <p className="font-medium">{b.business_name}</p>
              <p className="text-xs text-muted-foreground">/p/{b.slug}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className={b.published ? "bg-primary/15 text-primary" : ""}>
                {b.published ? "Published" : "Unpublished"}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => togglePublish.mutate({ id: b.id, published: !b.published })}
              >
                {b.published ? "Unpublish" : "Publish"}
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={`/p/${b.slug}`} target="_blank" rel="noreferrer">
                  Preview
                </a>
              </Button>
              <Button size="sm" asChild>
                <Link to="/admin/business/$id" params={{ id: b.id }}>
                  Edit
                </Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => {
                  if (window.confirm(`Delete ${b.business_name}?`)) remove.mutate(b.id);
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
        {(businesses ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No portfolios yet.</p>
        ) : null}
      </div>
    </div>
  );
}

function OverviewPanel() {
  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: businesses } = useQuery({
    queryKey: ["admin-businesses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_profiles")
        .select("id, business_name, slug, published, user_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: events } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analytics")
        .select("business_id, event_type, created_at")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = events ?? [];
  const since = Date.now() - 30 * 864e5;
  const recent = rows.filter((r) => new Date(r.created_at).getTime() > since);
  const views = rows.filter((r) => r.event_type === "page_view").length;
  const contacts = rows.filter((r) => r.event_type !== "page_view").length;

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 864e5);
    const key = d.toISOString().slice(0, 10);
    return {
      day: key.slice(5),
      views: rows.filter(
        (r) => r.event_type === "page_view" && r.created_at.slice(0, 10) === key,
      ).length,
    };
  });

  const perBusiness = (businesses ?? [])
    .map((b) => ({
      ...b,
      views: rows.filter((r) => r.business_id === b.id && r.event_type === "page_view").length,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 6);

  const byStatus = (s: string) => (users ?? []).filter((u) => u.status === s).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Users" value={(users ?? []).length} hint={`${byStatus("approved")} active`} />
        <StatCard
          label="Portfolios"
          value={(businesses ?? []).length}
          hint={`${(businesses ?? []).filter((b) => b.published).length} published`}
        />
        <StatCard label="Page views" value={views} hint={`${recent.length} events in 30 days`} />
        <StatCard label="Contact actions" value={contacts} hint="calls, WhatsApp, maps, website" />
      </div>

      <div className="surface p-5">
        <h2 className="text-lg font-semibold">Page views — last 14 days</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={days}>
              <defs>
                <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis allowDecimals={false} stroke="var(--color-muted-foreground)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="views"
                stroke="var(--color-primary)"
                strokeWidth={2}
                fill="url(#viewsFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="surface p-5">
        <h2 className="text-lg font-semibold">Most viewed portfolios</h2>
        <div className="mt-4 space-y-2">
          {perBusiness.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between border-b border-border/60 pb-2 text-sm"
            >
              <div>
                <p className="font-medium">{b.business_name}</p>
                <p className="text-xs text-muted-foreground">/p/{b.slug}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className={b.published ? "bg-primary/15 text-primary" : ""}>
                  {b.published ? "Published" : "Draft"}
                </Badge>
                <span className="font-display text-lg text-primary">{b.views}</span>
              </div>
            </div>
          ))}
          {perBusiness.length === 0 ? (
            <p className="text-sm text-muted-foreground">No portfolios yet.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="surface p-5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold text-primary">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
