create or replace function public.to_business_timestamptz(p_booking_date date, p_booking_time time)
returns timestamptz
language sql
immutable
security definer
set search_path = ''
as $$
  select make_timestamptz(
    extract(year from p_booking_date)::int,
    extract(month from p_booking_date)::int,
    extract(day from p_booking_date)::int,
    extract(hour from p_booking_time)::int,
    extract(minute from p_booking_time)::int,
    extract(second from p_booking_time)::int,
    'America/Argentina/Buenos_Aires'
  );
$$;

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
      and public.to_business_timestamptz(b.booking_date, b.start_time)
        < public.to_business_timestamptz(p_booking_date, p_end_time)
        + case when p_end_time <= p_start_time then interval '1 day' else interval '0' end
      and public.to_business_timestamptz(b.booking_date, b.end_time)
        + case when b.end_time <= b.start_time then interval '1 day' else interval '0' end
        > public.to_business_timestamptz(p_booking_date, p_start_time)
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
      and public.to_business_timestamptz(candidate.lock_start::date, l.start_time)
        < public.to_business_timestamptz(p_booking_date, p_end_time)
        + case when p_end_time <= p_start_time then interval '1 day' else interval '0' end
      and public.to_business_timestamptz(candidate.lock_start::date, l.end_time)
        + case when l.end_time <= l.start_time then interval '1 day' else interval '0' end
        > public.to_business_timestamptz(p_booking_date, p_start_time)
  );
$$;

