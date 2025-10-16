import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/utils/userCredentials";
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ feedbackId: string }> }
) {
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
    const { feedbackId } = await params;

    if (!feedbackId) {
      return NextResponse.json(
        { error: "Missing feedback ID" },
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
      .eq('id', feedbackId)
      .eq('user_id', userId)
      .single();

    if (error) {
      // If no feedback found, that's okay - return empty result
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: "Feedback not found"
        }, { status: 404 });
      }
      
      console.error('Error fetching feedback:', error);
      return NextResponse.json(
        { error: "Failed to fetch feedback" },
        { status: 500 }
      );
    }

    // Transform the data
    const transformedFeedback = {
      id: feedback.id,
      assignment_id: feedback.assignment_id,
      feedback_text: feedback.feedback_text,
      solution_file_names: feedback.solution_file_names,
      created_at: feedback.created_at,
      created_at_formatted: new Date(feedback.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    return NextResponse.json({
      success: true,
      feedback: transformedFeedback,
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
