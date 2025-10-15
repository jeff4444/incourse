import { NextRequest } from "next/server";
import { getUserFromRequest } from "@/lib/utils/userCredentials";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { courseId, fileIds, message, context, sessionId } = body as {
      courseId: string;
      fileIds: string[];
      message: string;
      context?: string;
      sessionId?: string;
    };

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
      const err = await resp.text();
      return new Response(
        JSON.stringify({ error: err }),
        { status: resp.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // Stream the response directly to the client
    return new Response(resp.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in chat stream API:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

