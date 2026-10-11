import Link from "next/link";

import { cancelBookingPlayerAction } from "@/features/bookings/actions/player-booking-actions";
import { isPlayerCancellationAllowed } from "@/features/courts/types/availability";
import type { PlayerBookingView } from "@/features/bookings/services/player-booking-service";

function money(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(value);
}

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "full", timeZone: "UTC" })
    .format(new Date(`${date}T12:00:00Z`));
}

const notices: Record<string, string> = {
  cancelled: "La reserva se canceló y el turno quedó disponible nuevamente.",
  "cancelled-refund": "La reserva se canceló. La devolución de la seña quedó registrada para gestionarla fuera del sistema.",
  "cancel-late": "No se puede cancelar la reserva con menos de 12 horas de anticipación.",
  "cancel-error": "No pudimos cancelar la reserva. Actualizá la página e intentá nuevamente.",
};

export function PlayerBookingsList({
  bookings,
  error,
  notice,
}: {
  bookings: PlayerBookingView[];
  error: string | null;
  notice?: string;
}) {
  return (
    <>
      {notice && notices[notice] && (
        <p className="mt-5 border-l-2 border-[#55705b] bg-white px-4 py-3 text-sm text-[#425247]" role="status">{notices[notice]}</p>
      )}
      {error && <p className="mt-5 border-l-2 border-[#e5643f] bg-white px-4 py-3 text-sm text-[#8d392c]" role="alert">{error}</p>}
      {bookings.length === 0 ? (
        <p className="mt-8 border-y border-[#d9ddd5] py-7 text-sm text-[#657067]">Todavía no tenés reservas. <Link className="font-semibold text-[#315b43] underline underline-offset-4" href="/availability">Ver disponibilidad</Link></p>
      ) : (
        <ul className="mt-7 divide-y divide-[#d9ddd5] border-y border-[#d9ddd5]">
          {bookings.map((booking) => {
            const canCancel = booking.status === "confirmed" && isPlayerCancellationAllowed(booking.booking_date, booking.start_time);
            const balance = Math.max(0, booking.total_price - booking.deposit_amount);
            return (
              <li className="py-5" key={booking.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#718072]">
                      {booking.status === "confirmed" ? "Confirmada" : "Cancelada"} · {booking.court_name}
                    </p>
                    <h2 className="mt-1 text-base font-semibold text-[#263b2c]">{dateLabel(booking.booking_date)}</h2>
                    <p className="mt-1 font-mono text-sm text-[#425247]">{booking.start_time.slice(0, 5)}–{booking.end_time.slice(0, 5)}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-lg font-semibold text-[#263b2c]">{money(booking.total_price)}</p>
                    <p className="mt-1 text-xs text-[#657067]">
                      {booking.payment_status === "paid" || booking.payment_status === "refund_pending"
                        ? `Seña pagada ${money(booking.deposit_amount)}`
                        : "Seña no acreditada"}
                    </p>
                    {booking.status === "confirmed" && <p className="mt-1 text-xs text-[#657067]">Saldo en cancha {money(balance)}</p>}
                  </div>
                </div>
                {booking.refund_required && (
                  <p className="mt-3 text-xs font-semibold text-[#815923]">Devolución de seña pendiente; se gestiona fuera del sistema.</p>
                )}
                {booking.status === "confirmed" && (canCancel ? (
                  <details className="mt-4">
                    <summary className="w-fit cursor-pointer text-xs font-semibold text-[#9c4032] underline underline-offset-4">Cancelar reserva</summary>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <p className="text-xs text-[#68746a]">{booking.payment_status === "paid" ? "La devolución de la seña se registrará para gestionarla fuera del sistema." : "El turno quedará disponible nuevamente."}</p>
                      <form action={cancelBookingPlayerAction}>
                        <input name="bookingId" type="hidden" value={booking.id} />
                        <button className="min-h-10 border border-[#b95a49] px-3 text-sm font-semibold text-[#9c4032] hover:bg-[#fff1ed]" type="submit">Confirmar cancelación</button>
                      </form>
                    </div>
                  </details>
                ) : (
                  <p className="mt-4 text-xs text-[#68746a]">Plazo de cancelación vencido; se requieren al menos 12 horas de anticipación.</p>
                ))}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}