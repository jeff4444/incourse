import { NextRequest, NextResponse } from "next/server";
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
      const err = await resp.text();
      return NextResponse.json({ error: err }, { status: resp.status });
    }

    const data = await resp.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


