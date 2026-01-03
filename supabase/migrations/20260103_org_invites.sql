-- Org invites table for admin-issued invitations with redeemable codes
-- Safe to rerun; IF NOT EXISTS guards used where possible

create table if not exists public.org_invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin','member')) default 'member',
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  expires_at timestamptz default (now() + interval '7 days'),
  created_by uuid references auth.users(id),
  redeemed_by uuid references auth.users(id),
  redeemed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists org_invites_org_idx on public.org_invites(org_id);
create index if not exists org_invites_email_idx on public.org_invites(email);
create index if not exists org_invites_code_idx on public.org_invites(code);

create or replace function public.touch_org_invites()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger org_invites_touch_updated
before update on public.org_invites
for each row execute function public.touch_org_invites();

alter table public.org_invites enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='org_invites' and policyname='org_invites_select'
  ) then
    create policy org_invites_select on public.org_invites
      for select using (
        public.is_org_admin(org_id) or email = auth.jwt()->>'email'
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='org_invites' and policyname='org_invites_insert_admin'
  ) then
    create policy org_invites_insert_admin on public.org_invites
      for insert with check (public.is_org_admin(org_id));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='org_invites' and policyname='org_invites_update'
  ) then
    create policy org_invites_update on public.org_invites
      for update using (
        public.is_org_admin(org_id) or (email = auth.jwt()->>'email' and status = 'pending')
      ) with check (
        public.is_org_admin(org_id) or (email = auth.jwt()->>'email' and status in ('pending','accepted','revoked','expired'))
      );
  end if;
end $$;
