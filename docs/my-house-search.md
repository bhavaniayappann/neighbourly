# My House Search — Feature Plan

> **Status:** Planned (not yet implemented)  
> **Last updated:** July 2026

A sign-in-gated module for tracking homes users have visited or plan to visit during their house search. This is a **separate page** from the main neighbourhood explorer and does not modify the existing explore experience at `/`.

---

## Goals

- Let signed-in users save homes with address, status, beds/baths, price, freeform notes, and ratings
- Let users define **custom comparison criteria** (e.g. "Natural light", "Yard size", "Commute feel") and score each house against them
- Show saved homes as map pins with quick hover tooltips (including notes preview)
- Provide a detailed editable view when a house is selected
- Compare 2–4 saved homes side by side on fixed fields **and** custom criteria
- Persist data per user in Supabase (cloud sync across devices)

## Non-goals (v1)

- Zillow or other listing API integration (manual user input only)
- Free map-click pin placement (address form only)
- House pins on the main explore map (`/`)
- Multi-user shared house lists

---

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Existing neighbourhood explorer (unchanged) |
| `/my-house-search` | Main house tracker module |
| `/my-house-search/compare?ids=uuid1,uuid2` | Side-by-side comparison view |

## Navigation

TopNav gains app-level tabs:

```
Neighbourly    Explore  |  My House Search          [Sign in] / [Account]
```

- **Explore** → `/`
- **My House Search** → `/my-house-search` (sign-in required)
- Auth session is global across both modules

---

## Module layout

`HouseSearchShell` at `/my-house-search`:

```
TopNav (shared)
├── HouseListPanel (left, ~260px)     │  HouseSearchMap (center)  │  HouseDetailPanel (right, ~300px)
│   - Add house button              │  - Bay Area map           │  - Selected house details
│   - Status filters                │  - Visited/planned pins   │  - Inline edit + save
│   - Search/filter list              │  - Hover tooltip          │  - Area context (census/schools)
│   - Compare selected (link)       │                           │  - Delete / View in Explore
```

**Mobile:** bottom sheets for list and detail (same pattern as `AppShell` mobile panels).

**Signed out:** full-page `SignInPrompt` with sign-in CTA.

---

## User flows

### Add a house

1. User clicks "Add house" in `HouseListPanel`
2. Enters address → geocoded via existing `/api/geocode` ([`src/lib/geocode-places.ts`](../src/lib/geocode-places.ts))
3. Tract resolved client-side via `resolveTractAtPoint` ([`src/lib/geocode.ts`](../src/lib/geocode.ts))
4. Neighbourhood label resolved via `resolveAreaSelection(geoid)`
5. User fills status (`visited` | `planned`), beds, baths, sqft, prices, notes, rating, visit date
6. `POST /api/houses` saves to Supabase
7. Map flies to new pin; house opens in detail panel

### View / edit a house

- Click pin on map or row in list → `HouseDetailPanel` shows full record
- User edits fields inline and saves via `PATCH /api/houses/[id]`
- "View in Explore" links to `/?geoid=...` on the main map

### Compare houses

1. User selects 2–4 houses in `HouseListPanel`
2. Navigates to `/my-house-search/compare?ids=...`
3. Side-by-side table with two sections:
   - **Fixed fields:** address, status, beds, baths, sqft, prices, rating, visit date, notes
   - **Custom criteria:** user-defined parameters (see below) with per-house values
4. User can add/rename/remove custom criteria from the compare view; changes apply across all their houses

### Custom notes

Each house has a single freeform **`notes`** field (unlimited text):

- Editable in `HouseDetailPanel` and when adding a house
- First ~80 characters shown in map hover tooltip
- Full notes shown in compare table row

This is general-purpose notes (e.g. "Great kitchen, noisy street"). Structured scoring uses **custom criteria** instead.

### Custom comparison criteria

Users define their own parameters to compare houses on criteria that matter to them:

| Example criterion | Type | Example values |
|-------------------|------|----------------|
| Natural light | Rating 1–5 | 4, 5, 3 |
| Yard size | Text | Large, Small, None |
| Walk to BART | Yes/No | Yes, No |
| Renovation needed | Rating 1–5 | 2, 4, 1 |

**How it works:**

1. User creates criteria once (label + value type: `text`, `number`, `rating`, or `boolean`)
2. Each house stores a value per criterion in `HouseDetailPanel`
3. Compare view renders a row per criterion alongside fixed fields
4. Criteria are **per user** (shared across all their houses), not per house

---

## Authentication

Neighbourly currently uses Supabase for **server admin** only ([`src/lib/supabase.ts`](../src/lib/supabase.ts)). This feature introduces **user auth** as a shared foundation.

| Approach | Detail |
|----------|--------|
| Provider | Supabase Auth (email magic link or Google OAuth) |
| Client | `@supabase/ssr` browser client with session cookies |
| Server | Session verification on `/api/houses` routes; `401` if unauthenticated |
| Optional | Middleware guard on `/my-house-search/*` |

### Access rules

| Action | Signed out | Signed in |
|--------|------------|-----------|
| Explore map (`/`) | Yes | Yes |
| Open `/my-house-search` | Sign-in prompt | Yes |
| Add / edit / delete house | No | Yes |
| Compare homes | No | Yes |

---

## Data model

Migration: `supabase/migrations/003_houses.sql`

```sql
create type house_visit_status as enum ('visited', 'planned');

create table houses (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  address         text not null,
  lat             double precision not null,
  lng             double precision not null,
  status          house_visit_status not null default 'planned',
  beds            smallint,
  baths           numeric(3,1),
  sqft            integer,
  list_price      integer,
  offer_price     integer,
  notes           text,
  neighbourhood   text,
  geoid           text,
  neighbourhood_id text,
  rating          smallint check (rating between 1 and 5),
  visit_date      date,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table houses enable row level security;
-- RLS policies: select/insert/update/delete where user_id = auth.uid()

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

alter table comparison_criteria enable row level security;
alter table house_criterion_values enable row level security;
-- RLS: user_id = auth.uid() on criteria; house ownership via join on house_criterion_values
```

