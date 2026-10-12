import Link from "next/link";

import { PlayerBookingsList } from "@/features/bookings/components/player-bookings-list";
import { getPlayerBookings } from "@/features/bookings/services/player-booking-service";
import { requireProfile } from "@/features/auth/services/profile-service";

export const instant = false;

export default async function PlayerBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string | string[]; payment?: string | string[] }>;
}) {
  const profile = await requireProfile("player");
  const [data, params] = await Promise.all([getPlayerBookings(profile.id), searchParams]);
  const notice = typeof params.notice === "string" ? params.notice : undefined;

  return (
    <main className="min-h-screen bg-[#f5f4ef] px-5 py-8 text-[#202720] sm:px-8 sm:py-12">
      <div className="mx-auto w-full max-w-4xl">
        <header className="flex items-center justify-between gap-4 border-b border-[#d9ddd5] pb-5">
          <Link className="text-xl font-bold tracking-tight text-[#263b2c]" href="/availability">Turnero<span className="text-[#e5643f]">.</span></Link>
          <nav className="flex gap-4 text-sm font-semibold">
            <Link className="text-[#315b43] underline underline-offset-4" href="/profile">Perfil</Link>
            <Link className="text-[#315b43] underline underline-offset-4" href="/availability">Disponibilidad</Link>
          </nav>
        </header>
        <section className="pt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#55705b]">Cuenta de jugador</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#263b2c]">Mis reservas</h1>
          {params.payment === "success" || params.payment === "pending" ? (
            <p className="mt-4 border-l-2 border-[#55705b] bg-white px-4 py-3 text-sm text-[#425247]" role="status">
              El pago está siendo verificado. Esta lista se actualiza al recibir la confirmación de Mercado Pago.
            </p>
          ) : null}
          <PlayerBookingsList bookings={data.bookings} error={data.error} notice={notice} />
        </section>
      </div>
    </main>
  );
}