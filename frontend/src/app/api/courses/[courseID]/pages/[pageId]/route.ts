import { NextRequest, NextResponse } from "next/server";
import { createLMSProviderWithUserCredentials } from "@/lib/utils/apiHelpers";
import { createClient } from "@/lib/utils/supabase/server";
import { getUserFromRequest } from "@/lib/utils/userCredentials";

export async function GET(request: NextRequest, { params }: { params: Promise<{ courseID: string, pageId: string }> }) {
    try {
        const courseID = (await params).courseID;
        const pageId = (await params).pageId;
        console.log('pageId', pageId);

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

        // Query by database ID (treating pageUrl as pageID)
        const { data: dbPage, error: dbError } = await supabase
            .from('pages')
            .select('*')
            .eq('module_item_id', pageId)
            .eq('course_id', courseID)
            .single();

        if (dbError || !dbPage) {
            return NextResponse.json(
                { error: "Page not found for page id: " + pageId },
                { status: 404 }
            );
        }

        return NextResponse.json({
            id: dbPage.id,
            lmsId: dbPage.lms_id,
            moduleItemId: dbPage.module_item_id,
            courseId: dbPage.course_id,
            title: dbPage.title,
            url: dbPage.url,
            createdAt: dbPage.created_at,
            htmlUrl: dbPage.html_url,
            body: dbPage.body,
            createdAtDb: dbPage.created_at_db,
            updatedAt: dbPage.updated_at,
        });
    } catch (error) {
        console.error('Error in page API:', error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

