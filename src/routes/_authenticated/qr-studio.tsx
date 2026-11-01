import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { QrStudio } from "@/components/QrStudio";

export const Route = createFileRoute("/_authenticated/qr-studio")({
  head: () => ({
    meta: [
      { title: "QR Design Studio — Tapro" },
      {
        name: "description",
        content:
          "Design a professional QR code for your Tapro portfolio: styles, colors, logo, frames and print-ready downloads.",
      },
      { property: "og:title", content: "QR Design Studio — Tapro" },
      {
        property: "og:description",
        content: "Customize your business QR code and download it for print.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QrStudioPage,
});

function QrStudioPage() {
  return (
    <AppShell title="QR Design Studio">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
        QR Design Studio
      </p>
      <h1 className="mt-2 text-3xl font-bold">A QR code that matches your business</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Customize the style, colors, logo and frame, then download a print-ready code that opens
        your portfolio. The preview updates instantly as you design.
      </p>
      <div className="mt-8">
        <QrStudio />
      </div>
    </AppShell>
  );
}
