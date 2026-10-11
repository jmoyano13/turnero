create or replace function public.owner_booking_slot_conflicts(
  p_court_id uuid,
  p_booking_date date,
  p_start_time time,
  p_end_time time,
  p_exclude_booking_id uuid default null
)
returns boolean
language sql
volatile
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.bookings as b
    where b.status = 'confirmed'
      and b.court_id = p_court_id
      and b.id is distinct from p_exclude_booking_id
      and b.booking_date between p_booking_date - 1 and p_booking_date
      and b.booking_date + b.start_time < p_booking_date + p_end_time
        + case when p_end_time <= p_start_time then interval '1 day' else interval '0' end
      and b.booking_date + b.end_time
        + case when b.end_time <= b.start_time then interval '1 day' else interval '0' end
        > p_booking_date + p_start_time
  ) or exists (
    select 1
    from public.locks as l
    cross join lateral generate_series(
      p_booking_date - 1,
      p_booking_date,
      interval '1 day'
    ) as candidate(lock_start)
    where l.is_active
      and (l.court_scope = 'both' or l.court_id = p_court_id)
      and (
        (l.lock_type = 'one_time' and l.specific_date = candidate.lock_start::date)
        or
        (l.lock_type = 'recurring' and extract(dow from candidate.lock_start)::integer = l.day_of_week)
      )
      and candidate.lock_start + l.start_time < p_booking_date + p_end_time
        + case when p_end_time <= p_start_time then interval '1 day' else interval '0' end
      and candidate.lock_start + l.end_time
        + case when l.end_time <= l.start_time then interval '1 day' else interval '0' end
        > p_booking_date + p_start_time
  );
$$;

