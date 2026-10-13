// vCard 3.0 generation for public portfolios (UTF-8, RFC 2426 escaping).

export type VCardInput = {
  name: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  portfolioUrl: string;
  address?: string | null;
  mapsUrl?: string | null;
  note?: string | null;
};

export function escapeVCard(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

/** Keep a leading "+" and digits only; preserves international dialing codes. */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) return "";
  if (trimmed.startsWith("+")) return `+${digits}`;
  if (trimmed.startsWith("00")) return `+${digits.slice(2)}`;
  return digits;
}

/** Fold lines longer than 75 octets (UTF-8 safe, never splits a character). */
function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let cur = "";
  let size = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (size + n > limit) {
      parts.push(cur);
      cur = "";
      size = 0;
    }
    cur += ch;
    size += n;
  }
  parts.push(cur);
  return parts.join("\r\n ");
}

const safeUrl = (u?: string | null) => (u && /^https?:\/\//i.test(u.trim()) ? u.trim() : null);

export function buildVCard(v: VCardInput): string {
  const name = v.name.trim();
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${escapeVCard(name)}`, `N:;${escapeVCard(name)};;;`, `ORG:${escapeVCard(name)}`];
  const phone = v.phone ? normalizePhone(v.phone) : "";
  if (phone) lines.push(`TEL;TYPE=WORK,VOICE:${phone}`);
  const wa = v.whatsapp ? normalizePhone(v.whatsapp) : "";
  if (wa && wa !== phone) lines.push(`TEL;TYPE=CELL:${wa}`);
  if (v.email?.trim()) lines.push(`EMAIL;TYPE=INTERNET,WORK:${escapeVCard(v.email.trim())}`);
  const site = safeUrl(v.website);
  if (site) lines.push(`URL;TYPE=WORK:${escapeVCard(site)}`);
  lines.push(`URL:${escapeVCard(v.portfolioUrl)}`);
  if (v.address?.trim()) lines.push(`ADR;TYPE=WORK:;;${escapeVCard(v.address.trim())};;;;`);
  const maps = safeUrl(v.mapsUrl);
  if (maps) lines.push(`X-SOCIALPROFILE;TYPE=maps:${escapeVCard(maps)}`);
  if (v.note?.trim()) lines.push(`NOTE:${escapeVCard(v.note.trim().slice(0, 300))}`);
  lines.push("END:VCARD");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function vcardFilename(name: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return `${base || "contact"}.vcf`;
}

/** Opens the native contact importer (iOS/Android) or downloads the .vcf (desktop). */
export async function downloadVCard(v: VCardInput): Promise<"shared" | "downloaded"> {
  const text = buildVCard(v);
  const filename = vcardFilename(v.name);
  const blob = new Blob([text], { type: "text/vcard;charset=utf-8" });
  try {
    const file = new File([blob], filename, { type: "text/vcard" });
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (/android/i.test(navigator.userAgent) && nav.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: v.name });
      return "shared";
    }
  } catch {
    /* fall back to download */
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "downloaded";
}

export function isSafeHttpsUrl(u: string): boolean {
  try {
    const p = new URL(u.trim());
    return p.protocol === "https:" && Boolean(p.hostname) && !/[\s<>"]/.test(u);
  } catch {
    return false;
  }
}
