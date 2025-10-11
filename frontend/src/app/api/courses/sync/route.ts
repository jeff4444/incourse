import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/utils/userCredentials";
import { LMSFactory } from "@/lib/api";
import { createClient } from "@/lib/utils/supabase/server";
import { Course } from "@/lib/types/course";

// Server-side Supabase client with service role for bypassing RLS when needed
const supabase = await createClient();

interface SyncCoursesRequest {
  courses?: Course[];
  apiKey?: string;
  apiBaseUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get user from request
    const userData = await getUserFromRequest(request);
    if (!userData) {
      return NextResponse.json(
        { error: "Unauthorized - No valid user token" },
        { status: 401 }
      );
    }

    const body: SyncCoursesRequest = await request.json();
    let { courses } = body;
    const { apiKey, apiBaseUrl } = body;

    // If apiKey and apiBaseUrl are provided, fetch courses server-side
    if (apiKey && apiBaseUrl) {
      try {
        const lmsFactory = new LMSFactory(apiBaseUrl, apiKey);
        const lmsProvider = lmsFactory.createLMSProvider('canvas');
        courses = await lmsProvider.getCourses();
      } catch (error) {
        console.error('Error fetching courses from LMS:', error);
        return NextResponse.json(
          { error: "Failed to fetch courses from LMS", details: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500 }
        );
      }
    }

    if (!courses || !Array.isArray(courses)) {
      return NextResponse.json(
        { error: "Invalid request body. Expected courses array or apiKey/apiBaseUrl." },
        { status: 400 }
      );
    }

    const results = {
      coursesCreated: 0,
      coursesUpdated: 0,
      enrollmentsCreated: 0,
      errors: [] as string[],
    };

    // Process each course
    for (const course of courses) {
      if (!course.lmsId || !course.lmsProvider || !course.name || !course.code) {
        console.error("Invalid course data:", course);
        continue;
      }
      try {
        // Upsert course (insert if new, update if exists based on UNIQUE constraint)
        const { data: upsertedCourse, error: upsertError } = await supabase
          .from("courses")
          .upsert({
            lms_id: course.lmsId,
            lms_provider: course.lmsProvider,
            name: course.name,
            code: course.code,
            instructor: course.instructor,
            description: course.description,
            semester: course.semester,
            year: course.year,
          }, {
            onConflict: 'lms_id,lms_provider',
            ignoreDuplicates: false, // Update existing records
          })
          .select()
          .single();

        if (upsertError) {
          console.error("Error upserting course:", course, upsertError);
          results.errors.push(`Failed to upsert course ${course.name}: ${upsertError.message}`);
          continue;
        }

        if (!upsertedCourse) {
          console.error("No course returned after upsert:", course);
          results.errors.push(`Failed to retrieve course after upsert: ${course.name}`);
          continue;
        }

        results.coursesCreated++;

        // Create enrollment for the user
        const { error: enrollmentError } = await supabase
          .from("enrollments")
          .upsert({
            user_id: userData.userId,
            course_id: upsertedCourse.id,
          }, {
            onConflict: 'user_id,course_id',
            ignoreDuplicates: true, // Don't update if already enrolled
          });

        if (enrollmentError) {
          console.error("Error creating enrollment:", enrollmentError);
          results.errors.push(`Failed to create enrollment for course ${course.name}: ${enrollmentError.message}`);
          continue;
        }

        results.enrollmentsCreated++;
      } catch (error) {
        console.error(`Error processing course ${course.name}:`, error);
        results.errors.push(`Error processing course ${course.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Error in sync courses API:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

