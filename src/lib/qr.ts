// QR rendering engine: builds the module matrix with the `qrcode` package and
// renders it manually so module/finder styles, colors, logos and frames are real.
import QRCode from "qrcode";
import { contrast } from "@/lib/design";

export type ModuleStyle = "square" | "rounded" | "dots";
export type FinderStyle = "square" | "rounded" | "circle";
export type FrameId = "none" | "card" | "outline" | "caption-top" | "caption-bottom";

export type QrDesign = {
  moduleStyle: ModuleStyle;
  finderStyle: FinderStyle;
  fg: string;
  bg: string;
  corner: string;
  logoScale: number; // fraction of QR width, 0–0.3
  logoPlate: boolean;
  frame: FrameId;
  caption: string;
  captionColor: string;
  frameColor: string;
  quiet: number; // whitespace modules around the code (min 4)
};

export const DEFAULT_QR_DESIGN: QrDesign = {
  moduleStyle: "rounded",
  finderStyle: "rounded",
  fg: "#0B3D2E",
  bg: "#FFFFFF",
  corner: "#22C08A",
  logoScale: 0.18,
  logoPlate: true,
  frame: "card",
  caption: "SCAN TO DISCOVER",
  captionColor: "#0B3D2E",
  frameColor: "#E4EDE8",
  quiet: 4,
};

export const QR_PRESETS: { name: string; design: QrDesign }[] = [
  { name: "Emerald Business", design: { ...DEFAULT_QR_DESIGN } },
  {
    name: "Luxury Black & Gold",
    design: {
      ...DEFAULT_QR_DESIGN,
      moduleStyle: "dots",
      finderStyle: "circle",
      fg: "#141414",
      bg: "#FFFFFF",
      corner: "#B08D57",
      frame: "outline",
      frameColor: "#B08D57",
      captionColor: "#7A6440",
    },
  },
  {
    name: "Minimal White",
    design: {
      ...DEFAULT_QR_DESIGN,
      moduleStyle: "square",
      finderStyle: "square",
      fg: "#111111",
      bg: "#FFFFFF",
      corner: "#111111",
      frame: "none",
      caption: "",
    },
  },
  {
    name: "Modern Charcoal",
    design: {
      ...DEFAULT_QR_DESIGN,
      moduleStyle: "rounded",
      finderStyle: "rounded",
      fg: "#1F2937",
      bg: "#F8FAFC",
      corner: "#1F2937",
      frame: "card",
      frameColor: "#E2E8F0",
      captionColor: "#1F2937",
    },
  },
  {
    name: "Café & Restaurant",
    design: {
      ...DEFAULT_QR_DESIGN,
      moduleStyle: "rounded",
      finderStyle: "circle",
      fg: "#4A2C17",
      bg: "#FFF8F0",
      corner: "#C2552D",
      frame: "caption-bottom",
      caption: "SCAN TO VIEW OUR MENU",
      captionColor: "#4A2C17",
      frameColor: "#EFD9C5",
    },
  },
  {
    name: "Creative Studio",
    design: {
      ...DEFAULT_QR_DESIGN,
      moduleStyle: "dots",
      finderStyle: "circle",
      fg: "#5B21B6",
      bg: "#FFFFFF",
      corner: "#0EA5A4",
      frame: "caption-top",
      caption: "SCAN TO CONTACT US",
      captionColor: "#5B21B6",
      frameColor: "#E7E2F5",
    },
  },
];

export const CAPTION_SUGGESTIONS = [
  "SCAN TO DISCOVER",
  "SCAN TO CONTACT US",
  "SCAN TO VIEW OUR MENU",
  "سكان وشوف الخدمات",
];

const HEX = /^#[0-9a-fA-F]{6}$/;
function hex(v: unknown, fallback: string) {
  return typeof v === "string" && HEX.test(v) ? v.toUpperCase() : fallback;
}
function pick<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

