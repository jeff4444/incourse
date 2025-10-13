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

    // Get all decks for the course and user
    const { data: decks, error } = await supabase
      .from('flashcard_decks')
      .select('*')
      .eq('course_id', courseId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch flashcard decks" },
        { status: 500 }
      );
    }

    return NextResponse.json(decks || []);
  } catch (error) {
    console.error("Error fetching flashcard decks:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

