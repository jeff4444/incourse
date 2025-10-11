import { useQuery } from "@tanstack/react-query";
import { Course } from "@/lib/types/course";
import { authenticatedFetchJson } from "@/lib/utils/apiClient";

// Query keys for consistent cache management
export const courseKeys = {
  all: ['courses'] as const,
  lists: () => [...courseKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...courseKeys.lists(), { filters }] as const,
  details: () => [...courseKeys.all, 'detail'] as const,
  detail: (id: string) => [...courseKeys.details(), id] as const,
  modules: (id: string) => [...courseKeys.detail(id), 'modules'] as const,
  pages: (courseId: string, pageUrl: string) => [...courseKeys.detail(courseId), 'pages', pageUrl] as const,
};

// Hook to fetch all courses
export function useCourses() {
  return useQuery({
    queryKey: courseKeys.lists(),
    queryFn: async (): Promise<Course[]> => {
      return authenticatedFetchJson<Course[]>("/api/courses");
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook to fetch a single course by ID
export function useCourse(courseId: string) {
  return useQuery({
    queryKey: courseKeys.detail(courseId),
    queryFn: async (): Promise<Course> => {
      return authenticatedFetchJson<Course>(`/api/courses/${courseId}`);
    },
    enabled: !!courseId, // Only run query if courseId is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
