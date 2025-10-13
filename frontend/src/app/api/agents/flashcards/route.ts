import { NextRequest, NextResponse } from "next/server";
import { serverAuthenticatedFetchJson } from "@/lib/utils/serverAuth";
import { getUserCredentials } from "@/lib/utils/userCredentials";

export async function POST(request: NextRequest) {
  try {
    const { courseId, name, fileIds, numFlashcards, cardType, extraContext } = await request.json();

    // Get the user ID from the session
    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Decode the JWT to get user ID (you might have a helper for this)
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const userId = payload.sub;

    // Get user credentials
    const userCreds = await getUserCredentials(userId, token);
    if (!userCreds) {
      return NextResponse.json(
        { error: "User credentials not found" },
        { status: 404 }
      );
    }

    // Python backend URL
    const backendUrl = process.env.NEXT_PUBLIC_AGENTS_BACKEND_URL || "http://localhost:8000";

    // Call the backend to generate flashcards
    const resp = await fetch(`${backendUrl}/generate-flashcards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        course_id: courseId,
        name,
        file_ids: fileIds,
        num_flashcards: numFlashcards,
        card_type: cardType,
        extra_context: extraContext,
      }),
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error("Backend error:", errorText);
      return NextResponse.json(
        { error: `Failed to generate flashcards: ${errorText}` },
        { status: resp.status }
      );
    }

    const data = await resp.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("Error generating flashcards:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

