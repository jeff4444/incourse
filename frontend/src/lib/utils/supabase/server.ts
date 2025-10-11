import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const createClient = async (
  cookieStore?: Awaited<ReturnType<typeof cookies>>,
  customKey?: string
) => {
  const apiKey = customKey || supabaseKey;
  
  if (!cookieStore) {
    // When no cookies provided, create a simple client (for scripts/service role usage)
    return createServerClient(
      supabaseUrl!,
      apiKey!,
      {
        cookies: {
          getAll() {
            return []
          },
          setAll() {
            // No-op when cookies not provided
          },
        },
      },
    );
  }
  
  return createServerClient(
    supabaseUrl!,
    apiKey!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
};

