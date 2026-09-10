import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { getPublicBusiness } from "@/lib/public.functions";
import { supabase } from "@/integrations/supabase/client";
import { Media } from "@/components/Media";
import { Button } from "@/components/ui/button";
import { DAYS } from "@/lib/floword";

export const Route = createFileRoute("/p/$slug")({
  loader: async ({ params }) => {
    const data = await getPublicBusiness({ data: { slug: params.slug } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    const name = loaderData?.business?.business_name ?? "Business";
    const desc =
      loaderData?.business?.description?.slice(0, 155) ??
      `${name} on FLOWORA: services, offers, opening hours and contact details.`;
    return {
      meta: [
        { title: `${name} — FLOWORA` },
        { name: "description", content: desc },
        { property: "og:title", content: `${name} — FLOWORA` },
        { property: "og:description", content: desc },
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
          Go to FLOWORA
        </Link>
      </div>
    </div>
  ),
  component: PublicProfile,
});

function PublicProfile() {
  const { business, services, gallery, offers } = Route.useLoaderData();

  useEffect(() => {
    void supabase.from("analytics").insert({ business_id: business.id, event_type: "page_view" });
  }, [business.id]);

  function track(event: string) {
    void supabase.from("analytics").insert({ business_id: business.id, event_type: event });
  }

  const hours = (business.opening_hours ?? {}) as Record<string, string>;

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="relative h-48 w-full overflow-hidden bg-secondary sm:h-64">
        <Media path={business.cover_url} alt={business.business_name} className="h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="mx-auto max-w-3xl px-4">
        <div className="mt-4 flex items-end gap-4">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-border bg-card shadow-lg ring-1 ring-border/60">
            <Media
              path={business.logo_url}
              alt={`${business.business_name} logo`}
              className="h-full w-full object-cover"
              fallback={
                <span className="font-display text-2xl text-primary">
                  {business.business_name.charAt(0)}
                </span>
              }
            />
          </div>
        </div>

        <h1 className="mt-5 text-3xl font-bold">{business.business_name}</h1>
        {business.description ? (
          <p className="mt-3 text-muted-foreground">{business.description}</p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          {business.phone ? (
            <Button asChild onClick={() => track("phone_click")}>
              <a href={`tel:${business.phone}`}>Call</a>
            </Button>
          ) : null}
          {business.whatsapp ? (
            <Button asChild variant="outline" onClick={() => track("whatsapp_click")}>
              <a
                href={`https://wa.me/${business.whatsapp.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>
            </Button>
          ) : null}
          {business.google_maps_url ? (
            <Button asChild variant="outline" onClick={() => track("maps_click")}>
              <a href={business.google_maps_url} target="_blank" rel="noreferrer">
                Directions
              </a>
            </Button>
          ) : null}
          {business.website ? (
            <Button asChild variant="outline" onClick={() => track("website_click")}>
              <a href={business.website} target="_blank" rel="noreferrer">
                Website
              </a>
            </Button>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-sm text-primary">
          {business.instagram ? (
            <a href={business.instagram} target="_blank" rel="noreferrer">
              Instagram
            </a>
          ) : null}
          {business.facebook ? (
            <a href={business.facebook} target="_blank" rel="noreferrer">
              Facebook
            </a>
          ) : null}
          {business.tiktok ? (
            <a href={business.tiktok} target="_blank" rel="noreferrer">
              TikTok
            </a>
          ) : null}
          {business.email ? <a href={`mailto:${business.email}`}>Email</a> : null}
        </div>

        {offers.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Current offers</h2>
            <div className="mt-4 space-y-3">
              {offers.map((o) => (
                <div key={o.id} className="surface p-4">
                  <div className="flex justify-between gap-4">
                    <p className="font-medium">{o.title}</p>
                    <span className="text-primary">{o.price}</span>
                  </div>
                  {o.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">{o.description}</p>
                  ) : null}
                  {o.valid_until ? (
                    <p className="mt-1 text-xs text-muted-foreground">Valid until {o.valid_until}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {services.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Services</h2>
            <div className="mt-4 space-y-3">
              {services.map((s) => (
                <div key={s.id} className="surface flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    {s.description ? (
                      <p className="text-sm text-muted-foreground">{s.description}</p>
                    ) : null}
                  </div>
                  <span className="whitespace-nowrap text-primary">{s.price}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {gallery.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Gallery</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {gallery.map((g) => (
                <Media
                  key={g.id}
                  path={g.image_url}
                  alt={g.caption ?? `${business.business_name} photo`}
                  className="h-36 w-full rounded-lg object-cover"
                />
              ))}
            </div>
          </section>
        ) : null}

        {Object.values(hours).some(Boolean) ? (
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Opening hours</h2>
            <div className="surface mt-4 divide-y divide-border/60">
              {DAYS.map((d) =>
                hours[d] ? (
                  <div key={d} className="flex justify-between px-4 py-2 text-sm">
                    <span className="capitalize text-muted-foreground">{d}</span>
                    <span>{hours[d]}</span>
                  </div>
                ) : null,
              )}
            </div>
          </section>
        ) : null}

        {business.address ? (
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Find us</h2>
            <p className="mt-2 text-sm text-muted-foreground">{business.address}</p>
          </section>
        ) : null}

        <footer className="mt-16 border-t border-border/70 pt-6 text-center text-xs text-muted-foreground">
          Powered by{" "}
          <Link to="/" className="text-primary hover:underline">
            FLOWORA
          </Link>
        </footer>
      </div>
    </div>
  );
}
