import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getUserCredentials } from "@/lib/utils/userCredentials";
import { createClient } from "@/lib/utils/supabase/server";
import { LMSFactory } from "@/lib/api";
import LMSProvider from "@/lib/lms/lms-provider";

const supabase = await createClient();

async function syncModulesForCourse(
  courseId: string,
  courseLmsId: string,
  lmsProvider: LMSProvider
): Promise<{ modulesCreated: number; moduleItemsCreated: number; errors: string[] }> {
  const result = {
    modulesCreated: 0,
    moduleItemsCreated: 0,
    errors: [] as string[],
  };

  try {
    // Check if modules already exist for this course
    const { data: existingModules, error: checkError } = await supabase
      .from("modules")
      .select("id")
      .eq("course_id", courseId)
      .limit(1);

    if (checkError) {
      console.error(`Failed to check existing modules: ${checkError.message}`);
      result.errors.push(`Failed to check existing modules: ${checkError.message}`);
      return result;
    }

    // If modules already exist, skip syncing
    if (existingModules && existingModules.length > 0) {
      console.log(`Modules already exist for course ${courseId}, skipping sync`);
      return result;
    }

    // Fetch modules from LMS
    const modules = await lmsProvider.getCourseModules(courseLmsId);

    // Process each module
    for (const module of modules) {
      try {
        // Upsert module
        const { data: upsertedModule, error: moduleError } = await supabase
          .from("modules")
          .upsert({
            lms_id: module.lmsId,
            course_id: courseId,
            name: module.name,
            description: module.description,
            items_count: module.itemsCount,
            prerequisites: module.prerequisites,
          }, {
            onConflict: 'lms_id,course_id',
            ignoreDuplicates: false,
          })
          .select()
          .single();

        if (moduleError) {
          result.errors.push(`Failed to upsert module ${module.name}: ${moduleError.message}`);
          continue;
        }

        if (!upsertedModule) {
          result.errors.push(`No module returned after upsert: ${module.name}`);
          continue;
        }

        result.modulesCreated++;

        // Process module items
        for (const item of module.moduleItems) {
          try {
            const { error: itemError } = await supabase
              .from("module_items")
              .upsert({
                lms_id: item.lmsId,
                lms_content_id: item.lmsContentId,
                module_id: upsertedModule.id,
                course_id: courseId,
                name: item.name,
                type: item.type,
                content_type: item.contentType,
                url: item.url,
                position: item.position,
              }, {
                onConflict: 'lms_id,module_id',
                ignoreDuplicates: false,
              });

            if (itemError) {
              console.error(`Failed to upsert module item ${item.name}:`, JSON.stringify(item, null, 2), `Error: ${itemError.message}`);
              result.errors.push(`Failed to upsert module item ${item.name}: ${itemError.message}`);
              continue;
            }

            result.moduleItemsCreated++;
          } catch (itemError) {
            result.errors.push(
              `Error processing module item ${item.name}: ${itemError instanceof Error ? itemError.message : 'Unknown error'}`
            );
          }
        }
      } catch (moduleError) {
        result.errors.push(
          `Error processing module ${module.name}: ${moduleError instanceof Error ? moduleError.message : 'Unknown error'}`
        );
      }
    }
  } catch (error) {
    result.errors.push(
      `Error syncing modules for course: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  return result;
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

    // Get user credentials
    const credentials = await getUserCredentials(userData.userId, userData.accessToken);
    if (!credentials) {
      return NextResponse.json(
        { error: "No LMS credentials found. Please add your LMS token first." },
        { status: 400 }
      );
    }

    const results = {
      enrollmentsDeleted: 0,
      coursesCreated: 0,
      enrollmentsCreated: 0,
      modulesCreated: 0,
      moduleItemsCreated: 0,
      errors: [] as string[],
    };

    // Step 1: Delete existing enrollments for this user
    const { data: deletedEnrollments, error: deleteError } = await supabase
      .from("enrollments")
      .delete()
      .eq("user_id", userData.userId)
      .select();

    if (deleteError) {
      console.error("Error deleting enrollments:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete existing enrollments", details: deleteError.message },
        { status: 500 }
      );
    }

    results.enrollmentsDeleted = deletedEnrollments?.length || 0;
    console.log(`Deleted ${results.enrollmentsDeleted} enrollments for user ${userData.userId}`);

    // Step 2: Fetch courses from LMS
    const lmsFactory = new LMSFactory(credentials.apiBaseUrl, credentials.apiKey);
    const lmsProvider = lmsFactory.createLMSProvider(credentials.lmsProvider);
    
    let courses;
    try {
      courses = await lmsProvider.getCourses();
    } catch (error) {
      console.error('Error fetching courses from LMS:', error);
      return NextResponse.json(
        { error: "Failed to fetch courses from LMS", details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }

    // Step 3: Process each course
    for (const course of courses) {
      if (!course.lmsId || !course.lmsProvider || !course.name || !course.code) {
        console.error("Invalid course data:", course);
        continue;
      }

      try {
        // Upsert course (insert if new, update if exists)
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
            ignoreDuplicates: false,
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
            ignoreDuplicates: true,
          });

        if (enrollmentError) {
          console.error("Error creating enrollment:", enrollmentError);
          results.errors.push(`Failed to create enrollment for course ${course.name}: ${enrollmentError.message}`);
          continue;
        }

        results.enrollmentsCreated++;

        // Sync modules and module items for this course
        if (course.lmsId) {
          console.log(`Syncing modules for course ${course.name}`);
          const moduleResults = await syncModulesForCourse(
            upsertedCourse.id,
            course.lmsId,
            lmsProvider
          );
          results.modulesCreated += moduleResults.modulesCreated;
          results.moduleItemsCreated += moduleResults.moduleItemsCreated;
          results.errors.push(...moduleResults.errors);
        }
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
    console.error("Error in resync enrollments API:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

