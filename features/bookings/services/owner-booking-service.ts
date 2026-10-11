import { getSupabaseConfig } from "@/shared/lib/supabase/config";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import type { Booking, Profile } from "@/shared/types/database.types";

export type OwnerBookingView = Pick<Booking,
  "id" | "court_id" | "player_id" | "manual_player_name" | "booking_date" | "start_time" | "end_time" |
  "status" | "is_manual" | "total_price" | "deposit_amount" | "payment_status" | "refund_required" | "created_at"
> & {
  player_first_name: string | null;
  player_last_name: string | null;
};

export type RegisteredPlayerOption = Pick<Profile, "id" | "first_name" | "last_name" | "email">;

export async function getOwnerBookingData(date: string) {
  if (!getSupabaseConfig()) {
    return { bookings: [] as OwnerBookingView[], players: [] as RegisteredPlayerOption[], error: null };
  }

  const supabase = await createSupabaseServerClient();
  const [bookingsResult, playersResult] = await Promise.all([
    supabase.from("bookings")
      .select("id, court_id, player_id, manual_player_name, booking_date, start_time, end_time, status, is_manual, total_price, deposit_amount, payment_status, refund_required, created_at")
      .eq("booking_date", date)
      .order("start_time"),
    supabase.from("profiles")
      .select("id, first_name, last_name, email")
      .eq("role", "player")
      .order("first_name"),
  ]);

  if (bookingsResult.error || playersResult.error || !bookingsResult.data || !playersResult.data) {
    return {
      bookings: [] as OwnerBookingView[],
      players: [] as RegisteredPlayerOption[],
      error: "No se pudieron cargar las reservas y jugadores de la agenda.",
    };
  }

  const playerIds = [...new Set(bookingsResult.data.flatMap((booking) => booking.player_id ? [booking.player_id] : []))];
  const profilesResult = playerIds.length > 0
    ? await supabase.from("profiles").select("id, first_name, last_name").in("id", playerIds)
    : { data: [], error: null };

  if (profilesResult.error) {
    return {
      bookings: [] as OwnerBookingView[],
      players: playersResult.data,
      error: "No se pudo cargar el detalle de jugadores de la agenda.",
    };
  }

  const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
  return {
    bookings: bookingsResult.data.map((booking) => ({
      ...booking,
      player_first_name: booking.player_id ? profiles.get(booking.player_id)?.first_name ?? null : null,
      player_last_name: booking.player_id ? profiles.get(booking.player_id)?.last_name ?? null : null,
    })),
    players: playersResult.data,
    error: null,
  };
}