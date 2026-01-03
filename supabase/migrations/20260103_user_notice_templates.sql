-- Per-user notice defaults and logo storage
-- Safe to rerun; guards with IF NOT EXISTS

create table if not exists public.user_notice_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text,
  company text,
  phone text,
  email text,
  address text,
  website text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_notice_templates_user_idx on public.user_notice_templates(user_id);

create or replace function public.touch_user_notice_templates()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_notice_templates_touch_updated
before update on public.user_notice_templates
for each row execute function public.touch_user_notice_templates();

alter table public.user_notice_templates enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_notice_templates' and policyname = 'user_notice_templates_rw'
  ) then
    create policy user_notice_templates_rw on public.user_notice_templates
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;
