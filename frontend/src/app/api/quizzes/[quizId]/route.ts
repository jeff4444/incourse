import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";
import { getUserFromRequest } from "@/lib/utils/userCredentials";

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
    const supabase = await createClient();

    // Get the quiz
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    // Get questions
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('position');

    if (questionsError) {
      return NextResponse.json(
        { error: "Failed to fetch quiz questions" },
        { status: 500 }
      );
    }

    // Combine quiz with questions
    const quizWithQuestions = {
      ...quiz,
      questions: questions || [],
    };

    return NextResponse.json(quizWithQuestions);
  } catch (error) {
    console.error("Error fetching quiz:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const supabase = await createClient();

    // First verify the quiz exists and belongs to the user
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('user_id')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    if (quiz.user_id !== userData.userId) {
      return NextResponse.json(
        { error: "Unauthorized - You can only delete your own quizzes" },
        { status: 403 }
      );
    }

    // Delete all questions for this quiz
    const { error: questionsError } = await supabase
      .from('quiz_questions')
      .delete()
      .eq('quiz_id', quizId);

    if (questionsError) {
      console.error("Error deleting quiz questions:", questionsError);
      return NextResponse.json(
        { error: "Failed to delete quiz questions" },
        { status: 500 }
      );
    }

    // Delete the quiz
    const { error: quizDeleteError } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', quizId);

    if (quizDeleteError) {
      console.error("Error deleting quiz:", quizDeleteError);
      return NextResponse.json(
        { error: "Failed to delete quiz" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Quiz deleted successfully" });
  } catch (error) {
    console.error("Error deleting quiz:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

