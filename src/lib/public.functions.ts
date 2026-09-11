import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function publicClient() {
  const key = (process.env["SUPABASE_PUBLISHABLE_KEY"] ??
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"]) as string;
  const url = (process.env["SUPABASE_URL"] ??
    import.meta.env["VITE_SUPABASE_URL"]) as string;
  if (!url || !key) throw new Error("Missing Supabase configuration");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
          h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const getPublicBusiness = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1).max(80) }).parse(input))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: business } = await supabase
      .from("business_profiles")
      .select(
        "id, business_name, slug, logo_url, cover_url, description, phone, whatsapp, email, website, instagram, facebook, tiktok, google_maps_url, address, opening_hours, published",
      )
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();

    if (!business) return null;

    const [{ data: services }, { data: gallery }, { data: offers }] = await Promise.all([
      supabase.from("services").select("id, name, description, price, image_url").eq("business_id", business.id),
      supabase.from("gallery").select("id, image_url, caption").eq("business_id", business.id),
      supabase
        .from("offers")
        .select("id, title, description, price, valid_until")
        .eq("business_id", business.id),
    ]);

    return {
      business,
      services: services ?? [],
      gallery: gallery ?? [],
      offers: offers ?? [],
    };
  });
