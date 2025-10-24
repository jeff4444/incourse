import { useQuery } from "@tanstack/react-query";
import { Page } from "@/lib/types/course";
import { authenticatedFetchJson } from "@/lib/utils/apiClient";
import { courseKeys } from "./useCourses";

// Hook to fetch a specific page for a course
export function usePage(courseId: string, pageId: string) {
  return useQuery({
    queryKey: courseKeys.pages(courseId, pageId),
    queryFn: async (): Promise<Page> => {
      return authenticatedFetchJson<Page>(`/api/courses/${courseId}/pages/${pageId}`);
    },
    enabled: !!courseId && !!pageId, // Only run query if both parameters are provided
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
