-- Multi-tenant schema for organizations, notices, billing, and customer templates
-- Safe to rerun (IF NOT EXISTS guards); intended for Supabase SQL migrations.

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Helper functions for RLS checks
create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.organization_members om
    where om.org_id = target_org and om.user_id = auth.uid()
  );
$$;

create or replace function public.is_org_admin(target_org uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.organization_members om
    where om.org_id = target_org and om.user_id = auth.uid() and om.role = 'admin'
  );
$$;

-- Organizations
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  created_by uuid references auth.users(id),
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Organization members
create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','member')),
  invited_email text,
  status text not null default 'active' check (status in ('active','invited','revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(org_id, user_id)
);
create index if not exists organization_members_org_idx on public.organization_members(org_id);
create index if not exists organization_members_user_idx on public.organization_members(user_id);

-- Customer template (per org; auto-fills notices)
create table if not exists public.customer_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  business_name text,
  company_name text,
  address text,
  phone text,
  email text,
  tax_id text,
  website text,
  geo_lat numeric,
  geo_lng numeric,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customer_templates_org_idx on public.customer_templates(org_id);

-- Notices
create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id),
  template_key text,
  state text,
  title text,
  subtitle text,
  content text,
  recipient_name text,
  recipient_email text,
  recipient_address text,
  recipient_state text,
  recipient_zip text,
  amount numeric(12,2),
  send_option text, -- email, print, esign, certified_mail, priority_mail, bundle
  ohio boolean default false,
  checkout_session_id text,
  status text not null default 'draft' check (status in ('draft','pending_payment','paid','sent','failed')),
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists notices_org_idx on public.notices(org_id);
create index if not exists notices_state_idx on public.notices(state);

-- Billing artifacts used by the Stripe webhook
create table if not exists public.org_subscriptions (
  subscription_id text primary key,
  customer_id text not null,
  tier text not null,
  price_id text,
  seats integer default 1,
  status text,
  current_period_end bigint,
  cancel_at bigint,
  cancel_at_period_end boolean,
  org_id uuid references public.organizations(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.org_entitlements (
  customer_id text primary key,
  tier text not null,
  seat_limit integer default 1,
  status text,
  org_id uuid references public.organizations(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_invoices (
  invoice_id text primary key,
  customer_id text,
  subscription_id text,
  status text,
  amount_paid bigint,
  amount_due bigint,
  currency text,
  hosted_invoice_url text,
  next_payment_attempt bigint,
  org_id uuid references public.organizations(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_charges (
  charge_id text primary key,
  customer_id text,
  invoice_id text,
  amount_refunded bigint,
  status text,
  event_type text,
  org_id uuid references public.organizations(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_events (
  id text primary key,
  type text,
  status text,
  message text,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- Keep timestamps fresh
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_touch_updated
before update on public.organizations
for each row execute function public.touch_updated_at();

create trigger organization_members_touch_updated
before update on public.organization_members
for each row execute function public.touch_updated_at();

create trigger customer_templates_touch_updated
before update on public.customer_templates
for each row execute function public.touch_updated_at();

create trigger notices_touch_updated
before update on public.notices
for each row execute function public.touch_updated_at();

create trigger org_subscriptions_touch_updated
before update on public.org_subscriptions
for each row execute function public.touch_updated_at();

create trigger org_entitlements_touch_updated
before update on public.org_entitlements
for each row execute function public.touch_updated_at();

create trigger billing_invoices_touch_updated
before update on public.billing_invoices
for each row execute function public.touch_updated_at();

create trigger billing_charges_touch_updated
before update on public.billing_charges
for each row execute function public.touch_updated_at();

-- RLS
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.customer_templates enable row level security;
alter table public.notices enable row level security;
alter table public.org_subscriptions enable row level security;
alter table public.org_entitlements enable row level security;
alter table public.billing_invoices enable row level security;
alter table public.billing_charges enable row level security;
alter table public.billing_events enable row level security;

-- Organizations: creator or members can see; anyone authenticated can create
create policy org_select_on_membership on public.organizations
  for select using (public.is_org_member(id));
create policy org_select_creator on public.organizations
  for select using (created_by = auth.uid());
create policy org_insert_self on public.organizations
  for insert with check (auth.uid() = created_by);
create policy org_update_admin on public.organizations
  for update using (public.is_org_admin(id));

-- Organization members: members can read; admins can manage
create policy org_members_select on public.organization_members
  for select using (public.is_org_member(org_id));
create policy org_members_insert_admin on public.organization_members
  for insert with check (public.is_org_admin(org_id));
create policy org_members_insert_creator on public.organization_members
  for insert with check (
    auth.uid() = user_id and exists (
      select 1 from public.organizations o where o.id = org_id and o.created_by = auth.uid()
    )
  );
create policy org_members_update_admin on public.organization_members
  for update using (public.is_org_admin(org_id));
create policy org_members_delete_admin on public.organization_members
  for delete using (public.is_org_admin(org_id));

-- Customer templates: member scoped
create policy customer_templates_crud on public.customer_templates
  for all using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

-- Notices: member scoped
create policy notices_crud on public.notices
  for all using (public.is_org_member(org_id)) with check (public.is_org_member(org_id));

-- Billing tables: service role only
create policy org_subscriptions_service on public.org_subscriptions
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy org_entitlements_service on public.org_entitlements
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy billing_invoices_service on public.billing_invoices
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy billing_charges_service on public.billing_charges
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy billing_events_service on public.billing_events
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Convenience view to list memberships for current user
create or replace view public.my_memberships as
select om.*, o.name as org_name, o.slug, o.stripe_customer_id
from public.organization_members om
join public.organizations o on o.id = om.org_id
where om.user_id = auth.uid();
