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

    // Get assignment_id from query parameters
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignment_id');

    if (!assignmentId) {
      return NextResponse.json(
        { error: "Missing assignment_id parameter" },
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

    // Query the autograder_feedback table
    const { data: feedback, error } = await supabase
      .from('autograder_feedback')
      .select('*')
      .eq('user_id', userId)
      .eq('assignment_id', assignmentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // If no feedback found, that's okay - return empty result
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: true,
          feedback: null,
          message: "No feedback found"
        });
      }
      
      console.error('Error fetching feedback:', error);
      return NextResponse.json(
        { error: "Failed to fetch feedback" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      feedback: feedback.feedback_text,
      created_at: feedback.created_at,
      solution_file_names: feedback.solution_file_names,
      message: "Feedback retrieved successfully"
    });

  } catch (error) {
    console.error('Error in autograder feedback API route:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
