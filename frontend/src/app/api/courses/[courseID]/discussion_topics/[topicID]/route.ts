import { NextRequest, NextResponse } from "next/server";
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


        // Query by database ID
        const { data: dbDiscussion, error: dbError } = await supabase
            .from('discussion_topics')
            .select('*')
            .eq('module_item_id', topicID)
            .eq('course_id', courseID)
            .single();

        if (dbError || !dbDiscussion) {
            return NextResponse.json(
                { error: "Discussion not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            id: dbDiscussion.id,
            lmsId: dbDiscussion.lms_id,
            moduleItemId: dbDiscussion.module_item_id,
            courseId: dbDiscussion.course_id,
            title: dbDiscussion.title,
            createdAt: dbDiscussion.created_at,
            lastReplyAt: dbDiscussion.last_reply_at,
            postedAt: dbDiscussion.posted_at,
            message: dbDiscussion.message,
            htmlUrl: dbDiscussion.html_url,
            discussionSubentryCount: dbDiscussion.discussion_subentry_count,
            subscribed: dbDiscussion.subscribed,
            readState: dbDiscussion.read_state,
            permissions: dbDiscussion.permissions,
            createdAtDb: dbDiscussion.created_at_db,
            updatedAt: dbDiscussion.updated_at,
        });
    } catch (error) {
        console.error('Error in discussion topic API:', error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

