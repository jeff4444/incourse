import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/utils/userCredentials";
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Get user credentials from the request
    const userCredentials = await getUserFromRequest(request);
    if (!userCredentials) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { userId } = userCredentials;

    // Get course_id from query parameters
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id');
    const assignmentId = searchParams.get('assignment_id');

    if (!courseId) {
      return NextResponse.json(
        { error: "Missing course_id parameter" },
        { status: 400 }
      );
    }

    // Get Supabase client with service role key for RLS bypass
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Supabase configuration missing" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query
    let query = supabase
      .from('autograder_feedback')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });

    // Add assignment filter if provided
    if (assignmentId) {
      query = query.eq('assignment_id', assignmentId);
    }

    const { data: feedbackList, error } = await query;

    if (error) {
      console.error('Error fetching feedback list:', error);
      return NextResponse.json(
        { error: "Failed to fetch feedback list" },
        { status: 500 }
      );
    }

    // Transform the data to include a preview of the feedback
    const transformedFeedback = feedbackList.map(feedback => ({
      id: feedback.id,
      assignment_id: feedback.assignment_id,
      feedback_preview: feedback.feedback_text.substring(0, 200) + (feedback.feedback_text.length > 200 ? '...' : ''),
      full_feedback: feedback.feedback_text,
      solution_file_names: feedback.solution_file_names,
      created_at: feedback.created_at,
      created_at_formatted: new Date(feedback.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }));

    return NextResponse.json({
      success: true,
      feedback: transformedFeedback,
      message: "Feedback list retrieved successfully"
    });

  } catch (error) {
    console.error('Error in autograder feedback list API route:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
