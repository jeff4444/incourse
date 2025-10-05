import { NextRequest, NextResponse } from "next/server";
import { LMSFactory } from "@/lib/api";
import { getUserCredentials, getUserFromRequest } from "@/lib/utils/userCredentials";

export async function GET(request: NextRequest) {
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

        const { searchParams } = new URL(request.url);
        const lms = searchParams.get('lms') ?? credentials.lmsProvider;
        
        // Create LMS provider with user's specific credentials
        const lmsFactory = new LMSFactory(credentials.apiBaseUrl, credentials.apiKey);
        const lmsProvider = lmsFactory.createLMSProvider(lms);

        const courses = await lmsProvider.getCourses();
        return NextResponse.json(courses);
    } catch (error) {
        console.error('Error in courses API:', error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}