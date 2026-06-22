-- Neighbourly API response cache
-- Run in Supabase SQL editor before Phase 2 caching

create table if not exists api_cache (
  id          uuid primary key default gen_random_uuid(),
  geoid       text not null,
  category    text not null,
  data        jsonb not null,
  fetched_at  timestamptz default now(),
  expires_at  timestamptz not null,
  unique (geoid, category)
);

create index if not exists idx_cache_lookup on api_cache (geoid, category, expires_at);

-- Curated neighbourhood identity layer (user-facing names → internal tract GEOIDs)

create table if not exists neighbourhood (
  id              text primary key,
  display_name    text not null,
  city            text not null,
  county          text not null,
  centroid_lat    double precision not null,
  centroid_lng    double precision not null,
  bbox            jsonb not null,
  created_at      timestamptz default now()
);

create table if not exists neighbourhood_tract (
  neighbourhood_id  text not null references neighbourhood(id) on delete cascade,
  tract_geoid       text not null,
  weight            double precision not null check (weight > 0),
  primary key (neighbourhood_id, tract_geoid)
);

create index if not exists idx_neighbourhood_display_name on neighbourhood (display_name);
create index if not exists idx_neighbourhood_city on neighbourhood (city);
create index if not exists idx_neighbourhood_tract_geoid on neighbourhood_tract (tract_geoid);

insert into neighbourhood (id, display_name, city, county, centroid_lat, centroid_lng, bbox) values
  ('niles-fremont',           'Niles',            'Fremont', 'Alameda', 37.5766, -121.9780, '[-122.00, 37.56, -121.96, 37.59]'),
  ('mission-san-jose-fremont','Mission San Jose', 'Fremont', 'Alameda', 37.5124, -121.9211, '[-121.94, 37.50, -121.90, 37.53]'),
  ('ardenwood-fremont',       'Ardenwood',        'Fremont', 'Alameda', 37.5549, -122.0197, '[-122.04, 37.54, -122.00, 37.57]'),
  ('irvington-fremont',       'Irvington',        'Fremont', 'Alameda', 37.5271, -121.9736, '[-121.99, 37.51, -121.95, 37.54]'),
  ('centerville-fremont',     'Centerville',      'Fremont', 'Alameda', 37.5485, -121.9886, '[-122.01, 37.53, -121.97, 37.57]'),
  ('warm-springs-fremont',    'Warm Springs',     'Fremont', 'Alameda', 37.4974, -121.9419, '[-121.96, 37.48, -121.92, 37.52]')
on conflict (id) do nothing;
