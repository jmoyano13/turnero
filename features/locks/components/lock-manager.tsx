"use client";

import { useActionState } from "react";

import { getValidSlotStartTimes } from "@/features/bookings/utils/slot-validation";
import { createLockAction, deleteLockAction, type LockActionState } from "@/features/locks/actions/lock-actions";
import { getSlotEndTime, weekDays } from "@/features/locks/types/lock.schema";
import type { CourtLock } from "@/shared/types/database.types";

type LockListItem = Pick<CourtLock,
  "id" | "court_id" | "court_scope" | "lock_type" | "reason" | "specific_date" |
  "day_of_week" | "start_time" | "end_time"
>;

const initialState: LockActionState = {};
const lockTimes = getValidSlotStartTimes();

export function LockManager({
  courtIds,
  selectedDate,
  locks,
}: {
  courtIds: Array<{ id: string; name: string }>;
  selectedDate: string;
  locks: LockListItem[];
}) {
  const [state, formAction, isPending] = useActionState(createLockAction, initialState);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#718072]">Agenda · reglas</p>
            <h2 className="mt-1 text-xl font-semibold text-[#263b2c]">Crear bloqueo</h2>
          </div>
        </div>
        <form action={formAction} className="grid gap-4 border-y border-[#d9ddd5] py-5 sm:grid-cols-2">
          <input type="hidden" name="confirmAffected" value={state.confirmRequired ? "true" : "false"} />
          <label className="grid gap-1.5 text-xs font-semibold text-[#425247]">
            Canchas
            <select className="h-10 border border-[#c7cfc4] bg-white px-3 text-sm font-normal" name="courtScope" defaultValue="single">
              <option value="single">Una cancha</option>
              <option value="both">Ambas canchas</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-[#425247]">
            Cancha
            <select className="h-10 border border-[#c7cfc4] bg-white px-3 text-sm font-normal" name="courtId" defaultValue={courtIds[0]?.id}>
              {courtIds.map((court) => <option key={court.id} value={court.id}>{court.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-[#425247]">
            Tipo
            <select className="h-10 border border-[#c7cfc4] bg-white px-3 text-sm font-normal" name="lockType" defaultValue="one_time">
              <option value="one_time">Puntual</option>
              <option value="recurring">Recurrente · indefinido</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-[#425247]">
            Fecha puntual
            <input className="h-10 border border-[#c7cfc4] bg-white px-3 text-sm font-normal" type="date" name="specificDate" defaultValue={selectedDate} />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-[#425247]">
            Día recurrente
            <select className="h-10 border border-[#c7cfc4] bg-white px-3 text-sm font-normal" name="dayOfWeek" defaultValue={String(new Date(`${selectedDate}T00:00:00.000Z`).getUTCDay())}>
              {weekDays.map((day, index) => <option key={day} value={index}>{day}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-[#425247]">
            Inicio · duración 90 min
            <select className="h-10 border border-[#c7cfc4] bg-white px-3 font-mono text-sm font-normal" name="startTime" defaultValue="18:30:00">
              {lockTimes.map((time) => <option key={time} value={time}>{time.slice(0, 5)}–{getSlotEndTime(time).slice(0, 5)}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-[#425247] sm:col-span-2">
            Motivo
            <input className="h-10 border border-[#c7cfc4] bg-white px-3 text-sm font-normal" name="reason" maxLength={120} minLength={2} required placeholder="Escuela, mantenimiento…" />
          </label>
          {state.error && <p className="text-sm text-[#a33c2b] sm:col-span-2" role="alert">{state.error}</p>}
          {state.success && <p className="text-sm font-semibold text-[#315b43] sm:col-span-2" role="status">{state.success}</p>}
          {state.warnings && state.warnings.length > 0 && (
            <div className="border border-[#d4b65d] bg-[#fbf4d9] p-3 text-sm text-[#655116] sm:col-span-2" role="status">
              <p className="font-semibold">
                {state.confirmRequired
                  ? `Este bloqueo afecta ${state.warnings.length} reserva(s). Confirmá para crearlo; las reservas no se cancelarán.`
                  : `El bloqueo se creó y afecta ${state.warnings.length} reserva(s).`}
              </p>
              <ul className="mt-2 space-y-1 text-xs">
                {state.warnings.map((warning) => (
                  <li key={warning.bookingId}>
                    {warning.bookingDate} · {warning.courtName} · {warning.startTime} · {warning.playerName}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex items-center justify-between gap-4 sm:col-span-2">
            <p className="max-w-sm text-xs leading-5 text-[#6c756d]">Si el horario ya tiene una reserva, se marcará aquí para que puedas resolverla.</p>
            <button className="h-10 shrink-0 bg-[#315b43] px-4 text-sm font-semibold text-white hover:bg-[#244733] disabled:opacity-60" type="submit" disabled={isPending}>
              {isPending ? "Guardando…" : state.confirmRequired ? "Crear de todos modos" : "Crear bloqueo"}
            </button>
          </div>
        </form>
      </section>

      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#718072]">Bloqueos activos</p>
        <h2 className="mt-1 text-xl font-semibold text-[#263b2c]">Reglas vigentes</h2>
        {locks.length === 0 ? (
          <p className="mt-5 border-y border-[#d9ddd5] py-5 text-sm text-[#657067]">No hay bloqueos activos.</p>
        ) : (
          <ul className="mt-4 divide-y divide-[#d9ddd5] border-y border-[#d9ddd5]">
            {locks.map((lock) => (
              <li className="flex items-center justify-between gap-3 py-3" key={lock.id}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#34483a]">{lock.reason}</p>
                  <p className="mt-1 text-xs text-[#68746a]">
                    {lock.court_scope === "both" ? "Ambas canchas" : courtIds.find((court) => court.id === lock.court_id)?.name ?? "Cancha"}
                    {" · "}{lock.lock_type === "one_time" ? lock.specific_date : `${weekDays[lock.day_of_week ?? 0]} · recurrente`}
                    {" · "}{lock.start_time.slice(0, 5)}–{lock.end_time.slice(0, 5)}
                  </p>
                </div>
                <form action={deleteLockAction}>
                  <input type="hidden" name="lockId" value={lock.id} />
                  <button aria-label={`Eliminar bloqueo: ${lock.reason}`} className="h-9 border border-[#c7cfc4] px-3 text-xs font-semibold text-[#536057] hover:bg-white" type="submit">Eliminar</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}