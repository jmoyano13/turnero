import Link from "next/link";
import { connection } from "next/server";

import { AvailabilityBoard, AvailabilityLegend, CourtsHeader } from "@/features/courts/components/availability-board";
import { getAvailabilityByDate } from "@/features/courts/services/availability-service";
import { addCalendarDays, getBusinessDate, isPlayerDateAllowed } from "@/features/courts/types/availability";
import { getCurrentProfile } from "@/features/auth/services/profile-service";

export const instant = false;

function validDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[]; paymentError?: string | string[]; payment?: string | string[] }>;
}) {
  await connection();
  const params = await searchParams;
  const today = getBusinessDate();
  const requestedDate = typeof params.date === "string" ? params.date : undefined;
  const date = validDate(requestedDate) && isPlayerDateAllowed(requestedDate) ? requestedDate : today;
  const [{ slots, price, error }, profile] = await Promise.all([
    getAvailabilityByDate(date),
    getCurrentProfile(),
  ]);

  return (
    <main className="min-h-screen bg-[#f5f4ef] text-[#202720]">
      <CourtsHeader title="Disponibilidad" isOwner={false} />
      <div className="mx-auto w-full max-w-7xl px-5 pb-14 pt-8 sm:px-9 sm:pt-12">
        <div className="flex flex-col justify-between gap-6 border-b border-[#d9ddd5] pb-7 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#55705b]">Dos canchas · turnos de 90 minutos</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#263b2c]">Disponibilidad</h1>
            <p className="mt-2 text-sm text-[#657067]">Elegí una fecha dentro de los próximos siete días.</p>
          </div>
          <form action="/availability" className="flex items-end gap-2">
            <label className="grid gap-1 text-xs font-semibold text-[#536057]" htmlFor="availability-date">
              Fecha
              <input className="h-10 border border-[#c7cfc4] bg-white px-3 text-sm font-normal" id="availability-date" type="date" name="date" min={today} max={addCalendarDays(today, 7)} defaultValue={date} />
            </label>
            <button className="h-10 bg-[#315b43] px-4 text-sm font-semibold text-white hover:bg-[#244733]" type="submit">Ver fecha</button>
          </form>
        </div>

        {error ? (
          <div className="mt-8 border-l-2 border-[#e5643f] bg-white px-5 py-4 text-sm text-[#5d665e]" role="alert">
            {error}
            <p className="mt-2"><Link className="font-semibold text-[#315b43] underline underline-offset-4" href="/login">Iniciar sesión</Link> para gestionar tu cuenta.</p>
          </div>
        ) : (
          <>
            {typeof params.paymentError === "string" && (
              <p className="mb-5 border-l-2 border-[#e5643f] bg-white px-4 py-3 text-sm text-[#8d392c]" role="alert">
                {{
                  invalid: "Los datos del turno no son válidos.",
                  unavailable: "Ese turno ya no está disponible. Actualizá la agenda.",
                  checkout: "No pudimos iniciar el pago. Revisá la configuración e intentá nuevamente.",
                }[params.paymentError] ?? "No se pudo iniciar la reserva."}
              </p>
            )}
            {params.payment === "success" && (
              <p className="mb-5 border-l-2 border-[#55705b] bg-white px-4 py-3 text-sm text-[#425247]" role="status">
                Mercado Pago recibió el pago. La reserva aparecerá cuando se confirme la acreditación.
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-4 py-5">
              <p className="text-sm font-semibold text-[#425247]">
                {new Intl.DateTimeFormat("es-AR", { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`))}
              </p>
              <AvailabilityLegend />
            </div>
            <div className="mb-6 flex items-baseline gap-3 border-b border-[#d9ddd5] pb-5">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#718072]">Precio por turno</span>
              <span className="text-lg font-semibold text-[#315b43]">
                {price === null ? "—" : new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(price)}
              </span>
            </div>
            <AvailabilityBoard slots={slots} isOwner={false} isPlayer={profile?.role === "player"} />
          </>
        )}
      </div>
    </main>
  );
}