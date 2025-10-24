import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";
import { getUserFromRequest } from "@/lib/utils/userCredentials";

export async function GET(request: NextRequest, { params }: { params: Promise<{ courseID: string }> }) {
    
    try {
        const courseID = (await params).courseID;
        console.log('request.nextUrl.searchParams', request.nextUrl.searchParams);
        const no_module = request.nextUrl.searchParams.get('no_module') === 'true';

        // Get user from request
        const userData = await getUserFromRequest(request);
        if (!userData) {
            return NextResponse.json(
                { error: "Unauthorized - No valid user token" },
                { status: 401 }
            );
        }

        // Fetch all files without module_item_id for this course
        const supabase = await createClient();
        let files: any[] = [];
        let error: Error | null = null;
        
        if (no_module) {
            const result = await supabase
                .from('files')
                .select('*')
                .eq('course_id', courseID)
                .is('module_item_id', null);
            files = result.data || [];
            error = result.error;
        } else {
            const result = await supabase
                .from('files')
                .select('*')
                .eq('course_id', courseID);
            files = result.data || [];
            error = result.error;
        }

        if (error) {
            console.error('Error fetching all files:', error);
            return NextResponse.json(
                { error: "Failed to fetch files" },
                { status: 500 }
            );
        }

            return NextResponse.json(files.map((file) => ({
                id: file.id,
                lmsId: file.lms_id,
                moduleItemId: file.module_item_id,
                courseId: file.course_id,
                displayName: file.display_name,
                contentType: file.content_type,
                url: file.url,
                uuid: file.uuid,
                size: file.size,
                createdAt: file.created_at,
                updatedAt: file.updated_at,
            })) || []);
    } catch (error) {
        console.error('Error in all files API:', error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
