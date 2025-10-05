import { NextRequest, NextResponse } from "next/server";
import { createLMSProviderWithUserCredentials } from "@/lib/utils/apiHelpers";

export async function GET(request: NextRequest, { params }: { params: Promise<{ courseID: string, topicID: string }> }) {
    try {
        const courseID = (await params).courseID.split('-')[1];
        const lms = (await params).courseID.split('-')[0];
        const topicID = (await params).topicID;

        // Create LMS provider with user credentials
        const result = await createLMSProviderWithUserCredentials(request, lms);
        if (result instanceof NextResponse) {
            return result; // Return error response
        }

        const { lmsProvider } = result;
        const discussionTopic = await lmsProvider.getDiscussionTopic(topicID, courseID);
        return NextResponse.json(discussionTopic);
    } catch (error) {
        console.error('Error in discussion topic API:', error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
