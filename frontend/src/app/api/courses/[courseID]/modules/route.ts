import { NextRequest, NextResponse } from "next/server";
import { createLMSProviderWithUserCredentials } from "@/lib/utils/apiHelpers";

export async function GET(request: NextRequest, { params }: { params: Promise<{ courseID: string }> }) {
    try {
        const courseID = (await params).courseID.split('-')[1];
        const lms = (await params).courseID.split('-')[0];
        
        // Create LMS provider with user credentials
        const result = await createLMSProviderWithUserCredentials(request, lms);
        if (result instanceof NextResponse) {
            return result; // Return error response
        }

        const { lmsProvider } = result;
        const modules = await lmsProvider.getCourseModules(courseID);
        return NextResponse.json(modules);
    } catch (error) {
        console.error('Error in modules API:', error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}