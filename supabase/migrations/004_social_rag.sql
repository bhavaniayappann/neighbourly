-- Social Pulse RAG: pgvector-backed post chunks for neighbourhood chat retrieval

create extension if not exists vector;

create table social_posts (
  id            text primary key,
  geoid         text not null,
  display_name  text not null,
  city          text not null,
  county        text not null,
  title         text not null,
  source        text not null,
  permalink     text,
  posted_at     timestamptz,
  ingested_at   timestamptz default now()
);

create table social_post_chunks (
  id            uuid primary key default gen_random_uuid(),
  post_id       text not null references social_posts(id) on delete cascade,
  geoid         text not null,
  city          text not null,
  county        text not null,
  chunk_index   smallint not null,
  content       text not null,
  embedding     vector(1536),
  unique (post_id, chunk_index)
);

create index idx_social_posts_geoid on social_posts (geoid);
create index idx_social_posts_city_county on social_posts (city, county);
create index idx_social_post_chunks_geoid on social_post_chunks (geoid);
create index idx_social_post_chunks_city_county on social_post_chunks (city, county);

create index idx_social_post_chunks_embedding
  on social_post_chunks
  using hnsw (embedding vector_cosine_ops);

alter table social_posts enable row level security;
alter table social_post_chunks enable row level security;

create policy "Public read social_posts"
  on social_posts for select
  using (true);

create policy "Public read social_post_chunks"
  on social_post_chunks for select
  using (true);

create or replace function match_social_chunks(
  query_embedding vector(1536),
  match_geoid text default null,
  match_city text default null,
  match_county text default null,
  match_count int default 8
)
returns table (
  id uuid,
  post_id text,
  geoid text,
  city text,
  county text,
  chunk_index smallint,
  content text,
  source text,
  permalink text,
  similarity float
)
language sql
stable
as $$
  select
    c.id,
    c.post_id,
    c.geoid,
    c.city,
    c.county,
    c.chunk_index,
    c.content,
    p.source,
    p.permalink,
    1 - (c.embedding <=> query_embedding) as similarity
  from social_post_chunks c
  join social_posts p on p.id = c.post_id
  where c.embedding is not null
    and (
      (match_geoid is not null and c.geoid = match_geoid)
      or (
        match_geoid is null
        and match_city is not null
        and match_county is not null
        and lower(c.city) = lower(match_city)
        and lower(c.county) = lower(match_county)
      )
    )
  order by c.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

grant execute on function match_social_chunks to anon, authenticated, service_role;
