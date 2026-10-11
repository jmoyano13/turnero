import Link from "next/link";
import { connection } from "next/server";

import { AvailabilityBoard, AvailabilityLegend, CourtsHeader } from "@/features/courts/components/availability-board";
import { getAvailabilityByDate, getActiveLocks } from "@/features/courts/services/availability-service";
import { addCalendarDays, getBusinessDate } from "@/features/courts/types/availability";
import { LockManager } from "@/features/locks/components/lock-manager";
import { updateCurrentPriceAction } from "@/features/locks/actions/lock-actions";
import { OwnerBookingManager } from "@/features/bookings/components/owner-booking-manager";
import { getOwnerBookingData } from "@/features/bookings/services/owner-booking-service";

export const instant = false;

function validDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

const notices: Record<string, string> = {
  "price-updated": "El precio vigente se actualizó. Las reservas existentes conservan su precio histórico.",
  "price-error": "No se pudo actualizar el precio. Verificá que sea un importe mayor que cero.",
  "lock-deleted": "El bloqueo se eliminó y la disponibilidad quedó actualizada.",
  "lock-error": "No se pudo eliminar el bloqueo.",
  "booking-updated": "La reserva se modificó y conserva su precio histórico.",
  "booking-cancelled": "La reserva se canceló y el horario quedó disponible.",
  "booking-refund": "La reserva se canceló. La devolución de la seña quedó registrada para gestionarla fuera del sistema.",
  "booking-error": "No se pudo administrar la reserva. Actualizá la agenda e intentá nuevamente.",
};

export default async function OwnerAgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[]; notice?: string | string[] }>;
}) {
  await connection();
  const params = await searchParams;
  const today = getBusinessDate();
  const requestedDate = typeof params.date === "string" ? params.date : undefined;
  const date = validDate(requestedDate) && requestedDate >= today ? requestedDate : today;
  const [{ slots, courts, price, error }, { locks, error: locksError }, bookingData] = await Promise.all([
    getAvailabilityByDate(date, true),
    getActiveLocks(),
    getOwnerBookingData(date),
  ]);
  const notice = typeof params.notice === "string" ? notices[params.notice] : undefined;

  return (
    <main className="min-h-screen bg-[#f5f4ef] text-[#202720]">
      <CourtsHeader title="Tablero del dueño" isOwner />
      <div className="mx-auto w-full max-w-7xl px-5 pb-16 pt-8 sm:px-9 sm:pt-12">
        <div className="flex flex-col justify-between gap-6 border-b border-[#d9ddd5] pb-7 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#55705b]">Administración</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#263b2c]">Agenda</h1>
            <p className="mt-2 text-sm text-[#657067]">Reservas, disponibilidad y horarios bloqueados.</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <form action="/owner" className="flex items-end gap-2">
              <label className="grid gap-1 text-xs font-semibold text-[#536057]" htmlFor="owner-date">
                Fecha
                <input className="h-10 border border-[#c7cfc4] bg-white px-3 text-sm font-normal" id="owner-date" type="date" name="date" min={today} defaultValue={date} />
              </label>
              <button className="h-10 bg-[#315b43] px-4 text-sm font-semibold text-white hover:bg-[#244733]" type="submit">Ver fecha</button>
            </form>
            <Link aria-label="Actualizar agenda" className="flex h-10 items-center border border-[#c7cfc4] bg-white px-3 text-sm font-semibold text-[#425247]" href={`/owner?date=${date}`} title="Actualizar agenda">Actualizar</Link>
          </div>
        </div>

        {notice && <p className="mt-5 border-l-2 border-[#55705b] bg-white px-4 py-3 text-sm text-[#425247]" role="status">{notice}</p>}
        {error && <p className="mt-5 border-l-2 border-[#e5643f] bg-white px-4 py-3 text-sm text-[#8d392c]" role="alert">{error}</p>}
        {locksError && <p className="mt-5 text-sm text-[#8d392c]" role="alert">{locksError}</p>}

        <div className="flex flex-wrap items-center justify-between gap-4 py-5">
          <p className="text-sm font-semibold text-[#425247]">
            {new Intl.DateTimeFormat("es-AR", { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`))}
          </p>
          <AvailabilityLegend />
        </div>
        <AvailabilityBoard slots={slots} isOwner />

        <OwnerBookingManager
          bookings={bookingData.bookings}
          courts={courts}
          date={date}
          error={bookingData.error}
          players={bookingData.players}
          slots={slots}
        />

        <section className="mt-10 border-y border-[#d9ddd5] py-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#718072]">Configuración global</p>
              <h2 className="mt-1 text-xl font-semibold text-[#263b2c]">Precio vigente</h2>
              <p className="mt-1 text-xs text-[#68746a]">Los cambios no alteran el precio histórico de reservas.</p>
            </div>
            <form action={updateCurrentPriceAction} className="flex items-end gap-2">
              <label className="grid gap-1 text-xs font-semibold text-[#536057]" htmlFor="current-price">
                Importe en ARS
                <input className="h-10 w-40 border border-[#c7cfc4] bg-white px-3 text-sm font-normal" id="current-price" type="number" name="currentPrice" min="0.01" step="0.01" required defaultValue={price ?? ""} />
              </label>
              <button className="h-10 border border-[#315b43] px-4 text-sm font-semibold text-[#315b43] hover:bg-[#edf4e9]" type="submit">Guardar precio</button>
            </form>
          </div>
        </section>

        <section className="mt-10">
          {courts.length > 0 && <LockManager courtIds={courts} selectedDate={date} locks={locks} />}
          {courts.length === 0 && !error && <p className="text-sm text-[#657067]">No hay canchas activas para asociar bloqueos.</p>}
        </section>

        <p className="mt-8 text-xs text-[#68746a]">La selección de fechas del tablero no tiene límite de anticipación. La consulta pública muestra hasta {addCalendarDays(today, 7)}.</p>
      </div>
    </main>
  );
}