import { NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/utils/userCredentials";

export async function POST(request: NextRequest) {
  let courseId, fileIds, message, context, sessionId, provider;
  
  try {
    const body = await request.json();
    ({ courseId, fileIds, message, context, sessionId, provider } = body as {
      courseId: string;
      fileIds: string[];
      message: string;
      context?: string;
      sessionId?: string;
      provider?: string;
    });

    // Get user id from request
    const userData = await getUserFromRequest(request);
    if (!userData) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - No valid user token" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Python backend URL
    const backendUrl = process.env.NEXT_PUBLIC_AGENTS_BACKEND_URL || "http://localhost:8000";

    const prompt = context ? `Context:\n${context}\n\nQuestion: ${message}` : undefined;

    // Make streaming request to backend
    const resp = await fetch(`${backendUrl}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userData.accessToken}`,
      },
      body: JSON.stringify({
        user_id: userData.userId,
        course_id: courseId,
        file_ids: (fileIds || []).map((id: string) => String(id)),
        message,
        ...(prompt ? { prompt } : {}),
        ...(sessionId ? { session_id: sessionId } : {}),
        ...(provider ? { provider: provider } : {}),
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
        endpoint: '/chat/stream',
        backendUrl,
        requestBody: {
          user_id: userData.userId,
          course_id: courseId,
          file_ids: (fileIds || []).map((id: string) => String(id)),
          message,
          ...(prompt ? { prompt } : {}),
          ...(sessionId ? { session_id: sessionId } : {}),
          ...(provider ? { provider: provider } : {}),
        },
        response: {
          status: resp.status,
          statusText: resp.statusText,
          errorText,
          errorJson,
        },
        timestamp: new Date().toISOString(),
      };
      
      console.error("Backend error in chat stream:", errorDetails);
      
      return new Response(
        JSON.stringify({ error: errorText }),
        { status: resp.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // Stream the response directly to the client without buffering
    return new Response(resp.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    // Enhanced error logging with request context
    const errorDetails = {
      endpoint: '/api/agents/chat/stream',
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
    
    console.error('Error in chat stream API:', errorDetails);
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

