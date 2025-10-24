import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/utils/userCredentials";

export async function POST(request: NextRequest) {
  let courseId, noteIds, aiMessage, conversationContext, fileId;
  
  try {
    const body = await request.json();
    ({ courseId, noteIds, aiMessage, conversationContext, fileId } = body as {
      courseId: string;
      noteIds: string[];
      aiMessage: string;
      conversationContext?: Array<{ role: string; content: string }>;
      fileId: string;
    });

    // Get user id from request
    const userData = await getUserFromRequest(request);
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized - No valid user token" }, { status: 401 });
    }

    // Validate required fields
    if (!courseId || !noteIds || noteIds.length === 0 || !aiMessage || !fileId) {
      return NextResponse.json({ 
        error: "Missing required fields: courseId, noteIds, aiMessage, and fileId are required" 
      }, { status: 400 });
    }

    // Python backend URL
    const backendUrl = process.env.NEXT_PUBLIC_AGENTS_BACKEND_URL || "http://localhost:8000";

    // Call the backend to add chat message to notes
    const resp = await fetch(`${backendUrl}/agents/notes/add-chat-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userData.accessToken}`,
      },
      body: JSON.stringify({
        user_id: userData.userId,
        course_id: courseId,
        note_ids: noteIds,
        ai_message: aiMessage,
        conversation_context: conversationContext || [],
        file_id: fileId,
      }),
    });

    if (!resp.ok) {
      let errorText = '';
      let errorJson: any = null;
      
      try {
        errorText = await resp.text();
        errorJson = JSON.parse(errorText);
      } catch {
        // If parsing fails, use the text as is
      }
      
      console.error('Backend error response:', {
        status: resp.status,
        statusText: resp.statusText,
        errorText,
        errorJson
      });
      
      return NextResponse.json(
        { 
          error: errorJson?.detail || errorJson?.error || errorText || `Backend error: ${resp.status} ${resp.statusText}`,
          backendStatus: resp.status
        }, 
        { status: resp.status }
      );
    }

    const result = await resp.json();
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Error in /api/agents/notes/add-chat-message:', error);
    
    return NextResponse.json(
      { 
        error: "Internal server error while adding chat message to notes",
        details: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
    );
  }
}
