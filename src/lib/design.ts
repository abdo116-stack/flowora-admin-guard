// Controlled, validated portfolio design configuration. Never accepts raw CSS.

export const SECTION_IDS = [
  "offers",
  "services",
  "gallery",
  "reviews",
  "hours",
  "location",
  "social",
] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export const THEMES = ["modern", "minimal", "elegant", "bold", "classic"] as const;
export type ThemeId = (typeof THEMES)[number];
export const PRESETS = ["none", "electronics", "restaurant", "salon", "professional"] as const;
export type PresetId = (typeof PRESETS)[number];
export const FONTS = ["grotesk", "manrope", "playfair", "baskerville"] as const;
export type FontId = (typeof FONTS)[number];
export type ButtonShape = "rounded" | "soft" | "square";
export type CardStyle = "flat" | "bordered" | "shadow";
export type Spacing = "compact" | "normal" | "airy";
export type CoverPosition = "top" | "center" | "bottom";

export type Colors = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
};

export type Design = {
  theme: ThemeId;
  preset: PresetId;
  colors: Colors;
  font: FontId;
  buttonShape: ButtonShape;
  cardStyle: CardStyle;
  spacing: Spacing;
  coverPosition: CoverPosition;
  sections: { id: SectionId; visible: boolean }[];
};

export const DEFAULT_COLORS: Colors = {
  primary: "#22C08A",
  secondary: "#1B3A30",
  accent: "#F5C451",
  background: "#07130F",
  surface: "#10231C",
  text: "#EEF6F2",
};

export const PALETTES: { name: string; colors: Colors }[] = [
  { name: "Tapro Emerald", colors: DEFAULT_COLORS },
  {
    name: "Paper",
    colors: { primary: "#1F2937", secondary: "#E5E7EB", accent: "#B45309", background: "#FAFAF7", surface: "#FFFFFF", text: "#111827" },
  },
  {
    name: "Midnight Tech",
    colors: { primary: "#3B9EFF", secondary: "#1C2540", accent: "#00E0C6", background: "#0A0F1E", surface: "#121A30", text: "#E8EEFC" },
  },
  {
    name: "Terracotta",
    colors: { primary: "#C2552D", secondary: "#F3E2D3", accent: "#2F5D50", background: "#FBF4EC", surface: "#FFFFFF", text: "#2A1A12" },
  },
  {
    name: "Blush Gold",
    colors: { primary: "#B08D57", secondary: "#F6E9E4", accent: "#8C4A5E", background: "#FFF9F6", surface: "#FFFFFF", text: "#2E2225" },
  },
  {
    name: "Navy Trust",
    colors: { primary: "#1E3A8A", secondary: "#DBE4F3", accent: "#0F766E", background: "#F5F7FB", surface: "#FFFFFF", text: "#0F172A" },
  },
];

const DEFAULT_SECTIONS = SECTION_IDS.map((id) => ({ id, visible: true }));

export const DEFAULT_DESIGN: Design = {
  theme: "modern",
  preset: "none",
  colors: DEFAULT_COLORS,
  font: "grotesk",
  buttonShape: "soft",
  cardStyle: "bordered",
  spacing: "normal",
  coverPosition: "center",
  sections: DEFAULT_SECTIONS,
};

/** Industry starting points: only adjust presentation, never content. */
export const PRESET_DESIGNS: Record<Exclude<PresetId, "none">, Partial<Design>> = {
  electronics: {
    theme: "modern",
    colors: PALETTES[2]!.colors,
    font: "manrope",
    buttonShape: "soft",
    cardStyle: "bordered",
    sections: order(["services", "offers", "gallery", "reviews", "location", "hours", "social"]),
  },
  restaurant: {
    theme: "bold",
    colors: PALETTES[3]!.colors,
    font: "playfair",
    buttonShape: "rounded",
    cardStyle: "shadow",
    sections: order(["services", "hours", "location", "gallery", "offers", "reviews", "social"]),
  },
  salon: {
    theme: "elegant",
    colors: PALETTES[4]!.colors,
    font: "playfair",
    buttonShape: "rounded",
    cardStyle: "flat",
    sections: order(["gallery", "services", "offers", "reviews", "hours", "location", "social"]),
  },
  professional: {
    theme: "minimal",
    colors: PALETTES[5]!.colors,
    font: "baskerville",
    buttonShape: "square",
    cardStyle: "bordered",
    sections: order(["services", "reviews", "location", "hours", "offers", "gallery", "social"]),
  },
};

function order(ids: SectionId[]) {
  return ids.map((id) => ({ id, visible: true }));
}

