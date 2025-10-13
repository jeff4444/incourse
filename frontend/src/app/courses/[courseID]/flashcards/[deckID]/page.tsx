"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FlashcardView } from "@/components/flashcard-view"
import { Navbar } from "@/components/navbar"
import { useFlashcardDeck } from "@/lib/hooks/useFlashcards"

export default function FlashcardPage({ params }: { params: Promise<{ courseID: string; deckID: string }> }) {
  const router = useRouter()
  const [courseID, setCourseID] = useState<string>("")
  const [deckID, setDeckID] = useState<string>("")

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setCourseID(resolvedParams.courseID);
      setDeckID(resolvedParams.deckID);
    };
    getParams();
  }, [params]);

  // Fetch deck from database
  const { data: deck, isLoading, error } = useFlashcardDeck(deckID);

  useEffect(() => {
    // If deck not found after loading, redirect back to course page
    if (!isLoading && !deck && deckID && courseID) {
      router.push(`/courses/${courseID}`)
    }
  }, [deck, isLoading, deckID, courseID, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50">
        <Navbar />
        <div className="container mx-auto py-12 px-4">
          <div className="text-center">Loading flashcards...</div>
        </div>
      </div>
    )
  }

  if (error || !deck) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50">
        <Navbar />
        <div className="container mx-auto py-12 px-4">
          <div className="text-center text-red-500">
            <h2 className="text-xl font-semibold mb-2">Error loading flashcards</h2>
            <p>The flashcard deck could not be found or there was an error loading it.</p>
          </div>
        </div>
      </div>
    )
  }

  // Transform database flashcards to match FlashcardView component format
  const transformedCards = deck.flashcards.map((card) => ({
    id: parseInt(card.id) || 0,
    front: card.question,
    back: card.answer,
    hint: card.hint || undefined,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50">
      <Navbar />
      <div className="container mx-auto py-12 px-4">
        <FlashcardView title={deck.name} cards={transformedCards} courseID={courseID} />
      </div>
    </div>
  )
}
