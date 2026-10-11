drop policy if exists "Players and owners insert bookings" on public.bookings;

create policy "Owners insert bookings"
  on public.bookings for insert
  with check ((select public.is_owner()));