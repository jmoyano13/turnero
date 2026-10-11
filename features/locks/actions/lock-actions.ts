"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireProfile } from "@/features/auth/services/profile-service";
import { getBusinessDate } from "@/features/courts/types/availability";
import { createLockSchema, deleteLockSchema, getSlotEndTime, updatePriceSchema } from "@/features/locks/types/lock.schema";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

export interface LockWarning {
  bookingId: string;
  bookingDate: string;
  startTime: string;
  courtName: string;
  playerName: string;
}

export interface LockActionState {
  error?: string;
  success?: string;
  warnings?: LockWarning[];
  confirmRequired?: boolean;
}

function getFormText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function createLockAction(
  _previousState: LockActionState,
  formData: FormData,
): Promise<LockActionState> {
  const profile = await requireProfile("owner");
  const parsed = createLockSchema.safeParse({
    courtScope: getFormText(formData, "courtScope"),
    courtId: getFormText(formData, "courtId") || undefined,
    lockType: getFormText(formData, "lockType"),
    specificDate: getFormText(formData, "specificDate") || undefined,
    dayOfWeek: getFormText(formData, "dayOfWeek") || undefined,
    startTime: getFormText(formData, "startTime"),
    reason: getFormText(formData, "reason"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisá los datos del bloqueo." };
  if (parsed.data.lockType === "one_time" && parsed.data.specificDate! < getBusinessDate()) {
    return { error: "No se pueden crear bloqueos para fechas pasadas." };
  }

  const supabase = await createSupabaseServerClient();
  const endTime = getSlotEndTime(parsed.data.startTime);
  const { data: affected, error: warningError } = await supabase.rpc("get_affected_bookings_for_lock", {
    p_lock_type: parsed.data.lockType,
    p_court_scope: parsed.data.courtScope,
    p_court_id: parsed.data.courtScope === "single" ? parsed.data.courtId! : null,
    p_specific_date: parsed.data.specificDate ?? null,
    p_day_of_week: parsed.data.dayOfWeek ?? null,
    p_start_time: parsed.data.startTime,
    p_end_time: endTime,
  });

  if (warningError) return { error: "No pudimos verificar si el bloqueo afecta reservas. Intentá nuevamente." };

  const warnings = (affected ?? []).map((booking) => ({
    bookingId: booking.booking_id,
    bookingDate: booking.booking_date,
    startTime: booking.start_time.slice(0, 5),
    courtName: booking.court_name,
    playerName: booking.player_name,
  }));
  if (warnings.length > 0 && getFormText(formData, "confirmAffected") !== "true") {
    return { warnings, confirmRequired: true };
  }

  const { error } = await supabase.from("locks").insert({
    court_id: parsed.data.courtScope === "single" ? parsed.data.courtId! : null,
    court_scope: parsed.data.courtScope,
    lock_type: parsed.data.lockType,
    reason: parsed.data.reason,
    specific_date: parsed.data.lockType === "one_time" ? parsed.data.specificDate! : null,
    day_of_week: parsed.data.lockType === "recurring" ? parsed.data.dayOfWeek! : null,
    start_time: parsed.data.startTime,
    end_time: endTime,
    created_by: profile.id,
  });

  if (error) return { error: "No pudimos crear el bloqueo. Actualizá la agenda e intentá nuevamente." };

  revalidatePath("/availability");
  revalidatePath("/owner");
  return {
    success: "Bloqueo creado.",
    warnings,
  };
}

export async function deleteLockAction(formData: FormData) {
  await requireProfile("owner");
  const parsed = deleteLockSchema.safeParse(getFormText(formData, "lockId"));
  if (!parsed.success) redirect("/owner?notice=lock-error");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("locks").delete().eq("id", parsed.data);
  if (error) redirect("/owner?notice=lock-error");

  revalidatePath("/availability");
  revalidatePath("/owner");
  redirect("/owner?notice=lock-deleted");
}

export async function updateCurrentPriceAction(formData: FormData) {
  const profile = await requireProfile("owner");
  const parsed = updatePriceSchema.safeParse(getFormText(formData, "currentPrice"));
  if (!parsed.success) redirect("/owner?notice=price-error");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("system_settings")
    .update({ current_price: parsed.data, updated_by: profile.id, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) redirect("/owner?notice=price-error");

  revalidatePath("/availability");
  revalidatePath("/owner");
  redirect("/owner?notice=price-updated");
}