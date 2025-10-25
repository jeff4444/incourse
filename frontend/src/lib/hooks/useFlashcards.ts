import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authenticatedFetchJson } from "@/lib/utils/apiClient";

export interface FlashcardDeck {
  id: string;
  user_id: string;
  course_id: string;
  name: string;
  description: string | null;
  file_ids: string[];
  extra_context: string | null;
  card_type: string;
  card_count: number;
  status: 'generating' | 'completed' | 'failed';
  error_message: string | null;
  created_at: string;
  updated_at: string;
  flashcards: Flashcard[];
}

export interface Flashcard {
  id: string;
  deck_id: string;
  question: string;
  answer: string;
  hint: string | null;
  position: number;
  times_viewed: number;
  times_correct: number;
  times_incorrect: number;
  confidence_level: number | null;
  last_viewed_at: string | null;
  created_at: string;
  updated_at: string;
}

const flashcardKeys = {
  all: ['flashcards'] as const,
  decks: (courseId: string) => [...flashcardKeys.all, 'decks', courseId] as const,
  deck: (deckId: string) => [...flashcardKeys.all, 'deck', deckId] as const,
};

// Hook to fetch a specific flashcard deck with its cards
export function useFlashcardDeck(deckId: string) {
  return useQuery({
    queryKey: flashcardKeys.deck(deckId),
    queryFn: async (): Promise<FlashcardDeck> => {
      return authenticatedFetchJson<FlashcardDeck>(`/api/flashcards/${deckId}`);
    },
    enabled: !!deckId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook to fetch all flashcard decks for a course
export function useFlashcardDecks(courseId: string, userId: string) {
  return useQuery({
    queryKey: flashcardKeys.decks(courseId),
    queryFn: async (): Promise<FlashcardDeck[]> => {
      return authenticatedFetchJson<FlashcardDeck[]>(
        `/api/flashcards?courseId=${courseId}&userId=${userId}`
      );
    },
    enabled: !!courseId && !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// Hook to retry flashcard generation
export function useRetryFlashcardGeneration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (deckId: string) => {
      return authenticatedFetchJson(`/api/agents/flashcards/${deckId}/retry`, {
        method: 'POST',
      });
    },
    onSuccess: (_, deckId) => {
      // Invalidate and refetch flashcard decks to show updated status
      queryClient.invalidateQueries({ queryKey: flashcardKeys.all });
      queryClient.invalidateQueries({ queryKey: flashcardKeys.deck(deckId) });
    },
  });
}

// Hook to delete a flashcard deck
export function useDeleteFlashcardDeck() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (deckId: string) => {
      return authenticatedFetchJson(`/api/flashcards/${deckId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      // Invalidate and refetch flashcard decks to remove deleted deck
      queryClient.invalidateQueries({ queryKey: flashcardKeys.all });
    },
  });
}

