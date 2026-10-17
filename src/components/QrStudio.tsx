import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CAPTION_SUGGESTIONS,
  DEFAULT_QR_DESIGN,
  QR_PRESETS,
  download,
  drawCard,
  drawQr,
  parseQrDesign,
  qrSvg,
  qrWarnings,
  type QrDesign,
} from "@/lib/qr";
import { publicPortfolioUrl, resolveMedia } from "@/lib/floword";
import { Copy, Download, TriangleAlert } from "lucide-react";

type Business = {
  id: string;
  business_name: string;
  slug: string;
  logo_url: string | null;
  qr_design: unknown;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image could not be loaded"));
    img.src = src;
  });
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-9 w-10 cursor-pointer rounded-md border border-border bg-transparent p-1"
          aria-label={label}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 font-mono text-xs"
          maxLength={7}
        />
      </div>
    </div>
  );
}

export function QrStudio() {
  const { data: auth } = useAuth();
  const qc = useQueryClient();
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [design, setDesign] = useState<QrDesign>(DEFAULT_QR_DESIGN);
  const [customUrl, setCustomUrl] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  const { data: business } = useQuery({
    queryKey: ["qr-studio-business", auth?.userId],
    enabled: Boolean(auth?.userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_profiles")
        .select("id, business_name, slug, logo_url, qr_design")
        .eq("user_id", auth!.userId)
        .maybeSingle();
      if (error) throw error;
      return (data as Business | null) ?? null;
    },
  });

  // Load the saved design and business logo once the business arrives.
  useEffect(() => {
    if (!business || loadedFor === business.id) return;
    setLoadedFor(business.id);
    const saved = parseQrDesign(business.qr_design);
    setDesign(saved);
    if (business.logo_url) {
      void resolveMedia(business.logo_url).then((url) => {
        if (url) void loadImage(url).then(setLogoImg).catch(() => undefined);
      });
    }
  }, [business, loadedFor]);

  const url = useMemo(() => {
    if (useCustom || !business) return customUrl.trim();
    return publicPortfolioUrl(business.slug);
  }, [useCustom, business, customUrl]);

  const urlValid = /^https?:\/\/.+\..+/.test(url);
  const warnings = useMemo(() => qrWarnings(design), [design]);

  // Redraw the preview on any change.
  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas || !urlValid) return;
    canvas.width = 1200;
    canvas.height = 1400;
    drawCard(canvas, url, design, {
      businessName: business?.business_name,
      logo: logoImg,
    });
  }, [url, urlValid, design, logoImg, business?.business_name]);

  function patch(p: Partial<QrDesign>) {
    setDesign((d) => ({ ...d, ...p }));
  }

  function onLogoUpload(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setLogoDataUrl(dataUrl);
      void loadImage(dataUrl).then(setLogoImg).catch(() => toast.error("Could not read that image"));
    };
    reader.readAsDataURL(file);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!business) throw new Error("Sign in and create a portfolio first");
      const { error } = await supabase
        .from("business_profiles")
        .update({ qr_design: design })
        .eq("id", business.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("QR design saved to your portfolio");
      void qc.invalidateQueries({ queryKey: ["qr-studio-business", auth?.userId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save design"),
  });

  function exportPng() {
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 2048;
    drawQr(canvas, url, design, logoImg);
    canvas.toBlob((b) => b && download("tapro-qr.png", b), "image/png");
  }

  function exportCard() {
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 1867;
    drawCard(canvas, url, design, { businessName: business?.business_name, logo: logoImg });
    canvas.toBlob((b) => b && download("tapro-qr-card.png", b), "image/png");
  }

  function exportSvg() {
    const svg = qrSvg(url, design, logoDataUrl);
    download("tapro-qr.svg", new Blob([svg], { type: "image/svg+xml" }));
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy the link");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      {/* Settings */}
      <div className="space-y-8">
        <section className="surface space-y-4 p-5">
          <h2 className="text-lg font-semibold">Destination</h2>
          {business ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                <span className="truncate">{publicPortfolioUrl(business.slug)}</span>
                <Button size="sm" variant="ghost" onClick={() => void copyUrl()}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={useCustom}
                  onChange={(e) => setUseCustom(e.target.checked)}
                />
                Use a custom link instead
              </label>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {auth
                ? "Create your portfolio from the dashboard to link it here, or use a custom link."
                : "Sign in to generate a QR code for your own portfolio, or try the studio with a custom link."}
            </p>
          )}
          {useCustom || !business ? (
            <div className="space-y-1.5">
              <Label htmlFor="qr-url">Custom URL</Label>
              <Input
                id="qr-url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://tapro.netlify.app/p/your-business"
                dir="ltr"
              />
              {customUrl && !urlValid ? (
                <p className="text-xs text-destructive">Enter a full link starting with https://</p>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="surface space-y-4 p-5">
          <h2 className="text-lg font-semibold">Style presets</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {QR_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => setDesign({ ...p.design })}
                className="rounded-lg border border-border p-3 text-left text-sm transition hover:border-primary"
              >
                <span className="mb-2 flex gap-1">
                  <span className="h-4 w-4 rounded-full" style={{ background: p.design.fg }} />
                  <span className="h-4 w-4 rounded-full" style={{ background: p.design.corner }} />
                  <span
                    className="h-4 w-4 rounded-full border border-border"
                    style={{ background: p.design.bg }}
                  />
                </span>
                {p.name}
              </button>
            ))}
          </div>
        </section>

        <section className="surface grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="text-lg font-semibold sm:col-span-2">Code style</h2>
          <div className="space-y-1.5">
            <Label className="text-xs">Module shape</Label>
            <Select
              value={design.moduleStyle}
              onValueChange={(v) => patch({ moduleStyle: v as QrDesign["moduleStyle"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="square">Classic square</SelectItem>
                <SelectItem value="rounded">Rounded</SelectItem>
                <SelectItem value="dots">Dots</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Corner markers</Label>
            <Select
              value={design.finderStyle}
              onValueChange={(v) => patch({ finderStyle: v as QrDesign["finderStyle"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="square">Classic square</SelectItem>
                <SelectItem value="rounded">Rounded</SelectItem>
                <SelectItem value="circle">Circular</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ColorField label="Code color" value={design.fg} onChange={(v) => patch({ fg: v })} />
          <ColorField label="Background" value={design.bg} onChange={(v) => patch({ bg: v })} />
          <ColorField label="Corner color" value={design.corner} onChange={(v) => patch({ corner: v })} />
          <div className="space-y-1.5">
            <Label className="text-xs">Whitespace around the code</Label>
            <Slider
              value={[design.quiet]}
              min={4}
              max={8}
              step={1}
              onValueChange={([v]) => patch({ quiet: v ?? 4 })}
            />
          </div>
        </section>

        <section className="surface grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="text-lg font-semibold sm:col-span-2">Logo</h2>
          <div className="space-y-1.5">
            <Label className="text-xs">Business logo</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => onLogoUpload(e.target.files?.[0])}
            />
            <p className="text-xs text-muted-foreground">
              {business?.logo_url
                ? "Your portfolio logo is used by default; upload to override it for this design."
                : "Shown in the center of the code."}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Logo size</Label>
            <Slider
              value={[Math.round(design.logoScale * 100)]}
              min={0}
              max={28}
              step={1}
              onValueChange={([v]) => patch({ logoScale: (v ?? 18) / 100 })}
            />
            <label className="flex items-center gap-2 pt-1 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={design.logoPlate}
                onChange={(e) => patch({ logoPlate: e.target.checked })}
              />
              Light plate behind the logo
            </label>
          </div>
        </section>

        <section className="surface grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="text-lg font-semibold sm:col-span-2">Frame & caption</h2>
          <div className="space-y-1.5">
            <Label className="text-xs">Frame</Label>
            <Select
              value={design.frame}
              onValueChange={(v) => patch({ frame: v as QrDesign["frame"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Minimal (no frame)</SelectItem>
                <SelectItem value="card">Rounded card</SelectItem>
                <SelectItem value="outline">Premium outline</SelectItem>
                <SelectItem value="caption-bottom">Bottom caption</SelectItem>
                <SelectItem value="caption-top">Top caption</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Caption</Label>
            <Select
              value={CAPTION_SUGGESTIONS.includes(design.caption) ? design.caption : "custom"}
              onValueChange={(v) => patch({ caption: v === "custom" ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAPTION_SUGGESTIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom text…</SelectItem>
              </SelectContent>
            </Select>
            {!CAPTION_SUGGESTIONS.includes(design.caption) ? (
              <Input
                value={design.caption}
                maxLength={60}
                onChange={(e) => patch({ caption: e.target.value })}
                placeholder="Your caption"
              />
            ) : null}
          </div>
          <ColorField
            label="Caption color"
            value={design.captionColor}
            onChange={(v) => patch({ captionColor: v })}
          />
          <ColorField
            label="Frame color"
            value={design.frameColor}
            onChange={(v) => patch({ frameColor: v })}
          />
        </section>
      </div>

      {/* Preview + export */}
      <div className="lg:sticky lg:top-20 lg:self-start">
        <div className="surface space-y-4 p-5">
          <h2 className="text-lg font-semibold">Live preview</h2>
          {urlValid ? (
            <canvas
              ref={previewRef}
              className="w-full rounded-xl border border-border"
              aria-label="QR code preview"
            />
          ) : (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
              Enter a valid link to preview the QR code
            </div>
          )}
          {warnings.map((w) => (
            <p key={w} className="flex items-start gap-2 text-xs text-warning">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {w}
            </p>
          ))}
          <p className="text-xs text-muted-foreground">
            Always test the downloaded QR code with a phone camera before printing it.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={exportPng} disabled={!urlValid}>
              <Download className="mr-1.5 h-4 w-4" /> PNG
            </Button>
            <Button variant="outline" onClick={exportSvg} disabled={!urlValid}>
              <Download className="mr-1.5 h-4 w-4" /> SVG
            </Button>
            <Button variant="outline" onClick={exportCard} disabled={!urlValid}>
              <Download className="mr-1.5 h-4 w-4" /> Card
            </Button>
            <Button variant="outline" onClick={() => void copyUrl()} disabled={!urlValid}>
              <Copy className="mr-1.5 h-4 w-4" /> Copy link
            </Button>
          </div>
          {business ? (
            <Button
              variant="secondary"
              className="w-full"
              disabled={save.isPending}
              onClick={() => save.mutate()}
            >
              {save.isPending ? "Saving…" : "Save design to my portfolio"}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
