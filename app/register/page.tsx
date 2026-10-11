import Link from "next/link";

import { RegisterForm } from "@/features/auth/components/auth-form";
import { getSupabaseConfig } from "@/shared/lib/supabase/config";

export default function RegisterPage() {
  const configured = Boolean(getSupabaseConfig());

  return (
    <main className="min-h-screen bg-[#f5f4ef] px-5 py-8 text-[#202720] sm:px-8 sm:py-12">
      <div className="mx-auto w-full max-w-5xl">
        <Link className="font-sans text-xl font-bold tracking-tight" href="/">turnero<span className="text-[#e5643f]">.</span></Link>
        <div className="mt-10 grid overflow-hidden border border-[#dce0d8] bg-white lg:grid-cols-[0.85fr_1.15fr]">
          <aside className="flex min-h-48 flex-col justify-between bg-[#315b43] p-7 text-white sm:p-10 lg:min-h-[650px]">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#d7e6d6]">Empezá por acá</p>
            <div>
              <p className="font-sans text-3xl font-medium leading-tight">La cancha<br />te espera.</p>
              <p className="mt-4 max-w-xs text-sm leading-6 text-[#d7e6d6]">Creá tu cuenta para tener tus datos de jugador siempre a mano.</p>
            </div>
            <span className="text-xs font-medium text-[#d7e6d6]">Turnero · Club de pádel</span>
          </aside>
          <section className="p-6 sm:p-10 lg:p-14">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#55705b]">Nueva cuenta</p>
            <h1 className="mt-3 font-sans text-3xl font-semibold">Registrate como jugador</h1>
            <p className="mt-2 text-sm leading-6 text-[#687168]">Completá tus datos para continuar.</p>
            {!configured ? (
              <div className="mt-8 border-l-2 border-[#e5643f] bg-[#fbf1ec] px-4 py-3 text-sm leading-6 text-[#744534]">
                Para habilitar el registro, configurá <code>NEXT_PUBLIC_SUPABASE_URL</code> y <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> en tu entorno.
              </div>
            ) : (
              <div className="mt-8"><RegisterForm /></div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}