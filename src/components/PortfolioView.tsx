import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Phone, MessageCircle, MapPin, Globe, Mail, UserPlus, Star, Instagram, Facebook, Music2, ExternalLink,
} from "lucide-react";
import { Media } from "@/components/Media";
import { DAYS } from "@/lib/floword";
import { designStyle, type Design, type SectionId, type ThemeId } from "@/lib/design";
import { DICTS, LANGS, LANG_LABEL, type Lang } from "@/lib/portfolio-i18n";
import { downloadVCard, isSafeHttpsUrl } from "@/lib/vcard";

export type PortfolioData = {
  business: {
    id: string;
    business_name: string;
    slug: string;
    logo_url: string | null;
    cover_url: string | null;
    description: string | null;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    website: string | null;
    instagram: string | null;
    facebook: string | null;
    tiktok: string | null;
    google_maps_url: string | null;
    address: string | null;
    opening_hours: unknown;
    google_review_url?: string | null;
    external_review_url?: string | null;
    show_review_cta?: boolean | null;
    review_cta?: string | null;
  };
  services: { id: string; name: string; description: string | null; price: string | null; image_url?: string | null }[];
  gallery: { id: string; image_url: string; caption: string | null }[];
  offers: { id: string; title: string; description: string | null; price: string | null; valid_until: string | null }[];
};

type ThemeRules = {
  cover: string;
  header: "left" | "center";
  logo: string;
  title: string;
  heading: string;
  actions: string;
  dividerHeadings: boolean;
};

const THEME_RULES: Record<ThemeId, ThemeRules> = {
  modern: { cover: "h-52 sm:h-64", header: "left", logo: "h-24 w-24 rounded-2xl", title: "text-3xl font-bold", heading: "text-xl font-semibold", actions: "flex flex-wrap gap-2", dividerHeadings: false },
  minimal: { cover: "h-36 sm:h-44", header: "left", logo: "h-16 w-16 rounded-full", title: "text-2xl font-semibold tracking-tight", heading: "text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground", actions: "flex flex-wrap gap-2", dividerHeadings: false },
  elegant: { cover: "h-56 sm:h-72", header: "center", logo: "h-24 w-24 rounded-full", title: "text-4xl font-medium", heading: "text-2xl font-medium", actions: "flex flex-wrap justify-center gap-2", dividerHeadings: true },
  bold: { cover: "h-64 sm:h-80", header: "left", logo: "h-28 w-28 rounded-3xl", title: "text-4xl font-extrabold sm:text-5xl", heading: "text-2xl font-extrabold", actions: "grid grid-cols-2 gap-2 sm:flex sm:flex-wrap", dividerHeadings: false },
  classic: { cover: "h-44 sm:h-56", header: "center", logo: "h-24 w-24 rounded-md", title: "text-3xl font-bold", heading: "text-xl font-bold", actions: "flex flex-wrap justify-center gap-2", dividerHeadings: true },
};

const SPACING = { compact: "mt-7", normal: "mt-10", airy: "mt-16" } as const;
const CARD = {
  flat: "bg-card",
  bordered: "bg-card border border-border",
  shadow: "bg-card shadow-[0_8px_30px_-12px_rgba(0,0,0,0.35)]",
} as const;
const COVER_POS = { top: "object-top", center: "object-center", bottom: "object-bottom" } as const;

