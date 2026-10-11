export type MercadoPagoPayment = {
  id: number;
  status: string;
  external_reference: string | null;
  transaction_amount: number;
  currency_id: string;
};

export async function createMercadoPagoPreference({
  attemptId,
  courtName,
  bookingDate,
  startTime,
  depositAmount,
  payerEmail,
}: {
  attemptId: string;
  courtName: string;
  bookingDate: string;
  startTime: string;
  depositAmount: number;
  payerEmail: string;
}) {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (!accessToken || !appUrl) throw new Error("Falta configurar Mercado Pago o la URL pública de la aplicación.");

  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      external_reference: attemptId,
      notification_url: `${appUrl}/api/webhooks/mercadopago`,
      back_urls: {
        success: `${appUrl}/profile/bookings?payment=success`,
        failure: `${appUrl}/availability?payment=failed`,
        pending: `${appUrl}/profile/bookings?payment=pending`,
      },
      auto_return: "approved",
      payer: { email: payerEmail },
      items: [{
        id: attemptId,
        title: `Seña ${courtName} · ${bookingDate} ${startTime.slice(0, 5)}`,
        quantity: 1,
        currency_id: "ARS",
        unit_price: depositAmount,
      }],
    }),
    cache: "no-store",
  });

  const result = await response.json() as { id?: string; init_point?: string; message?: string };
  if (!response.ok || !result.id || !result.init_point) {
    throw new Error(result.message ?? "Mercado Pago no pudo crear la preferencia de pago.");
  }
  return { preferenceId: result.id, initPoint: result.init_point };
}

export async function getMercadoPagoPayment(paymentId: string): Promise<MercadoPagoPayment> {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) throw new Error("Falta configurar MERCADOPAGO_ACCESS_TOKEN.");

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("No se pudo verificar el pago con Mercado Pago.");
  return await response.json() as MercadoPagoPayment;
}