const HEX = /^#[0-9a-fA-F]{6}$/;
function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** Validate untrusted JSON into a safe Design with backwards-compatible defaults. */
export function parseDesign(raw: unknown): Design {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof Design, unknown>>;
  const c = (r.colors && typeof r.colors === "object" ? r.colors : {}) as Record<string, unknown>;
  const colors = Object.fromEntries(
    (Object.keys(DEFAULT_COLORS) as (keyof Colors)[]).map((k) => [
      k,
      typeof c[k] === "string" && HEX.test(c[k] as string) ? (c[k] as string).toUpperCase() : DEFAULT_COLORS[k],
    ]),
  ) as Colors;

  const seen = new Set<SectionId>();
  const sections: Design["sections"] = [];
  if (Array.isArray(r.sections)) {
    for (const s of r.sections) {
      const id = (s as { id?: unknown })?.id;
      if (typeof id === "string" && (SECTION_IDS as readonly string[]).includes(id) && !seen.has(id as SectionId)) {
        seen.add(id as SectionId);
        sections.push({ id: id as SectionId, visible: (s as { visible?: unknown }).visible !== false });
      }
    }
  }
  for (const id of SECTION_IDS) if (!seen.has(id)) sections.push({ id, visible: true });

  return {
    theme: pick(r.theme, THEMES, DEFAULT_DESIGN.theme),
    preset: pick(r.preset, PRESETS, "none"),
    colors,
    font: pick(r.font, FONTS, DEFAULT_DESIGN.font),
    buttonShape: pick(r.buttonShape, ["rounded", "soft", "square"] as const, "soft"),
    cardStyle: pick(r.cardStyle, ["flat", "bordered", "shadow"] as const, "bordered"),
    spacing: pick(r.spacing, ["compact", "normal", "airy"] as const, "normal"),
    coverPosition: pick(r.coverPosition, ["top", "center", "bottom"] as const, "center"),
    sections,
  };
}

// ---- Contrast helpers (WCAG) ----
function lum(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
}
export function contrast(a: string, b: string) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}
export function readableOn(bg: string) {
  return contrast(bg, "#FFFFFF") >= contrast(bg, "#111111") ? "#FFFFFF" : "#111111";
}

export function contrastWarnings(c: Colors): { message: string; fix: Partial<Colors> }[] {
  const out: { message: string; fix: Partial<Colors> }[] = [];
  if (contrast(c.text, c.background) < 4.5)
    out.push({ message: "Text is hard to read on the background.", fix: { text: readableOn(c.background) } });
  if (contrast(c.text, c.surface) < 4.5)
    out.push({ message: "Text is hard to read on cards.", fix: { surface: c.background } });
  if (contrast(c.primary, c.background) < 2.5)
    out.push({
      message: "Primary color blends into the background.",
      fix: { primary: readableOn(c.background) === "#FFFFFF" ? "#22C08A" : "#1F2937" },
    });
  return out;
}

const FONT_STACKS: Record<FontId, { display: string; body: string }> = {
  grotesk: { display: "'Space Grotesk', sans-serif", body: "'DM Sans', sans-serif" },
  manrope: { display: "'Manrope', sans-serif", body: "'Manrope', sans-serif" },
  playfair: { display: "'Playfair Display', serif", body: "'DM Sans', sans-serif" },
  baskerville: { display: "'Libre Baskerville', serif", body: "'DM Sans', sans-serif" },
};
export const FONT_LABEL: Record<FontId, string> = {
  grotesk: "Grotesk (modern)",
  manrope: "Manrope (tech)",
  playfair: "Playfair (elegant)",
  baskerville: "Baskerville (classic)",
};

/** CSS variables scoped to the portfolio wrapper; all values are validated tokens. */
export function designStyle(d: Design): React.CSSProperties {
  const c = d.colors;
  const radius = { rounded: "1.25rem", soft: "0.6rem", square: "0.125rem" }[d.buttonShape];
  return {
    "--background": c.background,
    "--foreground": c.text,
    "--card": c.surface,
    "--card-foreground": c.text,
    "--primary": c.primary,
    "--primary-foreground": readableOn(c.primary),
    "--secondary": c.secondary,
    "--secondary-foreground": readableOn(c.secondary),
    "--accent": c.accent,
    "--accent-foreground": readableOn(c.accent),
    "--muted": `color-mix(in srgb, ${c.text} 8%, ${c.background})`,
    "--muted-foreground": `color-mix(in srgb, ${c.text} 68%, ${c.background})`,
    "--border": `color-mix(in srgb, ${c.text} 16%, ${c.background})`,
    "--input": `color-mix(in srgb, ${c.text} 16%, ${c.background})`,
    "--ring": c.primary,
    "--radius": radius,
    "--pf-display": FONT_STACKS[d.font].display,
    "--pf-body": FONT_STACKS[d.font].body,
    fontFamily: FONT_STACKS[d.font].body,
    backgroundColor: c.background,
    color: c.text,
  } as React.CSSProperties;
}
