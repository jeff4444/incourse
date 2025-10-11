import { NextRequest, NextResponse } from "next/server";
import { createLMSProviderWithUserCredentials } from "@/lib/utils/apiHelpers";
import { createClient } from "@/lib/utils/supabase/server";
import { getUserFromRequest } from "@/lib/utils/userCredentials";

export async function GET(request: NextRequest, { params }: { params: Promise<{ courseID: string, topicID: string }> }) {
    try {
        const courseID = (await params).courseID;
        const topicID = (await params).topicID;

        // Get user from request
        const userData = await getUserFromRequest(request);
        if (!userData) {
            return NextResponse.json(
                { error: "Unauthorized - No valid user token" },
                { status: 401 }
            );
        }

        // Fetch course info from database to get lmsId and lmsProvider
        const supabase = await createClient();
        const { data: course, error: courseError } = await supabase
            .from('courses')
            .select('lms_id, lms_provider')
            .eq('id', courseID)
            .single();

        if (courseError || !course) {
            return NextResponse.json(
                { error: "Course not found" },
                { status: 404 }
            );
        }

        // Create LMS provider with user credentials
        const result = await createLMSProviderWithUserCredentials(request, course.lms_provider);
        if (result instanceof NextResponse) {
            return result; // Return error response
        }

        const { lmsProvider } = result;
        const discussionTopic = await lmsProvider.getDiscussionTopic(topicID, course.lms_id);
        return NextResponse.json(discussionTopic);
    } catch (error) {
        console.error('Error in discussion topic API:', error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

