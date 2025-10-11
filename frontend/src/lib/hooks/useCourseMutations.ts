import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Course } from "@/lib/types/course";
import { authenticatedFetchJson } from "@/lib/utils/apiClient";
import { courseKeys } from "./useCourses";

// Hook for updating course data and invalidating cache
export function useUpdateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ courseId, data }: { courseId: string; data: Partial<Course> }) => {
      return authenticatedFetchJson<Course>(`/api/courses/${courseId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (updatedCourse, { courseId }) => {
      // Update the specific course in cache
      queryClient.setQueryData(courseKeys.detail(courseId), updatedCourse);
      
      // Invalidate and refetch the courses list to ensure consistency
      queryClient.invalidateQueries({ queryKey: courseKeys.lists() });
    },
  });
}

// Hook for deleting a course and invalidating cache
export function useDeleteCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseId: string) => {
      return authenticatedFetchJson(`/api/courses/${courseId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: (_, courseId) => {
      // Remove the course from cache
      queryClient.removeQueries({ queryKey: courseKeys.detail(courseId) });
      
      // Invalidate the courses list
      queryClient.invalidateQueries({ queryKey: courseKeys.lists() });
    },
  });
}
