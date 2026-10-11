import { createAvailabilitySlots, type BookingRecord, type LockRecord } from "@/features/courts/types/availability";
import { getSupabaseConfig } from "@/shared/lib/supabase/config";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

export async function getAvailabilityByDate(date: string, isOwner = false) {
  if (!getSupabaseConfig()) {
    return { slots: [], courts: [], price: null, error: "Configurá Supabase para consultar la disponibilidad." };
  }

  const supabase = await createSupabaseServerClient();
  const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  const [courtsResult, priceResult, oneTimeLocksResult, recurringLocksResult] = await Promise.all([
    supabase.from("courts").select("id, name").eq("is_active", true).order("name"),
    supabase.from("system_settings").select("current_price").eq("id", 1).single(),
    supabase.from("locks")
      .select("id, court_id, court_scope, lock_type, reason, specific_date, day_of_week, start_time, end_time")
      .eq("is_active", true)
      .eq("lock_type", "one_time")
      .eq("specific_date", date),
    supabase.from("locks")
      .select("id, court_id, court_scope, lock_type, reason, specific_date, day_of_week, start_time, end_time")
      .eq("is_active", true)
      .eq("lock_type", "recurring")
      .eq("day_of_week", weekday),
  ]);

  const error = courtsResult.error ?? priceResult.error ?? oneTimeLocksResult.error ?? recurringLocksResult.error;
  if (error || !courtsResult.data || !priceResult.data) {
    return { slots: [], courts: [], price: null, error: "No se pudo cargar la agenda. Revisá la migración de Supabase y volvé a intentar." };
  }

  let bookings: BookingRecord[];
  if (isOwner) {
    const { data, error: bookingsError } = await supabase.from("bookings")
      .select("id, court_id, booking_date, start_time, end_time, player_id, manual_player_name, status, is_manual, total_price, deposit_amount, payment_status, refund_required")
      .eq("booking_date", date)
      .eq("status", "confirmed");
    if (bookingsError) {
      return { slots: [], courts: [], price: null, error: "No se pudieron cargar las reservas del tablero." };
    }
    const playerIds = [...new Set(data.flatMap((booking) => booking.player_id ? [booking.player_id] : []))];
    const profilesResult = playerIds.length > 0
      ? await supabase.from("profiles").select("id, first_name, last_name").in("id", playerIds)
      : { data: [], error: null };
    if (profilesResult.error) {
      return { slots: [], courts: [], price: null, error: "No se pudo cargar el detalle de las reservas." };
    }
    const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
    bookings = data.map((booking) => ({
      ...booking,
      total_price: Number(booking.total_price),
      deposit_amount: Number(booking.deposit_amount),
      player_first_name: booking.player_id ? profiles.get(booking.player_id)?.first_name ?? null : null,
      player_last_name: booking.player_id ? profiles.get(booking.player_id)?.last_name ?? null : null,
    }));
  } else {
    const { data, error: bookingsError } = await supabase.rpc("get_public_bookings_by_date", { p_booking_date: date });
    if (bookingsError) {
      return { slots: [], courts: [], price: null, error: "No se pudo cargar la disponibilidad. Aplicá las migraciones de Supabase." };
    }
    bookings = data.map((booking) => ({
      ...booking,
      id: `${booking.court_id}-${booking.start_time}`,
      booking_date: date,
      player_id: null,
      manual_player_name: null,
      status: "confirmed",
    }));
  }
  const locks = [
    ...(oneTimeLocksResult.data ?? []),
    ...(recurringLocksResult.data ?? []),
  ] as LockRecord[];

  return {
    slots: createAvailabilitySlots({
      date,
      courts: courtsResult.data,
      bookings,
      locks,
      price: Number(priceResult.data.current_price),
      now: new Date(),
    }),
    courts: courtsResult.data,
    price: Number(priceResult.data.current_price),
    error: null,
  };
}

export async function getActiveLocks() {
  if (!getSupabaseConfig()) return { locks: [], error: "Configurá Supabase para administrar bloqueos." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("locks")
    .select("id, court_id, court_scope, lock_type, reason, specific_date, day_of_week, start_time, end_time")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return {
    locks: data ?? [],
    error: error ? "No se pudieron cargar los bloqueos." : null,
  };
}