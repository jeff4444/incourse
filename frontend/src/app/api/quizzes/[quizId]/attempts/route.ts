import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";
import { getUserFromRequest } from "@/lib/utils/userCredentials";
import { calculateFeedback, formatActivitySummary } from "@/lib/utils/activityUtils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  // Get user id from request
  const userData = await getUserFromRequest(request);
  if (!userData) {
    return NextResponse.json({ error: "Unauthorized - No valid user token" }, { status: 401 });
  }

  try {
    const { quizId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get all attempts for this quiz and user
    const { data: attempts, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch quiz attempts" },
        { status: 500 }
      );
    }

    return NextResponse.json(attempts || []);
  } catch (error) {
    console.error("Error fetching quiz attempts:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params;
    const { score, answers, time_spent_seconds } = await request.json();

    const supabase = await createClient();
    
    // Get user ID from session
    const userData = await getUserFromRequest(request);
    if (!userData) {
      return NextResponse.json(
        { error: "Unauthorized - No valid user token" },
        { status: 401 }
      );
    }

    // Get quiz information for activity logging
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('name, course_id')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    // Record the attempt
    const { data: attempt, error } = await supabase
      .from('quiz_attempts')
      .insert({
        quiz_id: quizId,
        user_id: userData.userId,
        score,
        answers,
        time_spent_seconds,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to record quiz attempt" },
        { status: 500 }
      );
    }

    // Create activity record (fire-and-forget, don't block response)
    const feedback = calculateFeedback('quiz_completion', { score });
    const activitySummary = formatActivitySummary('quiz_completion', {
      quizName: quiz.name,
      score
    });

    // Create activity asynchronously
    supabase
      .from('activities')
      .insert({
        user_id: userData.userId,
        course_id: quiz.course_id,
        activity_type: 'quiz_completion',
        activity_summary: activitySummary,
        feedback,
        metadata: {
          quiz_id: quizId,
          quiz_name: quiz.name,
          score,
          time_spent_seconds
        }
      })
      .then(({ error: activityError }) => {
        if (activityError) {
          console.error('Error creating quiz activity:', activityError);
        }
      });

    return NextResponse.json(attempt);
  } catch (error) {
    console.error("Error recording quiz attempt:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

