import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/supabase/config";

function noStoreFetch(input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) {
  return fetch(input, {
    ...init,
    cache: "no-store",
    next: { revalidate: 0 }
  } as RequestInit & { next: { revalidate: 0 } });
}

export function getSupabaseAdmin() {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      fetch: noStoreFetch
    }
  });
}
