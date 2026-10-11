"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  signInAction,
  signInWithGoogleAction,
  signUpAction,
  updateProfileAction,
} from "@/features/auth/actions/auth-actions";
import type { AuthActionState } from "@/features/auth/types/auth.schema";
import type { Profile } from "@/shared/types/database.types";

const initialState: AuthActionState = {};
const fieldClass = "mt-2 min-h-12 w-full border border-[#c8cec5] bg-white px-3 text-sm text-[#202720] outline-none transition focus:border-[#315b43] focus:ring-2 focus:ring-[#315b43]/15";
const labelClass = "block text-sm font-semibold text-[#34443b]";

function Feedback({ state }: { state: AuthActionState }) {
  if (state.error) {
    return <p aria-live="polite" className="border-l-2 border-[#c34f3b] bg-[#fbefeb] px-3 py-2 text-sm text-[#8d3428]">{state.error}</p>;
  }

  if (state.success) {
    return <p aria-live="polite" className="border-l-2 border-[#315b43] bg-[#edf3ec] px-3 py-2 text-sm text-[#315b43]">{state.success}</p>;
  }

  return null;
}

function SubmitButton({ children }: { children: string }) {
  return (
    <button className="inline-flex min-h-12 w-full items-center justify-center bg-[#315b43] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#244733] disabled:cursor-wait disabled:opacity-60" type="submit">
      {children}
    </button>
  );
}

export function LoginForm({ nextPath, googleError }: { nextPath: string; googleError: boolean }) {
  const [state, action, pending] = useActionState(signInAction, initialState);

  return (
    <div className="space-y-5">
      {googleError && <Feedback state={{ error: "No pudimos conectar con Google. Probá con email y contraseña." }} />}
      <form action={action} className="space-y-5">
        <input name="next" type="hidden" value={nextPath} />
        <label className={labelClass}>Email
          <input autoComplete="email" className={fieldClass} name="email" required type="email" />
        </label>
        <label className={labelClass}>Contraseña
          <input autoComplete="current-password" className={fieldClass} minLength={8} name="password" required type="password" />
        </label>
        <Feedback state={state} />
        <SubmitButton>{pending ? "Ingresando..." : "Iniciar sesión"}</SubmitButton>
      </form>
      <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.12em] text-[#879087]">
        <span className="h-px flex-1 bg-[#dce0d8]" />o<span className="h-px flex-1 bg-[#dce0d8]" />
      </div>
      <form action={signInWithGoogleAction}>
        <button className="inline-flex min-h-12 w-full items-center justify-center gap-3 border border-[#c8cec5] bg-white px-5 text-sm font-semibold text-[#34443b] transition-colors hover:bg-[#f8f8f5]" type="submit">
          <span aria-hidden="true" className="font-bold text-base">G</span>Continuar con Google
        </button>
      </form>
      <p className="text-center text-sm text-[#687168]">¿Todavía no tenés cuenta? <Link className="font-semibold text-[#315b43] underline underline-offset-4" href="/register">Registrate</Link></p>
    </div>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(signUpAction, initialState);

  return (
    <div className="space-y-5">
      <form action={action} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>Nombre
            <input autoComplete="given-name" className={fieldClass} maxLength={80} minLength={2} name="firstName" required />
          </label>
          <label className={labelClass}>Apellido
            <input autoComplete="family-name" className={fieldClass} maxLength={80} minLength={2} name="lastName" required />
          </label>
        </div>
        <label className={labelClass}>Email
          <input autoComplete="email" className={fieldClass} name="email" required type="email" />
        </label>
        <label className={labelClass}>Teléfonos
          <textarea autoComplete="tel" className={`${fieldClass} min-h-20 py-3`} minLength={8} name="phoneNumbers" placeholder="Un teléfono por línea" required rows={2} />
          <span className="mt-1 block text-xs font-normal text-[#7b847a]">Podés agregar más de uno, separados por coma o por línea.</span>
        </label>
        <label className={labelClass}>Contraseña
          <input autoComplete="new-password" className={fieldClass} minLength={8} name="password" required type="password" />
        </label>
        <Feedback state={state} />
        <SubmitButton>{pending ? "Creando cuenta..." : "Crear cuenta"}</SubmitButton>
      </form>
      <form action={signInWithGoogleAction}>
        <button className="inline-flex min-h-12 w-full items-center justify-center gap-3 border border-[#c8cec5] bg-white px-5 text-sm font-semibold text-[#34443b] transition-colors hover:bg-[#f8f8f5]" type="submit">
          <span aria-hidden="true" className="font-bold text-base">G</span>Registrarme con Google
        </button>
      </form>
      <p className="text-center text-sm text-[#687168]">¿Ya tenés cuenta? <Link className="font-semibold text-[#315b43] underline underline-offset-4" href="/login">Iniciá sesión</Link></p>
    </div>
  );
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(updateProfileAction, initialState);

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>Nombre
          <input autoComplete="given-name" className={fieldClass} defaultValue={profile.first_name} maxLength={80} minLength={2} name="firstName" required />
        </label>
        <label className={labelClass}>Apellido
          <input autoComplete="family-name" className={fieldClass} defaultValue={profile.last_name} maxLength={80} minLength={2} name="lastName" required />
        </label>
      </div>
      <label className={labelClass}>Email
        <input autoComplete="email" className={fieldClass} defaultValue={profile.email} name="email" required type="email" />
        <span className="mt-1 block text-xs font-normal text-[#7b847a]">Los cambios de email pueden requerir confirmación.</span>
      </label>
      <label className={labelClass}>Teléfonos
        <textarea autoComplete="tel" className={`${fieldClass} min-h-20 py-3`} defaultValue={profile.phone_numbers.join("\n")} minLength={8} name="phoneNumbers" required rows={2} />
        <span className="mt-1 block text-xs font-normal text-[#7b847a]">Un teléfono por línea.</span>
      </label>
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-[#687168]">Tipo de cuenta: <strong className="text-[#34443b]">{profile.role === "owner" ? "Dueño" : "Jugador"}</strong></span>
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#738075]">No editable</span>
      </div>
      <Feedback state={state} />
      <SubmitButton>{pending ? "Guardando..." : "Guardar cambios"}</SubmitButton>
    </form>
  );
}