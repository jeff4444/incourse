import { useQuery, useMutation } from "@tanstack/react-query";
import { authenticatedFetchJson } from "@/lib/utils/apiClient";

export interface Quiz {
  id: string;
  user_id: string;
  course_id: string;
  name: string;
  description: string | null;
  file_ids: string[];
  extra_context: string | null;
  difficulty: string;
  question_count: number;
  created_at: string;
  updated_at: string;
  questions: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question: string;
  options: string[];
  correct_option_index: number;
  explanation: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  score: number;
  answers: Array<{
    question_id: string;
    selected_option_index: number;
    correct: boolean;
  }>;
  time_spent_seconds: number | null;
  completed_at: string;
  created_at: string;
}

const quizKeys = {
  all: ['quizzes'] as const,
  quizzes: (courseId: string) => [...quizKeys.all, 'list', courseId] as const,
  quiz: (quizId: string) => [...quizKeys.all, 'detail', quizId] as const,
  attempts: (quizId: string, userId: string) => [...quizKeys.all, 'attempts', quizId, userId] as const,
};

// Hook to fetch a specific quiz with its questions
export function useQuiz(quizId: string) {
  return useQuery({
    queryKey: quizKeys.quiz(quizId),
    queryFn: async (): Promise<Quiz> => {
      return authenticatedFetchJson<Quiz>(`/api/quizzes/${quizId}`);
    },
    enabled: !!quizId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook to fetch all quizzes for a course
export function useQuizzes(courseId: string, userId: string) {
  return useQuery({
    queryKey: quizKeys.quizzes(courseId),
    queryFn: async (): Promise<Quiz[]> => {
      return authenticatedFetchJson<Quiz[]>(
        `/api/quizzes?courseId=${courseId}&userId=${userId}`
      );
    },
    enabled: !!courseId && !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

// Hook to fetch quiz attempts
export function useQuizAttempts(quizId: string, userId: string) {
  return useQuery({
    queryKey: quizKeys.attempts(quizId, userId),
    queryFn: async (): Promise<QuizAttempt[]> => {
      return authenticatedFetchJson<QuizAttempt[]>(
        `/api/quizzes/${quizId}/attempts?userId=${userId}`
      );
    },
    enabled: !!quizId && !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
  });
}

// Mutation hook to record a quiz attempt
export function useRecordQuizAttempt() {
  return useMutation({
    mutationFn: async ({
      quizId,
      score,
      answers,
      timeSpentSeconds,
    }: {
      quizId: string;
      score: number;
      answers: Array<{
        question_id: string;
        selected_option_index: number;
        correct: boolean;
      }>;
      timeSpentSeconds?: number;
    }) => {
      return authenticatedFetchJson<QuizAttempt>(
        `/api/quizzes/${quizId}/attempts`,
        {
          method: 'POST',
          body: JSON.stringify({
            score,
            answers,
            time_spent_seconds: timeSpentSeconds,
          }),
        }
      );
    },
  });
}

