"use client";

import { useActionState, useState } from "react";

import {
  cancelBookingOwnerAction,
  createManualBookingAction,
  updateBookingOwnerAction,
} from "@/features/bookings/actions/booking-actions";
import type { BookingActionState } from "@/features/bookings/types/booking.schema";
import type { OwnerBookingView, RegisteredPlayerOption } from "@/features/bookings/services/owner-booking-service";
import type { AvailabilitySlot, CourtRecord } from "@/features/courts/types/availability";

const initialState: BookingActionState = {};
const fieldClass = "mt-1 h-10 w-full border border-[#c7cfc4] bg-white px-3 text-sm font-normal text-[#202720]";
const labelClass = "grid gap-1 text-xs font-semibold text-[#536057]";
const slotTimes = Array.from({ length: 16 }, (_, index) => {
  const minutes = index * 90;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00`;
});

function money(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);
}

function playerName(booking: OwnerBookingView) {
  return booking.manual_player_name || [booking.player_first_name, booking.player_last_name].filter(Boolean).join(" ") || "Jugador registrado";
}

function paymentSummary(booking: OwnerBookingView) {
  if (booking.refund_required || booking.payment_status === "refund_pending") return "Devolución de seña pendiente";
  if (booking.is_manual || booking.payment_status === "none") return "Sin seña";
  if (booking.payment_status === "paid") return `Seña pagada: ${money(booking.deposit_amount)}`;
  if (booking.payment_status === "pending") return "Seña pendiente";
  return "Seña no registrada";
}

function ManualBookingForm({
  date,
  courts,
  players,
  slots,
}: {
  date: string;
  courts: CourtRecord[];
  players: RegisteredPlayerOption[];
  slots: AvailabilitySlot[];
}) {
  const [state, formAction, pending] = useActionState(createManualBookingAction, initialState);
  const [playerType, setPlayerType] = useState(players.length > 0 ? "registered" : "manual");
  const [selectedCourtId, setSelectedCourtId] = useState(courts[0]?.id ?? "");
  const [selectedStartTime, setSelectedStartTime] = useState(() =>
    slots.find((slot) => slot.courtId === courts[0]?.id && slot.status === "available")?.startTime ?? "",
  );
  const availableSlots = slots.filter((slot) => slot.courtId === selectedCourtId && slot.status === "available");
  const currentStartTime = availableSlots.some((slot) => slot.startTime === selectedStartTime)
    ? selectedStartTime
    : availableSlots[0]?.startTime ?? "";

  return (
    <form action={formAction} className="grid gap-4 border-y border-[#d9ddd5] py-5 sm:grid-cols-2 lg:grid-cols-3">
      <input name="bookingDate" type="hidden" value={date} />
      <p className={`${labelClass} justify-center`}>
        <span>Fecha</span>
        <span className="mt-1 flex h-10 items-center border border-[#d9ddd5] bg-white px-3 text-sm font-normal text-[#202720]">{date}</span>
      </p>
      <label className={labelClass}>Cancha
        <select className={fieldClass} name="courtId" onChange={(event) => {
          const nextCourtId = event.target.value;
          const firstFreeTime = slots.find((slot) => slot.courtId === nextCourtId && slot.status === "available")?.startTime ?? "";
          setSelectedCourtId(nextCourtId);
          setSelectedStartTime(firstFreeTime);
        }} required value={selectedCourtId}>
          {courts.map((court) => <option key={court.id} value={court.id}>{court.name}</option>)}
        </select>
      </label>
      <label className={labelClass}>Horario · 90 minutos
        <select className={`${fieldClass} font-mono`} name="startTime" onChange={(event) => setSelectedStartTime(event.target.value)} required value={currentStartTime}>
          {availableSlots.map((slot) => <option key={slot.startTime} value={slot.startTime}>{slot.startTime.slice(0, 5)}–{slot.endTime.slice(0, 5)}</option>)}
        </select>
      </label>
      <label className={labelClass}>Tipo de jugador
        <select className={fieldClass} name="playerType" onChange={(event) => setPlayerType(event.target.value)} value={playerType}>
          <option value="registered">Jugador registrado</option>
          <option value="manual">Solo nombre</option>
        </select>
      </label>
      {playerType === "registered" ? (
        <label className={labelClass}>Jugador registrado
          <select className={fieldClass} name="playerId" required>
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {[player.first_name, player.last_name].join(" ")} · {player.email}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label className={labelClass}>Nombre del jugador
          <input autoComplete="off" className={fieldClass} maxLength={100} minLength={2} name="manualPlayerName" required />
        </label>
      )}
      {state.error && <p className="text-sm text-[#a33c2b] sm:col-span-2 lg:col-span-3" role="alert">{state.error}</p>}
      {state.success && <p className="text-sm font-semibold text-[#315b43] sm:col-span-2 lg:col-span-3" role="status">{state.success}</p>}
      {availableSlots.length === 0 && <p className="text-sm text-[#68746a] sm:col-span-2 lg:col-span-3">No hay horarios libres para esta cancha en la fecha seleccionada.</p>}
      <div className="flex items-end sm:col-span-2 lg:col-span-3">
        <button className="min-h-10 bg-[#315b43] px-4 text-sm font-semibold text-white hover:bg-[#244733] disabled:opacity-60" disabled={pending || availableSlots.length === 0} type="submit">
          {pending ? "Guardando…" : "Confirmar reserva manual"}
        </button>
      </div>
    </form>
  );
}

function BookingEditForm({ booking, date, courts }: { booking: OwnerBookingView; date: string; courts: CourtRecord[] }) {
  return (
    <details className="mt-3 border-t border-[#d9ddd5] pt-2">
      <summary className="w-fit cursor-pointer text-xs font-semibold text-[#315b43] underline underline-offset-4">Modificar turno</summary>
      <form action={updateBookingOwnerAction} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input name="bookingId" type="hidden" value={booking.id} />
        <input name="returnDate" type="hidden" value={date} />
        <label className={labelClass}>Fecha
          <input className={fieldClass} defaultValue={booking.booking_date} name="bookingDate" required type="date" />
        </label>
        <label className={labelClass}>Cancha
          <select className={fieldClass} defaultValue={booking.court_id} name="courtId" required>
            {courts.map((court) => <option key={court.id} value={court.id}>{court.name}</option>)}
          </select>
        </label>
        <label className={labelClass}>Inicio
          <select className={`${fieldClass} font-mono`} defaultValue={booking.start_time} name="startTime" required>
            {slotTimes.map((time) => <option key={time} value={time}>{time.slice(0, 5)}</option>)}
          </select>
        </label>
        <div className="flex items-end">
          <button className="min-h-10 w-full border border-[#315b43] px-3 text-sm font-semibold text-[#315b43] hover:bg-[#edf4e9]" type="submit">Guardar cambio</button>
        </div>
      </form>
    </details>
  );
}

export function OwnerBookingManager({
  date,
  courts,
  bookings,
  players,
  slots,
  error,
}: {
  date: string;
  courts: CourtRecord[];
  bookings: OwnerBookingView[];
  players: RegisteredPlayerOption[];
  slots: AvailabilitySlot[];
  error: string | null;
}) {
  const courtNames = new Map(courts.map((court) => [court.id, court.name]));

  return (
    <section className="mt-10 border-t border-[#d9ddd5] pt-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#718072]">Reservas · dueño</p>
        <h2 className="mt-1 text-xl font-semibold text-[#263b2c]">Registrar y administrar turnos</h2>
      </div>
      {error && <p className="mt-4 text-sm text-[#a33c2b]" role="alert">{error}</p>}
      {courts.length > 0 && <ManualBookingForm date={date} courts={courts} players={players} slots={slots} />}

      <div className="mt-8">
        <h3 className="text-base font-semibold text-[#34483a]">Reservas de esta fecha</h3>
        {bookings.length === 0 ? (
          <p className="mt-3 border-y border-[#d9ddd5] py-5 text-sm text-[#657067]">No hay reservas registradas para esta fecha.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[#d9ddd5] border-y border-[#d9ddd5]">
            {bookings.map((booking) => (
              <li className="py-4" key={booking.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-semibold text-[#263b2c]">
                      {booking.start_time.slice(0, 5)}–{booking.end_time.slice(0, 5)} · {courtNames.get(booking.court_id) ?? "Cancha"}
                    </p>
                    <p className="mt-1 text-sm text-[#425247]">{playerName(booking)}</p>
                    <p className="mt-1 text-xs text-[#68746a]">
                      {booking.status === "confirmed" ? "Confirmada" : "Cancelada"}
                      {booking.is_manual ? " · Manual" : " · Online"}
                      {` · Total ${money(booking.total_price)} · ${paymentSummary(booking)}`}
                    </p>
                  </div>
                  {booking.refund_required && <span className="border border-[#d4b65d] px-2 py-1 text-xs font-semibold text-[#655116]">Devolución pendiente</span>}
                </div>
                {booking.status === "confirmed" && (
                  <>
                    <BookingEditForm booking={booking} date={date} courts={courts} />
                    <form action={cancelBookingOwnerAction} className="mt-2">
                      <input name="bookingId" type="hidden" value={booking.id} />
                      <input name="returnDate" type="hidden" value={date} />
                      <details>
                        <summary className="w-fit cursor-pointer text-xs font-semibold text-[#9c4032] underline underline-offset-4">Cancelar reserva</summary>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          <p className="text-xs text-[#68746a]">
                            {booking.payment_status === "paid" ? "Se registrará la devolución de la seña para gestionarla fuera del sistema." : "El turno quedará disponible nuevamente."}
                          </p>
                          <button className="min-h-10 border border-[#b95a49] px-3 text-sm font-semibold text-[#9c4032] hover:bg-[#fff1ed]" type="submit">Confirmar cancelación</button>
                        </div>
                      </details>
                    </form>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}