import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatBookingTime, localDateInTimezone } from "@/lib/booking";
import { DEFAULT_BOOKING_SETTINGS, parseBookingSettings, type BookingSettings } from "@/lib/booking";
import { Switch } from "@/components/ui/switch";

const requestSchema = z.object({
  customer_name: z.string().trim().min(1, "Enter your name").max(120),
  customer_phone: z.string().trim().min(6, "Enter a valid phone number").max(40),
  note: z.string().trim().max(1000, "Keep the note under 1,000 characters"),
});

type ServiceOption = { id: string; name: string; price: string | null; duration_minutes?: number | null };
type Slot = { slot_start: string; duration_minutes: number };
type BookingSettings = { timezone?: string };

export function PublicBookingPanel({
  businessId,
  businessName,
  services,
  settings,
}: {
  businessId: string;
  businessName: string;
  services: ServiceOption[];
  settings: unknown;
}) {
  const configuration = (settings && typeof settings === "object" ? settings : {}) as BookingSettings;
  const timezone = configuration.timezone || "Africa/Casablanca";
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [date, setDate] = useState(() => localDateInTimezone(new Date(), timezone));
  const [slot, setSlot] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!serviceId && services[0]) setServiceId(services[0].id);
  }, [serviceId, services]);

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ["booking-slots", businessId, serviceId, date],
    enabled: Boolean(serviceId && date),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_booking_slots", {
        _business_id: businessId,
        _service_id: serviceId,
        _date: date,
      });
      if (error) throw error;
      return (data ?? []) as Slot[];
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      const customer = requestSchema.parse({ customer_name: name, customer_phone: phone, note });
      if (!serviceId || !slot) throw new Error("Choose a service and available time");
      const { error } = await supabase.from("appointment_requests").insert({
        business_id: businessId,
        service_id: serviceId,
        customer_name: customer.customer_name,
        customer_phone: customer.customer_phone,
        note: customer.note || null,
        scheduled_start: slot,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSent(true);
      setSlot("");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not send your request"),
  });

  if (!services.length) {
    return <p className="mt-4 text-sm text-muted-foreground">Appointments are available after services are added.</p>;
  }

  return (
    <section className="mt-10 border-t border-border pt-8" aria-labelledby="booking-title">
      <h2 id="booking-title" className="text-xl font-semibold">Request an appointment</h2>
      {sent ? (
        <div className="mt-4 border-s-2 border-primary ps-4" role="status">
          <p className="font-medium">Request sent</p>
          <p className="mt-1 text-sm text-muted-foreground">Your appointment request is awaiting the business owner’s response.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setSent(false)}>Send another request</Button>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="booking-service">Service</Label>
            <select id="booking-service" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={serviceId} onChange={(event) => { setServiceId(event.target.value); setSlot(""); }}>
              {services.map((service) => <option key={service.id} value={service.id}>{service.name}{service.duration_minutes ? ` · ${service.duration_minutes} min` : " · 30 min"}{service.price ? ` · ${service.price}` : ""}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="booking-date">Date</Label>
            <Input id="booking-date" type="date" min={localDateInTimezone(new Date(), timezone)} max={localDateInTimezone(new Date(Date.now() + 90 * 86400000), timezone)} value={date} onChange={(event) => { setDate(event.target.value); setSlot(""); }} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Available times <span className="text-muted-foreground">({timezone})</span></Label>
            {isLoading ? <p className="text-sm text-muted-foreground">Checking availability…</p> : slots.length ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {slots.map((available) => (
                  <Button key={available.slot_start} type="button" size="sm" variant={slot === available.slot_start ? "default" : "outline"} onClick={() => setSlot(available.slot_start)}>
                    {new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZone: timezone }).format(new Date(available.slot_start))}
                  </Button>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No available times for this date.</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="booking-name">Your name</Label>
            <Input id="booking-name" autoComplete="name" maxLength={120} value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="booking-phone">Phone number</Label>
            <Input id="booking-phone" type="tel" autoComplete="tel" maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="booking-note">Note <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea id="booking-note" rows={3} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Button disabled={!slot || submit.isPending} onClick={() => submit.mutate()}>
              {submit.isPending ? "Sending…" : "Request appointment"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

type Appointment = {
  id: string;
  service_id: string | null;
  customer_name: string;
  customer_phone: string;
  note: string | null;
  scheduled_start: string;
  duration_minutes: number | null;
  status: string;
  created_at: string;
};

const statusLabels: Record<string, string> = {
  pending: "Pending", confirmed: "Confirmed", rejected: "Rejected", cancelled: "Cancelled", completed: "Completed",
};

export function BusinessBookings({
  businessId,
  timezone = "Africa/Casablanca",
}: {
  businessId: string;
  timezone?: string;
}) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSlot, setRescheduleSlot] = useState("");

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("appointment_requests")
        .select("id, service_id, customer_name, customer_phone, note, scheduled_start, duration_minutes, status, created_at")
        .eq("business_id", businessId).order("scheduled_start", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Appointment[];
    },
  });

  const selected = appointments.find((item) => item.id === rescheduleId);
  const { data: rescheduleSlots = [] } = useQuery({
    queryKey: ["booking-reschedule-slots", businessId, selected?.service_id, rescheduleDate],
    enabled: Boolean(selected?.service_id && rescheduleDate),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_booking_slots", {
        _business_id: businessId,
        _service_id: selected?.service_id ?? "",
        _date: rescheduleDate,
      });
      if (error) throw error;
      return (data ?? []) as Slot[];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, changes }: { id: string; changes: { status?: string; scheduled_start?: string } }) => {
      const { error } = await supabase.from("appointment_requests").update(changes).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Appointment updated");
      setRescheduleId(null);
      setRescheduleSlot("");
      void queryClient.invalidateQueries({ queryKey: ["appointments", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["booking-reschedule-slots"] });
      void queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update appointment"),
  });

  const pendingCount = appointments.filter((item) => item.status === "pending").length;
  const visible = useMemo(() => appointments.filter((item) =>
    (statusFilter === "all" || item.status === statusFilter) &&
    (!dateFilter || localDateInTimezone(new Date(item.scheduled_start), timezone) === dateFilter),
  ), [appointments, statusFilter, dateFilter, timezone]);

  return (
    <section className="space-y-5" aria-labelledby="appointments-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 id="appointments-heading" className="text-lg font-semibold">Appointment requests</h2>
          {pendingCount > 0 ? <Badge variant="secondary" className="bg-warning/15 text-warning">{pendingCount} new</Badge> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <select aria-label="Filter appointments by status" className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <Input aria-label="Filter appointments by date" className="w-auto" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
        </div>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading appointment requests…</p> : visible.length ? (
        <div className="space-y-3">
          {visible.map((item) => (
            <article key={item.id} className={`surface space-y-3 p-4 ${item.status === "pending" ? "border-primary/50" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.customer_name}</p>
                  <a href={`tel:${item.customer_phone}`} className="text-sm text-primary">{item.customer_phone}</a>
                  <p className="mt-1 text-sm text-muted-foreground">{formatBookingTime(item.scheduled_start, timezone)} · {item.duration_minutes ?? 30} min</p>
                </div>
                <Badge variant="secondary" className={item.status === "pending" ? "bg-warning/15 text-warning" : item.status === "confirmed" ? "bg-primary/15 text-primary" : ""}>
                  {statusLabels[item.status] ?? item.status}
                </Badge>
              </div>
              {item.note ? <p className="whitespace-pre-wrap text-sm text-muted-foreground">{item.note}</p> : null}
              {item.status === "pending" ? <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => update.mutate({ id: item.id, changes: { status: "confirmed" } })}>Confirm</Button>
                <Button size="sm" variant="outline" onClick={() => update.mutate({ id: item.id, changes: { status: "rejected" } })}>Reject</Button>
              </div> : null}
              {item.status === "confirmed" ? <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => { setRescheduleId(rescheduleId === item.id ? null : item.id); setRescheduleDate(""); setRescheduleSlot(""); }}>Reschedule</Button>
                <Button size="sm" variant="outline" onClick={() => update.mutate({ id: item.id, changes: { status: "cancelled" } })}>Cancel</Button>
                <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: item.id, changes: { status: "completed" } })}>Mark completed</Button>
              </div> : null}
              {rescheduleId === item.id ? <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-[minmax(160px,220px)_1fr_auto] sm:items-end">
                <div className="space-y-2"><Label htmlFor={`reschedule-date-${item.id}`}>New date</Label><Input id={`reschedule-date-${item.id}`} type="date" min={localDateInTimezone(new Date(), timezone)} value={rescheduleDate} onChange={(event) => { setRescheduleDate(event.target.value); setRescheduleSlot(""); }} /></div>
                <div className="space-y-2"><Label>Available times</Label><select aria-label="Choose an available time" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={rescheduleSlot} onChange={(event) => setRescheduleSlot(event.target.value)}><option value="">Choose a time</option>{rescheduleSlots.map((available) => <option key={available.slot_start} value={available.slot_start}>{formatBookingTime(available.slot_start, timezone)}</option>)}</select></div>
                <Button size="sm" disabled={!rescheduleSlot || update.isPending} onClick={() => update.mutate({ id: item.id, changes: { scheduled_start: rescheduleSlot } })}>Save time</Button>
              </div> : null}
            </article>
          ))}
        </div>
      ) : <p className="surface p-5 text-sm text-muted-foreground">No appointment requests match these filters.</p>}
    </section>
  );
}

export function BookingSetupPanel({ businessId }: { businessId: string }) {
  const queryClient = useQueryClient();
  const { data: business, isLoading } = useQuery({
    queryKey: ["booking-setup", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("business_profiles")
        .select("booking_enabled, booking_settings, opening_hours").eq("id", businessId).single();
      if (error) throw error;
      return data;
    },
  });
  const [enabled, setEnabled] = useState(false);
  const [settings, setSettings] = useState<BookingSettings>(DEFAULT_BOOKING_SETTINGS);
  const [hours, setHours] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!business || loaded) return;
    setEnabled(business.booking_enabled);
    setSettings(parseBookingSettings(business.booking_settings));
    setHours((business.opening_hours && typeof business.opening_hours === "object" ? business.opening_hours : {}) as Record<string, string>);
    setLoaded(true);
  }, [business, loaded]);

  const save = useMutation({
    mutationFn: async () => {
      const validation = z.object({
        timezone: z.string().min(1).max(80),
        minimum_notice_hours: z.number().int().min(0).max(720),
        buffer_minutes: z.number().int().min(0).max(240),
        slot_interval_minutes: z.number().int().min(5).max(120),
      }).safeParse(settings);
      if (!validation.success) throw new Error("Check the timezone, notice, buffer, and interval values");
      try { new Intl.DateTimeFormat(undefined, { timeZone: settings.timezone }); }
      catch { throw new Error("Enter a valid timezone, for example Africa/Casablanca"); }
      const { error } = await supabase.from("business_profiles").update({
        booking_enabled: enabled,
        booking_settings: settings,
        opening_hours: hours,
      }).eq("id", businessId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Appointment settings saved");
      void queryClient.invalidateQueries({ queryKey: ["booking-setup", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["business", businessId] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save appointment settings"),
  });

  if (isLoading || !business) return <p className="text-sm text-muted-foreground">Loading appointment settings…</p>;

  const updateNumber = (key: "minimum_notice_hours" | "buffer_minutes" | "slot_interval_minutes", value: string) => {
    const parsed = Number(value);
    if (Number.isInteger(parsed)) setSettings((current) => ({ ...current, [key]: parsed }));
  };

  return (
    <div className="space-y-6">
      <div className="surface flex flex-wrap items-center justify-between gap-4 p-5">
        <div><h2 className="font-semibold">Appointment requests</h2><p className="mt-1 text-sm text-muted-foreground">Visitors can request a time; you confirm each appointment.</p></div>
        <div className="flex items-center gap-3"><Label htmlFor="booking-enabled">Accept requests</Label><Switch id="booking-enabled" checked={enabled} onCheckedChange={setEnabled} /></div>
      </div>
      <div className="surface space-y-5 p-5">
        <h3 className="font-semibold">Hours and availability</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const).map((day) => (
            <div key={day} className="space-y-1.5"><Label htmlFor={`booking-hours-${day}`} className="capitalize">{day}</Label><Input id={`booking-hours-${day}`} placeholder="09:00-18:00 or Closed" value={hours[day] ?? ""} onChange={(event) => setHours((current) => ({ ...current, [day]: event.target.value }))} /></div>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="booking-timezone">Business timezone</Label><Input id="booking-timezone" value={settings.timezone} onChange={(event) => setSettings((current) => ({ ...current, timezone: event.target.value }))} /></div>
          <div className="space-y-1.5"><Label htmlFor="booking-notice">Minimum notice (hours)</Label><Input id="booking-notice" type="number" min="0" max="720" value={settings.minimum_notice_hours} onChange={(event) => updateNumber("minimum_notice_hours", event.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="booking-buffer">Buffer after appointments (minutes)</Label><Input id="booking-buffer" type="number" min="0" max="240" value={settings.buffer_minutes} onChange={(event) => updateNumber("buffer_minutes", event.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="booking-interval">Available start-time interval (minutes)</Label><Input id="booking-interval" type="number" min="5" max="120" value={settings.slot_interval_minutes} onChange={(event) => updateNumber("slot_interval_minutes", event.target.value)} /></div>
        </div>
        <p className="text-xs text-muted-foreground">Use a timezone such as Africa/Casablanca. Breaks can be added to the opening-hours settings as part of the configured schedule.</p>
        <Button disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Saving…" : "Save appointment settings"}</Button>
      </div>
      <BusinessBookings businessId={businessId} timezone={settings.timezone} />
    </div>
  );
}