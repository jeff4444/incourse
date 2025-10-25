/**
 * Generates consistent colors for courses based on their ID
 * Uses a simple hash function to ensure the same course always gets the same color
 */

// Predefined color palette for courses
const COURSE_COLORS = [
  'bg-blue-500',
  'bg-green-500', 
  'bg-purple-500',
  'bg-red-500',
  'bg-yellow-500',
  'bg-indigo-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-orange-500',
  'bg-cyan-500',
  'bg-lime-500',
  'bg-rose-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-sky-500',
];

/**
 * Simple hash function to convert string to number
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Generates a consistent color for a course based on its ID
 */
export function getCourseColor(courseId: string): string {
  const hash = hashString(courseId);
  const colorIndex = hash % COURSE_COLORS.length;
  return COURSE_COLORS[colorIndex];
}

/**
 * Generates colors for multiple courses
 */
export function getCourseColors(courseIds: string[]): Record<string, string> {
  const colors: Record<string, string> = {};
  
  for (const courseId of courseIds) {
    colors[courseId] = getCourseColor(courseId);
  }
  
  return colors;
}
