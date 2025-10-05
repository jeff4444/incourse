import { NextRequest, NextResponse } from "next/server";
import { createLMSProviderWithUserCredentials } from "@/lib/utils/apiHelpers";

export async function GET(request: NextRequest, { params }: { params: { courseID: string } }) {
    try {
        const courseID = (await params).courseID.split('-')[1];
        const lms = (await params).courseID.split('-')[0];
        
        // Create LMS provider with user credentials
        const result = await createLMSProviderWithUserCredentials(request, lms);
        if (result instanceof NextResponse) {
            return result; // Return error response
        }

        const { lmsProvider } = result;
        const course = await lmsProvider.getCourse(courseID);
        return NextResponse.json(course);
    } catch (error) {
        console.error('Error in course API:', error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}