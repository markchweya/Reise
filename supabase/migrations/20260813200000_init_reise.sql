create extension if not exists pgcrypto;

create type public.shift_status as enum ('active', 'paused', 'completed', 'handed_over', 'ended_early', 'technical_problem');
create type public.location_source as enum ('reise_simulated_gps', 'reise_browser_gps', 'official_vehicle_position', 'future_onboard_system', 'scheduled_interpolation');
create type public.disruption_category as enum ('traffic', 'roadworks', 'accident', 'event', 'stop_closure', 'diversion', 'breakdown', 'cancellation');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  preferred_language text not null default 'en' check (preferred_language in ('en','de','fr','it')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.travel_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  travelcard text not null default 'none' check (travelcard in ('none','half_fare','ga','regional')),
  priority text not null default 'fastest' check (priority in ('fastest','fewest_transfers','least_walking','cheapest','accessible')),
  max_transfers smallint not null default 2 check (max_transfers between 0 and 6),
  max_walking_metres integer not null default 1200 check (max_walking_metres between 0 and 10000),
  walking_speed text not null default 'normal' check (walking_speed in ('slow','normal','fast')),
  accessibility_required boolean not null default false, saved_locations jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
create table public.notification_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  vehicle_approaching boolean not null default true, wrong_direction boolean not null default true,
  prepare_to_alight boolean not null default true, connection_risk boolean not null default true,
  disruption_changes boolean not null default true, live_location_lost boolean not null default true,
  updated_at timestamptz not null default now()
);
create table public.operators (
  id uuid primary key default gen_random_uuid(), name text not null unique, public_code text not null unique,
  created_at timestamptz not null default now()
);
create table public.drivers (
  id uuid primary key default gen_random_uuid(), profile_id uuid unique references public.profiles(id) on delete set null,
  operator_id uuid not null references public.operators(id), driver_code text not null unique,
  pin_hash text not null, failed_attempts smallint not null default 0, locked_until timestamptz,
  active boolean not null default true, created_at timestamptz not null default now()
);
create table public.vehicles (
  id uuid primary key default gen_random_uuid(), operator_id uuid not null references public.operators(id),
  fleet_number text not null, public_code text not null unique, accessible boolean not null default true,
  status text not null default 'offline' check (status in ('offline','assigned','active','maintenance')),
  created_at timestamptz not null default now(), unique(operator_id, fleet_number)
);
create table public.stops (
  id text primary key, name text not null, latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180), accessible boolean not null default false,
  platform text, source text not null default 'reise_test_network', created_at timestamptz not null default now()
);
create table public.routes (
  id text primary key, operator_id uuid not null references public.operators(id), line_code text not null,
  direction_id text not null, destination text not null, colour text not null default '#EB0000',
  source text not null default 'reise_test_network', unique(line_code, direction_id)
);
create table public.route_stops (
  route_id text not null references public.routes(id) on delete cascade, stop_id text not null references public.stops(id),
  stop_sequence integer not null check (stop_sequence >= 0), scheduled_offset_minutes integer not null default 0,
  primary key(route_id, stop_sequence), unique(route_id, stop_id)
);
create table public.service_calendars (
  id uuid primary key default gen_random_uuid(), service_code text not null unique,
  monday boolean not null, tuesday boolean not null, wednesday boolean not null, thursday boolean not null,
  friday boolean not null, saturday boolean not null, sunday boolean not null,
  start_date date not null, end_date date not null check (end_date >= start_date)
);
create table public.trips (
  id text primary key, route_id text not null references public.routes(id), service_calendar_id uuid references public.service_calendars(id),
  scheduled_departure time not null, accessible boolean not null default true, cancelled boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.stop_times (
  trip_id text not null references public.trips(id) on delete cascade, stop_id text not null references public.stops(id),
  stop_sequence integer not null, arrival_time time not null, departure_time time not null,
  primary key(trip_id, stop_sequence), unique(trip_id, stop_id)
);
create table public.walking_connections (
  from_stop_id text not null references public.stops(id), to_stop_id text not null references public.stops(id),
  distance_metres integer not null check (distance_metres > 0), duration_minutes integer not null check (duration_minutes > 0),
  accessible boolean not null default true, primary key(from_stop_id, to_stop_id)
);
create table public.disruptions (
  id uuid primary key default gen_random_uuid(), category public.disruption_category not null,
  severity text not null check (severity in ('minor','moderate','major')), affected_route_ids text[] not null default '{}',
  affected_stop_ids text[] not null default '{}', note text not null check (char_length(note) between 1 and 500),
  starts_at timestamptz not null default now(), clears_at timestamptz, active boolean not null default true,
  reported_by_driver_id uuid references public.drivers(id), created_at timestamptz not null default now()
);
create table public.fare_products (
  id uuid primary key default gen_random_uuid(), name text not null, product_type text not null,
  base_price_chf numeric(7,2) not null check (base_price_chf >= 0), travelcard text not null default 'none',
  is_prototype boolean not null default true, valid_from timestamptz not null default now(), valid_until timestamptz
);
create table public.driver_shifts (
  id uuid primary key default gen_random_uuid(), driver_id uuid not null references public.drivers(id),
  vehicle_id uuid not null references public.vehicles(id), trip_id text not null references public.trips(id),
  status public.shift_status not null default 'active', location_source public.location_source not null,
  started_at timestamptz not null default now(), ended_at timestamptz, end_note text,
  check (ended_at is null or ended_at >= started_at)
);
create unique index one_active_shift_per_driver on public.driver_shifts(driver_id) where status in ('active','paused');
create unique index one_active_shift_per_vehicle on public.driver_shifts(vehicle_id) where status in ('active','paused');
create table public.vehicle_assignments (
  id uuid primary key default gen_random_uuid(), shift_id uuid not null unique references public.driver_shifts(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id), route_id text not null references public.routes(id),
  trip_id text not null references public.trips(id), direction_id text not null, confirmed_at timestamptz not null default now()
);
create table public.vehicle_positions (
  id bigint generated always as identity primary key, shift_id uuid not null references public.driver_shifts(id),
  vehicle_id uuid not null references public.vehicles(id), fleet_number text not null, line_code text not null,
  route_id text not null references public.routes(id), direction_id text not null, trip_id text not null references public.trips(id),
  latitude double precision not null check (latitude between -90 and 90), longitude double precision not null check (longitude between -180 and 180),
  bearing numeric(6,2) not null check (bearing between 0 and 360), speed_kph numeric(6,2) not null check (speed_kph between 0 and 160),
  accuracy_metres numeric(7,2) not null check (accuracy_metres > 0), current_stop_id text references public.stops(id), next_stop_id text references public.stops(id),
  delay_minutes integer not null default 0, location_source public.location_source not null,
  device_timestamp timestamptz not null, server_timestamp timestamptz not null default now(), retained_until timestamptz
);
create unique index deduplicate_positions on public.vehicle_positions(shift_id, device_timestamp);
create index recent_vehicle_positions on public.vehicle_positions(vehicle_id, server_timestamp desc);
create table public.shift_handovers (
  id uuid primary key default gen_random_uuid(), outgoing_shift_id uuid not null references public.driver_shifts(id),
  incoming_shift_id uuid references public.driver_shifts(id), token_hash text not null, expires_at timestamptz not null,
  used_at timestamptz, created_at timestamptz not null default now(), check (expires_at > created_at)
);
create table public.journey_sessions (
  id uuid primary key default gen_random_uuid(), profile_id uuid references public.profiles(id) on delete set null,
  origin_stop_id text references public.stops(id), destination_stop_id text references public.stops(id),
  selected_trip_ids text[] not null default '{}', context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), expires_at timestamptz not null default (now() + interval '24 hours')
);

