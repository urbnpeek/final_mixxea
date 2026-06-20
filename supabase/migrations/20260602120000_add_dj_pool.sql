create table if not exists labels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo text,
  description text,
  genre_focus text,
  created_at timestamptz not null default now()
);

create table if not exists tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null,
  label text,
  genre text,
  bpm int,
  musical_key text,
  energy_level int check (energy_level between 1 and 5),
  audio_url text,
  waveform_url text,
  cover_image text,
  release_date timestamptz,
  is_exclusive boolean not null default false,
  is_promo boolean not null default false,
  is_featured boolean not null default false,
  dj_notes text,
  created_at timestamptz not null default now()
);

create table if not exists playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists playlist_tracks (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid references playlists(id) on delete cascade,
  track_id uuid references tracks(id) on delete cascade,
  position int not null default 1
);

create table if not exists downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  track_id uuid references tracks(id) on delete cascade,
  created_at timestamptz not null default now(),
  download_url text
);

create table if not exists favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  track_id uuid references tracks(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, track_id)
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  tier text not null check (tier in ('Starter', 'Pro DJ', 'Elite')),
  status text not null default 'active',
  start_date timestamptz not null default now(),
  end_date timestamptz,
  download_limit int,
  downloads_used int not null default 0
);

create index if not exists tracks_search_idx on tracks using gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(artist,'') || ' ' || coalesce(label,'')));
create index if not exists tracks_filter_idx on tracks (genre, label, musical_key, energy_level, bpm, release_date desc);
create index if not exists downloads_user_track_idx on downloads (user_id, track_id, created_at desc);
create index if not exists playlist_tracks_playlist_idx on playlist_tracks (playlist_id, position);