TypeScript types to add in [`src/types/index.ts`](../src/types/index.ts):

```ts
export type HouseVisitStatus = "visited" | "planned";
export type CriterionValueType = "text" | "number" | "rating" | "boolean";

export interface ComparisonCriterion {
  id: string;
  label: string;
  valueType: CriterionValueType;
  sortOrder: number;
}

export interface HouseCriterionValue {
  criterionId: string;
  valueText?: string;
  valueNumber?: number;
  valueRating?: number;
  valueBoolean?: boolean;
}

export interface SavedHouse {
  id: string;
  address: string;
  lat: number;
  lng: number;
  status: HouseVisitStatus;
  beds?: number;
  baths?: number;
  sqft?: number;
  listPrice?: number;
  offerPrice?: number;
  notes?: string;                    // freeform notes
  customValues?: HouseCriterionValue[]; // structured custom criteria
  neighbourhood?: string;
  geoid?: string;
  neighbourhoodId?: string | null;
  rating?: number;
  visitDate?: string;
}
```

---

## API routes

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/houses` | GET | Required | List user's houses |
| `/api/houses` | POST | Required | Create house |
| `/api/houses/[id]` | PATCH | Required | Update house |
| `/api/houses/[id]` | DELETE | Required | Delete house |
| `/api/criteria` | GET, POST | Required | List / create comparison criteria |
| `/api/criteria/[id]` | PATCH, DELETE | Required | Update / delete a criterion |
| `/api/houses/[id]/criteria` | PUT | Required | Upsert custom values for a house |

All routes verify Supabase session JWT. Row-level security enforces `user_id = auth.uid()`.

---

## State management

New Zustand store: `src/store/useHouseTrackerStore.ts` (separate from `useAppStore`).

```ts
{
  houses: SavedHouse[];
  selectedHouseId: string | null;
  statusFilter: "all" | "visited" | "planned";
  compareIds: string[];
  loading: boolean;
}
```

Hook: `src/hooks/useHouseTracker.ts` — loads on sign-in, clears on sign-out, optimistic CRUD.

House selection is **independent** from area selection (`selectedGeoid` in `useAppStore`).

---

## Map behavior

Component: `src/components/house-search/HouseSearchMap.tsx` (adapted from [`NeighbourhoodMap.tsx`](../src/components/map/NeighbourhoodMap.tsx)).

- Bay Area basemap (`BAY_AREA_BOUNDS`, `BAY_AREA_CENTER`)
- Pin colors: **teal** = planned, **amber** = visited
- Hover → `HouseMapTooltip` (address, status, beds/baths, neighbourhood, notes preview)
- Click pin → select house in store
- Fit bounds to all pins on load (with max zoom cap)
- No census layer toggle in v1

Does **not** modify the explore page map.

---

## File structure (new)

```
src/
  app/
    my-house-search/
      page.tsx
      compare/
        page.tsx
  components/
    house-search/
      HouseSearchShell.tsx
      HouseSearchMap.tsx
      HouseMapTooltip.tsx
      HouseListPanel.tsx
      HouseDetailPanel.tsx
      AddHouseForm.tsx
      HouseCompareView.tsx
      CustomCriteriaEditor.tsx
      SignInPrompt.tsx
  hooks/
    useAuth.ts
    useHouseTracker.ts
  store/
    useHouseTrackerStore.ts
  lib/
    supabase-browser.ts
    supabase-server.ts
```

**Modified existing files:**

- [`src/components/layout/TopNav.tsx`](../src/components/layout/TopNav.tsx) — nav tabs + sign-in
- [`src/types/index.ts`](../src/types/index.ts) — `SavedHouse` types

**Reused unchanged:** geocode utilities, census/school hooks, tract resolution.

---

## Implementation phases

| Phase | Scope |
|-------|-------|
| **1 — Auth** | Supabase browser/server clients, `useAuth`, sign-in UI in TopNav, protect API routes |
| **2 — Data** | Migration + RLS, `/api/houses` CRUD, `useHouseTracker` hook |
| **3 — Shell** | `/my-house-search` route, `HouseSearchShell`, TopNav links, sign-in gate |
| **4 — Add + map** | `AddHouseForm`, `HouseListPanel`, `HouseSearchMap` with pins + tooltip |
| **5 — Detail** | `HouseDetailPanel` with inline edit, notes, custom criteria values, census/school enrichment |
| **6 — Compare** | `/my-house-search/compare` with fixed fields + custom criteria rows; `CustomCriteriaEditor` to manage criteria |

---

## Verification checklist

- [ ] `/` unchanged — no house pins, Social Pulse works as today
- [ ] Signed out → `/my-house-search` shows sign-in prompt
- [ ] Signed in → houses persist across refresh
- [ ] Add address → pin appears, detail panel opens
- [ ] Select from list or map → detail panel updates
- [ ] Compare 2–4 houses at `/my-house-search/compare?ids=...` (fixed + custom criteria)
- [ ] Add custom criterion → appears on all houses; fill per-house values in detail panel
- [ ] Notes save and show in tooltip preview + compare row
- [ ] "View in Explore" links to main map with correct geoid
- [ ] RLS: user A cannot read user B's houses

---

## Related context

- **Zillow / listing data:** Not planned for v1. See feasibility notes — no public Zillow API; manual user input is the intended model.
- **Existing explore flow:** Area selection via `useAppStore`, census layers, school rankings artifact — all remain on `/` only.
