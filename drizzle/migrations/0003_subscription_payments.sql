create table public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  user_id uuid not null,
  subscription_id uuid not null,
  amount numeric not null check (amount >= 0),
  currency text not null default 'MAD',
  period text not null check (period in ('monthly','yearly')),
  paid_at timestamptz not null default now(),
  reference text,
  created_at timestamptz not null default now(),
  unique (subscription_id)
);

alter table public.subscription_payments
  add constraint subscription_payments_business_fkey
  foreign key (business_id) references public.business_profiles(id) on delete cascade;
alter table public.subscription_payments
  add constraint subscription_payments_subscription_fkey
  foreign key (subscription_id) references public.subscriptions(id) on delete cascade;

grant select, insert, update, delete on public.subscription_payments to authenticated;
grant all on public.subscription_payments to service_role;

alter table public.subscription_payments enable row level security;

create policy "Admins manage payment records"
  on public.subscription_payments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Users can read own payment records"
  on public.subscription_payments for select to authenticated
  using (user_id = auth.uid());