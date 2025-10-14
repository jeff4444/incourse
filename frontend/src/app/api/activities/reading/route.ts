import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";
import { calculateFeedback, formatActivitySummary } from "@/lib/utils/activityUtils";
import { getUserFromRequest } from "@/lib/utils/userCredentials";

export async function POST(request: NextRequest) {
  try {
    const userData = await getUserFromRequest(request);
    if (!userData) {
      return NextResponse.json(
        { error: "Unauthorized - No valid user token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { course_id, file_id, file_name, time_spent_seconds } = body;

    // Validate required fields
    if (!course_id || !file_id || !file_name || time_spent_seconds === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Calculate feedback based on time spent
    const feedback = calculateFeedback('reading', { 
      timeSpentSeconds: time_spent_seconds 
    });

    // Generate activity summary
    const activitySummary = formatActivitySummary('reading', {
      fileName: file_name,
      timeSpentSeconds: time_spent_seconds
    });

    const supabase = await createClient();

    const { data: activity, error } = await supabase
      .from('activities')
      .insert({
        user_id: userData.userId,
        course_id,
        activity_type: 'reading',
        activity_summary: activitySummary,
        feedback,
        metadata: {
          file_id,
          file_name,
          time_spent_seconds
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating reading activity:', error);
      return NextResponse.json(
        { error: "Failed to create reading activity" },
        { status: 500 }
      );
    }

    return NextResponse.json(activity);
  } catch (error) {
    console.error("Error in POST /api/activities/reading:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

