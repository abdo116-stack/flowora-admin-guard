import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/Site";
import { PricingCard } from "@/components/Pricing";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Tapro" },
      {
        name: "description",
        content:
          "TAPRO Business: one plan with every feature — 49 MAD per month or 490 MAD per year.",
      },
      { property: "og:title", content: "Pricing — Tapro" },
      {
        property: "og:description",
        content: "One plan, everything included. 49 MAD / month or 490 MAD / year.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Pricing</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">One plan. Everything included.</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Choose monthly or yearly billing — the features are identical either way. Yearly saves
            you 98 MAD.
          </p>
        </div>
        <div className="mt-10">
          <PricingCard />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
