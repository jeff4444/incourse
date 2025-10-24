import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/utils/userCredentials";

export async function POST(request: NextRequest) {
  try {
    // Get user credentials from the request
    const userCredentials = await getUserFromRequest(request);
    if (!userCredentials) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { userId } = userCredentials;

    // Get form data from the request
    const formData = await request.formData();
    
    // Extract form fields
    const courseId = formData.get('course_id') as string;
    const assignmentId = formData.get('assignment_id') as string;
    const files = formData.getAll('files') as File[];

    // Validate required fields
    if (!courseId || !assignmentId || !files || files.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: course_id, assignment_id, and files" },
        { status: 400 }
      );
    }

    // Create new FormData for the Python backend
    const backendFormData = new FormData();
    backendFormData.append('user_id', userId);
    backendFormData.append('course_id', courseId);
    backendFormData.append('assignment_id', assignmentId);
    
    // Add all files to the backend FormData
    files.forEach((file) => {
      backendFormData.append('files', file);
    });

    // Call the Python backend
    const backendUrl = process.env.NEXT_PUBLIC_AGENTS_BACKEND_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/grade-assignment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userCredentials.accessToken}`,
      },
      body: backendFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error:', errorText);
      return NextResponse.json(
        { error: `Backend error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const lambdaResponse = await response.json();
    
    // Extract the body from Lambda response format
    let result;
    if (lambdaResponse.body) {
      // Lambda response format: extract and parse the body
      result = JSON.parse(lambdaResponse.body);
    } else {
      // Direct response format (for local development)
      result = lambdaResponse;
    }
    
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in autograder API route:', error);
    return NextResponse.json(
      { error: "Internal server error" + JSON.stringify(error) },
      { status: 500 }
    );
  }
}
