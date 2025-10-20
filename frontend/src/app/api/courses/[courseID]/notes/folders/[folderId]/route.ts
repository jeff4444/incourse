import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";
import { getUserFromRequest } from "@/lib/utils/userCredentials";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ courseID: string; folderId: string }> }
) {
  try {
    const { courseID, folderId } = await params;
    const userData = await getUserFromRequest(request);
    
    if (!userData) {
      return NextResponse.json(
        { error: "Unauthorized - No valid user token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, position } = body;

    const supabase = await createClient();

    const updateData: any = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Folder name cannot be empty" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }
    if (position !== undefined) {
      updateData.position = position;
    }

    const { data: folder, error } = await supabase
      .from('note_folders')
      .update(updateData)
      .eq('id', folderId)
      .eq('user_id', userData.userId)
      .eq('course_id', courseID)
      .select()
      .single();

    if (error) {
      console.error('Error updating note folder:', error);
      return NextResponse.json(
        { error: "Failed to update note folder" },
        { status: 500 }
      );
    }

    if (!folder) {
      return NextResponse.json(
        { error: "Note folder not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(folder);
  } catch (error) {
    console.error("Error in PUT /api/courses/[courseID]/notes/folders/[folderId]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ courseID: string; folderId: string }> }
) {
  try {
    const { courseID, folderId } = await params;
    const userData = await getUserFromRequest(request);
    
    if (!userData) {
      return NextResponse.json(
        { error: "Unauthorized - No valid user token" },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // First, move all notes in this folder to no folder (folder_id = null)
    await supabase
      .from('notes')
      .update({ folder_id: null })
      .eq('folder_id', folderId)
      .eq('user_id', userData.userId)
      .eq('course_id', courseID);

    // Then delete the folder
    const { error } = await supabase
      .from('note_folders')
      .delete()
      .eq('id', folderId)
      .eq('user_id', userData.userId)
      .eq('course_id', courseID);

    if (error) {
      console.error('Error deleting note folder:', error);
      return NextResponse.json(
        { error: "Failed to delete note folder" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/courses/[courseID]/notes/folders/[folderId]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
