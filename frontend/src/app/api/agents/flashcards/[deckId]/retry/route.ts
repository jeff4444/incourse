import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/utils/userCredentials";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  try {
    const { deckId } = await params;
    
    // Get user id from request
    const userData = await getUserFromRequest(request);
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized - No valid user token" }, { status: 401 });
    }

    // Python backend URL
    const backendUrl = process.env.NEXT_PUBLIC_AGENTS_BACKEND_URL || "http://localhost:8000";

    // Call the backend to retry flashcard generation
    const resp = await fetch(`${backendUrl}/retry-flashcard-generation/${deckId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userData.accessToken}`,
      },
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
      
      console.error("Backend error in flashcard retry:", {
        endpoint: `/retry-flashcard-generation/${deckId}`,
        backendUrl,
        response: {
          status: resp.status,
          statusText: resp.statusText,
          errorText,
          errorJson,
        },
        timestamp: new Date().toISOString(),
      });
      
      return NextResponse.json(
        { error: `Failed to retry flashcard generation: ${errorText}` },
        { status: resp.status }
      );
    }

    const data = await resp.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("Error retrying flashcard generation:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
