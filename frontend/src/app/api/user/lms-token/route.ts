import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/utils/userCredentials";
import { createClient } from "@/lib/utils/supabase/server";
import { encryptApiKey } from "@/lib/utils/encryption";

interface UpdateLMSTokenRequest {
  apiKey: string;
  apiBaseUrl: string;
  lmsProvider: string;
}

export async function PUT(request: NextRequest) {
  try {
    // Get user from request
    const userData = await getUserFromRequest(request);
    if (!userData) {
      return NextResponse.json(
        { error: "Unauthorized - No valid user token" },
        { status: 401 }
      );
    }

    const body: UpdateLMSTokenRequest = await request.json();
    const { apiKey, apiBaseUrl, lmsProvider } = body;

    if (!apiKey || !apiBaseUrl || !lmsProvider) {
      return NextResponse.json(
        { error: "Missing required fields: apiKey, apiBaseUrl, or lmsProvider" },
        { status: 400 }
      );
    }

    // Encrypt the API key
    const encryptedApiKey = encryptApiKey(apiKey);

    // Update the user's API key in the database
    const supabase = await createClient();
    const { error } = await supabase
      .from('user_api_keys')
      .upsert({
        user_id: userData.userId,
        lms_provider: lmsProvider,
        encrypted_api_key: encryptedApiKey,
        api_base_url: apiBaseUrl,
        is_active: true
      });

    if (error) {
      console.error('Error updating LMS token:', error);
      return NextResponse.json(
        { error: "Failed to update LMS token", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "LMS token updated successfully"
    });
  } catch (error) {
    console.error("Error in update LMS token API:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get user from request
    const userData = await getUserFromRequest(request);
    if (!userData) {
      return NextResponse.json(
        { error: "Unauthorized - No valid user token" },
        { status: 401 }
      );
    }

    // Get the user's API keys from the database (without decrypting them)
    const supabase = await createClient();
    const { data: apiKeys, error } = await supabase
      .from('user_api_keys')
      .select('lms_provider, api_base_url, is_active, created_at, updated_at')
      .eq('user_id', userData.userId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching LMS tokens:', error);
      return NextResponse.json(
        { error: "Failed to fetch LMS tokens", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      apiKeys: apiKeys || []
    });
  } catch (error) {
    console.error("Error in get LMS token API:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

