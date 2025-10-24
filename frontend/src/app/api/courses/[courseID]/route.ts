import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";
import { getUserFromRequest } from "@/lib/utils/userCredentials";
import { Course } from "@/lib/types/course";

export async function GET(request: NextRequest, { params }: { params: Promise<{ courseID: string }> }) {
    try {
        const courseID = (await params).courseID;
        
        // Get user from request
        const userData = await getUserFromRequest(request);
        if (!userData) {
            return NextResponse.json(
                { error: "Unauthorized - No valid user token" },
                { status: 401 }
            );
        }

        // Try to fetch course from database first
        try {
            const supabase = await createClient();
            
            const { data: dbCourse, error: dbError } = await supabase
                .from('courses')
                .select(`
                    id,
                    lms_id,
                    lms_provider,
                    name,
                    code,
                    instructor,
                    description,
                    semester,
                    year,
                    calendar
                `)
                .eq('id', courseID)
                .single();

            if (!dbError && dbCourse) {
                // Transform database record to Course interface
                const course: Course = {
                    id: dbCourse.id,
                    lmsId: dbCourse.lms_id,
                    lmsProvider: dbCourse.lms_provider,
                    name: dbCourse.name,
                    code: dbCourse.code,
                    instructor: dbCourse.instructor,
                    description: dbCourse.description,
                    semester: dbCourse.semester,
                    year: dbCourse.year,
                    calendar: dbCourse.calendar,
                };

                console.log('Fetched course from database');
                return NextResponse.json(course);
            }

            console.log('Course not found in database, falling back to LMS provider');
        } catch (dbError) {
            console.error('Database query error, falling back to LMS provider:', dbError);
        }

        // Fallback: Fetch course info from database to get lmsId and lmsProvider
        const supabase = await createClient();
        const { data: courseInfo, error: courseError } = await supabase
            .from('courses')
            .select('lms_id, lms_provider')
            .eq('id', courseID)
            .single();

        if (courseError || !courseInfo) {
            return NextResponse.json(
                { error: "Course not found" },
                { status: 404 }
            );
        }

        // LMS provider fallback functionality needs to be implemented
        return NextResponse.json(
            { error: "LMS provider functionality needs to be implemented" },
            { status: 501 }
        );
    } catch (error) {
        console.error('Error in course API:', error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}