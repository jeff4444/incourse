import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Gets the current user's session token for server-side API calls
 * @returns Promise with the access token or null if not authenticated
 */
export async function getServerSessionToken(): Promise<string | null> {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );
    
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.error('Error getting server session:', error);
    return null;
  }
}

/**
 * Makes an authenticated API call from server components
 * @param url - The API endpoint URL
 * @param options - Additional fetch options
 * @returns Promise with the response
 */
export async function serverAuthenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  try {
    const token = await getServerSessionToken();
    
    if (!token) {
      throw new Error("No valid session found");
    }

    // Add the Authorization header
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    return fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    console.error('Error in server authenticated fetch:', error);
    throw error;
  }
}

/**
 * Makes an authenticated API call from server components and returns JSON
 * @param url - The API endpoint URL
 * @param options - Additional fetch options
 * @returns Promise with the parsed JSON response
 */
export async function serverAuthenticatedFetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await serverAuthenticatedFetch(url, options);
  
  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}
