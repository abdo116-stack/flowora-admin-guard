import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { SiteFooter, SiteHeader } from "@/components/Site";
import { publicPortfolioUrl } from "@/lib/floword";
import {
  Camera,
  Contact,
  FolderOpen,
  MapPin,
  MessageCircle,
  Palette,
  QrCode,
  ScanLine,
  Share2,
  Star,
  Store,
  Tag,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tapro — Your Business, One Scan Away" },
      {
        name: "description",
        content:
          "Create a professional digital portfolio for your business, share it through one QR code, and make it easy for customers to discover and contact you.",
      },
      { property: "og:title", content: "Tapro — Your Business, One Scan Away" },
      {
        property: "og:description",
        content:
          "A professional digital business portfolio that replaces the paper business card — one link, one QR code.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const DEMO_URL = publicPortfolioUrl("tapro");

function useQrDataUrl(text: string) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    void QRCode.toDataURL(text, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 480,
      color: { dark: "#0B3D2E", light: "#FFFFFF" },
    }).then(setSrc);
  }, [text]);
  return src;
}

const FEATURES = [
  { icon: Store, t: "Professional digital portfolio", d: "A complete page for your business, always up to date." },
  { icon: Tag, t: "Services, prices & photos", d: "List what you offer with prices and a photo gallery." },
  { icon: MessageCircle, t: "WhatsApp contact", d: "Customers reach you in one tap." },
  { icon: Share2, t: "Social media links", d: "Instagram, Facebook, TikTok and your website in one place." },
  { icon: MapPin, t: "Business location", d: "Opening hours and directions via Google Maps." },
  { icon: Contact, t: "Save Contact", d: "Visitors can save your details straight to their phone." },
  { icon: Palette, t: "Custom design", d: "Themes, colors, fonts and layouts that match your brand." },
  { icon: QrCode, t: "QR Design Studio", d: "Custom colors, styles, logo and frames — print-ready downloads." },
  { icon: Star, t: "Review requests", d: "A ready-made polite message to ask customers for honest reviews." },
];

const USE_CASES = [
  { t: "Cafés & restaurants", d: "Menu, opening hours and directions on the table." },
  { t: "Clothing & electronics shops", d: "New arrivals, offers and WhatsApp orders." },
  { t: "Barbers & beauty salons", d: "Services, prices and a gallery of your work." },
  { t: "Freelancers & professionals", d: "A portfolio that replaces the paper card." },
  { t: "Real estate agents", d: "Listings, contact and location in one scan." },
  { t: "Service providers", d: "Quotes, services and fast contact." },
];

function Landing() {
  const demoQr = useQrDataUrl(DEMO_URL);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-16 lg:grid-cols-2 lg:pt-24">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
            Your Business, One Scan Away.
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
            Your business deserves more than a paper business card.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Create a professional digital portfolio for your business, share all your important
            information through one QR code, and make it easy for customers to discover and contact
            you.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <a href="#demo">Explore the Live Demo</a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/qr-studio">Explore QR Designs</Link>
            </Button>
          </div>
        </div>

        {/* Phone + QR composition */}
        <div className="relative mx-auto flex w-full max-w-md items-end justify-center gap-4">
          <div className="w-56 overflow-hidden rounded-[2rem] border border-border bg-card shadow-2xl sm:w-64">
            <div className="flex items-center justify-center gap-1.5 border-b border-border/60 py-2">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
              <span className="text-[10px] text-muted-foreground">tapro.netlify.app/p/tapro</span>
            </div>
            <iframe
              src="/p/tapro"
              title="Live Tapro portfolio demo"
              className="h-105 w-full bg-background"
              loading="lazy"
            />
          </div>
          <div className="absolute -right-2 bottom-10 hidden w-36 rotate-3 rounded-2xl border border-border bg-card p-3 shadow-xl sm:block">
            {demoQr ? (
              <img src={demoQr} alt="QR code for the Tapro demo portfolio" className="w-full rounded-lg" />
            ) : (
              <div className="aspect-square w-full animate-pulse rounded-lg bg-muted" />
            )}
            <p className="mt-2 text-center text-[10px] font-semibold tracking-wide text-muted-foreground">
              SCAN TO DISCOVER
            </p>
          </div>
        </div>
      </section>

      {/* Live demo */}
      <section id="demo" className="border-t border-border/70 bg-card/40">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 lg:grid-cols-2">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
              Experience TAPRO
            </p>
            <h2 className="mt-3 text-3xl font-bold">Try it the way your customers will</h2>
            <ol className="mt-6 space-y-4 text-sm">
              {[
                "A customer sees your professional QR display.",
                "They scan it with their phone camera — no app needed.",
                "The browser opens your Tapro portfolio.",
                "They explore services, prices, photos, contact details, WhatsApp, social media and location.",
                "They contact you or save your contact details to their phone.",
              ].map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
            <Button asChild className="mt-8">
              <a href={DEMO_URL} target="_blank" rel="noreferrer">
                Open Full Portfolio Demo
              </a>
            </Button>
          </div>
          <div className="surface mx-auto w-full max-w-xs p-6 text-center">
            {demoQr ? (
              <img src={demoQr} alt="Scannable QR code opening the Tapro demo portfolio" className="w-full rounded-xl" />
            ) : (
              <div className="aspect-square w-full animate-pulse rounded-xl bg-muted" />
            )}
            <p className="mt-4 text-sm font-semibold">Scan with your phone</p>
            <p className="mt-1 break-all text-xs text-muted-foreground">{DEMO_URL}</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-3xl font-bold">How TAPRO works</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: FolderOpen,
              n: "01",
              t: "Create your digital identity",
              d: "Organize your business information, services, prices, photos and contact details.",
            },
            {
              icon: QrCode,
              n: "02",
              t: "Customize your QR code",
              d: "Choose a professional style, colors, shapes and a frame that matches your brand.",
            },
            {
              icon: Share2,
              n: "03",
              t: "Share your business everywhere",
              d: "Place the QR code on a counter, menu, packaging, printed material or social media.",
            },
          ].map((s) => (
            <div key={s.n} className="surface p-6">
              <div className="flex items-center justify-between">
                <s.icon className="h-6 w-6 text-primary" />
                <span className="font-display text-2xl font-bold text-muted-foreground/40">
                  {s.n}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border/70 bg-card/40">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-center text-3xl font-bold">Everything your customers need</h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.t} className="surface p-5">
                <f.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 font-semibold">{f.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Camera className="mr-1 inline h-3.5 w-3.5" />
            Visitors never need to install an app — everything opens in the browser.
          </p>
        </div>
      </section>

      {/* Use cases */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-3xl font-bold">Made for businesses like yours</h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {USE_CASES.map((u) => (
            <div key={u.t} className="rounded-xl border border-border p-5 transition hover:border-primary/50">
              <h3 className="font-semibold">{u.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{u.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border/70 bg-card/40">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <ScanLine className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-4 text-3xl font-bold">Make your business easier to discover.</h2>
          <p className="mt-3 text-muted-foreground">
            One professional page. One QR code. A better way to present your business.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link to="/auth">Get Started with TAPRO</Link>
          </Button>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
