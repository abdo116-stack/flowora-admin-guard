import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/Site";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Tapro" },
      { name: "description", content: "The terms for using Tapro portfolios and subscriptions." },
      { property: "og:title", content: "Terms of Service — Tapro" },
      { property: "og:description", content: "The terms for using Tapro portfolios and subscriptions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">The service</h2>
            <p>
              Tapro provides a digital business portfolio with a permanent public link and a
              customizable QR code. Each account manages one business portfolio.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">Subscriptions</h2>
            <p>
              The TAPRO Business plan costs 49 MAD per month or 490 MAD per year; both include the
              same features. Subscriptions are activated after we verify your payment. There is no
              automatic renewal — you request a renewal from your dashboard. When a subscription
              expires, your data is kept and your dashboard remains accessible so you can renew.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">Your content</h2>
            <p>
              You are responsible for the accuracy and legality of the information you publish.
              We may suspend or remove content that is unlawful, misleading or harmful.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">Availability</h2>
            <p>
              We work to keep the service available, but we do not guarantee uninterrupted uptime.
              Your portfolio link is permanent as long as your account remains in good standing.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">Contact</h2>
            <p>Questions about these terms: softatlas38@gmail.com · 0681569749.</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
