import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { authenticatedFetchJson } from '@/lib/utils/apiClient';

export interface Activity {
  id: string;
  user_id: string;
  course_id: string;
  activity_type: string;
  activity_summary: string;
  feedback: 'good' | 'neutral' | 'bad';
  metadata: Record<string, any>;
  created_at: string;
  courses?: {
    name: string;
    lms_id: string;
  };
}

interface CreateActivityParams {
  course_id: string;
  activity_type: string;
  activity_summary: string;
  feedback: 'good' | 'neutral' | 'bad';
  metadata?: Record<string, any>;
}

/**
 * Hook to fetch recent activities
 */
export function useRecentActivities(limit: number = 5, activityType?: string) {
  return useQuery<Activity[]>({
    queryKey: ['activities', limit, activityType],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: limit.toString() });
      if (activityType) {
        params.append('activity_type', activityType);
      }
      
      const data = await authenticatedFetchJson<Activity[]>(`/api/activities?${params.toString()}`);
      return data;
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to fetch all activity types at once for efficient filtering
 * Fetches 5 activities per type and caches them
 */
export function useAllActivitiesByType(limit: number = 5) {
  // Fetch activities for each type
  const quizzesQuery = useQuery<Activity[]>({
    queryKey: ['activities', limit, 'quizzes'],
    queryFn: async () => {
      const params = new URLSearchParams({ 
        limit: limit.toString(),
        activity_type: 'quizzes'
      });
      
      const data = await authenticatedFetchJson<Activity[]>(`/api/activities?${params.toString()}`);
      return data;
    },
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  const flashcardsQuery = useQuery<Activity[]>({
    queryKey: ['activities', limit, 'flashcards'],
    queryFn: async () => {
      const params = new URLSearchParams({ 
        limit: limit.toString(),
        activity_type: 'flashcards'
      });
      
      const data = await authenticatedFetchJson<Activity[]>(`/api/activities?${params.toString()}`);
      return data;
    },
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  const summariesQuery = useQuery<Activity[]>({
    queryKey: ['activities', limit, 'summaries'],
    queryFn: async () => {
      const params = new URLSearchParams({ 
        limit: limit.toString(),
        activity_type: 'summaries'
      });
      
      const data = await authenticatedFetchJson<Activity[]>(`/api/activities?${params.toString()}`);
      return data;
    },
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  return {
    quizzes: quizzesQuery.data || [],
    flashcards: flashcardsQuery.data || [],
    summaries: summariesQuery.data || [],
    isLoading: quizzesQuery.isLoading || flashcardsQuery.isLoading || summariesQuery.isLoading,
    refetchAll: () => {
      quizzesQuery.refetch();
      flashcardsQuery.refetch();
      summariesQuery.refetch();
    }
  };
}

/**
 * Hook to create a new activity
 */
export function useCreateActivity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: CreateActivityParams) => {
      const data = await authenticatedFetchJson<Activity>('/api/activities', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      
      return data;
    },
    onSuccess: () => {
      // Invalidate activities queries to refetch
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

/**
 * Hook to track reading time and automatically log activity
 */
export function useReadingTracker(
  fileId: string,
  fileName: string,
  courseId: string,
  enabled: boolean = true
) {
  const [timeSpent, setTimeSpent] = useState(0);
  const startTimeRef = useRef<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoggedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !fileId || !fileName || !courseId) return;

    // Reset when file changes
    startTimeRef.current = Date.now();
    setTimeSpent(0);
    hasLoggedRef.current = false;

    // Update time spent every second
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setTimeSpent(elapsed);
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fileId, fileName, courseId, enabled]);

  const logActivity = async () => {
    // Only log if we haven't already and time is at least 1 second
    if (hasLoggedRef.current || timeSpent < 1 || !fileId || !fileName || !courseId) {
      return;
    }

    hasLoggedRef.current = true;

    try {
      await authenticatedFetchJson('/api/activities/reading', {
        method: 'POST',
        body: JSON.stringify({
          course_id: courseId,
          file_id: fileId,
          file_name: fileName,
          time_spent_seconds: timeSpent,
        }),
      });
    } catch (error) {
      console.error('Error logging reading activity:', error);
      hasLoggedRef.current = false; // Allow retry on error
    }
  };

  return {
    timeSpent,
    logActivity,
  };
}

/**
 * Hook to log flashcard study session
 */
export function useLogFlashcardStudy() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      deckId: string;
      cardReviews: Array<{ cardId: string; difficulty: 'easy' | 'hard' }>;
      totalCards: number;
    }) => {
      const data = await authenticatedFetchJson<Activity>(
        `/api/flashcards/${params.deckId}/study`,
        {
          method: 'POST',
          body: JSON.stringify({
            card_reviews: params.cardReviews,
            total_cards: params.totalCards,
          }),
        }
      );
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

