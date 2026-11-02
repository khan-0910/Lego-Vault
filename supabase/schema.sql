-- BRICKVAULT · Supabase schema (Postgres)
-- Mirrors the local data model in src/lib/types.ts so the app can move from
-- local mode to cloud sync without reshaping data.
--
-- Money is stored as integer paise (bigint), never floats. ₹1 = 100 paise.
-- Every table is owned by a user and locked down with row-level security.
--
-- Run in the Supabase SQL editor, or: supabase db push

create extension if not exists "pgcrypto";

-- ───────────── profiles ─────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  default_currency char(3) not null default 'INR',
  locale text not null default 'en-IN',
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ───────────── themes ─────────────
create table if not exists public.themes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  color char(7) not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  pattern text not null check (pattern in ('dots', 'stripes', 'grid', 'zigzag', 'checks', 'rays')),
  icon text not null default 'blocks',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists themes_user_name_key on public.themes (user_id, lower(name));

-- ───────────── sets ─────────────
create table if not exists public.sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  theme_id uuid not null references public.themes (id) on delete restrict,
  name text not null check (char_length(trim(name)) between 1 and 120),
  set_number text not null default '' check (set_number ~ '^[A-Za-z0-9.\-]{0,24}$'),
  pieces int check (pieces between 0 and 100000),
  purchase_price_paise bigint check (purchase_price_paise between 0 and 10000000000),
  purchase_date date check (purchase_date between date '1949-01-01' and current_date),
  seller text not null default '' check (char_length(seller) <= 80),
  condition text not null default 'sealed' check (condition in ('sealed', 'opened', 'built', 'used', 'incomplete')),
  -- user-entered estimate, not a verified market price
  market_value_paise bigint check (market_value_paise between 0 and 10000000000),
  market_value_at timestamptz,
  notes text not null default '' check (char_length(notes) <= 4000),
  status text not null default 'owned' check (status in ('owned', 'sold')),
  sale_price_paise bigint check (sale_price_paise between 0 and 10000000000),
  sale_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sets_user_idx on public.sets (user_id);
create index if not exists sets_user_theme_idx on public.sets (user_id, theme_id);
create index if not exists sets_user_purchase_idx on public.sets (user_id, purchase_date);

-- Ownership history. Kept when a set is sold; removed only if the set is deleted.
create table if not exists public.set_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  set_id uuid not null references public.sets (id) on delete cascade,
  type text not null check (type in ('added', 'purchased', 'value', 'condition', 'price', 'edited', 'photo', 'sold', 'restored')),
  label text not null,
  from_value jsonb,
  to_value jsonb,
  at timestamptz not null default now()
);
create index if not exists set_events_set_idx on public.set_events (set_id, at);

-- Photos live in Storage; this table only keeps paths and order.
create table if not exists public.set_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  set_id uuid not null references public.sets (id) on delete cascade,
  storage_path text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists set_photos_set_idx on public.set_photos (set_id, position);

-- ───────────── wishlist ─────────────
create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  theme_id uuid references public.themes (id) on delete set null,
  name text not null check (char_length(trim(name)) between 1 and 120),
  set_number text not null default '',
  target_price_paise bigint check (target_price_paise between 0 and 10000000000),
  priority smallint not null default 2 check (priority between 1 and 3),
  link text not null default '' check (link = '' or link ~* '^https?://'),
  notes text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now()
);

-- ───────────── updated_at trigger ─────────────
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists sets_touch on public.sets;
create trigger sets_touch before update on public.sets
  for each row execute function public.touch_updated_at();

-- ───────────── row-level security ─────────────
-- Same rule everywhere: you can only see and change your own rows.
do $$
declare t text;
begin
  foreach t in array array['themes', 'sets', 'set_events', 'set_photos', 'wishlist_items'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;

alter table public.profiles enable row level security;
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- A set may only point at one of the same user's themes.
create or replace function public.check_set_theme_owner() returns trigger
language plpgsql security invoker as $$
begin
  if not exists (select 1 from public.themes where id = new.theme_id and user_id = new.user_id) then
    raise exception 'theme does not belong to this user';
  end if;
  return new;
end $$;

drop trigger if exists sets_theme_owner on public.sets;
create trigger sets_theme_owner before insert or update of theme_id on public.sets
  for each row execute function public.check_set_theme_owner();

-- ───────────── storage: private photo bucket ─────────────
-- Files go under  <user id>/<set id>/<photo id>.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('set-photos', 'set-photos', false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "read own photos" on storage.objects;
create policy "read own photos" on storage.objects for select to authenticated
  using (bucket_id = 'set-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "upload own photos" on storage.objects;
create policy "upload own photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'set-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "delete own photos" on storage.objects;
create policy "delete own photos" on storage.objects for delete to authenticated
  using (bucket_id = 'set-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ───────────── handy view: spending by theme ─────────────
create or replace view public.theme_spending with (security_invoker = true) as
select
  s.user_id,
  s.theme_id,
  t.name as theme_name,
  count(*) as set_count,
  coalesce(sum(s.purchase_price_paise), 0) as spent_paise,
  coalesce(sum(s.market_value_paise), 0) as est_value_paise,
  coalesce(sum(s.pieces), 0) as pieces
from public.sets s
join public.themes t on t.id = s.theme_id
where s.status = 'owned'
group by s.user_id, s.theme_id, t.name;
