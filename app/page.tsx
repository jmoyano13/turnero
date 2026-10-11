import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f5f4ef] text-[#202720]">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 sm:px-10">
        <Link className="font-sans text-xl font-bold tracking-tight" href="/">
          turnero<span className="text-[#e5643f]">.</span>
        </Link>
        <Link className="text-sm font-semibold text-[#34443b] underline decoration-[#a7b5a8] underline-offset-4" href="/login">
          Iniciar sesión
        </Link>
      </header>
      <section className="mx-auto grid min-h-[calc(100vh-88px)] w-full max-w-6xl items-center gap-12 px-6 pb-16 pt-8 sm:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
        <div className="max-w-2xl">
          <p className="mb-6 text-xs font-bold uppercase tracking-[0.18em] text-[#55705b]">Club de pádel</p>
          <h1 className="max-w-xl font-sans text-5xl font-semibold leading-[1.04] sm:text-6xl">
            Tu próximo partido, más cerca.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-[#5d665e]">
            Consultá turnos, reservá tu cancha y tené toda la información de tus partidos en un solo lugar.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link className="inline-flex min-h-12 items-center justify-center bg-[#315b43] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#244733]" href="/availability">
              Consultar disponibilidad
            </Link>
            <Link className="inline-flex min-h-12 items-center justify-center bg-[#315b43] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#244733]" href="/register">
              Crear cuenta
            </Link>
            <Link className="inline-flex min-h-12 items-center justify-center border border-[#c8cec5] px-6 text-sm font-semibold text-[#315b43] transition-colors hover:bg-white" href="/login">
              Ya tengo una cuenta
            </Link>
          </div>
        </div>
        <div className="relative min-h-[300px] overflow-hidden bg-[#315b43] p-7 text-white sm:min-h-[390px] sm:p-10">
          <div className="absolute inset-4 border border-white/25" aria-hidden="true" />
          <div className="relative flex h-full min-h-[250px] flex-col justify-between sm:min-h-[310px]">
            <div className="flex items-start justify-between gap-4">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d7e6d6]">La agenda, clara</span>
              <span className="flex h-10 w-10 items-center justify-center border border-white/40 text-sm font-semibold">02</span>
            </div>
            <div>
              <p className="text-sm text-[#d7e6d6]">Un lugar para organizar</p>
              <p className="mt-2 font-sans text-3xl font-medium leading-tight sm:text-4xl">cada punto<br />del partido.</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium text-[#d7e6d6]">
              <span className="h-px w-10 bg-[#e5643f]" />
              Turnos de 90 minutos
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
