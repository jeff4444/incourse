import { NextRequest, NextResponse } from "next/server";
import { createLMSProviderWithUserCredentials } from "@/lib/utils/apiHelpers";
import { getUserFromRequest } from "@/lib/utils/userCredentials";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { courseId, fileIds, message, context } = body as {
      courseId: string;
      fileIds: string[];
      message: string;
      context?: string;
    };

    // Determine LMS from courseId prefix (e.g., "canvas-12345"); fallback to 'canvas'
    const parts = courseId.split('-');
    const lms = parts.length > 1 ? parts[0] : 'canvas';
    const rawCourseId = parts.length > 1 ? parts[1] : courseId;

    // Validate user and get LMS credentials
    const result = await createLMSProviderWithUserCredentials(request, lms);
    if (result instanceof NextResponse) {
      return result; // Unauthorized or bad request
    }


    // Get user id from request (helper above does not return it)
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
        course_id: rawCourseId,
        file_ids: (fileIds || []).map((id: string) => String(id)),
        message,
        ...(prompt ? { prompt } : {}),
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


