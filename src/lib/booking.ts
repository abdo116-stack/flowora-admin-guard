export type BookingSettings = {
  timezone: string;
  minimum_notice_hours: number;
  buffer_minutes: number;
  slot_interval_minutes: number;
  breaks: Record<string, { start: string; end: string } | null>;
};

export const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
  timezone: "Africa/Casablanca",
  minimum_notice_hours: 2,
  buffer_minutes: 0,
  slot_interval_minutes: 30,
  breaks: {},
};

export function parseBookingSettings(value: unknown): BookingSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_BOOKING_SETTINGS;
  }
  const raw = value as Record<string, unknown>;
  const rawBreaks = raw.breaks && typeof raw.breaks === "object" && !Array.isArray(raw.breaks)
    ? (raw.breaks as Record<string, unknown>)
    : {};
  const breaks: BookingSettings["breaks"] = {};

  for (const [day, valueForDay] of Object.entries(rawBreaks)) {
    const first = Array.isArray(valueForDay) ? valueForDay[0] : valueForDay;
    if (!first || typeof first !== "object" || Array.isArray(first)) continue;
    const entry = first as Record<string, unknown>;
    if (typeof entry.start === "string" && typeof entry.end === "string") {
      breaks[day] = { start: entry.start, end: entry.end };
    }
  }

  return {
    timezone: typeof raw.timezone === "string" && raw.timezone ? raw.timezone : DEFAULT_BOOKING_SETTINGS.timezone,
    minimum_notice_hours: safeNumber(raw.minimum_notice_hours, 2, 0, 720),
    buffer_minutes: safeNumber(raw.buffer_minutes, 0, 0, 240),
    slot_interval_minutes: safeNumber(raw.slot_interval_minutes, 30, 5, 120),
    breaks,
  };
}

function safeNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function serviceWhatsAppUrl(
  phone: string | null | undefined,
  businessName: string,
  serviceName: string,
  price: string | null | undefined,
): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  const priceLine = price?.trim() ? `\nالثمن: ${price.trim()}` : "";
  const message = `السلام عليكم، بغيت نستفسر على الخدمة التالية:\n\nالمحل: ${businessName}\nالخدمة: ${serviceName}${priceLine}\n\nواش ممكن تعطيني معلومات أكثر؟ شكراً.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function localDateInTimezone(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function formatBookingTime(value: string, timezone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(value));
}