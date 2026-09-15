-- TravelPro Database Schema
-- Run this in the Supabase SQL editor after creating a new project

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz default now()
);

-- Auto-create profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- TRIPS
-- ============================================================
create table public.trips (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references public.profiles(id) on delete cascade,
  title            text not null,
  description      text,
  start_date       date,
  end_date         date,
  cover_image_url  text,
  invite_token     text unique default encode(gen_random_bytes(12), 'hex'),
  created_at       timestamptz default now()
);

-- ============================================================
-- TRIP MEMBERS
-- ============================================================
create table public.trip_members (
  trip_id   uuid not null references public.trips(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  role      text not null default 'member',
  joined_at timestamptz default now(),
  primary key (trip_id, user_id)
);

-- Index for reverse lookups (is_trip_member queries by user_id)
create index idx_trip_members_user_id on public.trip_members(user_id);

-- ============================================================
-- STOPS (itinerary)
-- ============================================================
create table public.stops (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid not null references public.trips(id) on delete cascade,
  created_by    uuid not null references public.profiles(id),
  title         text not null,
  notes         text,
  location_name text,
  lat           double precision,
  lng           double precision,
  start_time    timestamptz,
  end_time      timestamptz,
  day_index     int,
  sort_order    int default 0,
  created_at    timestamptz default now()
);

-- ============================================================
-- EXPENSES
-- ============================================================
create table public.expenses (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  title      text not null,
  amount     numeric(12, 2) not null,
  currency   text not null default 'USD',
  paid_by    uuid not null references public.profiles(id),
  stop_id    uuid references public.stops(id) on delete set null,
  created_at timestamptz default now()
);

-- ============================================================
-- EXPENSE SPLITS
-- ============================================================
create table public.expense_splits (
  id         uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id    uuid not null references public.profiles(id),
  share      numeric(12, 2) not null
);

-- ============================================================
-- MEDIA
-- ============================================================
create table public.media (
  id             uuid primary key default gen_random_uuid(),
  trip_id        uuid not null references public.trips(id) on delete cascade,
  uploaded_by    uuid not null references public.profiles(id),
  stop_id        uuid references public.stops(id) on delete set null,
  storage_path   text not null,
  file_name      text not null,
  mime_type      text not null,
  size_bytes     bigint,
  thumbnail_path text,
  created_at     timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Helper: check if the current user is a member of a given trip
create or replace function is_trip_member(trip uuid) returns boolean as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = trip and user_id = auth.uid()
  );
$$ language sql security definer stable;

-- PROFILES
alter table public.profiles enable row level security;
create policy "profiles: anyone can read" on public.profiles for select using (true);
create policy "profiles: owner update" on public.profiles for update using (auth.uid() = id);

-- TRIPS
alter table public.trips enable row level security;
create policy "trips: member read" on public.trips for select using (is_trip_member(id));
create policy "trips: authenticated insert" on public.trips for insert with check (auth.uid() = owner_id);
create policy "trips: owner update" on public.trips for update using (owner_id = auth.uid());
create policy "trips: owner delete" on public.trips for delete using (owner_id = auth.uid());

-- TRIP_MEMBERS
alter table public.trip_members enable row level security;
create policy "trip_members: member read" on public.trip_members for select using (is_trip_member(trip_id));
create policy "trip_members: owner insert" on public.trip_members for insert
  with check (
    auth.uid() = user_id or
    exists (select 1 from public.trips where id = trip_id and owner_id = auth.uid())
  );
create policy "trip_members: self delete" on public.trip_members for delete using (user_id = auth.uid());

-- STOPS
alter table public.stops enable row level security;
create policy "stops: member all" on public.stops for all using (is_trip_member(trip_id));

-- EXPENSES
alter table public.expenses enable row level security;
create policy "expenses: member all" on public.expenses for all using (is_trip_member(trip_id));

-- EXPENSE_SPLITS
alter table public.expense_splits enable row level security;
create policy "expense_splits: member select" on public.expense_splits for select
  using (exists (select 1 from public.expenses e where e.id = expense_id and is_trip_member(e.trip_id)));
create policy "expense_splits: member insert" on public.expense_splits for insert
  with check (exists (select 1 from public.expenses e where e.id = expense_id and is_trip_member(e.trip_id)));
create policy "expense_splits: member delete" on public.expense_splits for delete
  using (exists (select 1 from public.expenses e where e.id = expense_id and is_trip_member(e.trip_id)));

-- MEDIA
alter table public.media enable row level security;
create policy "media: member all" on public.media for all using (is_trip_member(trip_id));

-- ============================================================
-- STOP COMMENTS
-- ============================================================
create table public.stop_comments (
  id             uuid primary key default gen_random_uuid(),
  stop_id        uuid not null references public.stops(id) on delete cascade,
  trip_id        uuid not null references public.trips(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  text           text not null,
  created_at     timestamptz default now()
);

alter table public.stop_comments enable row level security;
create policy "stop_comments: member all" on public.stop_comments for all using (is_trip_member(trip_id));

-- ============================================================
-- STOP VOTES
-- ============================================================
create table public.stop_votes (
  stop_id        uuid not null references public.stops(id) on delete cascade,
  trip_id        uuid not null references public.trips(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  vote           int not null check (vote in (1, -1)),
  created_at     timestamptz default now(),
  primary key (stop_id, user_id)
);

alter table public.stop_votes enable row level security;
create policy "stop_votes: member all" on public.stop_votes for all using (is_trip_member(trip_id));

-- ============================================================
-- TRIP CHECKLIST
-- ============================================================
create table public.trip_checklist (
  id             uuid primary key default gen_random_uuid(),
  trip_id        uuid not null references public.trips(id) on delete cascade,
  user_id        uuid not null references public.profiles(id),
  label          text not null,
  checked        boolean default false,
  sort_order     int default 0,
  created_at     timestamptz default now()
);

alter table public.trip_checklist enable row level security;
create policy "trip_checklist: member all" on public.trip_checklist for all using (is_trip_member(trip_id));

-- ============================================================
-- TRIP MESSAGES
-- ============================================================
create table public.trip_messages (
  id             uuid primary key default gen_random_uuid(),
  trip_id        uuid not null references public.trips(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  message        text not null,
  created_at     timestamptz default now()
);

alter table public.trip_messages enable row level security;
create policy "trip_messages: member all" on public.trip_messages for all using (is_trip_member(trip_id));

-- ============================================================
-- PACKING ITEMS
-- ============================================================
create table public.packing_items (
  id             uuid primary key default gen_random_uuid(),
  trip_id        uuid not null references public.trips(id) on delete cascade,
  created_by     uuid not null references public.profiles(id),
  text           text not null,
  checked        boolean default false,
  sort_order     int default 0,
  assigned_to    uuid references public.profiles(id) on delete set null,
  created_at     timestamptz default now()
);

alter table public.packing_items enable row level security;
create policy "packing_items: member all" on public.packing_items for all using (is_trip_member(trip_id));

-- ============================================================
-- PACKING TEMPLATES
-- ============================================================
create table public.packing_templates (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  name           text not null,
  created_at     timestamptz default now()
);

alter table public.packing_templates enable row level security;
create policy "packing_templates: creator all" on public.packing_templates for all using (user_id = auth.uid());

-- ============================================================
-- PACKING TEMPLATE ITEMS
-- ============================================================
create table public.packing_template_items (
  id             uuid primary key default gen_random_uuid(),
  template_id    uuid not null references public.packing_templates(id) on delete cascade,
  text           text not null,
  sort_order     int default 0,
  created_at     timestamptz default now()
);

alter table public.packing_template_items enable row level security;
create policy "packing_template_items: creator all" on public.packing_template_items for all
  using (exists (select 1 from public.packing_templates where id = template_id and user_id = auth.uid()));

-- ============================================================
-- STORAGE
-- ============================================================
-- Run in Supabase Dashboard → Storage → New Bucket:
--   Name: trip-media
--   Public: OFF (private bucket)
--
-- Then add this storage policy via Dashboard → Storage → Policies:
--   Bucket: trip-media
--   Policy name: trip members access
--   Definition: (auth.uid() is not null)  [rely on RLS on media table + signed URLs]
