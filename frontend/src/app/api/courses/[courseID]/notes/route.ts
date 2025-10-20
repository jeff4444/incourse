import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";
import { getUserFromRequest } from "@/lib/utils/userCredentials";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseID: string }> }
) {
  try {
    const { courseID } = await params;
    const userData = await getUserFromRequest(request);
    
    if (!userData) {
      return NextResponse.json(
        { error: "Unauthorized - No valid user token" },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    const { data: notes, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userData.userId)
      .eq('course_id', courseID)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching notes:', error);
      return NextResponse.json(
        { error: "Failed to fetch notes" },
        { status: 500 }
      );
    }

    return NextResponse.json(notes || []);
  } catch (error) {
    console.error("Error in GET /api/courses/[courseID]/notes:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseID: string }> }
) {
  try {
    const { courseID } = await params;
    const userData = await getUserFromRequest(request);
    
    if (!userData) {
      return NextResponse.json(
        { error: "Unauthorized - No valid user token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, folder_id, content } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Note title is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get the next position within the folder (or no folder)
    const { data: lastNote } = await supabase
      .from('notes')
      .select('position')
      .eq('user_id', userData.userId)
      .eq('course_id', courseID)
      .eq('folder_id', folder_id || null)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const nextPosition = lastNote ? lastNote.position + 1 : 0;

    const { data: note, error } = await supabase
      .from('notes')
      .insert({
        user_id: userData.userId,
        course_id: courseID,
        folder_id: folder_id || null,
        title: title.trim(),
        content: content || { type: 'doc', content: [] },
        position: nextPosition
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating note:', error);
      return NextResponse.json(
        { error: "Failed to create note" },
        { status: 500 }
      );
    }

    return NextResponse.json(note);
  } catch (error) {
    console.error("Error in POST /api/courses/[courseID]/notes:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
