import { NextRequest, NextResponse } from "next/server";
import { createLMSProviderWithUserCredentials } from "@/lib/utils/apiHelpers";
import { createClient } from "@/lib/utils/supabase/server";
import { getUserFromRequest } from "@/lib/utils/userCredentials";

export async function GET(request: NextRequest, { params }: { params: Promise<{ courseID: string, fileID: string }> }) {
    try {
        const courseID = (await params).courseID;
        const fileID = (await params).fileID;

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

        // Query by database ID
        const { data: dbFile, error: dbError } = await supabase
            .from('files')
            .select('*')
            .eq('id', fileID)
            .eq('course_id', courseID)
            .single();

        if (dbError || !dbFile) {
            // search by moduleItemId
            const { data: dbFile, error: dbError } = await supabase
                .from('files')
                .select('*')
                .eq('module_item_id', fileID)
                .eq('course_id', courseID)
                .single();

            if (dbError || !dbFile) {
                return NextResponse.json(
                    { error: "File not found" },
                    { status: 404 }
                );
            } 

            return NextResponse.json({
                id: dbFile.id,
                lmsId: dbFile.lms_id,
                moduleItemId: dbFile.module_item_id,
                courseId: dbFile.course_id,
                displayName: dbFile.display_name,
                contentType: dbFile.content_type,
                url: dbFile.url,
                uuid: dbFile.uuid,
                size: dbFile.size,
                createdAt: dbFile.created_at,
                updatedAt: dbFile.updated_at,
            })
        }

        return NextResponse.json({
            id: dbFile.id,
            lmsId: dbFile.lms_id,
            moduleItemId: dbFile.module_item_id,
            courseId: dbFile.course_id,
            displayName: dbFile.display_name,
            contentType: dbFile.content_type,
            url: dbFile.url,
            uuid: dbFile.uuid,
            size: dbFile.size,
            createdAt: dbFile.created_at,
            updatedAt: dbFile.updated_at,
        })
    } catch (error) {
        console.error('Error in file details API:', error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}