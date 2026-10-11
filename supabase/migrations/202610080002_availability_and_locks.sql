alter table public.bookings drop constraint check_booking_times;
alter table public.bookings
  add constraint check_booking_times
  check (
    end_time > start_time or
    (end_time = time '00:00:00' and start_time <> time '00:00:00')
  );

alter table public.locks drop constraint check_lock_times;
alter table public.locks
  add constraint check_lock_times
  check (
    end_time > start_time or
    (end_time = time '00:00:00' and start_time <> time '00:00:00')
  );

create or replace function public.get_public_bookings_by_date(p_booking_date date)
returns table (court_id uuid, start_time time, end_time time)
language sql
stable
security definer
set search_path = ''
as $$
  select b.court_id, b.start_time, b.end_time
  from public.bookings as b
  where b.booking_date = p_booking_date
    and b.status = 'confirmed';
$$;

grant execute on function public.get_public_bookings_by_date(date) to anon, authenticated;

create or replace function public.get_affected_bookings_for_lock(
  p_lock_type text,
  p_court_scope text,
  p_court_id uuid,
  p_specific_date date,
  p_day_of_week integer,
  p_start_time time,
  p_end_time time
)
returns table (
  booking_id uuid,
  booking_date date,
  start_time time,
  court_name text,
  player_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    b.id,
    b.booking_date,
    b.start_time,
    c.name,
    coalesce(nullif(b.manual_player_name, ''), nullif(trim(concat(p.first_name, ' ', p.last_name)), ''), 'Jugador registrado')
  from public.bookings as b
  join public.courts as c on c.id = b.court_id
  left join public.profiles as p on p.id = b.player_id
  where public.is_owner()
    and b.status = 'confirmed'
    and b.booking_date >= (now() at time zone 'America/Argentina/Buenos_Aires')::date
    and (
      (p_lock_type = 'one_time' and b.booking_date = p_specific_date) or
      (p_lock_type = 'recurring' and extract(dow from b.booking_date)::integer = p_day_of_week)
    )
    and (p_court_scope = 'both' or b.court_id = p_court_id)
    and (extract(hour from b.start_time) * 60 + extract(minute from b.start_time)) <
      case when p_end_time = time '00:00:00' then 1440 else extract(hour from p_end_time) * 60 + extract(minute from p_end_time) end
    and (case when b.end_time = time '00:00:00' then 1440 else extract(hour from b.end_time) * 60 + extract(minute from b.end_time) end) >
      (extract(hour from p_start_time) * 60 + extract(minute from p_start_time))
  order by b.booking_date, b.start_time;
$$;

revoke all on function public.get_affected_bookings_for_lock(text, text, uuid, date, integer, time, time) from public;
grant execute on function public.get_affected_bookings_for_lock(text, text, uuid, date, integer, time, time) to authenticated;