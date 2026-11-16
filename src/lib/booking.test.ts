import { describe, expect, it } from "vitest";
import { parseBookingSettings, serviceWhatsAppUrl } from "./booking";
import { publicPortfolioQrUrl } from "./floword";

describe("Tapro booking and portfolio helpers", () => {
  it("uses the configured QR source marker without changing the portfolio path", () => {
    const url = new URL(publicPortfolioQrUrl("sample-business"));
    expect(url.pathname).toBe("/p/sample-business");
    expect(url.searchParams.get("src")).toBe("qr");
  });

  it("encodes an Arabic service request and omits WhatsApp links for missing or invalid numbers", () => {
    const link = serviceWhatsAppUrl("+212 612 345 678", "Atlas Café", "Hair & styling", "120 MAD");
    expect(link).toMatch(/^https:\/\/wa\.me\/212612345678\?text=/);
    const message = new URL(link ?? "").searchParams.get("text") ?? "";
    expect(message).toContain("Atlas Café");
    expect(message).toContain("Hair & styling");
    expect(message).toContain("120 MAD");
    expect(serviceWhatsAppUrl("", "Atlas Café", "Cut", null)).toBeNull();
    expect(serviceWhatsAppUrl("1234", "Atlas Café", "Cut", null)).toBeNull();
  });

  it("reads existing break schedules and clamps booking controls to safe limits", () => {
    const settings = parseBookingSettings({
      timezone: "Africa/Casablanca",
      minimum_notice_hours: -1,
      buffer_minutes: 999,
      slot_interval_minutes: 2,
      breaks: { monday: [{ start: "13:00", end: "14:00" }] },
    });
    expect(settings.minimum_notice_hours).toBe(0);
    expect(settings.buffer_minutes).toBe(240);
    expect(settings.slot_interval_minutes).toBe(5);
    expect(settings.breaks.monday).toEqual({ start: "13:00", end: "14:00" });
  });
});