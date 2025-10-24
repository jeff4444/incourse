import { NextRequest, NextResponse } from "next/server";
import { LMSFactory } from "@/lib/api";
import { getUserFromRequest } from "@/lib/utils/userCredentials";
import { createClient } from "@/lib/utils/supabase/server";
import { Course } from "@/lib/types/course";

export async function GET(request: NextRequest) {
    try {
        // Get user ID and access token from the request
        const userData = await getUserFromRequest(request);
        if (!userData) {
            return NextResponse.json(
                { error: "Unauthorized - No valid user token" },
                { status: 401 }
            );
        }

        // Try to fetch courses from database first
        try {
            const supabase = await createClient();
            
            // Query enrollments joined with courses for this user
            const { data: enrollments, error: dbError } = await supabase
                .from('enrollments')
                .select(`
                    course_id,
                    courses (
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
                    )
                `)
                .eq('user_id', userData.userId);

            if (!dbError && enrollments && enrollments.length > 0) {
                // Transform database records to Course interface
                const courses: Course[] = enrollments
                    .filter(enrollment => enrollment.courses) // Filter out any null courses
                    .map(enrollment => {
                        const course = Array.isArray(enrollment.courses) 
                            ? enrollment.courses[0] 
                            : enrollment.courses;
                        
                        return {
                            id: course.id,
                            lmsId: course.lms_id,
                            lmsProvider: course.lms_provider,
                            name: course.name,
                            code: course.code,
                            instructor: course.instructor,
                            description: course.description,
                            semester: course.semester,
                            year: course.year,
                            calendar: course.calendar,
                        };
                    });

                console.log(`Fetched ${courses.length} courses from database`);
                return NextResponse.json(courses);
            }

            console.log('No courses found in database or error occurred, falling back to LMS provider');
        } catch (dbError) {
            console.error('Database query error, falling back to LMS provider:', dbError);
        }

        // Fallback: LMS provider functionality needs to be implemented
        return NextResponse.json(
            { error: "User credentials functionality needs to be implemented" },
            { status: 501 }
        );
    } catch (error) {
        console.error('Error in courses API:', error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}