# Tapro bookings, service actions, and insights

## Outcome
Extend the current public portfolio, owner editor, and admin Overview—without replacing their layouts or changing existing branding, access, pricing, or URLs.

## Build
1. **Appointment requests:** Add an opt-in booking setup to the existing owner editor, including business timezone (default `Africa/Casablanca`), weekly opening windows/breaks, minimum notice, buffer, and service duration. Add a public booking form that only shows available slots, collects name/phone/optional note, and confirms the request as pending. Add owner booking management in the existing dashboard/editor: status/date filters, accept/reject, cancel/reschedule/complete, and a visible pending count. A database exclusion constraint prevents overlapping confirmed bookings; database validation enforces service ownership, published/booking-enabled business, schedule, and notice. Public callers can submit but cannot read customer details; only the business owner/admin can read or manage requests. No temporary holds: pending requests do not reserve a slot.
2. **Service WhatsApp actions:** Add an encoded, editable WhatsApp message per service when the business has a valid WhatsApp number. Record a service-specific click event; never claim a message or sale completed.
3. **Real Insights:** Extend the existing admin Overview and owner Share & stats area with real event metrics, time/business/event filters, readable charts and empty states. Add privacy-safe analytics fields and record page visits, tracked actions, service clicks, and booking outcomes. Owners remain scoped to their own business; public visitors may insert valid events but cannot read them.
4. **QR attribution:** Keep every existing `/p/<slug>` URL valid and unchanged. Newly generated QR codes add a `src=qr` query marker to the same public URL; the public page records a QR-origin visit once per browser session, while unmarked links remain direct visits. Existing QR codes continue opening portfolios but cannot be retroactively identified as QR scans.

## Database changes
- Add booking-enabled/schedule settings and timezone to business profiles; add optional duration to services.
- Add an appointment-requests table with business/service, customer contact, time range, note, and status; grant access narrowly and enable RLS.
- Add analytics event metadata for source, service, privacy-safe visitor/session identifier, and interaction category.
- Add database validation and overlap protection, plus a public availability function that returns time slots only—not customer data.

## Technical approach
Use the existing Supabase client/RLS and current TanStack routes/components. Apply schema through Lovable Database migration tooling, then regenerate generated types. Keep booking dates as timezone-aware instants; derive slots from each business's configured local schedule. Use a server/database-enforced confirmation constraint as the concurrency safety net. Add focused tests for schedule validation, slot overlap, WhatsApp message encoding, and QR/direct attribution, then verify the public request and owner/admin flows in the preview. Live Netlify deployment cannot be confirmed from this workspace unless that deployment is available after the changes.

## Not included
No payment processing, automatic confirmation, fake analytics, messaging automation, or changes to existing public URL paths.
