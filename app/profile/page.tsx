import Link from "next/link";

import { ProfileForm } from "@/features/auth/components/auth-form";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { requireProfile } from "@/features/auth/services/profile-service";

export const instant = false;

export default async function ProfilePage() {
  const profile = await requireProfile();

  return (
    <main className="min-h-screen bg-[#f5f4ef] px-5 py-8 text-[#202720] sm:px-8 sm:py-12">
      <div className="mx-auto w-full max-w-4xl">
        <header className="flex items-center justify-between gap-4">
          <Link className="font-sans text-xl font-bold tracking-tight" href="/availability">Turnero<span className="text-[#e5643f]">.</span></Link>
          <SignOutButton />
        </header>
        <section className="mt-10 border border-[#dce0d8] bg-white p-6 sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#55705b]">{profile.role === "owner" ? "Cuenta de dueño" : "Cuenta de jugador"}</p>
          <h1 className="mt-3 font-sans text-3xl font-semibold">Tu perfil</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#687168]">Mantené actualizados tus datos de contacto.</p>
          {profile.role === "owner" && (
            <Link className="mt-5 inline-flex min-h-10 items-center bg-[#315b43] px-4 text-sm font-semibold text-white hover:bg-[#244733]" href="/owner">Abrir tablero de agenda</Link>
          )}
          {profile.role === "player" && (
            <Link className="mt-5 inline-flex min-h-10 items-center border border-[#315b43] px-4 text-sm font-semibold text-[#315b43] hover:bg-[#edf4e9]" href="/profile/bookings">Ver mis reservas</Link>
          )}
          <div className="mt-8 max-w-2xl"><ProfileForm profile={profile} /></div>
        </section>
      </div>
    </main>
  );
}