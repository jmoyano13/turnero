"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireProfile } from "@/features/auth/services/profile-service";
import { createMercadoPagoPreference } from "@/features/bookings/services/mercadopago-service";
import { cancelBookingPlayerSchema, createOnlineBookingSchema } from "@/features/bookings/types/booking.schema";
import { getBusinessDate } from "@/features/courts/types/availability";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";
import type { Json } from "@/shared/types/database.types";

type RpcResult = {
  success: boolean;
  reason?: string;
  attempt_id?: string;
  booking_id?: string;
  total_price?: number;
  deposit_amount?: number;
  refund_required?: boolean;
};

function readRpcResult(data: Json | null): RpcResult | null {
  return data && typeof data === "object" && !Array.isArray(data) ? data as RpcResult : null;
}

function availabilityRedirect(date: string, paymentError: string): never {
  redirect(`/availability?date=${encodeURIComponent(date)}&paymentError=${paymentError}`);
}

export async function createOnlineBookingPreferenceAction(formData: FormData) {
  const profile = await requireProfile("player");
  const parsed = createOnlineBookingSchema.safeParse({
    courtId: formData.get("courtId"),
    bookingDate: formData.get("bookingDate"),
    startTime: formData.get("startTime"),
  });
  const date = parsed.success ? parsed.data.bookingDate : getBusinessDate();
  if (!parsed.success) availabilityRedirect(date, "invalid");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_booking_payment_attempt", {
    p_court_id: parsed.data.courtId,
    p_booking_date: parsed.data.bookingDate,
    p_start_time: parsed.data.startTime,
  });
  const attempt = error ? null : readRpcResult(data);
  if (!attempt?.success || !attempt.attempt_id || attempt.deposit_amount === undefined) {
    const reason = attempt?.reason === "SLOT_UNAVAILABLE" ? "unavailable" : "checkout";
    availabilityRedirect(date, reason);
  }

  const { data: court, error: courtError } = await supabase.from("courts")
    .select("name")
    .eq("id", parsed.data.courtId)
    .single();
  if (courtError || !court) availabilityRedirect(date, "checkout");

  let preference: { preferenceId: string; initPoint: string };
  try {
    preference = await createMercadoPagoPreference({
      attemptId: attempt.attempt_id,
      courtName: court.name,
      bookingDate: parsed.data.bookingDate,
      startTime: parsed.data.startTime,
      depositAmount: attempt.deposit_amount,
      payerEmail: profile.email,
    });
  } catch (error) {
    console.error("No se pudo iniciar el checkout de Mercado Pago:", error);
    availabilityRedirect(date, "checkout");
  }

  const { data: recorded, error: recordError } = await supabase.rpc("record_booking_preference", {
    p_attempt_id: attempt.attempt_id,
    p_preference_id: preference.preferenceId,
  });
  if (recordError || !recorded) availabilityRedirect(date, "checkout");
  revalidatePath("/availability");
  redirect(preference.initPoint);
}

export async function cancelBookingPlayerAction(formData: FormData) {
  const profile = await requireProfile("player");
  const parsed = cancelBookingPlayerSchema.safeParse({ bookingId: formData.get("bookingId") });
  if (!parsed.success) redirect("/profile/bookings?notice=cancel-error");

  const supabase = await createSupabaseServerClient();
  const { data: booking, error: bookingError } = await supabase.from("bookings")
    .select("id, court_id, player_id, booking_date, start_time, end_time, total_price, deposit_amount, payment_status")
    .eq("id", parsed.data.bookingId)
    .eq("player_id", profile.id)
    .eq("status", "confirmed")
    .single();
  if (bookingError || !booking) redirect("/profile/bookings?notice=cancel-error");

  const { data, error } = await supabase.rpc("cancel_booking_by_player", { p_booking_id: booking.id });
  const result = error ? null : readRpcResult(data);
  if (!result?.success) {
    redirect(`/profile/bookings?notice=${result?.reason === "CANCELLATION_WINDOW_CLOSED" ? "cancel-late" : "cancel-error"}`);
  }

  const [{ data: court }, { data: currentProfile }] = await Promise.all([
    supabase.from("courts").select("name").eq("id", booking.court_id).single(),
    supabase.from("profiles").select("email, first_name, last_name").eq("id", profile.id).single(),
  ]);

  revalidatePath("/availability");
  revalidatePath("/owner");
  revalidatePath("/profile/bookings");
}
