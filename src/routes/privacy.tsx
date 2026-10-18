import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/Site";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Tapro" },
      { name: "description", content: "How Tapro collects, uses and protects your data." },
      { property: "og:title", content: "Privacy Policy — Tapro" },
      { property: "og:description", content: "How Tapro collects, uses and protects your data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">What we store</h2>
            <p>
              When you create an account we store your email address and, if you provide it, your
              name. For your portfolio we store the business information you enter: name,
              description, contact details, opening hours, photos, services, prices and offers.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">What visitors see</h2>
            <p>
              Only portfolios you publish are visible to the public. Unpublished portfolios are
              visible only to you and the Tapro administrator. We never publish your account email
              unless you add it as a business contact.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">Passwords and security</h2>
            <p>
              Passwords are handled by our authentication provider and are never stored by Tapro in
              readable form. Access to your data is protected by server-side rules; only you and
              the administrator can edit your portfolio.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">Your choices</h2>
            <p>
              You can edit or unpublish your portfolio at any time from your dashboard. To delete
              your account and data, contact us at softatlas38@gmail.com or 0681569749.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
