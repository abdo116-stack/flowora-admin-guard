import { createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/Site";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Tapro" },
      {
        name: "description",
        content: "Answers about Tapro digital business portfolios, QR codes and subscriptions.",
      },
      { property: "og:title", content: "FAQ — Tapro" },
      {
        property: "og:description",
        content: "Answers about Tapro digital business portfolios, QR codes and subscriptions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FaqPage,
});

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is TAPRO?",
    a: "Tapro is a platform that gives your business a professional digital portfolio — services, prices, photos, contact details, opening hours and location — reachable through one permanent link and one QR code.",
  },
  {
    q: "How does a digital business portfolio work?",
    a: "You create an account, fill in your business information and publish. Your portfolio gets a permanent public address (tapro.netlify.app/p/your-business) that you can share anywhere or print as a QR code.",
  },
  {
    q: "Do my customers need to install an app?",
    a: "No. The portfolio opens in any phone browser. Scanning the QR code with a normal camera is enough.",
  },
  {
    q: "Can I customize my QR code?",
    a: "Yes. The QR Design Studio lets you change the code style, colors, corner markers, add your logo, choose a frame and caption, and download the result as PNG or SVG for printing.",
  },
  {
    q: "Can I download my QR code for printing?",
    a: "Yes. You can download a high-resolution PNG, an SVG for print shops, or a finished presentation card. Always test the printed code with a phone before a large print run.",
  },
  {
    q: "What happens when I choose the annual plan?",
    a: "You pay 490 MAD once for 12 months instead of 49 MAD each month — a saving of 98 MAD. The features are exactly the same on both options.",
  },
  {
    q: "How can I renew my subscription?",
    a: "From your dashboard, open Subscription & Billing and send a new request before or after expiry. We verify payment and extend your subscription. There is no automatic renewal — you stay in control.",
  },
  {
    q: "Can I edit my portfolio after publishing?",
    a: "Yes, any time. Your public address never changes, and updates appear immediately on your live page.",
  },
  {
    q: "Will my portfolio be deleted when my subscription expires?",
    a: "No. Your data is never deleted when a subscription expires. Your dashboard stays accessible so you can renew; contact us if you want your portfolio removed entirely.",
  },
];

function FaqPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">FAQ</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Frequently asked questions</h1>
        <div className="mt-10 space-y-4">
          {FAQS.map((f) => (
            <details key={f.q} className="surface group p-5">
              <summary className="cursor-pointer list-none font-semibold group-open:text-primary">
                {f.q}
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
