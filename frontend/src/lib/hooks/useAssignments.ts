import { useQuery } from "@tanstack/react-query";
import { Assignment } from "@/lib/types/course";
import { authenticatedFetchJson } from "@/lib/utils/apiClient";

export function useAssignments(courseId: string) {
  return useQuery<Assignment[], Error>({
    queryKey: ["assignments", courseId],
    queryFn: async () => {
      const response = await authenticatedFetchJson<Assignment[]>(
        `/api/courses/${courseId}/assignments`
      );
      return response;
    },
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
