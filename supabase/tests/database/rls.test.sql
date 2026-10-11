select plan(14);

select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), 'RLS enabled on profiles');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles'), 'profiles has policies');
select ok((select relrowsecurity from pg_class where oid = 'public.courts'::regclass), 'RLS enabled on courts');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'courts'), 'courts has policies');
select ok((select relrowsecurity from pg_class where oid = 'public.system_settings'::regclass), 'RLS enabled on system_settings');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'system_settings'), 'system_settings has policies');
select ok((select relrowsecurity from pg_class where oid = 'public.bookings'::regclass), 'RLS enabled on bookings');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'bookings'), 'bookings has policies');
select ok((select relrowsecurity from pg_class where oid = 'public.locks'::regclass), 'RLS enabled on locks');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'locks'), 'locks has policies');
select ok((select relrowsecurity from pg_class where oid = 'public.deposit_refunds_log'::regclass), 'RLS enabled on deposit_refunds_log');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'deposit_refunds_log'), 'deposit_refunds_log has policies');
select ok((select relrowsecurity from pg_class where oid = 'public.booking_payment_attempts'::regclass), 'RLS enabled on booking_payment_attempts');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'booking_payment_attempts'), 'booking_payment_attempts has policies');

select * from finish();