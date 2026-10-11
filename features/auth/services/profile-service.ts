import { connection } from "next/server";
import { redirect } from "next/navigation";

import type { Profile, UserRole } from "@/shared/types/database.types";
import { getSupabaseConfig } from "@/shared/lib/supabase/config";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

export async function getCurrentProfile(): Promise<Profile | null> {
  await connection();
  if (!getSupabaseConfig()) return null;

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, phone_numbers, role, created_at, updated_at")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;

  return data;
}

export async function requireProfile(role?: UserRole) {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login?error=session");
  if (role && profile.role !== role) redirect("/profile");

  return profile;
}