/** Validate untrusted JSON (from the database) into a safe QrDesign. */
export function parseQrDesign(raw: unknown): QrDesign {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const scale = typeof r.logoScale === "number" ? r.logoScale : DEFAULT_QR_DESIGN.logoScale;
  const quiet = typeof r.quiet === "number" ? r.quiet : DEFAULT_QR_DESIGN.quiet;
  return {
    moduleStyle: pick(r.moduleStyle, ["square", "rounded", "dots"] as const, "rounded"),
    finderStyle: pick(r.finderStyle, ["square", "rounded", "circle"] as const, "rounded"),
    fg: hex(r.fg, DEFAULT_QR_DESIGN.fg),
    bg: hex(r.bg, DEFAULT_QR_DESIGN.bg),
    corner: hex(r.corner, DEFAULT_QR_DESIGN.corner),
    logoScale: Math.min(0.3, Math.max(0, scale)),
    logoPlate: r.logoPlate !== false,
    frame: pick(r.frame, ["none", "card", "outline", "caption-top", "caption-bottom"] as const, "card"),
    caption: typeof r.caption === "string" ? r.caption.slice(0, 60) : DEFAULT_QR_DESIGN.caption,
    captionColor: hex(r.captionColor, DEFAULT_QR_DESIGN.captionColor),
    frameColor: hex(r.frameColor, DEFAULT_QR_DESIGN.frameColor),
    quiet: Math.min(8, Math.max(4, Math.round(quiet))),
  };
}

/** Warnings for choices that may hurt scannability. */
export function qrWarnings(d: QrDesign): string[] {
  const out: string[] = [];
  if (contrast(d.fg, d.bg) < 3)
    out.push("Low contrast between the code and its background — many phones will struggle to scan it.");
  if (d.logoScale > 0.24)
    out.push("The logo is large; it may cover too much of the code. Test it with a phone before printing.");
  if (contrast(d.corner, d.bg) < 2)
    out.push("The corner markers blend into the background, which can prevent scanning.");
  return out;
}

type Matrix = { size: number; data: Uint8Array };

function matrix(text: string): Matrix {
  const qr = QRCode.create(text, { errorCorrectionLevel: "H" });
  return { size: qr.modules.size, data: qr.modules.data };
}

function isFinder(size: number, r: number, c: number) {
  const inRow = r < 7 || r >= size - 7;
  const inCol = c < 7 || c >= size - 7;
  return (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7) ? inRow && inCol : false;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rad: number) {
  const r = Math.min(rad, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFinder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cell: number,
  style: FinderStyle,
  color: string,
  bg: string,
) {
  const s = cell * 7;
  ctx.fillStyle = color;
  if (style === "circle") {
    ctx.beginPath();
    ctx.arc(x + s / 2, y + s / 2, s / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(x + s / 2, y + s / 2, (cell * 5) / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + s / 2, y + s / 2, (cell * 3) / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const rad = style === "rounded" ? cell * 1.6 : 0;
  roundRect(ctx, x, y, s, s, rad);
  ctx.fill();
  ctx.fillStyle = bg;
  roundRect(ctx, x + cell, y + cell, cell * 5, cell * 5, style === "rounded" ? cell * 1.1 : 0);
  ctx.fill();
  ctx.fillStyle = color;
  roundRect(ctx, x + cell * 2, y + cell * 2, cell * 3, cell * 3, style === "rounded" ? cell * 0.7 : 0);
  ctx.fill();
}

/** Draw the QR code (no frame/caption) onto a square canvas. */
export function drawQr(
  canvas: HTMLCanvasElement,
  text: string,
  d: QrDesign,
  logo?: HTMLImageElement | null,
) {
  const { size, data } = matrix(text);
  const quiet = Math.max(4, d.quiet);
  const total = size + quiet * 2;
  const px = canvas.width;
  const cell = px / total;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = d.bg;
  ctx.fillRect(0, 0, px, px);

  ctx.fillStyle = d.fg;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!data[r * size + c] || isFinder(size, r, c)) continue;
      const x = (c + quiet) * cell;
      const y = (r + quiet) * cell;
      if (d.moduleStyle === "dots") {
        ctx.beginPath();
        ctx.arc(x + cell / 2, y + cell / 2, cell * 0.42, 0, Math.PI * 2);
        ctx.fill();
      } else if (d.moduleStyle === "rounded") {
        roundRect(ctx, x + cell * 0.08, y + cell * 0.08, cell * 0.84, cell * 0.84, cell * 0.3);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, cell + 0.5, cell + 0.5);
      }
    }
  }

  const q = quiet * cell;
  drawFinder(ctx, q, q, cell, d.finderStyle, d.corner, d.bg);
  drawFinder(ctx, q + (size - 7) * cell, q, cell, d.finderStyle, d.corner, d.bg);
  drawFinder(ctx, q, q + (size - 7) * cell, cell, d.finderStyle, d.corner, d.bg);

  if (logo && d.logoScale > 0) {
    const side = px * d.logoScale;
    const cx = px / 2;
    const cy = px / 2;
    if (d.logoPlate) {
      const pad = side * 0.18;
      ctx.fillStyle = "#FFFFFF";
      roundRect(ctx, cx - side / 2 - pad, cy - side / 2 - pad, side + pad * 2, side + pad * 2, side * 0.22);
      ctx.fill();
    }
    ctx.save();
    roundRect(ctx, cx - side / 2, cy - side / 2, side, side, side * 0.16);
    ctx.clip();
    ctx.drawImage(logo, cx - side / 2, cy - side / 2, side, side);
    ctx.restore();
  }
}

