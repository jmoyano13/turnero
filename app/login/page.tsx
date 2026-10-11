import Link from "next/link";

import { LoginForm } from "@/features/auth/components/auth-form";
import { getSupabaseConfig } from "@/shared/lib/supabase/config";

export const instant = false;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const configured = Boolean(getSupabaseConfig());
  const nextPath = typeof params.next === "string" ? params.next : "/profile";

  return (
    <main className="min-h-screen bg-[#f5f4ef] px-5 py-8 text-[#202720] sm:px-8 sm:py-12">
      <div className="mx-auto w-full max-w-5xl">
        <Link className="font-sans text-xl font-bold tracking-tight" href="/">turnero<span className="text-[#e5643f]">.</span></Link>
        <div className="mt-10 grid overflow-hidden border border-[#dce0d8] bg-white lg:grid-cols-[0.85fr_1.15fr]">
          <aside className="flex min-h-48 flex-col justify-between bg-[#315b43] p-7 text-white sm:p-10 lg:min-h-[580px]">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#d7e6d6]">Volvé a la cancha</p>
            <div>
              <p className="font-sans text-3xl font-medium leading-tight">Tus partidos,<br />en orden.</p>
              <p className="mt-4 max-w-xs text-sm leading-6 text-[#d7e6d6]">Ingresá para ver tu perfil y mantener tus datos al día.</p>
            </div>
            <span className="text-xs font-medium text-[#d7e6d6]">Turnero · Club de pádel</span>
          </aside>
          <section className="p-6 sm:p-10 lg:p-14">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#55705b]">Tu cuenta</p>
            <h1 className="mt-3 font-sans text-3xl font-semibold">Iniciar sesión</h1>
            <p className="mt-2 text-sm leading-6 text-[#687168]">Ingresá con tu email o continuá con Google.</p>
            {!configured ? (
              <div className="mt-8 border-l-2 border-[#e5643f] bg-[#fbf1ec] px-4 py-3 text-sm leading-6 text-[#744534]">
                Para habilitar el acceso, configurá <code>NEXT_PUBLIC_SUPABASE_URL</code> y <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> en tu entorno.
              </div>
            ) : (
              <div className="mt-8"><LoginForm googleError={params.error === "google"} nextPath={nextPath} /></div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}