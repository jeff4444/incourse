import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";
import { getUserFromRequest } from "@/lib/utils/userCredentials";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseID: string; noteId: string }> }
) {
  try {
    const { courseID, noteId } = await params;
    const userData = await getUserFromRequest(request);
    
    if (!userData) {
      return NextResponse.json(
        { error: "Unauthorized - No valid user token" },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    const { data: note, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .eq('user_id', userData.userId)
      .eq('course_id', courseID)
      .single();

    if (error) {
      console.error('Error fetching note:', error);
      return NextResponse.json(
        { error: "Failed to fetch note" },
        { status: 500 }
      );
    }

    if (!note) {
      return NextResponse.json(
        { error: "Note not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(note);
  } catch (error) {
    console.error("Error in GET /api/courses/[courseID]/notes/[noteId]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ courseID: string; noteId: string }> }
) {
  try {
    const { courseID, noteId } = await params;
    const userData = await getUserFromRequest(request);
    
    if (!userData) {
      return NextResponse.json(
        { error: "Unauthorized - No valid user token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, content, folder_id, position } = body;

    const supabase = await createClient();

    const updateData: any = {};
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return NextResponse.json(
          { error: "Note title cannot be empty" },
          { status: 400 }
        );
      }
      updateData.title = title.trim();
    }
    if (content !== undefined) {
      updateData.content = content;
    }
    if (folder_id !== undefined) {
      updateData.folder_id = folder_id;
    }
    if (position !== undefined) {
      updateData.position = position;
    }

    const { data: note, error } = await supabase
      .from('notes')
      .update(updateData)
      .eq('id', noteId)
      .eq('user_id', userData.userId)
      .eq('course_id', courseID)
      .select()
      .single();

    if (error) {
      console.error('Error updating note:', error);
      return NextResponse.json(
        { error: "Failed to update note" },
        { status: 500 }
      );
    }

    if (!note) {
      return NextResponse.json(
        { error: "Note not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(note);
  } catch (error) {
    console.error("Error in PUT /api/courses/[courseID]/notes/[noteId]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ courseID: string; noteId: string }> }
) {
  try {
    const { courseID, noteId } = await params;
    const userData = await getUserFromRequest(request);
    
    if (!userData) {
      return NextResponse.json(
        { error: "Unauthorized - No valid user token" },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', userData.userId)
      .eq('course_id', courseID);

    if (error) {
      console.error('Error deleting note:', error);
      return NextResponse.json(
        { error: "Failed to delete note" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/courses/[courseID]/notes/[noteId]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
