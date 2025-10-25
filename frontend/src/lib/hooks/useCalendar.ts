import { useQuery } from "@tanstack/react-query";
import { authenticatedFetchJson } from "@/lib/utils/apiClient";

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  endDate: Date;
  courseId: string;
  type: string;
  courseName?: string;
  courseCode?: string;
  description?: string;
  location?: string;
}

interface CalendarEventsResponse {
  events: any[];
  errors?: string[];
}

// Query keys for consistent cache management
export const calendarKeys = {
  all: ['calendar'] as const,
  events: () => [...calendarKeys.all, 'events'] as const,
};

/**
 * Hook to fetch calendar events with caching
 */
export function useCalendarEvents() {
  return useQuery({
    queryKey: calendarKeys.events(),
    queryFn: async (): Promise<CalendarEvent[]> => {
      const data = await authenticatedFetchJson<CalendarEventsResponse>('/api/calendar/events');
      
      // Transform events to include proper Date objects
      const transformedEvents: CalendarEvent[] = data.events.map((event: any) => ({
        ...event,
        date: new Date(event.date),
        endDate: new Date(event.endDate),
      }));
      
      return transformedEvents;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
  });
}
