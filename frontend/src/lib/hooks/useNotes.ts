import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Note, NoteFolder } from "@/lib/types/course";
import { authenticatedFetchJson } from "@/lib/utils/apiClient";

// Query hooks for fetching data
export function useNoteFolders(courseId: string, userId: string) {
  return useQuery<NoteFolder[], Error>({
    queryKey: ["noteFolders", courseId, userId],
    queryFn: async () => {
      const response = await authenticatedFetchJson<NoteFolder[]>(
        `/api/courses/${courseId}/notes/folders`
      );
      return response;
    },
    enabled: !!courseId && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useNotes(courseId: string, userId: string) {
  return useQuery<Note[], Error>({
    queryKey: ["notes", courseId, userId],
    queryFn: async () => {
      const response = await authenticatedFetchJson<Note[]>(
        `/api/courses/${courseId}/notes`
      );
      return response;
    },
    enabled: !!courseId && !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes (shorter for notes due to auto-save)
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useNote(noteId: string, courseId?: string) {
  return useQuery<Note, Error>({
    queryKey: ["note", noteId],
    queryFn: async () => {
      if (!courseId) {
        throw new Error("Course ID is required to fetch note");
      }
      const response = await authenticatedFetchJson<Note>(
        `/api/courses/${courseId}/notes/${noteId}`
      );
      return response;
    },
    enabled: !!noteId && !!courseId,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Mutation hooks for creating, updating, and deleting
export function useCreateFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ courseId, name }: { courseId: string; name: string }) => {
      const response = await authenticatedFetchJson<NoteFolder>(
        `/api/courses/${courseId}/notes/folders`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name }),
        }
      );
      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch folders
      queryClient.invalidateQueries({
        queryKey: ["noteFolders", variables.courseId],
      });
    },
  });
}

export function useUpdateFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      courseId, 
      folderId, 
      updates 
    }: { 
      courseId: string; 
      folderId: string; 
      updates: Partial<Pick<NoteFolder, 'name' | 'position'>> 
    }) => {
      const response = await authenticatedFetchJson<NoteFolder>(
        `/api/courses/${courseId}/notes/folders/${folderId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        }
      );
      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch folders
      queryClient.invalidateQueries({
        queryKey: ["noteFolders", variables.courseId],
      });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ courseId, folderId }: { courseId: string; folderId: string }) => {
      await authenticatedFetchJson(
        `/api/courses/${courseId}/notes/folders/${folderId}`,
        {
          method: "DELETE",
        }
      );
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch folders and notes
      queryClient.invalidateQueries({
        queryKey: ["noteFolders", variables.courseId],
      });
      queryClient.invalidateQueries({
        queryKey: ["notes", variables.courseId],
      });
    },
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      courseId, 
      title, 
      folderId 
    }: { 
      courseId: string; 
      title: string; 
      folderId?: string 
    }) => {
      const response = await authenticatedFetchJson<Note>(
        `/api/courses/${courseId}/notes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            title, 
            folder_id: folderId || null,
            content: { type: 'doc', content: [] } // Empty Tiptap document
          }),
        }
      );
      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch notes
      queryClient.invalidateQueries({
        queryKey: ["notes", variables.courseId],
      });
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      courseId, 
      noteId, 
      updates 
    }: { 
      courseId: string; 
      noteId: string; 
      updates: Partial<Pick<Note, 'title' | 'content' | 'folder_id' | 'position'>> 
    }) => {
      const response = await authenticatedFetchJson<Note>(
        `/api/courses/${courseId}/notes/${noteId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        }
      );
      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch notes and the specific note
      queryClient.invalidateQueries({
        queryKey: ["notes", variables.courseId],
      });
      queryClient.invalidateQueries({
        queryKey: ["note", variables.noteId],
      });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ courseId, noteId }: { courseId: string; noteId: string }) => {
      await authenticatedFetchJson(
        `/api/courses/${courseId}/notes/${noteId}`,
        {
          method: "DELETE",
        }
      );
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch notes
      queryClient.invalidateQueries({
        queryKey: ["notes", variables.courseId],
      });
      queryClient.invalidateQueries({
        queryKey: ["note", variables.noteId],
      });
    },
  });
}
