import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/utils/userCredentials";

export async function POST(request: NextRequest) {
  let courseId, fileIds, message, context, sessionId;
  
  try {
    const body = await request.json();
    ({ courseId, fileIds, message, context, sessionId } = body as {
      courseId: string;
      fileIds: string[];
      message: string;
      context?: string;
      sessionId?: string;
    });

    // Get user id from request
    const userData = await getUserFromRequest(request);
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized - No valid user token" }, { status: 401 });
    }

    // Python backend URL
    const backendUrl = process.env.NEXT_PUBLIC_AGENTS_BACKEND_URL || "http://localhost:8000";

    const prompt = context ? `Context:\n${context}\n\nQuestion: ${message}` : undefined;

    const resp = await fetch(`${backendUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userData.userId,
        course_id: courseId,
        file_ids: (fileIds || []).map((id: string) => String(id)),
        message,
        ...(prompt ? { prompt } : {}),
        ...(sessionId ? { session_id: sessionId } : {}),
      }),
    });

    if (!resp.ok) {
      let errorText = '';
      let errorJson: any = null;
      
      try {
        const contentType = resp.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          errorJson = await resp.json();
          errorText = errorJson.error || errorJson.message || JSON.stringify(errorJson);
        } else {
          errorText = await resp.text();
        }
      } catch (e) {
        errorText = 'Unable to read error response';
        console.error('Failed to parse backend error response:', e);
      }
      
      // Enhanced error logging with request context
      const errorDetails = {
        endpoint: '/chat',
        backendUrl,
        requestBody: {
          user_id: userData.userId,
          course_id: courseId,
          file_ids: (fileIds || []).map((id: string) => String(id)),
          message,
          ...(prompt ? { prompt } : {}),
          ...(sessionId ? { session_id: sessionId } : {}),
        },
        response: {
          status: resp.status,
          statusText: resp.statusText,
          errorText,
          errorJson,
        },
        timestamp: new Date().toISOString(),
      };
      
      console.error("Backend error in chat:", errorDetails);
      
      return NextResponse.json({ error: errorText }, { status: resp.status });
    }

    const data = await resp.json();
    return NextResponse.json(data);
  } catch (error) {
    // Enhanced error logging with request context
    const errorDetails = {
      endpoint: '/api/agents/chat',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      requestBody: {
        courseId,
        fileIds,
        message,
        context,
        sessionId,
      },
      timestamp: new Date().toISOString(),
    };
    
    console.error('Error in chat API:', errorDetails);
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