/** Draw the full presentation card (frame, caption, business name, branding). */
export function drawCard(
  canvas: HTMLCanvasElement,
  text: string,
  d: QrDesign,
  opts: { businessName?: string; logo?: HTMLImageElement | null } = {},
) {
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const hasCaption = d.caption.trim().length > 0 && d.frame !== "none";
  const captionTop = d.frame === "caption-top" && hasCaption;
  const captionBottom = (d.frame === "caption-bottom" || d.frame === "card" || d.frame === "outline") && hasCaption;

  ctx.fillStyle = d.bg;
  roundRect(ctx, 0, 0, W, H, W * 0.05);
  ctx.fill();

  if (d.frame === "outline") {
    ctx.strokeStyle = d.frameColor;
    ctx.lineWidth = Math.max(4, W * 0.008);
    roundRect(ctx, W * 0.04, W * 0.04, W * 0.92, H - W * 0.08, W * 0.04);
    ctx.stroke();
  } else if (d.frame !== "none") {
    ctx.strokeStyle = d.frameColor;
    ctx.lineWidth = Math.max(2, W * 0.004);
    roundRect(ctx, W * 0.03, W * 0.03, W * 0.94, H - W * 0.06, W * 0.045);
    ctx.stroke();
  }

  let y = W * 0.09;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (captionTop) {
    ctx.fillStyle = d.captionColor;
    ctx.font = `700 ${W * 0.052}px 'Space Grotesk', sans-serif`;
    ctx.fillText(d.caption, W / 2, y + W * 0.03, W * 0.86);
    y += W * 0.1;
  }

  if (opts.businessName) {
    ctx.fillStyle = d.captionColor;
    ctx.font = `600 ${W * 0.058}px 'Space Grotesk', sans-serif`;
    ctx.fillText(opts.businessName, W / 2, y + W * 0.03, W * 0.86);
    y += W * 0.1;
  }

  const qrSize = W * 0.72;
  const qrCanvas = document.createElement("canvas");
  qrCanvas.width = qrSize;
  qrCanvas.height = qrSize;
  drawQr(qrCanvas, text, d, opts.logo);
  ctx.drawImage(qrCanvas, (W - qrSize) / 2, y);
  y += qrSize;

  if (captionBottom) {
    ctx.fillStyle = d.captionColor;
    ctx.font = `700 ${W * 0.05}px 'Space Grotesk', sans-serif`;
    ctx.fillText(d.caption, W / 2, y + W * 0.06, W * 0.86);
  }

  ctx.fillStyle = d.captionColor;
  ctx.globalAlpha = 0.55;
  ctx.font = `500 ${W * 0.03}px 'DM Sans', sans-serif`;
  ctx.fillText("Powered by TAPRO", W / 2, H - W * 0.05);
  ctx.globalAlpha = 1;
}

