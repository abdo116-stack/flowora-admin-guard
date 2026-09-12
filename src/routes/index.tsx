import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tapro — Managed digital portfolios for local businesses" },
      {
        name: "description",
        content:
          "Tapro designs, hosts and manages a complete digital portfolio for your business: services, offers, opening hours, contact links and a QR code.",
      },
      { property: "og:title", content: "Tapro — Managed digital portfolios" },
      {
        property: "og:description",
        content:
          "A managed-service platform: Tapro builds and maintains your business portfolio page and QR code.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <Brand withTagline />
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="ghost">
            <Link to="/about">About</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:pt-24">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
          Tap once. Show everything.
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
          Your business, presented properly — built and maintained by Tapro.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          Every approved business gets a permanent public page with services, prices, offers,
          opening hours, photos, contact links and a printable QR code. No setup, no dashboards to
          learn.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Access your portal</Link>
          </Button>
        </div>

        <div className="mt-20 grid gap-4 sm:grid-cols-3">
          {[
            {
              t: "Live in minutes",
              d: "Build your page, then publish it yourself whenever you are ready.",
            },
            {
              t: "A permanent link",
              d: "Your address never changes, even when you update your information.",
            },
            {
              t: "QR code & insights",
              d: "Print your QR code and see how many people view and contact you.",
            },
          ].map((f) => (
            <div key={f.t} className="surface p-6">
              <h2 className="text-lg font-semibold">{f.t}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/70 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Tapro ·{" "}
        <Link to="/about" className="underline hover:text-foreground">
          About
        </Link>{" "}
        · softatlas38@gmail.com · 0681569749
      </footer>
    </div>
  );
}
