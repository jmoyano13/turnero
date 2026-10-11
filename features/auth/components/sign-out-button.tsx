import { signOutAction } from "@/features/auth/actions/auth-actions";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button className="text-sm font-semibold text-[#55705b] underline decoration-[#a7b5a8] underline-offset-4" type="submit">
        Cerrar sesión
      </button>
    </form>
  );
}