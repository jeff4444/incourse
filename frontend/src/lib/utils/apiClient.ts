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
    };

    // Only set Content-Type to application/json if body is not FormData
    // FormData needs to set its own Content-Type with boundary
    if (!(options.body instanceof FormData)) {
      (headers as Record<string, string>)['Content-Type'] = 'application/json';
    }

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
    // Try to get the error text from the response body
    let errorText = '';
    let errorJson: any = null;
    
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        errorJson = await response.json();
        errorText = errorJson.error || errorJson.message || JSON.stringify(errorJson);
      } else {
        errorText = await response.text();
      }
    } catch (e) {
      errorText = 'Unable to read error response';
      console.error('Failed to parse error response:', e);
    }
    
    // Enhanced error logging with more context
    const errorDetails = {
      url,
      status: response.status,
      statusText: response.statusText,
      errorText,
      errorJson,
      method: options.method || 'GET',
      timestamp: new Date().toISOString(),
    };
    
    console.error('API call failed:', errorDetails);
    
    // Create a more informative error message
    const errorMessage = `API call failed: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''} - ${url}`;
    const error = new Error(errorMessage);
    
    // Attach additional context to the error object
    (error as any).status = response.status;
    (error as any).url = url;
    (error as any).response = errorJson;
    
    throw error;
  }
  
  return response.json();
}
