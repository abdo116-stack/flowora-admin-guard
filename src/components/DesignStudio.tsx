import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Eye, EyeOff, AlertTriangle, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PortfolioView, type PortfolioData } from "@/components/PortfolioView";
import {
  contrastWarnings, DEFAULT_DESIGN, FONT_LABEL, FONTS, PALETTES, parseDesign, PRESET_DESIGNS, THEMES,
  type Colors, type Design, type PresetId,
} from "@/lib/design";
import { publicPortfolioUrl } from "@/lib/floword";

const SECTION_LABEL: Record<string, string> = {
  offers: "Offers", services: "Services & products", gallery: "Gallery", reviews: "Reviews",
  hours: "Opening hours", location: "Map & location", social: "Social links",
};
const PRESET_LABEL: Record<PresetId, string> = {
  none: "Custom", electronics: "Electronics store", restaurant: "Restaurant / café",
  salon: "Barber / beauty salon", professional: "Professional services",
};
const THEME_DESC: Record<string, string> = {
  modern: "Cards, clear hierarchy", minimal: "Whitespace, quiet", elegant: "Centered, refined",
  bold: "Big cover, strong type", classic: "Traditional, trustworthy",
};

export function DesignStudio({ businessId, readOnly }: { businessId: string; readOnly: boolean }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["design-preview", businessId],
    queryFn: async () => {
      const [b, s, g, o] = await Promise.all([
        supabase.from("business_profiles").select("*").eq("id", businessId).single(),
        supabase.from("services").select("id, name, description, price, image_url").eq("business_id", businessId).order("created_at"),
        supabase.from("gallery").select("id, image_url, caption").eq("business_id", businessId).order("created_at"),
        supabase.from("offers").select("id, title, description, price, valid_until").eq("business_id", businessId).order("created_at"),
      ]);
      if (b.error) throw b.error;
      return { business: b.data, services: s.data ?? [], gallery: g.data ?? [], offers: o.data ?? [] };
    },
  });

  const saved = useMemo(() => (data ? parseDesign(data.business.design) : null), [data]);
  const [d, setD] = useState<Design>(DEFAULT_DESIGN);
  useEffect(() => { if (saved) setD(saved); }, [saved]);
  const dirty = saved ? JSON.stringify(saved) !== JSON.stringify(d) : false;

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const save = useMutation({
    mutationFn: async () => {
      const clean = parseDesign(d);
      const { error } = await supabase.from("business_profiles").update({ design: clean }).eq("id", businessId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Design saved — your public page is updated");
      void qc.invalidateQueries({ queryKey: ["design-preview", businessId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save design"),
  });

  if (!data) return <p className="text-sm text-muted-foreground">Loading design…</p>;

  const setColor = (k: keyof Colors, v: string) => setD({ ...d, preset: d.preset, colors: { ...d.colors, [k]: v } });
  const warnings = contrastWarnings(d.colors);
  const move = (i: number, dir: -1 | 1) => {
    const next = [...d.sections];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j]!, next[i]!];
    setD({ ...d, sections: next });
  };
  const applyPreset = (p: PresetId) =>
    setD(p === "none" ? { ...d, preset: "none" } : { ...d, ...PRESET_DESIGNS[p], preset: p });

  const choice = (active: boolean) =>
    `rounded-lg border px-3 py-2 text-left text-sm transition-colors ${active ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      <fieldset disabled={readOnly} className="space-y-5">
        <Panel title="Industry preset" hint="A starting point — your content is never changed.">
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(PRESET_LABEL) as PresetId[]).map((p) => (
              <button key={p} type="button" className={choice(d.preset === p)} onClick={() => applyPreset(p)}>{PRESET_LABEL[p]}</button>
            ))}
          </div>
        </Panel>

        <Panel title="Theme">
          <div className="grid gap-2 sm:grid-cols-5">
            {THEMES.map((t) => (
              <button key={t} type="button" className={choice(d.theme === t)} onClick={() => setD({ ...d, theme: t })}>
                <span className="block font-medium capitalize">{t}</span>
                <span className="block text-xs text-muted-foreground">{THEME_DESC[t]}</span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Brand colors">
          <div className="flex flex-wrap gap-2">
            {PALETTES.map((p) => (
              <button key={p.name} type="button" onClick={() => setD({ ...d, colors: p.colors })} className={choice(JSON.stringify(p.colors) === JSON.stringify(d.colors))}>
                <span className="flex gap-1">{Object.values(p.colors).slice(0, 5).map((c, i) => <span key={i} className="h-4 w-4 rounded-full border border-border" style={{ background: c }} />)}</span>
                <span className="mt-1 block text-xs">{p.name}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {(Object.keys(d.colors) as (keyof Colors)[]).map((k) => (
              <ColorInput key={k} label={k === "surface" ? "Card" : k[0]!.toUpperCase() + k.slice(1)} value={d.colors[k]} onChange={(v) => setColor(k, v)} />
            ))}
          </div>
          {warnings.length > 0 ? (
            <div className="mt-4 space-y-2">
              {warnings.map((w) => (
                <div key={w.message} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" />{w.message}</span>
                  <Button size="sm" variant="outline" type="button" onClick={() => setD({ ...d, colors: { ...d.colors, ...w.fix } })}>Use safer color</Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground"><Check className="h-3 w-3 text-success" />Colors pass readability checks</p>
          )}
        </Panel>

        <Panel title="Style">
          <div className="grid gap-4 sm:grid-cols-2">
            <Seg label="Font" value={d.font} options={FONTS.map((f) => [f, FONT_LABEL[f]])} onChange={(v) => setD({ ...d, font: v })} />
            <Seg label="Buttons" value={d.buttonShape} options={[["rounded", "Rounded"], ["soft", "Slightly rounded"], ["square", "Square"]]} onChange={(v) => setD({ ...d, buttonShape: v })} />
            <Seg label="Cards" value={d.cardStyle} options={[["flat", "Flat"], ["bordered", "Bordered"], ["shadow", "Shadow"]]} onChange={(v) => setD({ ...d, cardStyle: v })} />
            <Seg label="Spacing" value={d.spacing} options={[["compact", "Compact"], ["normal", "Normal"], ["airy", "Airy"]]} onChange={(v) => setD({ ...d, spacing: v })} />
            <Seg label="Cover focus" value={d.coverPosition} options={[["top", "Top"], ["center", "Center"], ["bottom", "Bottom"]]} onChange={(v) => setD({ ...d, coverPosition: v })} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Logo and cover images are uploaded in the Details tab.</p>
        </Panel>

        <Panel title="Sections" hint="Reorder or hide. Contact buttons always stay at the top.">
          <ul className="space-y-2">
            {d.sections.map((s, i) => (
              <li key={s.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <span className={s.visible ? "" : "text-muted-foreground line-through"}>{SECTION_LABEL[s.id]}</span>
                <span className="flex gap-1">
                  <Button type="button" size="icon" variant="ghost" aria-label={`Move ${SECTION_LABEL[s.id]} up`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
                  <Button type="button" size="icon" variant="ghost" aria-label={`Move ${SECTION_LABEL[s.id]} down`} disabled={i === d.sections.length - 1} onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
                  <Button type="button" size="icon" variant="ghost" aria-label={s.visible ? `Hide ${SECTION_LABEL[s.id]}` : `Show ${SECTION_LABEL[s.id]}`}
                    onClick={() => setD({ ...d, sections: d.sections.map((x) => (x.id === s.id ? { ...x, visible: !x.visible } : x)) })}>
                    {s.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        {!readOnly ? (
          <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card/95 p-3 backdrop-blur">
            <Button type="button" onClick={() => save.mutate()} disabled={!dirty || save.isPending}>{save.isPending ? "Saving…" : "Save design"}</Button>
            <Button type="button" variant="ghost" disabled={!dirty} onClick={() => saved && setD(saved)}>Discard</Button>
            <Button type="button" variant="ghost" onClick={() => setD({ ...DEFAULT_DESIGN })}>Reset to default</Button>
            <span className="text-xs text-muted-foreground">{dirty ? "Unsaved changes" : "All changes saved"}</span>
          </div>
        ) : null}
      </fieldset>

      <div className="lg:sticky lg:top-4 lg:self-start">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Live preview</p>
        <div className="mx-auto max-h-[78vh] max-w-[400px] overflow-y-auto rounded-[2rem] border-8 border-secondary shadow-2xl">
          <PortfolioView preview data={data as unknown as PortfolioData} design={d} portfolioUrl={publicPortfolioUrl(data.business.slug)} />
        </div>
      </div>
    </div>
  );
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="surface p-5">
      <h3 className="font-semibold">{title}</h3>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" aria-label={`${label} color`} value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} className="h-9 w-10 cursor-pointer rounded border border-border bg-transparent" />
        <Input value={text} maxLength={7} onChange={(e) => { setText(e.target.value); if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange(e.target.value.toUpperCase()); }} className="font-mono text-xs" />
      </div>
    </div>
  );
}

function Seg<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: (readonly [T, string])[]; onChange: (v: T) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex flex-wrap gap-1">
        {options.map(([v, l]) => (
          <button key={v} type="button" onClick={() => onChange(v)} aria-pressed={value === v}
            className={`rounded-md border px-2.5 py-1.5 text-xs ${value === v ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>{l}</button>
        ))}
      </div>
    </div>
  );
}
