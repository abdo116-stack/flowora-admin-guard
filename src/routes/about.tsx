import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/AppShell";
import taproLogo from "@/assets/tapro-logo.png.asset.json";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Tapro — Abdo Makol, founder" },
      {
        name: "description",
        content:
          "Meet the person behind Tapro: Abdo Makol, founder of Soft Atlas, building digital portfolios and QR pages for local businesses.",
      },
      { property: "og:title", content: "About Tapro — Abdo Makol, founder" },
      {
        property: "og:description",
        content:
          "Meet the person behind Tapro: Abdo Makol, founder of Soft Atlas, building digital portfolios and QR pages for local businesses.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <Brand withTagline />
        <Button asChild size="sm" variant="outline">
          <Link to="/">Home</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-8">
        <section className="surface overflow-hidden">
          <div className="grid gap-8 p-6 sm:p-10 md:grid-cols-[220px_1fr] md:items-center">
            <img
              src={taproLogo.url}
              alt="Tapro brand mark"
              className="mx-auto w-40 rounded-2xl shadow-lg ring-1 ring-border md:w-full"
            />
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
                About the founder
              </p>
              <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Abdo Makol</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Founder of Soft Atlas &amp; creator of Tapro
              </p>
              <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                I build simple digital tools for local businesses. Tapro grew out of one idea: a
                shop, salon or workshop should be able to share everything it offers with a single
                tap or scan — services, prices, photos, offers, opening hours and contact links, all
                on one page that never changes address.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <ContactCard label="Email" value="softatlas38@gmail.com" href="mailto:softatlas38@gmail.com" />
                <ContactCard label="Phone" value="0681569749" href="tel:0681569749" />
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild>
                  <Link to="/auth">Create your portfolio</Link>
                </Button>
                <Button asChild variant="outline">
                  <a href="mailto:softatlas38@gmail.com">Get in touch</a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { t: "Design", d: "Clean, modern pages that look right on any phone." },
            { t: "Care", d: "Personal support — you can always reach me directly." },
            { t: "Results", d: "Real numbers on views, calls and messages." },
          ].map((f) => (
            <div key={f.t} className="surface p-6">
              <h2 className="text-lg font-semibold">{f.t}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border/70 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Tapro — Tap once. Show everything.
      </footer>
    </div>
  );
}

function ContactCard({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <a
      href={href}
      className="rounded-lg border border-border bg-card/40 p-4 transition-colors hover:border-primary/60"
    >
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 break-all text-sm font-medium text-foreground">{value}</p>
    </a>
  );
}