export function PortfolioView({
  data,
  design,
  portfolioUrl,
  onTrack,
  preview = false,
}: {
  data: PortfolioData;
  design: Design;
  portfolioUrl: string;
  onTrack?: (event: string) => void;
  preview?: boolean;
}) {
  const { business, services, gallery, offers } = data;
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    const saved = localStorage.getItem("tapro-lang") as Lang | null;
    if (saved && LANGS.includes(saved)) setLang(saved);
    else if (navigator.language?.startsWith("fr")) setLang("fr");
    else if (navigator.language?.startsWith("ar")) setLang("ar");
  }, []);
  const changeLang = (l: Lang) => {
    setLang(l);
    localStorage.setItem("tapro-lang", l);
  };

  const t = DICTS[lang];
  const rules = THEME_RULES[design.theme];
  const card = `${CARD[design.cardStyle]} rounded-[var(--radius)]`;
  const gap = SPACING[design.spacing];
  const track = (e: string) => onTrack?.(e);
  const hours = (business.opening_hours ?? {}) as Record<string, string>;
  const btn = "inline-flex items-center justify-center gap-2 rounded-[var(--radius)] px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const btnPrimary = `${btn} bg-primary text-primary-foreground`;
  const btnOutline = `${btn} border border-border bg-card text-foreground`;
  const center = rules.header === "center";

  const reviewUrl = business.google_review_url && isSafeHttpsUrl(business.google_review_url) ? business.google_review_url : null;
  const otherReviewUrl = business.external_review_url && isSafeHttpsUrl(business.external_review_url) ? business.external_review_url : null;
  const showReviews = business.show_review_cta !== false && Boolean(reviewUrl || otherReviewUrl);

  async function saveContact() {
    track("save_contact");
    try {
      const r = await downloadVCard({
        name: business.business_name,
        phone: business.phone,
        whatsapp: business.whatsapp,
        email: business.email,
        website: business.website,
        portfolioUrl,
        address: business.address,
        mapsUrl: business.google_maps_url,
      });
      if (r === "downloaded") toast.success(t.contactSaved);
    } catch {
      toast.error(t.contactFailed);
    }
  }

  const H = ({ children }: { children: React.ReactNode }) => (
    <h2
      className={`${rules.heading} ${center ? "text-center" : ""} ${rules.dividerHeadings ? "flex items-center gap-4 before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border" : ""}`}
      style={{ fontFamily: "var(--pf-display)" }}
    >
      {children}
    </h2>
  );

  const sections: Record<SectionId, React.ReactNode> = {
    offers:
      offers.length > 0 ? (
        <section className={gap}>
          <H>{t.offers}</H>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {offers.map((o) => (
              <div key={o.id} className={`${card} p-4`} style={{ borderInlineStart: "4px solid var(--accent)" }}>
                <div className="flex justify-between gap-4">
                  <p className="font-semibold">{o.title}</p>
                  {o.price ? <span className="whitespace-nowrap font-semibold text-primary">{o.price}</span> : null}
                </div>
                {o.description ? <p className="mt-1 text-sm text-muted-foreground">{o.description}</p> : null}
                {o.valid_until ? <p className="mt-2 text-xs text-muted-foreground">{t.validUntil} {o.valid_until}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null,
    services:
      services.length > 0 ? (
        <section className={gap}>
          <H>{t.services}</H>
          <div className="mt-4 space-y-3">
            {services.map((s) => (
              <div key={s.id} className={`${card} flex items-center gap-4 p-4`}>
                {s.image_url ? <Media path={s.image_url} alt={s.name} className="h-16 w-16 shrink-0 rounded-[var(--radius)] object-cover" /> : null}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{s.name}</p>
                  {s.description ? <p className="text-sm text-muted-foreground">{s.description}</p> : null}
                </div>
                {s.price ? <span className="whitespace-nowrap font-semibold text-primary">{s.price}</span> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null,
    gallery:
      gallery.length > 0 ? (
        <section className={gap}>
          <H>{t.gallery}</H>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {gallery.map((g) => (
              <Media key={g.id} path={g.image_url} alt={g.caption ?? business.business_name} className="aspect-square w-full rounded-[var(--radius)] object-cover" />
            ))}
          </div>
        </section>
      ) : null,
    reviews: showReviews ? (
      <section className={gap}>
        <div className={`${card} p-6 text-center`}>
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <Star className="h-5 w-5" aria-hidden />
          </div>
          <h2 className={`${rules.heading} mt-3`} style={{ fontFamily: "var(--pf-display)" }}>{t.reviewsTitle}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{business.review_cta?.trim() || t.reviewsBody}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {reviewUrl ? (
              <a href={reviewUrl} target="_blank" rel="noopener noreferrer nofollow" className={btnPrimary} onClick={() => track("review_click")}>
                <GoogleG /> {t.leaveGoogle}
              </a>
            ) : null}
            {otherReviewUrl ? (
              <a href={otherReviewUrl} target="_blank" rel="noopener noreferrer nofollow" className={btnOutline} onClick={() => track("review_click")}>
                <ExternalLink className="h-4 w-4" aria-hidden /> {t.leaveOther}
              </a>
            ) : null}
          </div>
        </div>
      </section>
    ) : null,
    hours: Object.values(hours).some(Boolean) ? (
      <section className={gap}>
        <H>{t.hours}</H>
        <div className={`${card} mt-4 divide-y divide-border`}>
          {DAYS.map((d) =>
            hours[d] ? (
              <div key={d} className="flex justify-between px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">{t.days[d]}</span>
                <span dir="ltr">{hours[d]}</span>
              </div>
            ) : null,
          )}
        </div>
      </section>
    ) : null,
    location:
      business.address || business.google_maps_url ? (
        <section className={gap}>
          <H>{t.location}</H>
          <div className={`${card} mt-4 flex flex-wrap items-center justify-between gap-3 p-4`}>
            {business.address ? (
              <p className="flex items-start gap-2 text-sm"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />{business.address}</p>
            ) : <span />}
            {business.google_maps_url ? (
              <a href={business.google_maps_url} target="_blank" rel="noopener noreferrer" className={btnOutline} onClick={() => track("maps_click")}>
                {t.openMap}
              </a>
            ) : null}
          </div>
        </section>
      ) : null,
    social:
      business.instagram || business.facebook || business.tiktok ? (
        <section className={gap}>
          <H>{t.social}</H>
          <div className={`mt-4 flex flex-wrap gap-2 ${center ? "justify-center" : ""}`}>
            {business.instagram ? <a className={btnOutline} href={business.instagram} target="_blank" rel="noopener noreferrer"><Instagram className="h-4 w-4" aria-hidden />Instagram</a> : null}
            {business.facebook ? <a className={btnOutline} href={business.facebook} target="_blank" rel="noopener noreferrer"><Facebook className="h-4 w-4" aria-hidden />Facebook</a> : null}
            {business.tiktok ? <a className={btnOutline} href={business.tiktok} target="_blank" rel="noopener noreferrer"><Music2 className="h-4 w-4" aria-hidden />TikTok</a> : null}
          </div>
        </section>
      ) : null,
  };

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} lang={lang} style={designStyle(design)} className={`${preview ? "" : "min-h-screen"} pb-16`}>
      <div className={`relative w-full overflow-hidden bg-secondary ${rules.cover}`}>
        <Media path={business.cover_url} alt={business.business_name} className={`h-full w-full object-cover ${COVER_POS[design.coverPosition]}`} />
        {design.theme !== "minimal" ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24" style={{ background: `linear-gradient(to top, var(--background), transparent)` }} />
        ) : null}
        <div className="absolute end-3 top-3 flex overflow-hidden rounded-full border border-border bg-card/90 text-xs backdrop-blur">
          {LANGS.map((l) => (
            <button key={l} type="button" onClick={() => changeLang(l)} aria-pressed={lang === l}
              className={`px-3 py-1.5 ${lang === l ? "bg-primary text-primary-foreground" : "text-foreground"}`}>
              {LANG_LABEL[l]}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4">
        <div className={`mt-4 flex ${center ? "justify-center" : ""}`}>
          <div className={`flex items-center justify-center overflow-hidden border border-border bg-card shadow-lg ${rules.logo}`}>
            <Media path={business.logo_url} alt={`${business.business_name} logo`} className="h-full w-full object-cover"
              fallback={<span className="text-2xl text-primary" style={{ fontFamily: "var(--pf-display)" }}>{business.business_name.charAt(0)}</span>} />
          </div>
        </div>

        <div className={center ? "text-center" : ""}>
          <h1 className={`mt-5 ${rules.title}`} style={{ fontFamily: "var(--pf-display)" }}>{business.business_name}</h1>
          {business.description ? <p className="mt-3 whitespace-pre-line text-muted-foreground">{business.description}</p> : null}
        </div>

        <div className={`mt-6 ${rules.actions}`}>
          {business.phone ? <a className={btnPrimary} href={`tel:${business.phone}`} onClick={() => track("phone_click")}><Phone className="h-4 w-4" aria-hidden />{t.call}</a> : null}
          {business.whatsapp ? (
            <a className={btnOutline} href={`https://wa.me/${business.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" onClick={() => track("whatsapp_click")}>
              <MessageCircle className="h-4 w-4" aria-hidden />{t.whatsapp}
            </a>
          ) : null}
          {business.google_maps_url ? <a className={btnOutline} href={business.google_maps_url} target="_blank" rel="noopener noreferrer" onClick={() => track("maps_click")}><MapPin className="h-4 w-4" aria-hidden />{t.directions}</a> : null}
          {business.website ? <a className={btnOutline} href={business.website} target="_blank" rel="noopener noreferrer" onClick={() => track("website_click")}><Globe className="h-4 w-4" aria-hidden />{t.website}</a> : null}
          {business.email ? <a className={btnOutline} href={`mailto:${business.email}`}><Mail className="h-4 w-4" aria-hidden />{t.email}</a> : null}
          <button type="button" className={`${btn} bg-accent text-accent-foreground`} onClick={() => void saveContact()}>
            <UserPlus className="h-4 w-4" aria-hidden />{t.saveContact}
          </button>
        </div>

        {design.sections.filter((s) => s.visible).map((s) => <div key={s.id}>{sections[s.id]}</div>)}

        <footer className="mt-16 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          {t.poweredBy}{" "}
          {preview ? <span className="text-primary">Tapro</span> : <Link to="/" className="text-primary hover:underline">Tapro</Link>}
        </footer>
      </div>
    </div>
  );
}

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4 rounded-full bg-white p-[1px]" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6C12.4 13.7 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.3 5.7c4.3-3.9 7-9.8 7-17.1z" />
      <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.8-6z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.3-5.7c-2 1.4-4.7 2.3-8.6 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.8 6C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}
