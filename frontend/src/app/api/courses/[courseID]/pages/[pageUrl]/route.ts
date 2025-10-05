import { NextRequest, NextResponse } from "next/server";
import { createLMSProviderWithUserCredentials } from "@/lib/utils/apiHelpers";

export async function GET(request: NextRequest, { params }: { params: { courseID: string, pageUrl: string } }) {
    try {
        const courseID = (await params).courseID.split('-')[1];
        const lms = (await params).courseID.split('-')[0];
        const pageUrl = (await params).pageUrl;

        console.log(`courseID: ${courseID}, lms: ${lms}, pageUrl: ${pageUrl}`);

        // Create LMS provider with user credentials
        const result = await createLMSProviderWithUserCredentials(request, lms);
        if (result instanceof NextResponse) {
            return result; // Return error response
        }

        const { lmsProvider } = result;
        const page = await lmsProvider.getPage(pageUrl, courseID);
        console.log(page);
        return NextResponse.json(page);
    } catch (error) {
        console.error('Error in page API:', error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
