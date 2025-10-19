import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/utils/userCredentials";

export async function POST(request: NextRequest) {
  let courseId, name, fileIds, numQuestions, difficulty, extraContext;
  
  try {
    const requestBody = await request.json();
    ({ courseId, name, fileIds, numQuestions, difficulty, extraContext } = requestBody);

    // Get user id from request
    const userData = await getUserFromRequest(request);
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized - No valid user token" }, { status: 401 });
    }

    // Python backend URL
    const backendUrl = process.env.NEXT_PUBLIC_AGENTS_BACKEND_URL || "http://localhost:8000";

    // Call the backend to generate quiz
    const resp = await fetch(`${backendUrl}/generate-quiz`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userData.userId,
        course_id: courseId,
        name,
        file_ids: fileIds,
        num_questions: numQuestions,
        difficulty,
        extra_context: extraContext,
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
        endpoint: '/generate-quiz',
        backendUrl,
        requestBody: {
          user_id: userData.userId,
          course_id: courseId,
          name,
          file_ids: fileIds,
          num_questions: numQuestions,
          difficulty,
          extra_context: extraContext,
        },
        response: {
          status: resp.status,
          statusText: resp.statusText,
          errorText,
          errorJson,
        },
        timestamp: new Date().toISOString(),
      };
      
      console.error("Backend error in quiz generation:", errorDetails);
      
      return NextResponse.json(
        { error: `Failed to generate quiz: ${errorText}` },
        { status: resp.status }
      );
    }

    const lambdaResponse = await resp.json();
    
    // Extract the body from Lambda response format
    let data;
    if (lambdaResponse.body) {
      // Lambda response format: extract and parse the body
      data = JSON.parse(lambdaResponse.body);
    } else {
      // Direct response format (for local development)
      data = lambdaResponse;
    }
    
    return NextResponse.json(data);

  } catch (error) {
    // Enhanced error logging with request context
    const errorDetails = {
      endpoint: '/api/agents/quizzes',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      requestBody: {
        courseId,
        name,
        fileIds,
        numQuestions,
        difficulty,
        extraContext,
      },
      timestamp: new Date().toISOString(),
    };
    
    console.error("Error generating quiz:", errorDetails);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

