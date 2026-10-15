import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { isSafeHttpsUrl } from "@/lib/vcard";
import { LANGS, REVIEW_REQUEST, type Lang } from "@/lib/portfolio-i18n";

export function ReviewsPanel({ businessId, readOnly }: { businessId: string; readOnly: boolean }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["reviews-settings", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_profiles")
        .select("business_name, google_review_url, external_review_url, show_review_cta, review_cta")
        .eq("id", businessId)
        .single();
      if (error) throw error;
      return data;
    },
  });
  const [f, setF] = useState({ google: "", other: "", show: true, cta: "" });
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    if (data)
      setF({ google: data.google_review_url ?? "", other: data.external_review_url ?? "", show: data.show_review_cta, cta: data.review_cta ?? "" });
  }, [data]);

  const gErr = f.google.trim() && !isSafeHttpsUrl(f.google) ? "Enter a full https:// link" : null;
  const oErr = f.other.trim() && !isSafeHttpsUrl(f.other) ? "Enter a full https:// link" : null;

  const save = useMutation({
    mutationFn: async () => {
      if (gErr || oErr) throw new Error("Please fix the invalid links");
      const { error } = await supabase
        .from("business_profiles")
        .update({
          google_review_url: f.google.trim() || null,
          external_review_url: f.other.trim() || null,
          show_review_cta: f.show,
          review_cta: f.cta.trim().slice(0, 160) || null,
        })
        .eq("id", businessId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review settings saved");
      void qc.invalidateQueries({ queryKey: ["reviews-settings", businessId] });
      void qc.invalidateQueries({ queryKey: ["design-preview", businessId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const link = f.google.trim() || f.other.trim();
  const message = link ? REVIEW_REQUEST[lang](data.business_name, link) : "";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <fieldset disabled={readOnly} className="surface space-y-5 p-5">
        <div>
          <h3 className="text-lg font-semibold">Reviews &amp; reputation</h3>
          <p className="text-sm text-muted-foreground">
            Send visitors to your official review page. Tapro never shows invented reviews or ratings.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="g-review">Google review link</Label>
          <Input id="g-review" placeholder="https://g.page/r/…/review" value={f.google} onChange={(e) => setF({ ...f, google: e.target.value })} aria-invalid={Boolean(gErr)} />
          {gErr ? <p className="text-xs text-destructive">{gErr}</p> : (
            <p className="text-xs text-muted-foreground">In your Google Business Profile, choose “Ask for reviews” and copy the link.</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="o-review">Other review platform (optional)</Label>
          <Input id="o-review" placeholder="https://…" value={f.other} onChange={(e) => setF({ ...f, other: e.target.value })} aria-invalid={Boolean(oErr)} />
          {oErr ? <p className="text-xs text-destructive">{oErr}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="cta">Custom invitation message (optional)</Label>
          <Textarea id="cta" rows={2} maxLength={160} placeholder="Leave empty to use the translated default" value={f.cta} onChange={(e) => setF({ ...f, cta: e.target.value })} />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <p className="font-medium">Show review button on my page</p>
            <p className="text-xs text-muted-foreground">Hidden automatically when no valid link is set.</p>
          </div>
          <Switch checked={f.show} onCheckedChange={(v) => setF({ ...f, show: v })} />
        </div>
        {!readOnly ? (
          <div className="flex gap-2">
            <Button onClick={() => save.mutate()} disabled={save.isPending || Boolean(gErr || oErr)}>
              {save.isPending ? "Saving…" : "Save review settings"}
            </Button>
            {(data.google_review_url || data.external_review_url) ? (
              <Button variant="ghost" onClick={() => setF({ ...f, google: "", other: "" })}>Remove links</Button>
            ) : null}
          </div>
        ) : null}
      </fieldset>

      <div className="surface space-y-4 p-5">
        <h3 className="text-lg font-semibold">Review request message</h3>
        <p className="text-sm text-muted-foreground">Copy and send it yourself to customers who agreed to be contacted.</p>
        <div className="flex gap-1">
          {LANGS.map((l) => (
            <Button key={l} size="sm" variant={lang === l ? "default" : "outline"} onClick={() => setLang(l)}>{l.toUpperCase()}</Button>
          ))}
        </div>
        {message ? (
          <>
            <p dir={lang === "ar" ? "rtl" : "ltr"} className="rounded-lg border border-border bg-muted p-4 text-sm">{message}</p>
            <Button variant="outline" onClick={() => { void navigator.clipboard.writeText(message); toast.success("Message copied"); }}>Copy message</Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Add a review link to generate the message.</p>
        )}
        <p className="border-t border-border pt-3 text-xs text-muted-foreground">
          Showing Google reviews directly on your page needs an authorized Google Business Profile connection, which isn't set up yet — so no reviews or star ratings are displayed.
        </p>
      </div>
    </div>
  );
}
