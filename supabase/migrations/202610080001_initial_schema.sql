create extension if not exists pgcrypto;

create type public.user_role as enum ('owner', 'player');
create type public.booking_status as enum ('confirmed', 'cancelled');
create type public.payment_status as enum ('none', 'pending', 'paid', 'refund_pending');
create type public.lock_type as enum ('one_time', 'recurring');
create type public.lock_scope as enum ('single', 'both');
create type public.refund_status as enum ('pending_manual_refund', 'resolved');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null unique,
  phone_numbers text[] not null default '{}',
  role public.user_role not null default 'player',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.courts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.courts (id, name) values
  ('11111111-1111-1111-1111-111111111111', 'Cancha 1'),
  ('22222222-2222-2222-2222-222222222222', 'Cancha 2')
on conflict (id) do nothing;

create table public.system_settings (
  id integer primary key default 1 check (id = 1),
  current_price numeric(10, 2) not null check (current_price > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

insert into public.system_settings (id, current_price)
values (1, 15000.00)
on conflict (id) do nothing;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  court_id uuid not null references public.courts(id) on delete restrict,
  player_id uuid references public.profiles(id) on delete set null,
  manual_player_name text,
  booking_date date not null,
  start_time time not null,
  end_time time not null,
  status public.booking_status not null default 'confirmed',
  is_manual boolean not null default false,
  total_price numeric(10, 2) not null check (total_price >= 0),
  deposit_amount numeric(10, 2) not null check (deposit_amount >= 0),
  payment_status public.payment_status not null default 'none',
  payment_id text unique,
  paid_at timestamptz,
  refund_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint check_booking_duration check (end_time = start_time + interval '90 minutes'),
  constraint check_manual_player check (
    (is_manual = false and player_id is not null) or
    (is_manual = true and (player_id is not null or nullif(trim(manual_player_name), '') is not null))
  ),
  constraint check_booking_times check (end_time > start_time)
);

create unique index idx_bookings_confirmed_slot
  on public.bookings (court_id, booking_date, start_time)
  where status = 'confirmed';
create index idx_bookings_date_court on public.bookings (booking_date, court_id) where status = 'confirmed';
create index idx_bookings_player on public.bookings (player_id);
create index idx_bookings_payment_id on public.bookings (payment_id) where payment_id is not null;

create table public.locks (
  id uuid primary key default gen_random_uuid(),
  court_id uuid references public.courts(id) on delete cascade,
  court_scope public.lock_scope not null default 'single',
  lock_type public.lock_type not null,
  reason text not null,
  specific_date date,
  day_of_week integer check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint check_lock_target check (
    (court_scope = 'single' and court_id is not null) or
    (court_scope = 'both' and court_id is null)
  ),
  constraint check_lock_type_data check (
    (lock_type = 'one_time' and specific_date is not null and day_of_week is null) or
    (lock_type = 'recurring' and day_of_week is not null and specific_date is null)
  ),
  constraint check_lock_times check (end_time > start_time)
);

create index idx_locks_one_time on public.locks (specific_date, court_id) where lock_type = 'one_time' and is_active;
create index idx_locks_recurring on public.locks (day_of_week, court_id) where lock_type = 'recurring' and is_active;

create table public.deposit_refunds_log (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  player_id uuid references public.profiles(id),
  manual_player_name text,
  amount numeric(10, 2) not null check (amount >= 0),
  reason text not null,
  status public.refund_status not null default 'pending_manual_refund',
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'owner'
  );
$$;

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    if new.role is distinct from old.role then
      raise exception 'Profile role cannot be changed through profile updates';
    end if;
    if new.email is distinct from old.email
      and current_setting('app.sync_profile_email', true) is distinct from 'on' then
      raise exception 'Profile email must be changed through Supabase Auth';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_prevent_role_change
before update on public.profiles
for each row execute function public.prevent_profile_role_change();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  phone_values text[] := '{}';
begin
  if jsonb_typeof(metadata -> 'phone_numbers') = 'array' then
    select coalesce(array_agg(phone), '{}') into phone_values
    from jsonb_array_elements_text(metadata -> 'phone_numbers') as phones(phone);
  elsif nullif(metadata ->> 'phone', '') is not null then
    phone_values := array[metadata ->> 'phone'];
  end if;

  insert into public.profiles (id, first_name, last_name, email, phone_numbers, role)
  values (
    new.id,
    coalesce(nullif(metadata ->> 'first_name', ''), nullif(metadata ->> 'given_name', ''), ''),
    coalesce(nullif(metadata ->> 'last_name', ''), nullif(metadata ->> 'family_name', ''), ''),
    coalesce(new.email, ''),
    phone_values,
    'player'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    perform set_config('app.sync_profile_email', 'on', true);
    update public.profiles set email = coalesce(new.email, '') where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_updated
after update of email on auth.users
for each row execute function public.sync_profile_email();

alter table public.profiles enable row level security;
alter table public.courts enable row level security;
alter table public.system_settings enable row level security;
alter table public.bookings enable row level security;
alter table public.locks enable row level security;
alter table public.deposit_refunds_log enable row level security;

create policy "Read own profile or all profiles as owner"
  on public.profiles for select
  using ((select auth.uid()) = id or (select public.is_owner()));
create policy "Update own profile"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Read courts"
  on public.courts for select using (true);
create policy "Read current price"
  on public.system_settings for select using (true);
create policy "Owner updates settings"
  on public.system_settings for update
  using ((select public.is_owner()))
  with check ((select public.is_owner()));

create policy "Players read own bookings and owners read all"
  on public.bookings for select
  using ((select auth.uid()) = player_id or (select public.is_owner()));
create policy "Players and owners insert bookings"
  on public.bookings for insert
  with check (((select auth.uid()) = player_id and is_manual = false) or (select public.is_owner()));
create policy "Owners or booking player update bookings"
  on public.bookings for update
  using ((select public.is_owner()) or ((select auth.uid()) = player_id and status = 'confirmed'))
  with check ((select public.is_owner()) or ((select auth.uid()) = player_id));

create policy "Read locks"
  on public.locks for select using (true);
create policy "Owners manage locks"
  on public.locks for all
  using ((select public.is_owner()))
  with check ((select public.is_owner()));

create policy "Owners manage refund records"
  on public.deposit_refunds_log for all
  using ((select public.is_owner()))
  with check ((select public.is_owner()));

grant execute on function public.is_owner() to authenticated, anon;

-- Promoción administrativa puntual; ejecutar luego de confirmar identidad:
-- update public.profiles set role = 'owner' where email = 'owner@example.com';