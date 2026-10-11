import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseConfig } from "@/shared/lib/supabase/config";
import type { Database } from "@/shared/types/database.types";

export async function createSupabaseServerClient() {
  const config = getSupabaseConfig();

  if (!config) throw new Error("Supabase no está configurado.");

  const cookieStore = await cookies();

  return createServerClient<Database>(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Proxy refreshes cookies during Server Component rendering.
        }
      },
    },
  });
}