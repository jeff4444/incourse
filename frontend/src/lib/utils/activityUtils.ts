import { BookOpen, Brain, FileText, Layers } from "lucide-react";

export type ActivityType = 
  | 'quiz_completion' 
  | 'quiz_generation' 
  | 'flashcard_generation' 
  | 'flashcard_study' 
  | 'reading';

export type Feedback = 'good' | 'neutral' | 'bad';

interface QuizMetrics {
  score: number;
}

interface FlashcardMetrics {
  reviewedCount: number;
  totalCards: number;
}

interface ReadingMetrics {
  timeSpentSeconds: number;
}

/**
 * Calculate feedback based on activity type and metrics
 */
export function calculateFeedback(
  activityType: ActivityType,
  metrics: QuizMetrics | FlashcardMetrics | ReadingMetrics
): Feedback {
  switch (activityType) {
    case 'quiz_completion': {
      const { score } = metrics as QuizMetrics;
      if (score < 40) return 'bad';
      if (score < 80) return 'neutral';
      return 'good';
    }
    
    case 'flashcard_study': {
      const { reviewedCount, totalCards } = metrics as FlashcardMetrics;
      const percentage = (reviewedCount / totalCards) * 100;
      if (percentage < 40) return 'bad';
      if (percentage < 80) return 'neutral';
      return 'good';
    }
    
    case 'reading': {
      const { timeSpentSeconds } = metrics as ReadingMetrics;
      const minutes = timeSpentSeconds / 60;
      if (minutes < 5) return 'bad';
      if (minutes < 20) return 'neutral';
      return 'good';
    }
    
    case 'quiz_generation':
    case 'flashcard_generation':
      return 'neutral';
    
    default:
      return 'neutral';
  }
}

/**
 * Format time in a human-readable way
 */
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return '< 1min';
  if (minutes === 1) return '1min';
  return `${minutes}mins`;
}

/**
 * Generate activity summary based on type and data
 */
export function formatActivitySummary(
  activityType: ActivityType,
  data: {
    quizName?: string;
    score?: number;
    deckName?: string;
    reviewedCount?: number;
    totalCards?: number;
    fileName?: string;
    timeSpentSeconds?: number;
    cardCount?: number;
    difficulty?: string;
  }
): string {
  switch (activityType) {
    case 'quiz_completion':
      return `Completed ${data.quizName} (${data.score}%)`;
    
    case 'quiz_generation':
      return `Generated ${data.difficulty ? data.difficulty.charAt(0).toUpperCase() + data.difficulty.slice(1) : ''} Quiz: ${data.quizName}`;
    
    case 'flashcard_generation':
      return `Generated ${data.cardCount} flashcards for ${data.deckName}`;
    
    case 'flashcard_study':
      return `Studied ${data.reviewedCount}/${data.totalCards} of ${data.deckName} flashcards`;
    
    case 'reading':
      return `Studied ${data.fileName} for ${formatTime(data.timeSpentSeconds || 0)}`;
    
    default:
      return 'Activity';
  }
}

/**
 * Get icon component for activity type
 */
export function getActivityIcon(activityType: ActivityType) {
  switch (activityType) {
    case 'quiz_completion':
    case 'quiz_generation':
      return Layers;
    
    case 'flashcard_generation':
    case 'flashcard_study':
      return Brain;
    
    case 'reading':
      return BookOpen;
    
    default:
      return FileText;
  }
}

/**
 * Get color classes based on feedback
 */
export function getActivityColor(feedback: Feedback): {
  bg: string;
  text: string;
  border?: string;
} {
  switch (feedback) {
    case 'good':
      return {
        bg: 'bg-green-100',
        text: 'text-green-600',
        border: 'border-green-200'
      };
    
    case 'neutral':
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-600',
        border: 'border-blue-200'
      };
    
    case 'bad':
      return {
        bg: 'bg-orange-100',
        text: 'text-orange-600',
        border: 'border-orange-200'
      };
    
    default:
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-600',
        border: 'border-gray-200'
      };
  }
}

/**
 * Map activity type to display category
 */
export function getActivityCategory(activityType: ActivityType): string {
  switch (activityType) {
    case 'quiz_completion':
    case 'quiz_generation':
      return 'quiz';
    
    case 'flashcard_generation':
    case 'flashcard_study':
      return 'flashcard';
    
    case 'reading':
      return 'reading';
    
    default:
      return 'other';
  }
}

