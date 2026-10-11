export type BookingEmail = {
  email: string;
  playerName: string;
  courtName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  depositAmount: number;
  refundRequired: boolean;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

function money(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(value);
}

async function sendEmail({ to, subject, html, text }: { to: string; subject: string; html: string; text: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("Falta configurar Resend y el remitente de correo.");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html, text }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Resend no pudo enviar la notificación.");
}

export async function sendBookingConfirmedEmail(booking: BookingEmail) {
  const name = escapeHtml(booking.playerName);
  const court = escapeHtml(booking.courtName);
  const date = escapeHtml(booking.bookingDate);
  const start = escapeHtml(booking.startTime.slice(0, 5));
  const end = escapeHtml(booking.endTime.slice(0, 5));
  const total = money(booking.totalPrice);
  const deposit = money(booking.depositAmount);
  await sendEmail({
    to: booking.email,
    subject: "Reserva confirmada · Turnero",
    html: `<p>Hola ${name},</p><p>Tu reserva quedó confirmada con el pago de la seña.</p><p>${court} · ${date} · ${start} a ${end}</p><p>Precio total: ${total}<br>Seña acreditada: ${deposit}<br>Saldo a pagar en cancha: ${money(booking.totalPrice - booking.depositAmount)}</p>`,
    text: `Hola ${booking.playerName}, tu reserva quedó confirmada. ${booking.courtName} · ${booking.bookingDate} · ${booking.startTime.slice(0, 5)} a ${booking.endTime.slice(0, 5)}. Precio total: ${total}. Seña acreditada: ${deposit}. Saldo en cancha: ${money(booking.totalPrice - booking.depositAmount)}.`,
  });
}

export async function sendBookingCancelledEmail(booking: BookingEmail) {
  const name = escapeHtml(booking.playerName);
  const court = escapeHtml(booking.courtName);
  const date = escapeHtml(booking.bookingDate);
  const start = escapeHtml(booking.startTime.slice(0, 5));
  const end = escapeHtml(booking.endTime.slice(0, 5));
  const refundText = booking.refundRequired
    ? `Registramos la devolución de la seña (${money(booking.depositAmount)}), que se gestionará fuera del sistema.`
    : "No había una seña pagada asociada a esta reserva.";
  await sendEmail({
    to: booking.email,
    subject: "Reserva cancelada · Turnero",
    html: `<p>Hola ${name},</p><p>Tu reserva de ${court}, ${date} de ${start} a ${end}, fue cancelada.</p><p>${escapeHtml(refundText)}</p>`,
    text: `Hola ${booking.playerName}, tu reserva de ${booking.courtName}, ${booking.bookingDate} de ${booking.startTime.slice(0, 5)} a ${booking.endTime.slice(0, 5)}, fue cancelada. ${refundText}`,
  });
}