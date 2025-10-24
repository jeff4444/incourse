import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/utils/userCredentials";
import { createClient } from "@/lib/utils/supabase/server";
import { LMSFactory } from "@/lib/api";
import LMSProvider from "@/lib/lms/lms-provider";

const supabase = await createClient();

interface ResyncRequest {
  apiKey: string;
  apiBaseUrl: string;
}

interface SyncEvent {
  type: 'progress' | 'error' | 'done';
  stage: string;
  status: 'pending' | 'loading' | 'complete' | 'error';
  detail?: string;
  data?: any;
}

function createSSEEvent(event: SyncEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

async function syncModuleItems(
  moduleId: string,
  courseId: string,
  newModuleItems: any[],
  result: { moduleItemsCreated: number; moduleItemsDeleted: number; errors: string[] },
  controller: ReadableStreamDefaultController,
  courseName: string,
  moduleName: string
): Promise<void> {
  try {
    // Emit progress for module items
    controller.enqueue(new TextEncoder().encode(createSSEEvent({
      type: 'progress',
      stage: `Syncing items for ${moduleName}`,
      status: 'loading'
    })));

    // Fetch existing module items
    const { data: existingItems, error: fetchError } = await supabase
      .from("module_items")
      .select("id, lms_id")
      .eq("module_id", moduleId);

    if (fetchError) {
      console.error(`Failed to fetch existing module items: ${fetchError.message}`);
      result.errors.push(`Failed to fetch existing module items: ${fetchError.message}`);
      return;
    }

    // Create a map of existing items
    const existingItemMap = new Map<string, string>();
    if (existingItems) {
      for (const item of existingItems) {
        existingItemMap.set(item.lms_id, item.id);
      }
    }

    // Create a map of new items
    const newItemMap = new Map<string, typeof newModuleItems[0]>();
    for (const item of newModuleItems) {
      if (item.lmsId) {
        newItemMap.set(String(item.lmsId), item);
      }
    }

    // Find items to delete (exist in DB but not in Canvas)
    const itemsToDelete: string[] = [];
    for (const [lmsId, itemId] of existingItemMap.entries()) {
      if (!newItemMap.has(lmsId)) {
        itemsToDelete.push(itemId);
      }
    }

    // Delete obsolete items
    if (itemsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("module_items")
        .delete()
        .in("id", itemsToDelete);

      if (deleteError) {
        console.error(`Failed to delete obsolete module items: ${deleteError.message}`);
        result.errors.push(`Failed to delete obsolete module items: ${deleteError.message}`);
      } else {
        result.moduleItemsDeleted += itemsToDelete.length;
        console.log(`Deleted ${itemsToDelete.length} obsolete module items`);
      }
    }

    // Upsert all new/existing items
    for (const item of newModuleItems) {
      try {
        const isNewItem = !existingItemMap.has(item.lmsId);

        const { error: itemError } = await supabase
          .from("module_items")
          .upsert({
            lms_id: item.lmsId,
            lms_content_id: item.lmsContentId,
            module_id: moduleId,
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

        if (isNewItem) {
          result.moduleItemsCreated++;
        }
      } catch (itemError) {
        result.errors.push(
          `Error processing module item ${item.name}: ${itemError instanceof Error ? itemError.message : 'Unknown error'}`
        );
      }
    }

    // Mark module items as complete
    controller.enqueue(new TextEncoder().encode(createSSEEvent({
      type: 'progress',
      stage: `Syncing items for ${moduleName}`,
      status: 'complete',
      detail: `${result.moduleItemsCreated} items synced`
    })));

  } catch (error) {
    result.errors.push(
      `Error syncing module items: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    
    controller.enqueue(new TextEncoder().encode(createSSEEvent({
      type: 'progress',
      stage: `Syncing items for ${moduleName}`,
      status: 'error',
      detail: error instanceof Error ? error.message : 'Unknown error'
    })));
  }
}

async function syncModulesForCourse(
  courseId: string,
  courseLmsId: string,
  courseName: string,
  lmsProvider: LMSProvider,
  controller: ReadableStreamDefaultController
): Promise<{ modulesCreated: number; modulesUpdated: number; modulesDeleted: number; moduleItemsCreated: number; moduleItemsDeleted: number; errors: string[] }> {
  const result = {
    modulesCreated: 0,
    modulesUpdated: 0,
    modulesDeleted: 0,
    moduleItemsCreated: 0,
    moduleItemsDeleted: 0,
    errors: [] as string[],
  };

  try {
    // Emit progress for modules
    controller.enqueue(new TextEncoder().encode(createSSEEvent({
      type: 'progress',
      stage: `Syncing modules for ${courseName}`,
      status: 'loading'
    })));

    // Fetch existing modules for this course
    const { data: existingModules, error: fetchError } = await supabase
      .from("modules")
      .select("id, lms_id, name, description, items_count, prerequisites")
      .eq("course_id", courseId);

    if (fetchError) {
      console.error(`Failed to fetch existing modules: ${fetchError.message}`);
      result.errors.push(`Failed to fetch existing modules: ${fetchError.message}`);
      return result;
    }

    // Create a map of existing modules for quick lookup
    const existingModuleMap = new Map<string, { id: string; name: string; description: string | null; itemsCount: number; prerequisites: string[] | null }>();
    if (existingModules) {
      for (const module of existingModules) {
        existingModuleMap.set(module.lms_id, {
          id: module.id,
          name: module.name,
          description: module.description,
          itemsCount: module.items_count,
          prerequisites: module.prerequisites
        });
      }
    }

    // Fetch modules from LMS
    const modules = await lmsProvider.getCourseModules(courseLmsId);
    
    // Create a map of new modules
    const newModuleMap = new Map<string, typeof modules[0]>();
    for (const module of modules) {
      if (module.lmsId) {
        newModuleMap.set(String(module.lmsId), module);
      }
    }

    // Find modules to delete (exist in DB but not in Canvas)
    const modulesToDelete: string[] = [];
    for (const [lmsId, module] of existingModuleMap.entries()) {
      if (!newModuleMap.has(lmsId)) {
        modulesToDelete.push(module.id);
      }
    }

    // Delete obsolete modules (this will cascade delete module items)
    if (modulesToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("modules")
        .delete()
        .in("id", modulesToDelete);

      if (deleteError) {
        console.error(`Failed to delete obsolete modules: ${deleteError.message}`);
        result.errors.push(`Failed to delete obsolete modules: ${deleteError.message}`);
      } else {
        result.modulesDeleted = modulesToDelete.length;
        console.log(`Deleted ${modulesToDelete.length} obsolete modules for course ${courseId}`);
      }
    }

    // Process each module from Canvas
    for (const module of modules) {
      try {
        // Emit progress for individual module
        controller.enqueue(new TextEncoder().encode(createSSEEvent({
          type: 'progress',
          stage: `Syncing module: ${module.name}`,
          status: 'loading'
        })));

        const existingModule = existingModuleMap.get(module.lmsId!);
        const isNewModule = !existingModule;

        // Upsert module (insert if new, update if exists)
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

        if (isNewModule) {
          result.modulesCreated++;
        } else {
          result.modulesUpdated++;
        }

        // Now sync module items using the same diff approach
        await syncModuleItems(upsertedModule.id, courseId, module.moduleItems, result, controller, courseName, module.name);

        // Mark module as complete
        controller.enqueue(new TextEncoder().encode(createSSEEvent({
          type: 'progress',
          stage: `Syncing module: ${module.name}`,
          status: 'complete',
          detail: `${module.moduleItems.length} items synced`
        })));

      } catch (moduleError) {
        result.errors.push(
          `Error processing module ${module.name}: ${moduleError instanceof Error ? moduleError.message : 'Unknown error'}`
        );
      }
    }

    // Mark course modules as complete
    controller.enqueue(new TextEncoder().encode(createSSEEvent({
      type: 'progress',
      stage: `Syncing modules for ${courseName}`,
      status: 'complete',
      detail: `${result.modulesCreated} modules, ${result.moduleItemsCreated} items synced`
    })));

  } catch (error) {
    result.errors.push(
      `Error syncing modules for course: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    
    controller.enqueue(new TextEncoder().encode(createSSEEvent({
      type: 'progress',
      stage: `Syncing modules for ${courseName}`,
      status: 'error',
      detail: error instanceof Error ? error.message : 'Unknown error'
    })));
  }

  return result;
}

async function syncCourseAssignments(
  courseId: string,
  courseLmsId: string,
  courseName: string,
  lmsProvider: LMSProvider,
  controller: ReadableStreamDefaultController
): Promise<{ assignmentsCreated: number; errors: string[] }> {
  const result = {
    assignmentsCreated: 0,
    errors: [] as string[],
  };

  try {
    // Emit progress event
    controller.enqueue(new TextEncoder().encode(createSSEEvent({
      type: 'progress',
      stage: `Syncing course assignments for ${courseName}`,
      status: 'loading'
    })));

    // Fetch all course assignments
    const courseAssignments = await lmsProvider.getCourseAssignments(courseLmsId);
    
    if (courseAssignments.length === 0) {
      controller.enqueue(new TextEncoder().encode(createSSEEvent({
        type: 'progress',
        stage: `Syncing course assignments for ${courseName}`,
        status: 'complete',
        detail: 'No assignments found'
      })));
      return result;
    }

    // Get existing assignments from database to avoid duplicates
    const { data: existingAssignments, error: existingError } = await supabase
      .from("assignments")
      .select("lms_id")
      .eq("course_id", courseId);

    if (existingError) {
      result.errors.push(`Failed to check existing assignments: ${existingError.message}`);
      return result;
    }

    const existingAssignmentIds = new Set(existingAssignments?.map(a => a.lms_id) || []);

    // Filter out assignments that already exist
    const newAssignments = courseAssignments.filter((assignment: any) => !existingAssignmentIds.has(assignment.lms_id));

    if (newAssignments.length === 0) {
      controller.enqueue(new TextEncoder().encode(createSSEEvent({
        type: 'progress',
        stage: `Syncing course assignments for ${courseName}`,
        status: 'complete',
        detail: 'All assignments already synced'
      })));
      return result;
    }

    // Process each new assignment
    for (const assignmentData of newAssignments) {
      try {
        await supabase
          .from("assignments")
          .upsert({
            lms_id: assignmentData.lms_id,
            course_id: courseId,
            name: assignmentData.name,
            description: assignmentData.description,
            due_at: assignmentData.due_at,
            lock_at: assignmentData.lock_at,
            locked_for_user: assignmentData.locked_for_user,
            points_possible: assignmentData.points_possible,
            html_url: assignmentData.html_url,
            submission_types: assignmentData.submission_types,
            has_submitted_submissions: assignmentData.has_submitted_submissions,
          }, {
            onConflict: 'lms_id,course_id',
            ignoreDuplicates: false,
          });

        result.assignmentsCreated++;
      } catch (assignmentError) {
        result.errors.push(
          `Error processing assignment ${assignmentData.name}: ${assignmentError instanceof Error ? assignmentError.message : 'Unknown error'}`
        );
      }
    }

    // Mark course assignments as complete
    controller.enqueue(new TextEncoder().encode(createSSEEvent({
      type: 'progress',
      stage: `Syncing course assignments for ${courseName}`,
      status: 'complete',
      detail: `${result.assignmentsCreated} assignments synced`
    })));

  } catch (error) {
    result.errors.push(
      `Error syncing course assignments: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    
    controller.enqueue(new TextEncoder().encode(createSSEEvent({
      type: 'progress',
      stage: `Syncing course assignments for ${courseName}`,
      status: 'error',
      detail: error instanceof Error ? error.message : 'Unknown error'
    })));
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

    // Get credentials from request body
    const body: ResyncRequest = await request.json();
    const { apiKey, apiBaseUrl } = body;

    if (!apiKey || !apiBaseUrl) {
      return NextResponse.json(
        { error: "apiKey and apiBaseUrl are required" },
        { status: 400 }
      );
    }

    // Create a streaming response
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const results = {
            enrollmentsDeleted: 0,
            coursesCreated: 0,
            enrollmentsCreated: 0,
            enrollmentsKept: 0,
            modulesCreated: 0,
            modulesUpdated: 0,
            modulesDeleted: 0,
            moduleItemsCreated: 0,
            moduleItemsDeleted: 0,
            assignmentsCreated: 0,
            errors: [] as string[],
          };

          // Step 1: Fetch existing enrollments
          controller.enqueue(encoder.encode(createSSEEvent({
            type: 'progress',
            stage: 'Fetching existing enrollments',
            status: 'loading'
          })));

          const { data: existingEnrollments, error: fetchError } = await supabase
            .from("enrollments")
            .select(`
              id,
              course_id,
              courses (
                lms_id,
                lms_provider
              )
            `)
            .eq("user_id", userData.userId);

          if (fetchError) {
            console.error("Error fetching existing enrollments:", fetchError);
            controller.enqueue(encoder.encode(createSSEEvent({
              type: 'error',
              stage: 'Fetching existing enrollments',
              status: 'error',
              detail: fetchError.message
            })));
            return;
          }

          controller.enqueue(encoder.encode(createSSEEvent({
            type: 'progress',
            stage: 'Fetching existing enrollments',
            status: 'complete',
            detail: `${existingEnrollments?.length || 0} enrollments found`
          })));

          // Create a map of existing enrollments for quick lookup
          const existingEnrollmentMap = new Map<string, { enrollmentId: string; courseId: string }>();
          if (existingEnrollments) {
            for (const enrollment of existingEnrollments) {
              const course = Array.isArray(enrollment.courses) ? enrollment.courses[0] : enrollment.courses;
              if (course) {
                const key = `${course.lms_id}_${course.lms_provider}`;
                existingEnrollmentMap.set(key, {
                  enrollmentId: enrollment.id,
                  courseId: enrollment.course_id
                });
              }
            }
          }

          // Step 2: Fetch courses from LMS
          controller.enqueue(encoder.encode(createSSEEvent({
            type: 'progress',
            stage: 'Fetching courses from Canvas',
            status: 'loading'
          })));

          const lmsFactory = new LMSFactory(apiBaseUrl, apiKey);
          const lmsProvider = lmsFactory.createLMSProvider('canvas');
          
          let courses;
          try {
            courses = await lmsProvider.getCourses();
            console.log(`Fetched ${courses.length} courses from Canvas`);
          } catch (error) {
            console.error('Error fetching courses from LMS:', error);
            controller.enqueue(encoder.encode(createSSEEvent({
              type: 'error',
              stage: 'Fetching courses from Canvas',
              status: 'error',
              detail: error instanceof Error ? error.message : 'Unknown error'
            })));
            return;
          }

          controller.enqueue(encoder.encode(createSSEEvent({
            type: 'progress',
            stage: 'Fetching courses from Canvas',
            status: 'complete',
            detail: `${courses.length} courses found`
          })));

          // Step 3: Identify which enrollments to delete and which to add
          const newCourseMap = new Map<string, typeof courses[0]>();
          for (const course of courses) {
            if (course.lmsId && course.lmsProvider) {
              const key = `${course.lmsId}_${course.lmsProvider}`;
              newCourseMap.set(key, course);
            }
          }

          // Find enrollments to delete (exist in DB but not in Canvas)
          const enrollmentsToDelete: string[] = [];
          for (const [key, enrollment] of existingEnrollmentMap.entries()) {
            if (!newCourseMap.has(key)) {
              enrollmentsToDelete.push(enrollment.enrollmentId);
            }
          }

          // Delete obsolete enrollments
          if (enrollmentsToDelete.length > 0) {
            controller.enqueue(encoder.encode(createSSEEvent({
              type: 'progress',
              stage: 'Removing dropped courses',
              status: 'loading'
            })));

            const { error: deleteError } = await supabase
              .from("enrollments")
              .delete()
              .in("id", enrollmentsToDelete);

            if (deleteError) {
              console.error("Error deleting obsolete enrollments:", deleteError);
              results.errors.push(`Failed to delete obsolete enrollments: ${deleteError.message}`);
              controller.enqueue(encoder.encode(createSSEEvent({
                type: 'progress',
                stage: 'Removing dropped courses',
                status: 'error',
                detail: deleteError.message
              })));
            } else {
              results.enrollmentsDeleted = enrollmentsToDelete.length;
              console.log(`Deleted ${enrollmentsToDelete.length} obsolete enrollments`);
              controller.enqueue(encoder.encode(createSSEEvent({
                type: 'progress',
                stage: 'Removing dropped courses',
                status: 'complete',
                detail: `${enrollmentsToDelete.length} courses removed`
              })));
            }
          }

          // Step 4: Process each course
          for (const [index, course] of courses.entries()) {
            if (!course.lmsId || !course.lmsProvider || !course.name || !course.code) {
              console.error("Invalid course data:", course);
              continue;
            }

            try {
              // Emit progress for current course
              controller.enqueue(encoder.encode(createSSEEvent({
                type: 'progress',
                stage: `Syncing course ${index + 1}/${courses.length}: ${course.name}`,
                status: 'loading'
              })));

              const courseKey = `${course.lmsId}_${course.lmsProvider}`;
              const existingEnrollment = existingEnrollmentMap.get(courseKey);

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

              // Create enrollment only if it doesn't already exist
              if (existingEnrollment && existingEnrollment.courseId === upsertedCourse.id) {
                // Enrollment already exists, skip creation
                results.enrollmentsKept++;
              } else {
                // Create new enrollment
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
              }

              // Mark course as complete
              controller.enqueue(encoder.encode(createSSEEvent({
                type: 'progress',
                stage: `Syncing course ${index + 1}/${courses.length}: ${course.name}`,
                status: 'complete'
              })));

              // Sync modules and module items for this course
              if (course.lmsId) {
                const moduleResults = await syncModulesForCourse(
                  upsertedCourse.id,
                  course.lmsId,
                  course.name,
                  lmsProvider,
                  controller
                );
                results.modulesCreated += moduleResults.modulesCreated;
                results.modulesUpdated += moduleResults.modulesUpdated;
                results.modulesDeleted += moduleResults.modulesDeleted;
                results.moduleItemsCreated += moduleResults.moduleItemsCreated;
                results.moduleItemsDeleted += moduleResults.moduleItemsDeleted;
                results.errors.push(...moduleResults.errors);

                // Sync course assignments
                const assignmentResults = await syncCourseAssignments(
                  upsertedCourse.id,
                  course.lmsId,
                  course.name,
                  lmsProvider,
                  controller
                );
                results.assignmentsCreated += assignmentResults.assignmentsCreated;
                results.errors.push(...assignmentResults.errors);
              }
            } catch (error) {
              console.error(`Error processing course ${course.name}:`, error);
              results.errors.push(`Error processing course ${course.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
              
              controller.enqueue(encoder.encode(createSSEEvent({
                type: 'progress',
                stage: `Syncing course ${index + 1}/${courses.length}: ${course.name}`,
                status: 'error',
                detail: error instanceof Error ? error.message : 'Unknown error'
              })));
            }
          }

          // Emit final completion
          controller.enqueue(encoder.encode(createSSEEvent({
            type: 'done',
            stage: 'Resync Complete',
            status: 'complete',
            data: results
          })));

        } catch (error) {
          console.error("Error in streaming resync:", error);
          controller.enqueue(encoder.encode(createSSEEvent({
            type: 'error',
            stage: 'Resync Failed',
            status: 'error',
            detail: error instanceof Error ? error.message : 'Unknown error'
          })));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error("Error in resync enrollments stream API:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
