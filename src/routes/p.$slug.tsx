import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { getPublicBusiness } from "@/lib/public.functions";
import { supabase } from "@/integrations/supabase/client";
import { PortfolioView } from "@/components/PortfolioView";
import { parseDesign } from "@/lib/design";
import { publicPortfolioUrl } from "@/lib/floword";

export const Route = createFileRoute("/p/$slug")({
  loader: async ({ params }) => {
    let data: Awaited<ReturnType<typeof getPublicBusiness>> = null;
    try {
      data = await getPublicBusiness({ data: { slug: params.slug } });
    } catch {
      // Server-side fetch unavailable (e.g. missing server config on a static host):
      // fall back to a direct public read from the browser.
      if (typeof window === "undefined") throw notFound();
      data = await loadPublicBusinessFromBrowser(params.slug);
    }
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    const name = loaderData?.business?.business_name ?? "Business";
    const desc =
      loaderData?.business?.description?.slice(0, 155) ??
      `${name} on Tapro: services, offers, opening hours and contact details.`;
    return {
      meta: [
        { title: `${name} — Tapro` },
        { name: "description", content: desc },
        { property: "og:title", content: `${name} — Tapro` },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { property: "og:url", content: publicPortfolioUrl(loaderData?.business?.slug ?? "") },
      ],
    };
  },
  errorComponent: () => (
    <div className="flex min-h-screen items-center justify-center px-4 text-center">
      <div>
        <h1 className="text-2xl font-bold">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please try again in a moment.</p>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center px-4 text-center">
      <div>
        <h1 className="text-2xl font-bold">Business not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This portfolio does not exist or is not published yet.
        </p>
        <Link to="/" className="mt-4 inline-block text-primary hover:underline">
          Go to Tapro
        </Link>
      </div>
    </div>
  ),
  component: PublicProfile,
});

async function loadPublicBusinessFromBrowser(slug: string) {
  const { data: business } = await supabase
    .from("business_profiles")
    .select(
      "id, business_name, slug, logo_url, cover_url, description, phone, whatsapp, email, website, instagram, facebook, tiktok, google_maps_url, address, opening_hours, published, google_review_url, external_review_url, show_review_cta, review_cta, design",
    )
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (!business) return null;
  const [{ data: services }, { data: gallery }, { data: offers }] = await Promise.all([
    supabase.from("services").select("id, name, description, price, image_url").eq("business_id", business.id),
    supabase.from("gallery").select("id, image_url, caption").eq("business_id", business.id),
    supabase.from("offers").select("id, title, description, price, valid_until").eq("business_id", business.id),
  ]);
  return { business, services: services ?? [], gallery: gallery ?? [], offers: offers ?? [] };
}

function PublicProfile() {
  const data = Route.useLoaderData();
  const { business } = data;

  useEffect(() => {
    void supabase.from("analytics").insert({ business_id: business.id, event_type: "page_view" });
  }, [business.id]);

  return (
    <PortfolioView
      data={data}
      design={parseDesign(business.design)}
      portfolioUrl={publicPortfolioUrl(business.slug)}
      onTrack={(event) =>
        void supabase.from("analytics").insert({ business_id: business.id, event_type: event })
      }
    />
  );
}
