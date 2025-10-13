import { createClient } from "@/lib/utils/supabase/client";

const supabase = createClient();

/**
 * Makes an authenticated API call with the user's session token
 * @param url - The API endpoint URL
 * @param options - Additional fetch options
 * @returns Promise with the response
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  try {
    // Get the current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error("No valid session found");
    }

    // Add the Authorization header
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };

    return fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    console.error('Error in authenticated fetch:', error);
    throw error;
  }
}

/**
 * Makes an authenticated API call and returns the JSON response
 * @param url - The API endpoint URL
 * @param options - Additional fetch options
 * @returns Promise with the parsed JSON response
 */
export async function authenticatedFetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await authenticatedFetch(url, options);
  
  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText} ${response.body} ${url}`);
  }
  
  return response.json();
}
