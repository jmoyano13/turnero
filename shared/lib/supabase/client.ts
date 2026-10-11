import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseConfig } from "@/shared/lib/supabase/config";
import type { Database } from "@/shared/types/database.types";

export function createSupabaseBrowserClient() {
  const config = getSupabaseConfig();

  if (!config) throw new Error("Supabase no está configurado.");

  return createBrowserClient<Database>(config.url, config.anonKey);
}