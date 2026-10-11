create table public.booking_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete restrict,
  court_id uuid not null references public.courts(id) on delete restrict,
  booking_date date not null,
  start_time time not null,
  end_time time not null,
  total_price numeric(10, 2) not null check (total_price > 0),
  deposit_amount numeric(10, 2) not null check (deposit_amount > 0),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'lost', 'failed')),
  preference_id text,
  payment_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint check_payment_attempt_duration check (end_time = start_time + interval '90 minutes')
);

create index idx_booking_payment_attempts_player
  on public.booking_payment_attempts (player_id, created_at desc);
create index idx_booking_payment_attempts_slot
  on public.booking_payment_attempts (court_id, booking_date, start_time)
  where status = 'pending';

alter table public.booking_payment_attempts enable row level security;

create policy "Players read own payment attempts"
  on public.booking_payment_attempts for select
  using ((select auth.uid()) = player_id);

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
  v_now timestamp := timezone('America/Argentina/Buenos_Aires', now());
  v_end_time time;
  v_price numeric(10, 2);
  v_attempt_id uuid;
begin
  if v_player_id is null or not exists (
    select 1 from public.profiles where id = v_player_id and role = 'player'
  ) then
    return jsonb_build_object('success', false, 'reason', 'FORBIDDEN');
  end if;

  if p_court_id is null or p_booking_date is null or p_start_time is null
    or extract(epoch from p_start_time)::integer / 60 % 90 <> 0
    or p_booking_date < v_now::date
    or p_booking_date > v_now::date + 7
    or p_booking_date + p_start_time <= v_now then
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

create or replace function public.record_booking_preference(p_attempt_id uuid, p_preference_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.booking_payment_attempts
  set preference_id = p_preference_id, updated_at = now()
  where id = p_attempt_id
    and player_id = auth.uid()
    and status = 'pending';
  return found;
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
  ) or v_attempt.booking_date + v_attempt.start_time <= timezone('America/Argentina/Buenos_Aires', now())
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
        when v_attempt.booking_date + v_attempt.start_time <= timezone('America/Argentina/Buenos_Aires', now()) then 'payment_after_slot_start'
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

  v_start_at := (v_booking.booking_date + v_booking.start_time)
    at time zone 'America/Argentina/Buenos_Aires';
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

revoke all on function public.create_booking_payment_attempt(uuid, date, time) from public, anon;
revoke all on function public.record_booking_preference(uuid, text) from public, anon;
revoke all on function public.confirm_booking_payment(uuid, text, numeric) from public, anon, authenticated;
revoke all on function public.cancel_booking_by_player(uuid) from public, anon;
grant execute on function public.create_booking_payment_attempt(uuid, date, time) to authenticated;
grant execute on function public.record_booking_preference(uuid, text) to authenticated;
grant execute on function public.confirm_booking_payment(uuid, text, numeric) to service_role;
grant execute on function public.cancel_booking_by_player(uuid) to authenticated;