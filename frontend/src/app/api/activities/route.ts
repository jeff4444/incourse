import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";
import { getUserFromRequest } from "@/lib/utils/userCredentials";


export async function GET(request: NextRequest) {
  try {
    const userData = await getUserFromRequest(request);
    if (!userData) {
      return NextResponse.json(
        { error: "Unauthorized - No valid user token" },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');
    const activityType = searchParams.get('activity_type');

    // Build query
    let query = supabase
      .from('activities')
      .select('*, courses(name, lms_id)')
      .eq('user_id', userData.userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Add activity type filter if provided
    if (activityType && activityType !== 'all') {
      // Map UI categories to database activity types
      if (activityType === 'quizzes') {
        query = query.in('activity_type', ['quiz_completion', 'quiz_generation']);
      } else if (activityType === 'flashcards') {
        query = query.in('activity_type', ['flashcard_study', 'flashcard_generation']);
      } else if (activityType === 'summaries') {
        query = query.eq('activity_type', 'reading');
      } else {
        query = query.eq('activity_type', activityType);
      }
    }

    const { data: activities, error } = await query;

    if (error) {
      console.error('Error fetching activities:', error);
      return NextResponse.json(
        { error: "Failed to fetch activities" },
        { status: 500 }
      );
    }

    return NextResponse.json(activities || []);
  } catch (error) {
    console.error("Error in GET /api/activities:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userData = await getUserFromRequest(request as Request);
    if (!userData) {
      return NextResponse.json(
        { error: "Unauthorized - No valid user token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      course_id, 
      activity_type, 
      activity_summary, 
      feedback, 
      metadata 
    } = body;

    // Validate required fields
    if (!course_id || !activity_type || !activity_summary || !feedback) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: activity, error } = await supabase
      .from('activities')
      .insert({
        user_id: userData.userId,
        course_id,
        activity_type,
        activity_summary,
        feedback,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating activity:', error);
      return NextResponse.json(
        { error: "Failed to create activity" },
        { status: 500 }
      );
    }

    return NextResponse.json(activity);
  } catch (error) {
    console.error("Error in POST /api/activities:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

