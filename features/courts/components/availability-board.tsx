import Link from "next/link";

import { createOnlineBookingPreferenceAction } from "@/features/bookings/actions/player-booking-actions";
import type { AvailabilitySlot } from "@/features/courts/types/availability";

function timeLabel(value: string) {
  return value.slice(0, 5);
}

function slotLabel(slot: AvailabilitySlot, isOwner: boolean) {
  if (slot.status === "booked") {
    if (!isOwner) return "Reservado";
    const playerName = [slot.booking?.player_first_name, slot.booking?.player_last_name].filter(Boolean).join(" ");
    return slot.booking?.manual_player_name || playerName || "Reserva confirmada";
  }
  if (slot.status === "locked") return slot.lockReason ?? "Bloqueado";
  if (slot.unavailableReason === "in_progress") return "En curso";
  if (slot.unavailableReason === "past") return "Finalizado";
  if (!isOwner && !slot.isBookable) return "Fuera de los 7 días";
  return "Disponible";
}

function slotStyle(slot: AvailabilitySlot) {
  if (slot.status === "booked") return "border-[#db9c90] bg-[#fff1ed] text-[#8d392c]";
  if (slot.status === "locked") return "border-[#d4b65d] bg-[#fbf4d9] text-[#655116]";
  if (slot.isBookable) return "border-[#83a28a] bg-[#edf4e9] text-[#294c35]";
  return "border-[#d4d8d1] bg-[#eeefeb] text-[#737b73]";
}

function money(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);
}

function depositLabel(slot: AvailabilitySlot) {
  const booking = slot.booking;
  if (booking?.refund_required || booking?.payment_status === "refund_pending") return "Devolución pendiente";
  if (booking?.is_manual || booking?.payment_status === "none") return "Sin seña";
  if (booking?.payment_status === "paid") return `Seña paga · ${money(booking.deposit_amount ?? 0)}`;
  if (booking?.payment_status === "pending") return "Seña pendiente";
  return "Seña no registrada";
}

export function AvailabilityBoard({ slots, isOwner, isPlayer = false }: { slots: AvailabilitySlot[]; isOwner: boolean; isPlayer?: boolean }) {
  const courts = [...new Map(slots.map((slot) => [slot.courtId, slot.courtName])).entries()];

  if (courts.length === 0) {
    return <p className="border-y border-[#d9ddd5] py-8 text-sm text-[#657067]">No hay canchas activas para mostrar.</p>;
  }

  return (
    <div className="grid gap-8 md:grid-cols-2 md:gap-5">
      {courts.map(([courtId, courtName], courtIndex) => (
        <section className="min-w-0" key={courtId} aria-labelledby={`court-${courtId}`}>
          <div className="mb-3 flex items-center justify-between border-b border-[#aeb9ab] pb-3">
            <h2 className="text-lg font-semibold text-[#263b2c]" id={`court-${courtId}`}>{courtName}</h2>
            <span className="font-mono text-xs text-[#718072]">0{courtIndex + 1} / 02</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {slots.filter((slot) => slot.courtId === courtId).map((slot) => (
              <div
                className={`min-h-[96px] border p-2.5 ${slotStyle(slot)}`}
                key={`${slot.courtId}-${slot.startTime}`}
              >
                <div className="flex items-center justify-between gap-1 font-mono text-xs font-semibold">
                  <span>{timeLabel(slot.startTime)}</span>
                  <span className="opacity-60">{timeLabel(slot.endTime)}</span>
                </div>
                <p className="mt-2 truncate text-[11px] font-semibold" title={slotLabel(slot, isOwner)}>
                  {slotLabel(slot, isOwner)}
                </p>
                {!isOwner && slot.status === "available" && slot.isBookable && (
                  <>
                    <p className="mt-1 text-[10px]">Total {money(slot.price)} · Seña {money(slot.price / 2)}</p>
                    {isPlayer ? (
                      <form action={createOnlineBookingPreferenceAction} className="mt-2">
                        <input name="courtId" type="hidden" value={slot.courtId} />
                        <input name="bookingDate" type="hidden" value={slot.date} />
                        <input name="startTime" type="hidden" value={slot.startTime} />
                        <button className="min-h-9 w-full bg-[#315b43] px-2 text-[10px] font-semibold text-white hover:bg-[#244733]" type="submit">
                          Reservar
                        </button>
                      </form>
                    ) : (
                      <Link className="mt-2 flex min-h-9 items-center justify-center border border-[#315b43] px-2 text-[10px] font-semibold text-[#315b43] hover:bg-white" href="/login">
                        Iniciar sesión
                      </Link>
                    )}
                  </>
                )}
                {slot.status === "booked" && isOwner && slot.booking?.total_price !== undefined && (
                  <>
                    <p className="mt-1 truncate text-[10px] font-medium">Total {money(slot.booking.total_price)}</p>
                    <p className="truncate text-[10px]" title={depositLabel(slot)}>{depositLabel(slot)}</p>
                  </>
                )}
                {slot.status === "booked" && isOwner && slot.booking?.player_id && (
                  <p className="mt-1 text-[10px] text-[#74443d]">Jugador registrado</p>
                )}
                {slot.status === "booked" && isOwner && slot.lockReason && (
                  <p className="mt-1 truncate text-[10px] font-semibold text-[#655116]" title={`Bloqueo: ${slot.lockReason}`}>
                    Bloqueo: {slot.lockReason}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function AvailabilityLegend() {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#566258]" aria-label="Estados de la agenda">
      <span className="flex items-center gap-2"><i className="h-3 w-3 border border-[#83a28a] bg-[#edf4e9]" />Disponible</span>
      <span className="flex items-center gap-2"><i className="h-3 w-3 border border-[#db9c90] bg-[#fff1ed]" />Reservado</span>
      <span className="flex items-center gap-2"><i className="h-3 w-3 border border-[#d4b65d] bg-[#fbf4d9]" />Bloqueado</span>
    </div>
  );
}

export function CourtsHeader({ title, isOwner }: { title: string; isOwner: boolean }) {
  return (
    <header className="flex items-center justify-between border-b border-[#d9ddd5] px-5 py-4 sm:px-9">
      <Link className="font-semibold tracking-wide text-[#263b2c]" href="/">
        turnero<span className="text-[#e5643f]">.</span>
      </Link>
      <div className="flex items-center gap-4">
        <span className="hidden text-sm text-[#536057] sm:inline">{title}</span>
        <Link className="text-xs font-semibold text-[#315b43] underline decoration-[#a7b5a8] underline-offset-4" href={isOwner ? "/availability" : "/login"}>
          {isOwner ? "Vista pública" : "Iniciar sesión"}
        </Link>
      </div>
    </header>
  );
}