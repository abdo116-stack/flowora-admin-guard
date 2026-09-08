import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Media } from "@/components/Media";
import { DAYS, slugify, uploadMedia } from "@/lib/floword";

type Business = {
  id: string;
  user_id: string;
  business_name: string;
  slug: string;
  logo_url: string | null;
  cover_url: string | null;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  google_maps_url: string | null;
  address: string | null;
  opening_hours: Record<string, string> | null;
  published: boolean;
};

export function PortfolioEditor({
  businessId,
  canPublish,
  readOnly = false,
}: {
  businessId: string;
  canPublish: boolean;
  readOnly?: boolean;
}) {
  const queryClient = useQueryClient();
  const { data: business, isLoading } = useQuery({
    queryKey: ["business", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_profiles")
        .select("*")
        .eq("id", businessId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Business | null;
    },
  });

  const [form, setForm] = useState<Business | null>(null);
  useEffect(() => {
    if (business) setForm(business);
  }, [business]);

  const save = useMutation({
    mutationFn: async (values: Business) => {
      const { error } = await supabase
        .from("business_profiles")
        .update({
          business_name: values.business_name,
          slug: values.slug,
          logo_url: values.logo_url,
          cover_url: values.cover_url,
          description: values.description,
          phone: values.phone,
          whatsapp: values.whatsapp,
          email: values.email,
          website: values.website,
          instagram: values.instagram,
          facebook: values.facebook,
          tiktok: values.tiktok,
          google_maps_url: values.google_maps_url,
          address: values.address,
          opening_hours: values.opening_hours ?? {},
          published: values.published,
        })
        .eq("id", businessId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Portfolio saved");
      void queryClient.invalidateQueries({ queryKey: ["business", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-businesses"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  if (isLoading || !form) return <p className="text-sm text-muted-foreground">Loading portfolio…</p>;

  const set = <K extends keyof Business>(key: K, value: Business[K]) =>
    setForm({ ...form, [key]: value });

  const publicUrl =
    typeof window !== "undefined" ? `${window.location.origin}/p/${form.slug}` : `/p/${form.slug}`;

  return (
    <Tabs defaultValue="details" className="w-full">
      <TabsList className="flex w-full flex-wrap justify-start">
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="hours">Hours</TabsTrigger>
        <TabsTrigger value="services">Services</TabsTrigger>
        <TabsTrigger value="gallery">Gallery</TabsTrigger>
        <TabsTrigger value="offers">Offers</TabsTrigger>
        <TabsTrigger value="share">Share &amp; stats</TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="mt-6 space-y-6">
        <div className="surface space-y-5 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business name">
              <Input
                value={form.business_name}
                disabled={readOnly}
                onChange={(e) => set("business_name", e.target.value)}
              />
            </Field>
            <Field label="Public address (permanent)">
              <div className="flex gap-2">
                <Input
                  value={form.slug}
                  disabled={readOnly || !canPublish}
                  onChange={(e) => set("slug", slugify(e.target.value))}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">/p/{form.slug}</p>
            </Field>
          </div>

          <Field label="Description">
            <Textarea
              rows={4}
              value={form.description ?? ""}
              disabled={readOnly}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <ImageField
              label="Logo"
              businessId={businessId}
              value={form.logo_url}
              disabled={readOnly}
              onChange={(v) => set("logo_url", v)}
            />
            <ImageField
              label="Cover image"
              businessId={businessId}
              value={form.cover_url}
              disabled={readOnly}
              onChange={(v) => set("cover_url", v)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["phone", "Phone"],
                ["whatsapp", "WhatsApp"],
                ["email", "Contact email"],
                ["website", "Website"],
                ["instagram", "Instagram"],
                ["facebook", "Facebook"],
                ["tiktok", "TikTok"],
                ["google_maps_url", "Google Maps link"],
                ["address", "Address"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label}>
                <Input
                  value={(form[key] as string | null) ?? ""}
                  disabled={readOnly}
                  onChange={(e) => set(key, e.target.value as Business[typeof key])}
                />
              </Field>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="font-medium">Published</p>
              <p className="text-xs text-muted-foreground">
                {canPublish
                  ? "Published portfolios are visible to the public."
                  : "Only FLOWORA can publish or unpublish a portfolio."}
              </p>
            </div>
            <Switch
              checked={form.published}
              disabled={!canPublish || readOnly}
              onCheckedChange={(v) => set("published", v)}
            />
          </div>

          {!readOnly ? (
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => save.mutate(form)} disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save changes"}
              </Button>
              <Button variant="outline" asChild>
                <a href={publicUrl} target="_blank" rel="noreferrer">
                  Preview public page
                </a>
              </Button>
            </div>
          ) : null}
        </div>
      </TabsContent>

      <TabsContent value="hours" className="mt-6">
        <div className="surface space-y-4 p-5">
          {DAYS.map((day) => (
            <div key={day} className="grid grid-cols-3 items-center gap-3">
              <span className="text-sm capitalize">{day}</span>
              <Input
                className="col-span-2"
                placeholder="09:00 – 18:00 or Closed"
                disabled={readOnly}
                value={form.opening_hours?.[day] ?? ""}
                onChange={(e) =>
                  set("opening_hours", { ...(form.opening_hours ?? {}), [day]: e.target.value })
                }
              />
            </div>
          ))}
          {!readOnly ? (
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>
              Save hours
            </Button>
          ) : null}
        </div>
      </TabsContent>

      <TabsContent value="services" className="mt-6">
        <ServicesPanel businessId={businessId} readOnly={readOnly} />
      </TabsContent>

      <TabsContent value="gallery" className="mt-6">
        <GalleryPanel businessId={businessId} readOnly={readOnly} />
      </TabsContent>

      <TabsContent value="offers" className="mt-6">
        <OffersPanel businessId={businessId} readOnly={readOnly} />
      </TabsContent>

      <TabsContent value="share" className="mt-6">
        <SharePanel businessId={businessId} slug={form.slug} />
      </TabsContent>
    </Tabs>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ImageField({
  label,
  businessId,
  value,
  onChange,
  disabled,
}: {
  label: string;
  businessId: string;
  value: string | null;
  onChange: (v: string | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadMedia(businessId, file));
      toast.success("Image uploaded — remember to save");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
          <Media
            path={value}
            alt={label}
            className="h-full w-full object-cover"
            fallback={<span className="text-xs text-muted-foreground">None</span>}
          />
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void pick(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Uploading…" : "Upload"}
        </Button>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            Remove
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ServicesPanel({ businessId, readOnly }: { businessId: string; readOnly: boolean }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["services", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
  const [draft, setDraft] = useState({ name: "", description: "", price: "" });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("services").insert({
        business_id: businessId,
        name: draft.name,
        description: draft.description || null,
        price: draft.price || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft({ name: "", description: "", price: "" });
      void qc.invalidateQueries({ queryKey: ["services", businessId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add service"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["services", businessId] }),
  });

  return (
    <div className="space-y-4">
      {!readOnly ? (
        <div className="surface grid gap-3 p-5 sm:grid-cols-4">
          <Input
            placeholder="Service name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <Input
            placeholder="Description"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
          <Input
            placeholder="Price"
            value={draft.price}
            onChange={(e) => setDraft({ ...draft, price: e.target.value })}
          />
          <Button onClick={() => add.mutate()} disabled={!draft.name || add.isPending}>
            Add service
          </Button>
        </div>
      ) : null}

      <div className="space-y-2">
        {(data ?? []).map((s) => (
          <div
            key={s.id}
            className="surface flex items-center justify-between gap-4 p-4 text-sm"
          >
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="text-muted-foreground">{s.description}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-primary">{s.price}</span>
              {!readOnly ? (
                <Button variant="ghost" size="sm" onClick={() => remove.mutate(s.id)}>
                  Delete
                </Button>
              ) : null}
            </div>
          </div>
        ))}
        {(data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No services yet.</p>
        ) : null}
      </div>
    </div>
  );
}

function GalleryPanel({ businessId, readOnly }: { businessId: string; readOnly: boolean }) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const { data } = useQuery({
    queryKey: ["gallery", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async (file: File) => {
      const path = await uploadMedia(businessId, file);
      const { error } = await supabase
        .from("gallery")
        .insert({ business_id: businessId, image_url: path });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["gallery", businessId] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Upload failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("gallery").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["gallery", businessId] }),
  });

  return (
    <div className="space-y-4">
      {!readOnly ? (
        <div className="surface p-5">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) add.mutate(f);
            }}
          />
          <Button onClick={() => inputRef.current?.click()} disabled={add.isPending}>
            {add.isPending ? "Uploading…" : "Add image"}
          </Button>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(data ?? []).map((g) => (
          <div key={g.id} className="surface overflow-hidden">
            <Media path={g.image_url} alt="Gallery image" className="h-32 w-full object-cover" />
            {!readOnly ? (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => remove.mutate(g.id)}
              >
                Remove
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function OffersPanel({ businessId, readOnly }: { businessId: string; readOnly: boolean }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["offers", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
  const [draft, setDraft] = useState({ title: "", description: "", price: "", valid_until: "" });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("offers").insert({
        business_id: businessId,
        title: draft.title,
        description: draft.description || null,
        price: draft.price || null,
        valid_until: draft.valid_until || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDraft({ title: "", description: "", price: "", valid_until: "" });
      void qc.invalidateQueries({ queryKey: ["offers", businessId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add offer"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("offers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["offers", businessId] }),
  });

  return (
    <div className="space-y-4">
      {!readOnly ? (
        <div className="surface grid gap-3 p-5 sm:grid-cols-5">
          <Input
            placeholder="Offer title"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <Input
            placeholder="Description"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
          <Input
            placeholder="Price"
            value={draft.price}
            onChange={(e) => setDraft({ ...draft, price: e.target.value })}
          />
          <Input
            type="date"
            value={draft.valid_until}
            onChange={(e) => setDraft({ ...draft, valid_until: e.target.value })}
          />
          <Button onClick={() => add.mutate()} disabled={!draft.title || add.isPending}>
            Add offer
          </Button>
        </div>
      ) : null}
      <div className="space-y-2">
        {(data ?? []).map((o) => (
          <div key={o.id} className="surface flex items-center justify-between gap-4 p-4 text-sm">
            <div>
              <p className="font-medium">{o.title}</p>
              <p className="text-muted-foreground">
                {o.description} {o.valid_until ? `· until ${o.valid_until}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-primary">{o.price}</span>
              {!readOnly ? (
                <Button variant="ghost" size="sm" onClick={() => remove.mutate(o.id)}>
                  Delete
                </Button>
              ) : null}
            </div>
          </div>
        ))}
        {(data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No offers yet.</p>
        ) : null}
      </div>
    </div>
  );
}

function SharePanel({ businessId, slug }: { businessId: string; slug: string }) {
  const [qr, setQr] = useState<string | null>(null);
  const url = useMemo(
    () => (typeof window !== "undefined" ? `${window.location.origin}/p/${slug}` : `/p/${slug}`),
    [slug],
  );

  useEffect(() => {
    void QRCode.toDataURL(url, {
      width: 512,
      margin: 1,
      color: { dark: "#07130F", light: "#FFFFFF" },
    }).then(setQr);
  }, [url]);

  const { data: stats } = useQuery({
    queryKey: ["analytics", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analytics")
        .select("event_type, created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const totals = (stats ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.event_type] = (acc[row.event_type] ?? 0) + 1;
    return acc;
  }, {});
  const last30 = (stats ?? []).filter(
    (r) => new Date(r.created_at).getTime() > Date.now() - 30 * 864e5,
  ).length;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="surface space-y-4 p-5">
        <h3 className="text-lg font-semibold">Public link &amp; QR code</h3>
        <p className="break-all text-sm text-muted-foreground">{url}</p>
        {qr ? (
          <>
            <img src={qr} alt={`QR code for ${slug}`} className="h-48 w-48 rounded-lg bg-white p-2" />
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <a href={qr} download={`flowora-${slug}-qr.png`}>
                  Download QR
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText(url);
                  toast.success("Link copied");
                }}
              >
                Copy link
              </Button>
            </div>
          </>
        ) : null}
      </div>

      <div className="surface space-y-3 p-5">
        <h3 className="text-lg font-semibold">Analytics</h3>
        <Stat label="Events (last 30 days)" value={last30} />
        <Stat label="Page views" value={totals["page_view"] ?? 0} />
        <Stat label="Phone clicks" value={totals["phone_click"] ?? 0} />
        <Stat label="WhatsApp clicks" value={totals["whatsapp_click"] ?? 0} />
        <Stat label="Directions clicks" value={totals["maps_click"] ?? 0} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 pb-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-display text-lg font-semibold text-primary">{value}</span>
    </div>
  );
}