create or replace function public.reject_inactive_shift_position() returns trigger language plpgsql security definer set search_path=public as $$
declare current_shift public.driver_shifts;
begin
  select * into current_shift from public.driver_shifts where id = new.shift_id for update;
  if current_shift.status not in ('active','paused') or current_shift.vehicle_id <> new.vehicle_id then
    raise exception 'Position rejected: shift is not active for this vehicle';
  end if;
  if new.device_timestamp > now() + interval '2 minutes' or new.device_timestamp < now() - interval '10 minutes' then
    raise exception 'Position rejected: timestamp outside freshness window';
  end if;
  return new;
end $$;
create trigger validate_position_before_insert before insert on public.vehicle_positions for each row execute function public.reject_inactive_shift_position();

alter table public.profiles enable row level security;
alter table public.travel_preferences enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.drivers enable row level security;
alter table public.driver_shifts enable row level security;
alter table public.vehicle_assignments enable row level security;
alter table public.vehicle_positions enable row level security;
alter table public.shift_handovers enable row level security;
alter table public.journey_sessions enable row level security;
alter table public.operators enable row level security;
alter table public.vehicles enable row level security;
alter table public.stops enable row level security;
alter table public.routes enable row level security;
alter table public.route_stops enable row level security;
alter table public.service_calendars enable row level security;
alter table public.trips enable row level security;
alter table public.stop_times enable row level security;
alter table public.walking_connections enable row level security;
alter table public.disruptions enable row level security;
alter table public.fare_products enable row level security;

create policy "public transport data is readable" on public.stops for select using (true);
create policy "public routes are readable" on public.routes for select using (true);
create policy "public route stops are readable" on public.route_stops for select using (true);
create policy "public calendars are readable" on public.service_calendars for select using (true);
create policy "public trips are readable" on public.trips for select using (true);
create policy "public stop times are readable" on public.stop_times for select using (true);
create policy "public walking connections are readable" on public.walking_connections for select using (true);
create policy "public disruptions are readable" on public.disruptions for select using (true);
create policy "public prototype fares are readable" on public.fare_products for select using (true);
create policy "public operators are readable" on public.operators for select using (true);
create policy "public vehicles are readable" on public.vehicles for select using (true);
create policy "recent positions are publicly readable" on public.vehicle_positions for select using (server_timestamp > now() - interval '24 hours');
create policy "users manage own profile" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "users manage own travel preferences" on public.travel_preferences for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "users manage own notifications" on public.notification_preferences for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "users manage own journeys" on public.journey_sessions for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "drivers view own account" on public.drivers for select using (profile_id = auth.uid());
create policy "drivers view own shifts" on public.driver_shifts for select using (driver_id in (select id from public.drivers where profile_id = auth.uid()));
create policy "drivers write assigned positions" on public.vehicle_positions for insert with check (
  shift_id in (select ds.id from public.driver_shifts ds join public.drivers d on d.id=ds.driver_id where d.profile_id=auth.uid() and ds.status in ('active','paused') and ds.vehicle_id=vehicle_positions.vehicle_id)
);

alter publication supabase_realtime add table public.vehicle_positions;
alter publication supabase_realtime add table public.disruptions;
