# Tapro — Premium redesign, QR Design Studio & subscriptions

## 1. Homepage redesign (src/routes/index.tsx)
- Sticky header: logo, How It Works, Features, QR Studio, Pricing, FAQ, Sign In, "Create Your Digital Portfolio" CTA.
- Hero with the specified headline/copy, CTAs "Explore the Live Demo" and "Explore QR Designs", plus a composed visual (phone mockup rendering the real demo portfolio in an iframe, QR card, scan→open flow graphic).
- "Experience TAPRO" live-demo section: real scannable QR encoding the exact demo URL, 5-step journey, "Open Full Portfolio Demo" button. Uses the existing `/p/tapro` portfolio if it exists; otherwise the most-viewed published portfolio. No fake reviews/stats.
- How it works (3 steps), Features grid (only working features; analytics NOT advertised), Use cases, Final CTA, professional footer (logo, nav, pricing, contact softatlas38@gmail.com / 0681569749, Privacy, Terms).
- New routes: `/pricing`, `/faq`, `/privacy`, `/terms` (real content matching actual behavior).

## 2. QR Design Studio (/qr-studio)
- New route `src/routes/qr-studio.tsx` (public page with editor; signed-in users get their portfolio preselected) + `src/components/QrStudio.tsx` + `src/lib/qr.ts`.
- Library: keep existing `qrcode` npm package; render modules manually to canvas/SVG so module styles (square, rounded, dots), finder styles (square, rounded, circle), colors, corner color, center logo with light plate, frames (minimal, rounded card, premium outline, top/bottom caption), captions (presets incl. Arabic + custom), size, quiet zone, frame/caption colors are all genuinely rendered.
- Destination: signed-in users pick their own portfolio (auto-fills public URL, copy link, preview); custom URL allowed with validation.
- 6 presets (Emerald Business, Luxury Black & Gold, Minimal White, Modern Charcoal, Café & Restaurant, Creative Studio) applying real settings instantly.
- Export: high-res PNG download, SVG download, copy URL, download presentation card. Warn on low contrast / oversized logo; error-correction H; instruction to test-scan before printing.

## 3. Subscriptions (pricing + request flow)
- Pricing page: one plan "TAPRO Business", monthly 49 MAD / yearly 490 MAD toggle (saves 98 MAD), feature list of implemented features only, no analytics.
- No payment provider configured → honest "Request Subscription" flow:
  - New table `subscription_requests` (user_id, business_id, period monthly|yearly, status pending|approved|rejected, created_at) and `subscriptions` (user_id, business_id, period, status active|expired, starts_at, expires_at) with RLS: users insert/select their own requests and read their own subscription; only admin can approve/activate (via existing has_role + admin server functions).
  - User dashboard: Subscription & Billing card showing status (none/pending/active/expired), expiration date, renew button.
  - Admin console: new Subscriptions tab to approve (activates subscription, sets expires_at) or reject requests.
  - Expiry does NOT delete portfolio data; expired users keep editing but public page shows a renewal notice rule only if decided — default: portfolio stays live, dashboard shows renewal message (documented in FAQ honestly).

## 4. Dashboard & admin improvements
- Dashboard navigation cards: My Portfolio, Customize QR Code (links to /qr-studio), Subscription & Billing, Account Settings, Help & Support. No fake stats.
- PortfolioEditor: "Customize My QR Code" entry point per portfolio.
- QR design persistence: add `qr_design jsonb` column to `business_profiles` (additive, safe), saved/loaded per user's own portfolio only.

## 5. Verification
- tsgo typecheck, build OK, Playwright: homepage mobile+desktop, nav links, demo QR decodes to correct URL (decode via jsQR or zxing in node), QR preview updates on style change, PNG download encodes correct URL, price toggle, subscription request cannot self-activate (RLS), existing auth + /p/:slug still work.

## Explicitly not done
- No online payments (no provider configured) — request flow only.
- No analytics advertised.
- No fake reviews/testimonials/stats.
