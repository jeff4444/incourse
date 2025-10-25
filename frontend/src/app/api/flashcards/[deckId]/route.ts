import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";
import { getUserFromRequest } from "@/lib/utils/userCredentials";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  // Get user id from request
  const userData = await getUserFromRequest(request);
  if (!userData) {
    return NextResponse.json({ error: "Unauthorized - No valid user token" }, { status: 401 });
  }

  try {
    const { deckId } = await params;
    const supabase = await createClient();

    // Get the deck with flashcards
    const { data: deck, error: deckError } = await supabase
      .from('flashcard_decks')
      .select('*')
      .eq('id', deckId)
      .single();

    if (deckError || !deck) {
      return NextResponse.json(
        { error: "Flashcard deck not found" },
        { status: 404 }
      );
    }

    // Get flashcards
    const { data: flashcards, error: flashcardsError } = await supabase
      .from('flashcards')
      .select('*')
      .eq('deck_id', deckId)
      .order('position');

    if (flashcardsError) {
      return NextResponse.json(
        { error: "Failed to fetch flashcards" },
        { status: 500 }
      );
    }

    // Combine deck with flashcards
    const deckWithFlashcards = {
      ...deck,
      flashcards: flashcards || [],
    };

    return NextResponse.json(deckWithFlashcards);
  } catch (error) {
    console.error("Error fetching flashcard deck:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  // Get user id from request
  const userData = await getUserFromRequest(request);
  if (!userData) {
    return NextResponse.json({ error: "Unauthorized - No valid user token" }, { status: 401 });
  }

  try {
    const { deckId } = await params;
    const supabase = await createClient();

    // First verify the deck exists and belongs to the user
    const { data: deck, error: deckError } = await supabase
      .from('flashcard_decks')
      .select('user_id')
      .eq('id', deckId)
      .single();

    if (deckError || !deck) {
      return NextResponse.json(
        { error: "Flashcard deck not found" },
        { status: 404 }
      );
    }

    if (deck.user_id !== userData.userId) {
      return NextResponse.json(
        { error: "Unauthorized - You can only delete your own flashcard decks" },
        { status: 403 }
      );
    }

    // Delete all flashcards for this deck
    const { error: flashcardsError } = await supabase
      .from('flashcards')
      .delete()
      .eq('deck_id', deckId);

    if (flashcardsError) {
      console.error("Error deleting flashcards:", flashcardsError);
      return NextResponse.json(
        { error: "Failed to delete flashcards" },
        { status: 500 }
      );
    }

    // Delete the flashcard deck
    const { error: deckDeleteError } = await supabase
      .from('flashcard_decks')
      .delete()
      .eq('id', deckId);

    if (deckDeleteError) {
      console.error("Error deleting flashcard deck:", deckDeleteError);
      return NextResponse.json(
        { error: "Failed to delete flashcard deck" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Flashcard deck deleted successfully" });
  } catch (error) {
    console.error("Error deleting flashcard deck:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

