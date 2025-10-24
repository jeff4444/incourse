import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/utils/userCredentials";
import { LMSFactory } from "@/lib/api";
import { createClient } from "@/lib/utils/supabase/server";
import { Course, Module, ModuleItem } from "@/lib/types/course";
import LMSProvider from "@/lib/lms/lms-provider";

// Server-side Supabase client with service role for bypassing RLS when needed
const supabase = await createClient();

interface SyncCoursesRequest {
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

async function syncModulesForCourse(
  courseId: string,
  courseLmsId: string,
  courseName: string,
  lmsProvider: LMSProvider,
  controller: ReadableStreamDefaultController
): Promise<{ modulesCreated: number; moduleItemsCreated: number; errors: string[] }> {
  const result = {
    modulesCreated: 0,
    moduleItemsCreated: 0,
    errors: [] as string[],
  };

  try {
    // Emit progress event
    controller.enqueue(new TextEncoder().encode(createSSEEvent({
      type: 'progress',
      stage: `Syncing modules for ${courseName}`,
      status: 'loading'
    })));

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
      controller.enqueue(new TextEncoder().encode(createSSEEvent({
        type: 'progress',
        stage: `Syncing modules for ${courseName}`,
        status: 'complete',
        detail: 'Modules already synced'
      })));
      return result;
    }

    // Fetch modules from LMS
    const modules = await lmsProvider.getCourseModules(courseLmsId);

    // Process each module
    for (const module of modules) {
      try {
        // Emit progress for individual module
        controller.enqueue(new TextEncoder().encode(createSSEEvent({
          type: 'progress',
          stage: `Syncing module: ${module.name}`,
          status: 'loading'
        })));

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
            const { data: upsertedItem, error: itemError } = await supabase
              .from("module_items")
              .upsert({
                lms_id: item.lmsId,
                lms_content_id: item.lmsContentId,
                module_id: upsertedModule.id,
                course_id: courseId,
                name: item.name,
                type: item.type,
                url: item.url,
                position: item.position,
              }, {
                onConflict: 'lms_id,module_id',
                ignoreDuplicates: false,
              })
              .select()
              .single();

            if (itemError) {
              console.error(`Failed to upsert module item ${item.name}:`, JSON.stringify(item, null, 2), `Error: ${itemError.message}`);
              result.errors.push(`Failed to upsert module item ${item.name}: ${itemError.message}`);
              continue;
            }

            if (!upsertedItem) {
              result.errors.push(`No module item returned after upsert: ${item.name}`);
              continue;
            }

            result.moduleItemsCreated++;

            // Fetch and store details based on item type
            try {
              if (item.type === 'File' && item.url) {
                // Extract file ID from URL (e.g., /api/v1/courses/52305/files/3904021)
                const fileIdMatch = item.url.match(/\/files\/(\d+)/);
                if (fileIdMatch) {
                  const fileId = fileIdMatch[1];
                  const fileData = await lmsProvider.getFileDetails(fileId, courseLmsId);
                  const file = (lmsProvider as any).convertCanvasFileDetails(fileData, upsertedItem.id, courseId);
                  
                  await supabase
                    .from("files")
                    .upsert({
                      lms_id: file.lmsId,
                      module_item_id: file.moduleItemId,
                      course_id: file.courseId,
                      display_name: file.displayName,
                      content_type: file.contentType,
                      url: file.url,
                      uuid: file.uuid,
                      size: file.size,
                    }, {
                      onConflict: 'lms_id,course_id',
                      ignoreDuplicates: false,
                    });
                }
              } else if (item.type === 'Page' && item.lmsContentId) {
                const pageData = await lmsProvider.getPage(item.lmsContentId, courseLmsId);
                const page = (lmsProvider as any).convertCanvasPage(pageData, upsertedItem.id, courseId);
                
                await supabase
                  .from("pages")
                  .upsert({
                    lms_id: page.lmsId,
                    module_item_id: page.moduleItemId,
                    course_id: page.courseId,
                    title: page.title,
                    url: page.url,
                    created_at: page.createdAt,
                    html_url: page.htmlUrl,
                    body: page.body,
                  }, {
                    onConflict: 'lms_id,course_id',
                    ignoreDuplicates: false,
                  });
              } else if (item.type === 'Discussion' && item.lmsContentId) {
                const discussionData = await lmsProvider.getDiscussionTopic(item.lmsContentId, courseLmsId);
                const discussion = (lmsProvider as any).convertCanvasDiscussionTopic(discussionData, upsertedItem.id, courseId);
                
                await supabase
                  .from("discussion_topics")
                  .upsert({
                    lms_id: discussion.lmsId,
                    module_item_id: discussion.moduleItemId,
                    course_id: discussion.courseId,
                    title: discussion.title,
                    created_at: discussion.createdAt,
                    last_reply_at: discussion.lastReplyAt,
                    posted_at: discussion.postedAt,
                    message: discussion.message,
                    html_url: discussion.htmlUrl,
                    discussion_subentry_count: discussion.discussionSubentryCount,
                    subscribed: discussion.subscribed,
                    read_state: discussion.readState,
                    permissions: discussion.permissions,
                  }, {
                    onConflict: 'lms_id,course_id',
                    ignoreDuplicates: false,
                  });
              }
            } catch (detailError) {
              console.error(`Failed to fetch details for ${item.type} ${item.name}:`, detailError);
              result.errors.push(`Failed to fetch details for ${item.type} ${item.name}: ${detailError instanceof Error ? detailError.message : 'Unknown error'}`);
            }
          } catch (itemError) {
            result.errors.push(
              `Error processing module item ${item.name}: ${itemError instanceof Error ? itemError.message : 'Unknown error'}`
            );
          }
        }

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

async function syncCourseFilesDirectly(
  courseId: string,
  courseLmsId: string,
  courseName: string,
  lmsProvider: LMSProvider,
  controller: ReadableStreamDefaultController
): Promise<{ filesCreated: number; errors: string[] }> {
  const result = {
    filesCreated: 0,
    errors: [] as string[],
  };

  try {
    // Emit progress event
    controller.enqueue(new TextEncoder().encode(createSSEEvent({
      type: 'progress',
      stage: `Syncing course files for ${courseName}`,
      status: 'loading'
    })));

    // Fetch all course files
    const courseFiles = await (lmsProvider as any).getCourseFiles(courseLmsId);
    
    if (courseFiles.length === 0) {
      controller.enqueue(new TextEncoder().encode(createSSEEvent({
        type: 'progress',
        stage: `Syncing course files for ${courseName}`,
        status: 'complete',
        detail: 'No files found'
      })));
      return result;
    }

    // Get existing files from database to avoid duplicates
    const { data: existingFiles, error: existingError } = await supabase
      .from("files")
      .select("lms_id")
      .eq("course_id", courseId);

    if (existingError) {
      result.errors.push(`Failed to check existing files: ${existingError.message}`);
      return result;
    }

    const existingFileIds = new Set(existingFiles?.map(f => f.lms_id) || []);

    // Filter out files that already exist
    const newFiles = courseFiles.filter((file: any) => !existingFileIds.has(file.id));

    if (newFiles.length === 0) {
      controller.enqueue(new TextEncoder().encode(createSSEEvent({
        type: 'progress',
        stage: `Syncing course files for ${courseName}`,
        status: 'complete',
        detail: 'All files already synced'
      })));
      return result;
    }

    // Process each new file
    for (const fileData of newFiles) {
      try {
        const file = (lmsProvider as any).convertCanvasFileDetails(fileData, '', courseId);
        
        await supabase
          .from("files")
          .upsert({
            lms_id: file.lmsId,
            module_item_id: null, // No module item for direct course files
            course_id: file.courseId,
            display_name: file.displayName,
            content_type: file.contentType,
            url: file.url,
            uuid: file.uuid,
            size: file.size,
          }, {
            onConflict: 'lms_id,course_id',
            ignoreDuplicates: false,
          });

        result.filesCreated++;
      } catch (fileError) {
        result.errors.push(
          `Error processing file ${fileData.filename || fileData.display_name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`
        );
      }
    }

    // Mark course files as complete
    controller.enqueue(new TextEncoder().encode(createSSEEvent({
      type: 'progress',
      stage: `Syncing course files for ${courseName}`,
      status: 'complete',
      detail: `${result.filesCreated} files synced`
    })));

  } catch (error) {
    result.errors.push(
      `Error syncing course files: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    
    controller.enqueue(new TextEncoder().encode(createSSEEvent({
      type: 'progress',
      stage: `Syncing course files for ${courseName}`,
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

    const body: SyncCoursesRequest = await request.json();
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
          // Emit initial progress
          controller.enqueue(encoder.encode(createSSEEvent({
            type: 'progress',
            stage: 'Connecting to Canvas',
            status: 'loading'
          })));

          // Create LMS provider and fetch courses
          const lmsFactory = new LMSFactory(apiBaseUrl, apiKey);
          const lmsProvider = lmsFactory.createLMSProvider('canvas');
          
          controller.enqueue(encoder.encode(createSSEEvent({
            type: 'progress',
            stage: 'Connecting to Canvas',
            status: 'complete'
          })));

          controller.enqueue(encoder.encode(createSSEEvent({
            type: 'progress',
            stage: 'Fetching courses',
            status: 'loading'
          })));

          const courses = await lmsProvider.getCourses();
          
          controller.enqueue(encoder.encode(createSSEEvent({
            type: 'progress',
            stage: 'Fetching courses',
            status: 'complete',
            detail: `${courses.length} courses found`
          })));

          const results = {
            coursesCreated: 0,
            coursesUpdated: 0,
            enrollmentsCreated: 0,
            modulesCreated: 0,
            moduleItemsCreated: 0,
            filesCreated: 0,
            errors: [] as string[],
          };

          // Process each course
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
                results.moduleItemsCreated += moduleResults.moduleItemsCreated;
                results.errors.push(...moduleResults.errors);

                // Sync course files directly (not as module items)
                const fileResults = await syncCourseFilesDirectly(
                  upsertedCourse.id,
                  course.lmsId,
                  course.name,
                  lmsProvider,
                  controller
                );
                results.filesCreated += fileResults.filesCreated;
                results.errors.push(...fileResults.errors);
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
            stage: 'Sync Complete',
            status: 'complete',
            data: results
          })));

        } catch (error) {
          console.error("Error in streaming sync:", error);
          controller.enqueue(encoder.encode(createSSEEvent({
            type: 'error',
            stage: 'Sync Failed',
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
    console.error("Error in sync courses stream API:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
