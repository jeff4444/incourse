import { NextRequest, NextResponse } from "next/server";
import { LMSFactory } from "@/lib/api";
import { getUserCredentials, getUserFromRequest } from "./userCredentials";

export interface ApiErrorResponse {
  error: string;
}

/**
 * Helper function to create LMS provider with user credentials
 * @param request - The NextRequest object
 * @param lmsProviderOverride - Optional LMS provider override from URL params
 * @returns Promise with LMS provider or error response
 */
export async function createLMSProviderWithUserCredentials(
  request: NextRequest,
  lmsProviderOverride?: string
): Promise<{ lmsProvider: any } | NextResponse<ApiErrorResponse>> {
  try {
    // Get user ID and access token from the request
    const userData = await getUserFromRequest(request);
    if (!userData) {
      return NextResponse.json(
        { error: "Unauthorized - No valid user token" },
        { status: 401 }
      );
    }

    // Get user's LMS credentials with proper RLS context
    const credentials = await getUserCredentials(userData.userId, userData.accessToken);
    if (!credentials) {
      return NextResponse.json(
        { error: "No LMS credentials found. Please complete onboarding." },
        { status: 400 }
      );
    }

    // Use provided LMS provider or default to user's stored provider
    const lms = lmsProviderOverride ?? credentials.lmsProvider;
    
    // Create LMS provider with user's specific credentials
    const lmsFactory = new LMSFactory(credentials.apiBaseUrl, credentials.apiKey);
    const lmsProvider = lmsFactory.createLMSProvider(lms);

    return { lmsProvider };
  } catch (error) {
    console.error('Error creating LMS provider:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
