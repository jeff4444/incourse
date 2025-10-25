import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { authenticatedFetchJson } from '@/lib/utils/apiClient';

export interface Nudge {
  id: string;
  nudge_text: string;
  action: string;
  label: string;
  priority: 'high' | 'medium' | 'low';
  status: 'active' | 'completed' | 'dismissed' | 'expired';
  course_id?: string;
  created_at: string;
  completed_at?: string;
  dismissed_at?: string;
  courses?: {
    id: string;
    name: string;
    code: string;
  };
}

interface NudgeGenerationResponse {
  success: boolean;
  message: string;
}

/**
 * Hook to fetch and manage nudges with 5-hour check and async generation
 */
export function useNudges() {
  const queryClient = useQueryClient();
  
  // Fetch active nudges
  const nudgesQuery = useQuery<Nudge[]>({
    queryKey: ['nudges'],
    queryFn: async () => {
      const data = await authenticatedFetchJson<Nudge[]>('/api/nudges');
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });

  console.log(nudgesQuery.data);

  // Check if nudges need regeneration (5+ hours old)
  const checkGenerationQuery = useQuery({
    queryKey: ['nudges', 'last-generation'],
    queryFn: async () => {
      const data = await authenticatedFetchJson<{ last_generation: string | null }>('/api/nudges/last-generation');
      return data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Trigger async nudge generation
  const generateNudgesMutation = useMutation({
    mutationFn: async () => {
      const data = await authenticatedFetchJson<NudgeGenerationResponse>('/api/nudges/generate', {
        method: 'POST',
      });
      return data;
    },
    onSuccess: () => {
      // Refetch nudges after generation
      queryClient.invalidateQueries({ queryKey: ['nudges'] });
    },
  });

  // Complete a nudge
  const completeNudgeMutation = useMutation({
    mutationFn: async (nudgeId: string) => {
      const data = await authenticatedFetchJson(`/api/nudges/${nudgeId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' }),
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nudges'] });
    },
  });

  // Dismiss a nudge
  const dismissNudgeMutation = useMutation({
    mutationFn: async (nudgeId: string) => {
      const data = await authenticatedFetchJson(`/api/nudges/${nudgeId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'dismissed' }),
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nudges'] });
    },
  });

  // Check if nudges need regeneration on mount
  useEffect(() => {
    // Only check if not already generating and not loading
    if (generateNudgesMutation.isPending || checkGenerationQuery.isLoading) {
      return;
    }
    
    if (checkGenerationQuery.data?.last_generation) {
      const lastGeneration = new Date(checkGenerationQuery.data.last_generation);
      const now = new Date();
      const hoursSinceGeneration = (now.getTime() - lastGeneration.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceGeneration >= 5) {
        // Trigger async generation
        generateNudgesMutation.mutate();
      }
    } else if (checkGenerationQuery.data?.last_generation === null) {
      // No nudges exist, generate them
      generateNudgesMutation.mutate();
    }
  }, [checkGenerationQuery.data, generateNudgesMutation.isPending, checkGenerationQuery.isLoading]);

  const completeNudge = (nudgeId: string) => {
    completeNudgeMutation.mutate(nudgeId);
  };

  const dismissNudge = (nudgeId: string) => {
    dismissNudgeMutation.mutate(nudgeId);
  };

  const refetchNudges = () => {
    queryClient.invalidateQueries({ queryKey: ['nudges'] });
  };

  return {
    nudges: nudgesQuery.data || [],
    isLoading: nudgesQuery.isLoading,
    isGenerating: generateNudgesMutation.isPending,
    error: nudgesQuery.error,
    completeNudge,
    dismissNudge,
    refetchNudges,
  };
}
