import { createClient } from "@/lib/utils/supabase/client";

const supabaseClient = createClient();

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
