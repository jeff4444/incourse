import { NextRequest, NextResponse } from "next/server";
import { createLMSProviderWithUserCredentials } from "@/lib/utils/apiHelpers";
import { getUserFromRequest } from "@/lib/utils/userCredentials";
import { createClient } from "@/lib/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { courseId, fileIds, message, context } = body as {
      courseId: string;
      fileIds: string[];
      message: string;
      context?: string;
    };

    // Get user id from request
    const userData = await getUserFromRequest(request);
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized - No valid user token" }, { status: 401 });
    }

    // Fetch course info from database to get lmsId and lmsProvider
    const supabase = await createClient();
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('lms_id, lms_provider')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    // Validate user and get LMS credentials
    const result = await createLMSProviderWithUserCredentials(request, course.lms_provider);
    if (result instanceof NextResponse) {
      return result; // Unauthorized or bad request
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
        course_id: course.lms_id,
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


