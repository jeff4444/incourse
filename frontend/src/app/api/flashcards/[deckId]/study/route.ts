import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";
import { calculateFeedback, formatActivitySummary } from "@/lib/utils/activityUtils";
import { getUserFromRequest } from "@/lib/utils/userCredentials";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  try {
    const { deckId } = await params;
    const userData = await getUserFromRequest(request);
    
    if (!userData) {
      return NextResponse.json(
        { error: "Unauthorized - No valid user token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { card_reviews, total_cards } = body;

    // Validate required fields
    if (!card_reviews || !total_cards) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get deck information
    const { data: deck, error: deckError } = await supabase
      .from('flashcard_decks')
      .select('name, course_id')
      .eq('id', deckId)
      .single();

    if (deckError || !deck) {
      return NextResponse.json(
        { error: "Deck not found" },
        { status: 404 }
      );
    }

    const reviewedCount = card_reviews.length;

    // Calculate feedback based on completion percentage
    const feedback = calculateFeedback('flashcard_study', {
      reviewedCount,
      totalCards: total_cards
    });

    // Generate activity summary
    const activitySummary = formatActivitySummary('flashcard_study', {
      deckName: deck.name,
      reviewedCount,
      totalCards: total_cards
    });

    // Create activity record
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .insert({
        user_id: userData.userId,
        course_id: deck.course_id,
        activity_type: 'flashcard_study',
        activity_summary: activitySummary,
        feedback,
        metadata: {
          deck_id: deckId,
          deck_name: deck.name,
          reviewed_count: reviewedCount,
          total_cards: total_cards,
          card_reviews
        }
      })
      .select()
      .single();

    if (activityError) {
      console.error('Error creating flashcard study activity:', activityError);
      return NextResponse.json(
        { error: "Failed to create activity" },
        { status: 500 }
      );
    }

    return NextResponse.json(activity);
  } catch (error) {
    console.error("Error in POST /api/flashcards/[deckId]/study:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

