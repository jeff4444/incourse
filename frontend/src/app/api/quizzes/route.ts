import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const courseId = searchParams.get('courseId');
    const userId = searchParams.get('userId');

    if (!courseId || !userId) {
      return NextResponse.json(
        { error: "courseId and userId are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get all quizzes for the course and user
    const { data: quizzes, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('course_id', courseId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch quizzes" },
        { status: 500 }
      );
    }

    return NextResponse.json(quizzes || []);
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