// ---- SVG export ----
function svgFinder(x: number, y: number, cell: number, style: FinderStyle, color: string, bg: string): string {
  const s = cell * 7;
  if (style === "circle") {
    return (
      `<circle cx="${x + s / 2}" cy="${y + s / 2}" r="${s / 2}" fill="${color}"/>` +
      `<circle cx="${x + s / 2}" cy="${y + s / 2}" r="${(cell * 5) / 2}" fill="${bg}"/>` +
      `<circle cx="${x + s / 2}" cy="${y + s / 2}" r="${(cell * 3) / 2}" fill="${color}"/>`
    );
  }
  const rad = style === "rounded" ? cell * 1.6 : 0;
  const rad5 = style === "rounded" ? cell * 1.1 : 0;
  const rad3 = style === "rounded" ? cell * 0.7 : 0;
  return (
    `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${rad}" fill="${color}"/>` +
    `<rect x="${x + cell}" y="${y + cell}" width="${cell * 5}" height="${cell * 5}" rx="${rad5}" fill="${bg}"/>` +
    `<rect x="${x + cell * 2}" y="${y + cell * 2}" width="${cell * 3}" height="${cell * 3}" rx="${rad3}" fill="${color}"/>`
  );
}

/** SVG of the QR code only (logo embedded when a data/absolute URL is given). */
export function qrSvg(text: string, d: QrDesign, logoUrl?: string | null): string {
  const { size, data } = matrix(text);
  const quiet = Math.max(4, d.quiet);
  const total = size + quiet * 2;
  const cell = 10;
  const px = total * cell;
  const parts: string[] = [`<rect width="${px}" height="${px}" fill="${d.bg}"/>`];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!data[r * size + c] || isFinder(size, r, c)) continue;
      const x = (c + quiet) * cell;
      const y = (r + quiet) * cell;
      if (d.moduleStyle === "dots") {
        parts.push(`<circle cx="${x + cell / 2}" cy="${y + cell / 2}" r="${cell * 0.42}" fill="${d.fg}"/>`);
      } else if (d.moduleStyle === "rounded") {
        parts.push(
          `<rect x="${x + cell * 0.08}" y="${y + cell * 0.08}" width="${cell * 0.84}" height="${cell * 0.84}" rx="${cell * 0.3}" fill="${d.fg}"/>`,
        );
      } else {
        parts.push(`<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="${d.fg}"/>`);
      }
    }
  }

  const q = quiet * cell;
  parts.push(svgFinder(q, q, cell, d.finderStyle, d.corner, d.bg));
  parts.push(svgFinder(q + (size - 7) * cell, q, cell, d.finderStyle, d.corner, d.bg));
  parts.push(svgFinder(q, q + (size - 7) * cell, cell, d.finderStyle, d.corner, d.bg));

  if (logoUrl && d.logoScale > 0) {
    const side = px * d.logoScale;
    const cx = px / 2;
    const cy = px / 2;
    if (d.logoPlate) {
      const pad = side * 0.18;
      parts.push(
        `<rect x="${cx - side / 2 - pad}" y="${cy - side / 2 - pad}" width="${side + pad * 2}" height="${side + pad * 2}" rx="${side * 0.22}" fill="#FFFFFF"/>`,
      );
    }
    parts.push(
      `<image href="${logoUrl}" x="${cx - side / 2}" y="${cy - side / 2}" width="${side}" height="${side}" preserveAspectRatio="xMidYMid slice"/>`,
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}">${parts.join("")}</svg>`;
}

export function download(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
