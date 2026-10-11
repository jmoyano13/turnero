drop policy if exists "Owners or booking player update bookings" on public.bookings;

create policy "Owners update bookings"
  on public.bookings for update
  using ((select public.is_owner()))
  with check ((select public.is_owner()));