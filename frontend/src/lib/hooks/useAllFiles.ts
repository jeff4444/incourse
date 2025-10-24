import { useQuery } from "@tanstack/react-query";
import { File } from "@/lib/types/course";
import { authenticatedFetchJson } from "@/lib/utils/apiClient";

export function useAllFiles(courseID: string, no_module: boolean = false) {
  return useQuery({
    queryKey: ["allFiles", courseID, no_module],
    queryFn: async (): Promise<File[]> => {
      if (!courseID) return [];
      return authenticatedFetchJson<File[]>(`/api/courses/${courseID}/files/all?no_module=${no_module}`);
    },
    enabled: !!courseID,
  });
}
