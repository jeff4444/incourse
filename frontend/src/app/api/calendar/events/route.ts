import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";
import { getUserFromRequest } from "@/lib/utils/userCredentials";
import { fetchMultipleICSFiles, ParsedEvent } from "@/lib/utils/icsParser";

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

    // Fetch user's enrolled courses
    const supabase = await createClient();
    
    const { data: enrollments, error: dbError } = await supabase
      .from('enrollments')
      .select(`
        course_id,
        courses (
          id,
          name,
          code,
          calendar
        )
      `)
      .eq('user_id', userData.userId);

    if (dbError) {
      console.error('Database query error:', dbError);
      return NextResponse.json(
        { error: "Failed to fetch courses" },
        { status: 500 }
      );
    }

    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json({ events: [] });
    }

    // Filter courses that have calendar URLs
    const coursesWithCalendar = enrollments
      .filter(enrollment => enrollment.courses && enrollment.courses.calendar)
      .map(enrollment => {
        const course = Array.isArray(enrollment.courses) 
          ? enrollment.courses[0] 
          : enrollment.courses;
        
        return {
          courseId: course.id,
          courseName: course.name,
          courseCode: course.code,
          calendarUrl: course.calendar,
        };
      });

    if (coursesWithCalendar.length === 0) {
      return NextResponse.json({ events: [] });
    }

    // Prepare ICS URLs for fetching
    const icsUrls = coursesWithCalendar.map(course => ({
      url: course.calendarUrl,
      courseId: course.courseId,
    }));

    // Fetch and parse all ICS files
    const { events, errors } = await fetchMultipleICSFiles(icsUrls);

    // Log any errors for debugging
    if (errors.length > 0) {
      console.warn('ICS parsing errors:', errors);
    }

    // Add course metadata to events
    const eventsWithMetadata = events.map(event => ({
      ...event,
      courseName: coursesWithCalendar.find(c => c.courseId === event.courseId)?.courseName || 'Unknown Course',
      courseCode: coursesWithCalendar.find(c => c.courseId === event.courseId)?.courseCode || 'Unknown',
    }));

    return NextResponse.json({
      events: eventsWithMetadata,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('Error in calendar events API:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
