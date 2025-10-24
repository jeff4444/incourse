import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";
import { getUserFromRequest } from "@/lib/utils/userCredentials";

export async function GET(request: NextRequest, { params }: { params: Promise<{ courseID: string, lmsId: string }> }) {
    try {
        const courseID = (await params).courseID;
        const lmsId = (await params).lmsId;

        // Get user from request
        const userData = await getUserFromRequest(request);
        if (!userData) {
            return NextResponse.json(
                { error: "Unauthorized - No valid user token" },
                { status: 401 }
            );
        }

        // Query by lmsId
        const supabase = await createClient();
        const { data: dbFile, error: dbError } = await supabase
            .from('files')
            .select('*')
            .eq('lms_id', lmsId)
            .eq('course_id', courseID)
            .single();

        if (dbError || !dbFile) {
            return NextResponse.json(
                { error: "File not found" },
                { status: 404 }
            );
        }

        console.log('dbFile', dbFile);

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
        console.error('Error in file lookup by lmsId API:', error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
