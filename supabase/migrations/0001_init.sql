-- Mixxea + Freq Vault Supabase bootstrap schema
-- Apply with the Supabase SQL editor or supabase db push

create extension if not exists "pgcrypto";

create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  name text not null,
  real_name text default '',
  country text default '',
  city text default '',
  genre text default '',
  bio text default '',
  instagram text default '',
  soundcloud text default '',
  artist_type text default 'label',
  status text default 'signed',
  photo_url text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.releases (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  artist_id uuid references public.artists(id) on delete set null,
  artist_name text not null,
  title text not null,
  genre text default '',
  bpm integer default 0,
  catalog_number text default '',
  release_date date,
  status text default 'draft',
  description text default '',
  artwork_url text default '',
  audio_preview_url text default '',
  spotify_url text default '',
  beatport_url text default '',
  apple_music_url text default '',
  soundcloud_url text default '',
  bandcamp_url text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  title text,
  event_date date not null,
  venue text not null,
  city text default '',
  country text default '',
  artist_names text not null,
  event_type text default '',
  ticket_link text default '',
  fee numeric(12,2) default 0,
  status text default 'confirmed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  venue text not null,
  city text default '',
  country text default '',
  contact_name text default '',
  email text not null,
  artist_name text default '',
  event_date date,
  booking_type text default '',
  fee numeric(12,2) default 0,
  notes text default '',
  status text default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.demos (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  artist_name text not null,
  email text not null,
  track_title text not null,
  genre text default '',
  bpm integer default 0,
  notes text default '',
  soundcloud_link text default '',
  file_url text default '',
  submitted_at timestamptz not null default now(),
  status text default 'new'
);

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  source text default 'website',
  joined_at timestamptz not null default now()
);

create table if not exists public.newsletter_campaigns (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  body_html text not null,
  preview_text text default '',
  status text default 'draft',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.royalties (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  artist_name text not null,
  release_title text default '',
  revenue_source text default '',
  amount numeric(12,2) not null default 0,
  period text default '',
  paid_at timestamptz
);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  artist_name text not null,
  contract_type text default '',
  signed_at date,
  expires_at date,
  status text default 'active',
  file_url text default ''
);

create table if not exists public.artist_portal_users (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  artist_name text not null,
  email text unique not null,
  password_hash text default '',
  status text default 'signed',
  created_at timestamptz not null default now()
);

create index if not exists idx_artists_name on public.artists(name);
create index if not exists idx_releases_artist_name on public.releases(artist_name);
create index if not exists idx_releases_release_date on public.releases(release_date desc);
create index if not exists idx_events_event_date on public.events(event_date desc);
create index if not exists idx_bookings_status on public.bookings(status);
create index if not exists idx_demos_status on public.demos(status);

alter table public.artists enable row level security;
alter table public.releases enable row level security;
alter table public.events enable row level security;
alter table public.bookings enable row level security;
alter table public.demos enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.newsletter_campaigns enable row level security;
alter table public.royalties enable row level security;
alter table public.contracts enable row level security;
alter table public.artist_portal_users enable row level security;

drop policy if exists "Public can read artists" on public.artists;
create policy "Public can read artists" on public.artists for select using (true);

drop policy if exists "Public can read published releases" on public.releases;
create policy "Public can read published releases" on public.releases for select using (status <> 'draft');

drop policy if exists "Public can read confirmed events" on public.events;
create policy "Public can read confirmed events" on public.events for select using (status in ('confirmed', 'hold'));

drop policy if exists "Public can insert demos" on public.demos;
create policy "Public can insert demos" on public.demos for insert with check (true);

drop policy if exists "Public can insert newsletter subscribers" on public.newsletter_subscribers;
create policy "Public can insert newsletter subscribers" on public.newsletter_subscribers for insert with check (true);

drop policy if exists "Public can insert bookings" on public.bookings;
create policy "Public can insert bookings" on public.bookings for insert with check (true);

-- Admin and artist-specific access should be added once Auth users and roles are linked.
-- Suggested storage buckets:
-- artwork: public read for published covers, admin write
-- audio: restricted read, signed URLs for previews and private uploads
-- contracts: private only