create or replace function public.owner_create_manual_booking(
  p_court_id uuid,
  p_booking_date date,
  p_start_time time,
  p_player_id uuid,
  p_manual_player_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_end_time time;
  v_price numeric(10, 2);
  v_booking_id uuid;
begin
  if not public.is_owner() then
    return jsonb_build_object('success', false, 'reason', 'FORBIDDEN');
  end if;

  if p_court_id is null or p_booking_date is null or p_start_time is null
    or extract(epoch from p_start_time)::integer / 60 % 90 <> 0
    or (p_player_id is null and nullif(trim(p_manual_player_name), '') is null)
    or (p_player_id is not null and nullif(trim(p_manual_player_name), '') is not null) then
    return jsonb_build_object('success', false, 'reason', 'INVALID_INPUT');
  end if;

  v_end_time := (p_start_time + interval '90 minutes')::time;
  perform pg_advisory_xact_lock(hashtextextended(
    'owner-booking:' || p_court_id::text || ':' || p_booking_date::text,
    0
  ));

  if public.owner_booking_slot_conflicts(p_court_id, p_booking_date, p_start_time, v_end_time) then
    return jsonb_build_object('success', false, 'reason', 'SLOT_UNAVAILABLE');
  end if;

  select current_price into v_price
  from public.system_settings
  where id = 1
  for share;

  if v_price is null then
    return jsonb_build_object('success', false, 'reason', 'PRICE_NOT_CONFIGURED');
  end if;

  insert into public.bookings (
    court_id, player_id, manual_player_name, booking_date, start_time, end_time,
    status, is_manual, total_price, deposit_amount, payment_status
  ) values (
    p_court_id,
    p_player_id,
    case when p_player_id is null then trim(p_manual_player_name) else null end,
    p_booking_date,
    p_start_time,
    v_end_time,
    'confirmed',
    true,
    v_price,
    0,
    'none'
  ) returning id into v_booking_id;

  return jsonb_build_object('success', true, 'booking_id', v_booking_id, 'total_price', v_price);
exception
  when unique_violation then
    return jsonb_build_object('success', false, 'reason', 'SLOT_UNAVAILABLE');
end;
$$;

create or replace function public.owner_update_booking(
  p_booking_id uuid,
  p_court_id uuid,
  p_booking_date date,
  p_start_time time
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_initial public.bookings%rowtype;
  v_booking public.bookings%rowtype;
  v_first_key text;
  v_second_key text;
  v_end_time time;
begin
  if not public.is_owner() then
    return jsonb_build_object('success', false, 'reason', 'FORBIDDEN');
  end if;

  if p_booking_id is null or p_court_id is null or p_booking_date is null or p_start_time is null
    or extract(epoch from p_start_time)::integer / 60 % 90 <> 0 then
    return jsonb_build_object('success', false, 'reason', 'INVALID_INPUT');
  end if;

  select * into v_initial
  from public.bookings
  where id = p_booking_id and status = 'confirmed';

  if not found then
    return jsonb_build_object('success', false, 'reason', 'BOOKING_NOT_FOUND');
  end if;

  v_first_key := 'owner-booking:' || v_initial.court_id::text || ':' || v_initial.booking_date::text;
  v_second_key := 'owner-booking:' || p_court_id::text || ':' || p_booking_date::text;
  if v_first_key <= v_second_key then
    perform pg_advisory_xact_lock(hashtextextended(v_first_key, 0));
    if v_second_key <> v_first_key then
      perform pg_advisory_xact_lock(hashtextextended(v_second_key, 0));
    end if;
  else
    perform pg_advisory_xact_lock(hashtextextended(v_second_key, 0));
    perform pg_advisory_xact_lock(hashtextextended(v_first_key, 0));
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if v_booking.status <> 'confirmed' then
    return jsonb_build_object('success', false, 'reason', 'BOOKING_NOT_FOUND');
  end if;
  if v_booking.court_id is distinct from v_initial.court_id
    or v_booking.booking_date is distinct from v_initial.booking_date then
    return jsonb_build_object('success', false, 'reason', 'BOOKING_CHANGED_RETRY');
  end if;

  v_end_time := (p_start_time + interval '90 minutes')::time;
  if public.owner_booking_slot_conflicts(p_court_id, p_booking_date, p_start_time, v_end_time, p_booking_id) then
    return jsonb_build_object('success', false, 'reason', 'SLOT_UNAVAILABLE');
  end if;

  update public.bookings
  set court_id = p_court_id,
      booking_date = p_booking_date,
      start_time = p_start_time,
      end_time = v_end_time,
      updated_at = now()
  where id = p_booking_id;

  return jsonb_build_object('success', true, 'booking_id', p_booking_id);
exception
  when unique_violation then
    return jsonb_build_object('success', false, 'reason', 'SLOT_UNAVAILABLE');
end;
$$;

create or replace function public.owner_cancel_booking(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_initial public.bookings%rowtype;
  v_booking public.bookings%rowtype;
  v_refund_required boolean;
begin
  if not public.is_owner() then
    return jsonb_build_object('success', false, 'reason', 'FORBIDDEN');
  end if;

  select * into v_initial
  from public.bookings
  where id = p_booking_id and status = 'confirmed';

  if not found then
    return jsonb_build_object('success', false, 'reason', 'BOOKING_NOT_FOUND');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'owner-booking:' || v_initial.court_id::text || ':' || v_initial.booking_date::text,
    0
  ));

  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if v_booking.status <> 'confirmed'
    or v_booking.court_id is distinct from v_initial.court_id
    or v_booking.booking_date is distinct from v_initial.booking_date then
    return jsonb_build_object('success', false, 'reason', 'BOOKING_CHANGED_RETRY');
  end if;

  v_refund_required := v_booking.payment_status = 'paid';
  update public.bookings
  set status = 'cancelled',
      payment_status = case when v_refund_required then 'refund_pending'::public.payment_status else payment_status end,
      refund_required = v_refund_required,
      updated_at = now()
  where id = p_booking_id;

  if v_refund_required then
    insert into public.deposit_refunds_log (
      booking_id, player_id, manual_player_name, amount, reason
    ) values (
      v_booking.id, v_booking.player_id, v_booking.manual_player_name,
      v_booking.deposit_amount, 'cancelled_by_owner'
    );
  end if;

  return jsonb_build_object('success', true, 'refund_required', v_refund_required);
end;
$$;

create or replace function public.enforce_confirmed_booking_availability()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_end_time time;
begin
  if new.status <> 'confirmed' then
    return new;
  end if;

  if extract(epoch from new.start_time)::integer / 60 % 90 <> 0 then
    raise exception using errcode = '23514', message = 'Booking start must match the 90-minute slot grid';
  end if;

  v_end_time := (new.start_time + interval '90 minutes')::time;
  if new.end_time <> v_end_time then
    raise exception using errcode = '23514', message = 'Booking duration must be 90 minutes';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'owner-booking:' || new.court_id::text || ':' || new.booking_date::text,
    0
  ));

  if public.owner_booking_slot_conflicts(
    new.court_id,
    new.booking_date,
    new.start_time,
    new.end_time,
    new.id
  ) then
    raise exception using errcode = '23P01', message = 'Booking slot overlaps an active booking or lock';
  end if;

  return new;
end;
$$;

create trigger bookings_enforce_confirmed_availability
before insert or update of court_id, booking_date, start_time, end_time, status
on public.bookings
for each row execute function public.enforce_confirmed_booking_availability();

revoke all on function public.owner_booking_slot_conflicts(uuid, date, time, time, uuid) from public, anon, authenticated;
revoke all on function public.enforce_confirmed_booking_availability() from public, anon, authenticated;
revoke all on function public.owner_create_manual_booking(uuid, date, time, uuid, text) from public, anon;
revoke all on function public.owner_update_booking(uuid, uuid, date, time) from public, anon;
revoke all on function public.owner_cancel_booking(uuid) from public, anon;
grant execute on function public.owner_create_manual_booking(uuid, date, time, uuid, text) to authenticated;
grant execute on function public.owner_update_booking(uuid, uuid, date, time) to authenticated;
grant execute on function public.owner_cancel_booking(uuid) to authenticated;