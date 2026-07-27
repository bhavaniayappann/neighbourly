-- User-saved houses for the My House Search module

create type house_visit_status as enum ('visited', 'planned');

create table houses (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  address          text not null,
  lat              double precision not null,
  lng              double precision not null,
  status           house_visit_status not null default 'planned',
  beds             smallint,
  baths            numeric(3, 1),
  sqft             integer,
  list_price       integer,
  offer_price      integer,
  notes            text,
  neighbourhood    text,
  geoid            text,
  neighbourhood_id text,
  rating           smallint check (rating between 1 and 5),
  visit_date       date,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create index idx_houses_user_id on houses (user_id);

alter table houses enable row level security;

create policy "Users can view own houses"
  on houses for select
  using (auth.uid() = user_id);

create policy "Users can insert own houses"
  on houses for insert
  with check (auth.uid() = user_id);

create policy "Users can update own houses"
  on houses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own houses"
  on houses for delete
  using (auth.uid() = user_id);

create or replace function set_houses_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger houses_updated_at
  before update on houses
  for each row
  execute function set_houses_updated_at();

-- User-defined comparison criteria (shared across all houses)

create type criterion_value_type as enum ('text', 'number', 'rating', 'boolean');

create table comparison_criteria (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  label       text not null,
  value_type  criterion_value_type not null default 'text',
  sort_order  smallint not null default 0,
  created_at  timestamptz default now()
);

create index idx_comparison_criteria_user_id on comparison_criteria (user_id);

alter table comparison_criteria enable row level security;

create policy "Users can view own criteria"
  on comparison_criteria for select
  using (auth.uid() = user_id);

create policy "Users can insert own criteria"
  on comparison_criteria for insert
  with check (auth.uid() = user_id);

create policy "Users can update own criteria"
  on comparison_criteria for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own criteria"
  on comparison_criteria for delete
  using (auth.uid() = user_id);

-- Per-house values for each criterion

create table house_criterion_values (
  house_id      uuid not null references houses(id) on delete cascade,
  criterion_id  uuid not null references comparison_criteria(id) on delete cascade,
  value_text    text,
  value_number  numeric,
  value_rating  smallint check (value_rating between 1 and 5),
  value_boolean boolean,
  primary key (house_id, criterion_id)
);

create index idx_house_criterion_values_house_id on house_criterion_values (house_id);
create index idx_house_criterion_values_criterion_id on house_criterion_values (criterion_id);

alter table house_criterion_values enable row level security;

create policy "Users can view own house criterion values"
  on house_criterion_values for select
  using (
    exists (
      select 1 from houses
      where houses.id = house_criterion_values.house_id
        and houses.user_id = auth.uid()
    )
  );

create policy "Users can insert own house criterion values"
  on house_criterion_values for insert
  with check (
    exists (
      select 1 from houses
      where houses.id = house_criterion_values.house_id
        and houses.user_id = auth.uid()
    )
    and exists (
      select 1 from comparison_criteria
      where comparison_criteria.id = house_criterion_values.criterion_id
        and comparison_criteria.user_id = auth.uid()
    )
  );

create policy "Users can update own house criterion values"
  on house_criterion_values for update
  using (
    exists (
      select 1 from houses
      where houses.id = house_criterion_values.house_id
        and houses.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from houses
      where houses.id = house_criterion_values.house_id
        and houses.user_id = auth.uid()
    )
    and exists (
      select 1 from comparison_criteria
      where comparison_criteria.id = house_criterion_values.criterion_id
        and comparison_criteria.user_id = auth.uid()
    )
  );

create policy "Users can delete own house criterion values"
  on house_criterion_values for delete
  using (
    exists (
      select 1 from houses
      where houses.id = house_criterion_values.house_id
        and houses.user_id = auth.uid()
    )
  );
