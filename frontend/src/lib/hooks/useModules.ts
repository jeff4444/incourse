import { useQuery } from "@tanstack/react-query";
import { Module } from "@/lib/types/course";
import { authenticatedFetchJson } from "@/lib/utils/apiClient";
import { courseKeys } from "./useCourses";

// Hook to fetch modules for a specific course
export function useModules(courseId: string) {
  return useQuery({
    queryKey: courseKeys.modules(courseId),
    queryFn: async (): Promise<Module[]> => {
      return authenticatedFetchJson<Module[]>(`/api/courses/${courseId}/modules`);
    },
    enabled: !!courseId, // Only run query if courseId is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
