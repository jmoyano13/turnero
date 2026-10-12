"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  cancelBookingOwnerSchema,
  createManualBookingSchema,
  updateBookingOwnerSchema,
  type BookingActionState,
} from "@/features/bookings/types/booking.schema";
import { requireProfile } from "@/features/auth/services/profile-service";
import { getBusinessDate } from "@/features/courts/types/availability";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import type { Json } from "@/shared/types/database.types";

type BookingRpcResult = {
  success: boolean;
  reason?: string;
  booking_id?: string;
  total_price?: number;
  refund_required?: boolean;
};

function getFormText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readRpcResult(data: Json | null): BookingRpcResult | null {
  return data && typeof data === "object" && !Array.isArray(data)
    ? data as BookingRpcResult
    : null;
}

function errorMessage(reason: string | undefined) {
  switch (reason) {
    case "SLOT_UNAVAILABLE": return "Ese horario ya está reservado o bloqueado. Actualizá la agenda y elegí otro.";
    case "BOOKING_NOT_FOUND": return "La reserva ya no está activa.";
    case "BOOKING_CHANGED_RETRY": return "La reserva cambió mientras la editabas. Actualizá la agenda e intentá de nuevo.";
    case "PRICE_NOT_CONFIGURED": return "No hay un precio vigente configurado.";
    case "FORBIDDEN": return "No tenés autorización para administrar reservas.";
    default: return "No pudimos guardar la reserva. Revisá los datos e intentá nuevamente.";
  }
}

function revalidateAgenda() {
  revalidatePath("/owner");
  revalidatePath("/availability");
}

export async function createManualBookingAction(
  _previousState: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  await requireProfile("owner");
  const parsed = createManualBookingSchema.safeParse({
    courtId: getFormText(formData, "courtId"),
    bookingDate: getFormText(formData, "bookingDate"),
    startTime: getFormText(formData, "startTime"),
    playerType: getFormText(formData, "playerType"),
    playerId: getFormText(formData, "playerId") || undefined,
    manualPlayerName: getFormText(formData, "manualPlayerName") || undefined,
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisá los datos de la reserva." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("owner_create_manual_booking", {
    p_court_id: parsed.data.courtId,
    p_booking_date: parsed.data.bookingDate,
    p_start_time: parsed.data.startTime,
    p_player_id: parsed.data.playerType === "registered" ? parsed.data.playerId! : null,
    p_manual_player_name: parsed.data.playerType === "manual" ? parsed.data.manualPlayerName! : null,
  });

  if (error) return { error: "No pudimos guardar la reserva. Revisá las migraciones de Supabase." };
  const result = readRpcResult(data);
  if (!result?.success) return { error: errorMessage(result?.reason) };

  revalidateAgenda();
  return { success: "Reserva manual confirmada. No requiere seña." };
}

export async function updateBookingOwnerAction(formData: FormData) {
  await requireProfile("owner");
  const parsed = updateBookingOwnerSchema.safeParse({
    bookingId: getFormText(formData, "bookingId"),
    courtId: getFormText(formData, "courtId"),
    bookingDate: getFormText(formData, "bookingDate"),
    startTime: getFormText(formData, "startTime"),
  });
  const returnDate = getFormText(formData, "returnDate");
  const fallbackDate = /^\d{4}-\d{2}-\d{2}$/.test(returnDate) ? returnDate : getBusinessDate();

  if (!parsed.success) redirect(`/owner?date=${fallbackDate}&notice=booking-error`);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("owner_update_booking", {
    p_booking_id: parsed.data.bookingId,
    p_court_id: parsed.data.courtId,
    p_booking_date: parsed.data.bookingDate,
    p_start_time: parsed.data.startTime,
  });
  const result = error ? null : readRpcResult(data);
  if (!result?.success) redirect(`/owner?date=${fallbackDate}&notice=booking-error`);

  revalidateAgenda();
  redirect(`/owner?date=${parsed.data.bookingDate}&notice=booking-updated`);
}

export async function cancelBookingOwnerAction(formData: FormData) {
  await requireProfile("owner");
  const parsed = cancelBookingOwnerSchema.safeParse({ bookingId: getFormText(formData, "bookingId") });
  const returnDate = getFormText(formData, "returnDate");
  const bookingDate = /^\d{4}-\d{2}-\d{2}$/.test(returnDate) ? returnDate : getBusinessDate();

  if (!parsed.success) redirect(`/owner?date=${bookingDate}&notice=booking-error`);

  const supabase = await createSupabaseServerClient();
  const { data: booking } = await supabase.from("bookings")
    .select("id, court_id, player_id, booking_date, start_time, end_time, total_price, deposit_amount")
    .eq("id", parsed.data.bookingId)
    .eq("status", "confirmed")
    .maybeSingle();
  const { data, error } = await supabase.rpc("owner_cancel_booking", { p_booking_id: parsed.data.bookingId });
  const result = error ? null : readRpcResult(data);
  if (!result?.success) redirect(`/owner?date=${bookingDate}&notice=booking-error`);

  if (booking?.player_id) {
    const [{ data: player }, { data: court }] = await Promise.all([
      supabase.from("profiles").select("email, first_name, last_name").eq("id", booking.player_id).single(),
      supabase.from("courts").select("name").eq("id", booking.court_id).single(),
    ]);

  revalidateAgenda();
  revalidatePath("/profile/bookings");
  redirect(`/owner?date=${bookingDate}&notice=${result.refund_required ? "booking-refund" : "booking-cancelled"}`);
}}