create or replace function public.create_booking_payment_attempt(
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
  v_player_id uuid := auth.uid();
  v_now_local timestamp := timezone('America/Argentina/Buenos_Aires', now());
  v_business_date date := v_now_local::date;
  v_end_time time;
  v_price numeric(10, 2);
  v_attempt_id uuid;
  v_slot_start timestamptz;
begin
  if v_player_id is null or not exists (
    select 1 from public.profiles where id = v_player_id and role = 'player'
  ) then
    return jsonb_build_object('success', false, 'reason', 'FORBIDDEN');
  end if;

  if p_court_id is null or p_booking_date is null or p_start_time is null
    or ((extract(epoch from p_start_time)::integer / 60) - 30) % 90 <> 0
    or p_booking_date < v_business_date
    or p_booking_date > v_business_date + 7
  then
    return jsonb_build_object('success', false, 'reason', 'INVALID_OR_EXPIRED_SLOT');
  end if;

  v_slot_start := public.to_business_timestamptz(p_booking_date, p_start_time);
  if v_slot_start <= now() then
    return jsonb_build_object('success', false, 'reason', 'INVALID_OR_EXPIRED_SLOT');
  end if;

  if not exists (select 1 from public.courts where id = p_court_id and is_active) then
    return jsonb_build_object('success', false, 'reason', 'COURT_NOT_FOUND');
  end if;

  v_end_time := (p_start_time + interval '90 minutes')::time;
  if public.owner_booking_slot_conflicts(p_court_id, p_booking_date, p_start_time, v_end_time) then
    return jsonb_build_object('success', false, 'reason', 'SLOT_UNAVAILABLE');
  end if;

  select current_price into v_price
  from public.system_settings
  where id = 1;

  if v_price is null then
    return jsonb_build_object('success', false, 'reason', 'PRICE_NOT_CONFIGURED');
  end if;

  insert into public.booking_payment_attempts (
    player_id, court_id, booking_date, start_time, end_time, total_price, deposit_amount
  ) values (
    v_player_id, p_court_id, p_booking_date, p_start_time, v_end_time, v_price, v_price / 2
  ) returning id into v_attempt_id;

  return jsonb_build_object(
    'success', true,
    'attempt_id', v_attempt_id,
    'total_price', v_price,
    'deposit_amount', v_price / 2
  );
end;
$$;

create or replace function public.confirm_booking_payment(
  p_attempt_id uuid,
  p_payment_id text,
  p_amount_paid numeric
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.booking_payment_attempts%rowtype;
  v_booking_id uuid;
begin
  select * into v_attempt
  from public.booking_payment_attempts
  where id = p_attempt_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'reason', 'PAYMENT_ATTEMPT_NOT_FOUND');
  end if;

  if v_attempt.status = 'confirmed' and v_attempt.payment_id = p_payment_id then
    return jsonb_build_object('success', true, 'status', 'ALREADY_PROCESSED');
  end if;
  if v_attempt.status = 'lost' and v_attempt.payment_id = p_payment_id then
    return jsonb_build_object('success', false, 'status', 'ALREADY_LOST', 'refund_required', true);
  end if;
  if v_attempt.status <> 'pending' then
    return jsonb_build_object('success', false, 'reason', 'PAYMENT_ATTEMPT_NOT_PENDING');
  end if;
  if p_payment_id is null or p_amount_paid is null or p_amount_paid <= 0 then
    return jsonb_build_object('success', false, 'reason', 'INVALID_PAYMENT');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'owner-booking:' || v_attempt.court_id::text || ':' || v_attempt.booking_date::text,
    0
  ));

  if public.owner_booking_slot_conflicts(
    v_attempt.court_id, v_attempt.booking_date, v_attempt.start_time, v_attempt.end_time
  ) or public.to_business_timestamptz(v_attempt.booking_date, v_attempt.start_time) <= now()
    or p_amount_paid is distinct from v_attempt.deposit_amount then
    insert into public.bookings (
      court_id, player_id, booking_date, start_time, end_time, status, is_manual,
      total_price, deposit_amount, payment_status, payment_id, paid_at, refund_required
    ) values (
      v_attempt.court_id, v_attempt.player_id, v_attempt.booking_date, v_attempt.start_time,
      v_attempt.end_time, 'cancelled', false, v_attempt.total_price, v_attempt.deposit_amount,
      'refund_pending', p_payment_id, now(), true
    ) returning id into v_booking_id;

    insert into public.deposit_refunds_log (
      booking_id, player_id, amount, reason
    ) values (
      v_booking_id,
      v_attempt.player_id,
      p_amount_paid,
      case
        when p_amount_paid is distinct from v_attempt.deposit_amount then 'incorrect_payment_amount'
        when public.to_business_timestamptz(v_attempt.booking_date, v_attempt.start_time) <= now() then 'payment_after_slot_start'
        else 'concurrency_overpayment'
      end
    );

    update public.booking_payment_attempts
    set status = 'lost', payment_id = p_payment_id, updated_at = now()
    where id = p_attempt_id;

    return jsonb_build_object(
      'success', false,
      'status', 'PAYMENT_REFUND_REGISTERED',
      'booking_id', v_booking_id,
      'refund_required', true
    );
  end if;

  insert into public.bookings (
    court_id, player_id, booking_date, start_time, end_time, status, is_manual,
    total_price, deposit_amount, payment_status, payment_id, paid_at
  ) values (
    v_attempt.court_id, v_attempt.player_id, v_attempt.booking_date, v_attempt.start_time,
    v_attempt.end_time, 'confirmed', false, v_attempt.total_price, v_attempt.deposit_amount,
    'paid', p_payment_id, now()
  ) returning id into v_booking_id;

  update public.booking_payment_attempts
  set status = 'confirmed', payment_id = p_payment_id, updated_at = now()
  where id = p_attempt_id;

  return jsonb_build_object('success', true, 'status', 'CONFIRMED', 'booking_id', v_booking_id);
end;
$$;

create or replace function public.cancel_booking_by_player(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
  v_refund_required boolean;
  v_start_at timestamptz;
begin
  select * into v_booking
  from public.bookings
  where id = p_booking_id and player_id = auth.uid() and status = 'confirmed'
  for update;

  if not found then
    return jsonb_build_object('success', false, 'reason', 'BOOKING_NOT_FOUND');
  end if;

  v_start_at := public.to_business_timestamptz(v_booking.booking_date, v_booking.start_time);
  if v_start_at - now() < interval '12 hours' then
    return jsonb_build_object('success', false, 'reason', 'CANCELLATION_WINDOW_CLOSED');
  end if;

  v_refund_required := v_booking.payment_status = 'paid';
  update public.bookings
  set status = 'cancelled',
      payment_status = case when v_refund_required then 'refund_pending'::public.payment_status else payment_status end,
      refund_required = v_refund_required,
      updated_at = now()
  where id = p_booking_id;

  if v_refund_required then
    insert into public.deposit_refunds_log (booking_id, player_id, amount, reason)
    values (v_booking.id, v_booking.player_id, v_booking.deposit_amount, 'cancelled_by_player');
  end if;

  return jsonb_build_object('success', true, 'refund_required', v_refund_required);
end;
$$;
