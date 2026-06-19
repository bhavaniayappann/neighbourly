create table api_cache (
  id          uuid primary key default gen_random_uuid(),
  geoid       text not null,
  category    text not null,
  data        jsonb not null,
  fetched_at  timestamptz default now(),
  expires_at  timestamptz not null,
  unique (geoid, category)
);

create index idx_cache_lookup on api_cache (geoid, category, expires_at);
