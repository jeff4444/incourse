import { createClient } from "@/lib/utils/supabase/client";
import { decryptApiKey } from "./encryption";

export interface UserCredentials {
  apiKey: string;
  apiBaseUrl: string;
  lmsProvider: string;
}

const supabaseClient = createClient();
/**
 * Fetches and decrypts user's LMS credentials from the database
 * @param userId - The user ID to fetch credentials for
 * @returns Promise<UserCredentials | null>
 */
export async function getUserCredentials(userId: string, accessToken?: string): Promise<UserCredentials | null> {
  try {
    
    const { data, error } = await supabaseClient
    .from('user_api_keys')
      .select('encrypted_api_key, api_base_url, lms_provider')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching user credentials:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.error('No credentials found for user:', userId);
      return null;
    }

    // Use the first credential if multiple exist
    const credential = data[0];

    // Decrypt the API key
    const decryptedApiKey = decryptApiKey(credential.encrypted_api_key);

    return {
      apiKey: decryptedApiKey,
      apiBaseUrl: credential.api_base_url ? `${credential.api_base_url}/api/v1` : '',
      lmsProvider: credential.lms_provider
    };
  } catch (error) {
    console.error('Error in getUserCredentials:', error);
    return null;
  }
}

/**
 * Gets user ID and access token from the request headers (Authorization token)
 * @param request - The NextRequest object
 * @returns Promise<{userId: string, accessToken: string} | null>
 */
export async function getUserFromRequest(request: Request): Promise<{userId: string, accessToken: string} | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return null;
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify the token with Supabase and get user
    const { data: { user }, error } = await supabaseClient.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }

    return { userId: user.id, accessToken: token };
  } catch (error) {
    console.error('Error getting user from request:', error);
    return null;
  }
}
