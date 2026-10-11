import { revalidatePath } from "next/cache";

import { sendBookingCancelledEmail, sendBookingConfirmedEmail, type BookingEmail } from "@/features/bookings/services/email-service";
import { getMercadoPagoPayment } from "@/features/bookings/services/mercadopago-service";
import { verifyMercadoPagoSignature } from "@/features/bookings/services/mercadopago-signature";
import { createSupabaseAdminClient } from "@/shared/lib/supabase/admin";
import type { Json } from "@/shared/types/database.types";

type WebhookBody = {
  type?: unknown;
  action?: unknown;
  data?: { id?: unknown };
};

type ConfirmationResult = {
  success: boolean;
  status?: string;
  reason?: string;
  booking_id?: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readResult(data: Json | null): ConfirmationResult | null {
  return data && typeof data === "object" && !Array.isArray(data) ? data as ConfirmationResult : null;
}

async function getBookingEmail(admin: ReturnType<typeof createSupabaseAdminClient>, bookingId: string): Promise<BookingEmail | null> {
  const { data: booking, error: bookingError } = await admin.from("bookings")
    .select("id, player_id, court_id, booking_date, start_time, end_time, total_price, deposit_amount, refund_required")
    .eq("id", bookingId)
    .single();
  if (bookingError || !booking?.player_id) return null;

  const [{ data: profile }, { data: court }] = await Promise.all([
    admin.from("profiles").select("email, first_name, last_name").eq("id", booking.player_id).single(),
    admin.from("courts").select("name").eq("id", booking.court_id).single(),
  ]);
  if (!profile || !court) return null;

  return {
    email: profile.email,
    playerName: [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email,
    courtName: court.name,
    bookingDate: booking.booking_date,
    startTime: booking.start_time,
    endTime: booking.end_time,
    totalPrice: Number(booking.total_price),
    depositAmount: Number(booking.deposit_amount),
    refundRequired: booking.refund_required,
  };
}

export async function POST(request: Request) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "Webhook no configurado." }, { status: 503 });

  let body: WebhookBody;
  try {
    body = await request.json() as WebhookBody;
  } catch {
    return Response.json({ error: "Payload inválido." }, { status: 400 });
  }

  const url = new URL(request.url);
  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id")
    ?? (typeof body.data?.id === "string" || typeof body.data?.id === "number" ? String(body.data.id) : null);
  if (!verifyMercadoPagoSignature({
    dataId,
    requestId: request.headers.get("x-request-id"),
    signature: request.headers.get("x-signature"),
    secret,
  })) {
    return Response.json({ error: "Firma inválida." }, { status: 401 });
  }

  const bodyType = typeof body.type === "string" ? body.type : "";
  const actionType = typeof body.action === "string" ? body.action.split(".")[0] : "";
  if ((bodyType || actionType) !== "payment") return Response.json({ received: true, ignored: true });
  if (!dataId || !/^\d+$/.test(dataId)) return Response.json({ error: "Identificador de pago inválido." }, { status: 400 });

  let payment;
  try {
    payment = await getMercadoPagoPayment(dataId);
  } catch (error) {
    console.error("No se pudo consultar el pago de Mercado Pago:", error);
    return Response.json({ error: "No se pudo verificar el pago." }, { status: 500 });
  }

  if (payment.status !== "approved") return Response.json({ received: true, ignored: true });
  if (!payment.external_reference || !uuidPattern.test(payment.external_reference) ||
    payment.currency_id !== "ARS" || !Number.isFinite(payment.transaction_amount)) {
    return Response.json({ error: "El pago no corresponde a una reserva válida." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("confirm_booking_payment", {
    p_attempt_id: payment.external_reference,
    p_payment_id: String(payment.id),
    p_amount_paid: payment.transaction_amount,
  });
  if (error) {
    console.error("No se pudo confirmar la reserva acreditada:", error);
    return Response.json({ error: "No se pudo confirmar la reserva." }, { status: 500 });
  }

  const result = readResult(data);
  if (result?.booking_id && result.status !== "ALREADY_PROCESSED" && result.status !== "ALREADY_LOST") {
    try {
      const booking = await getBookingEmail(admin, result.booking_id);
      if (booking) {
        if (result.success) await sendBookingConfirmedEmail(booking);
        else if (booking.refundRequired) await sendBookingCancelledEmail(booking);
      }
    } catch (emailError) {
      console.error("No se pudo enviar la notificación de pago:", emailError);
    }
  }

  revalidatePath("/availability");
  revalidatePath("/owner");
  revalidatePath("/profile/bookings");
  return Response.json({ received: true, success: result?.success ?? false, status: result?.status ?? result?.reason });
}