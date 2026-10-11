import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import type { Booking } from "@/shared/types/database.types";

export type PlayerBookingView = Pick<Booking,
  "id" | "court_id" | "booking_date" | "start_time" | "end_time" | "status" | "total_price" |
  "deposit_amount" | "payment_status" | "refund_required" | "paid_at"
> & { court_name: string };

export async function getPlayerBookings(playerId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("bookings")
    .select("id, court_id, booking_date, start_time, end_time, status, total_price, deposit_amount, payment_status, refund_required, paid_at")
    .eq("player_id", playerId)
    .order("booking_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error || !data) return { bookings: [] as PlayerBookingView[], error: "No se pudieron cargar tus reservas." };
  const courtIds = [...new Set(data.map((booking) => booking.court_id))];
  const { data: courts, error: courtsError } = courtIds.length > 0
    ? await supabase.from("courts").select("id, name").in("id", courtIds)
    : { data: [], error: null };

  if (courtsError) return { bookings: [] as PlayerBookingView[], error: "No se pudieron cargar las canchas de tus reservas." };
  const courtNames = new Map((courts ?? []).map((court) => [court.id, court.name]));
  return {
    bookings: data.map((booking) => ({
      ...booking,
      total_price: Number(booking.total_price),
      deposit_amount: Number(booking.deposit_amount),
      court_name: courtNames.get(booking.court_id) ?? "Cancha",
    })),
    error: null,
  };
}