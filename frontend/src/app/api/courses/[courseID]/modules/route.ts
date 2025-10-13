import { NextRequest, NextResponse } from "next/server";
import { createLMSProviderWithUserCredentials } from "@/lib/utils/apiHelpers";
import { createClient } from "@/lib/utils/supabase/server";
import { getUserFromRequest } from "@/lib/utils/userCredentials";
import { Module } from "@/lib/types/course";

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

        // Try to fetch modules from database first
        try {
            const supabase = await createClient();
            
            // Query modules joined with module_items for this course
            const { data: dbModules, error: dbError } = await supabase
                .from('modules')
                .select(`
                    id,
                    lms_id,
                    course_id,
                    name,
                    description,
                    items_count,
                    prerequisites,
                    module_items (
                        id,
                        lms_id,
                        lms_content_id,
                        module_id,
                        name,
                        type,
                        content_type,
                        url,
                        position
                    )
                `)
                .eq('course_id', courseID)
                .order('lms_id', { ascending: true });

            if (!dbError && dbModules && dbModules.length > 0) {
                // Transform database records to Module interface
                const modules: Module[] = dbModules.map(module => ({
                    id: module.id,
                    lmsId: module.lms_id,
                    courseId: module.course_id,
                    name: module.name,
                    description: module.description,
                    itemsCount: module.items_count,
                    prerequisites: module.prerequisites,
                    moduleItems: Array.isArray(module.module_items) 
                        ? module.module_items.map(item => ({
                            id: item.id,
                            lmsId: item.lms_id,
                            lmsContentId: item.lms_content_id,
                            name: item.name,
                            moduleId: item.module_id || module.id,
                            courseId: module.course_id,
                            type: item.type,
                            contentType: item.content_type,
                            url: item.url,
                            position: item.position,
                        }))
                        : [],
                }));

                console.log(`Fetched ${modules.length} modules from database`);
                return NextResponse.json(modules);
            }

            console.log('No modules found in database, falling back to LMS provider');
        } catch (dbError) {
            console.error('Database query error, falling back to LMS provider:', dbError);
        }

        // Fallback: Fetch course info from database to get lmsId and lmsProvider
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
        console.log('Fetching modules from LMS provider');
        const modules = await lmsProvider.getCourseModules(course.lms_id);
        return NextResponse.json(modules);
    } catch (error) {
        console.error('Error in modules API:', error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}