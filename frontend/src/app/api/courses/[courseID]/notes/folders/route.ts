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

    const { data: folders, error } = await supabase
      .from('note_folders')
      .select('*')
      .eq('user_id', userData.userId)
      .eq('course_id', courseID)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching note folders:', error);
      return NextResponse.json(
        { error: "Failed to fetch note folders" },
        { status: 500 }
      );
    }

    return NextResponse.json(folders || []);
  } catch (error) {
    console.error("Error in GET /api/courses/[courseID]/notes/folders:", error);
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
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Folder name is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get the next position
    const { data: lastFolder } = await supabase
      .from('note_folders')
      .select('position')
      .eq('user_id', userData.userId)
      .eq('course_id', courseID)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const nextPosition = lastFolder ? lastFolder.position + 1 : 0;

    const { data: folder, error } = await supabase
      .from('note_folders')
      .insert({
        user_id: userData.userId,
        course_id: courseID,
        name: name.trim(),
        position: nextPosition
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating note folder:', error);
      return NextResponse.json(
        { error: "Failed to create note folder" },
        { status: 500 }
      );
    }

    return NextResponse.json(folder);
  } catch (error) {
    console.error("Error in POST /api/courses/[courseID]/notes/folders:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
