"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  loginSchema,
  parsePhoneNumbers,
  profileUpdateSchema,
  registerSchema,
  type AuthActionState,
} from "@/features/auth/types/auth.schema";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

function getText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function safeNextPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/profile";
}

export async function signInAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: getText(formData, "email"),
    password: getText(formData, "password"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) return { error: "No pudimos iniciar sesión. Revisá tus datos e intentá otra vez." };

  redirect(safeNextPath(getText(formData, "next")));
}

export async function signUpAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    firstName: getText(formData, "firstName"),
    lastName: getText(formData, "lastName"),
    email: getText(formData, "email"),
    password: getText(formData, "password"),
    phoneNumbers: parsePhoneNumbers(formData.get("phoneNumbers")),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback?next=/profile`,
      data: {
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName,
        phone_numbers: parsed.data.phoneNumbers,
      },
    },
  });

  if (error) return { error: "No pudimos crear tu cuenta. Verificá los datos e intentá otra vez." };

  if (data.session) redirect("/profile");

  return { success: "Te enviamos un email para confirmar tu cuenta. Después vas a poder iniciar sesión." };
}

export async function signInWithGoogleAction() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback?next=/profile`,
    },
  });

  if (error || !data.url) redirect("/login?error=google");
  redirect(data.url);
}

export async function updateProfileAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = profileUpdateSchema.safeParse({
    firstName: getText(formData, "firstName"),
    lastName: getText(formData, "lastName"),
    email: getText(formData, "email"),
    phoneNumbers: parsePhoneNumbers(formData.get("phoneNumbers")),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) redirect("/login?error=session");

  if (parsed.data.email !== user.email) {
    const { error } = await supabase.auth.updateUser({ email: parsed.data.email });
    if (error) return { error: "No pudimos actualizar el email. Puede que ya esté en uso." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      phone_numbers: parsed.data.phoneNumbers,
    })
    .eq("id", user.id);

  if (error) return { error: "No pudimos guardar el perfil. Intentá nuevamente." };

  revalidatePath("/profile");
  return { success: "Perfil actualizado correctamente." };
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}