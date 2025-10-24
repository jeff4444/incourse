import ICAL from 'ical.js';

export interface ParsedEvent {
  id: string;
  title: string;
  date: Date;
  endDate: Date;
  courseId: string;
  type: 'course-event';
  description?: string;
  location?: string;
}

export interface ICSFetchResult {
  events: ParsedEvent[];
  error?: string;
}

/**
 * Fetches an ICS file from a URL and returns the raw content
 */
export async function fetchICSFile(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ICS file: ${response.status} ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    throw new Error(`Error fetching ICS file from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parses ICS content and transforms events to match our calendar interface
 */
export function parseICSEvents(icsContent: string, courseId: string): ParsedEvent[] {
  try {
    const jcalData = ICAL.parse(icsContent);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');
    
    const events: ParsedEvent[] = [];
    
    for (const vevent of vevents) {
      try {
        const event = new ICAL.Event(vevent);
        
        // Skip events without start time
        if (!event.startDate) {
          continue;
        }
        
        // Convert ICAL time to JavaScript Date
        const startDate = event.startDate.toJSDate();
        const endDate = event.endDate ? event.endDate.toJSDate() : startDate;
        
        // Skip past events (older than 1 year)
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        if (startDate < oneYearAgo) {
          continue;
        }
        
        // Generate a unique ID for the event
        const eventId = `${courseId}-${event.uid || event.startDate.toString()}`;
        
        const parsedEvent: ParsedEvent = {
          id: eventId,
          title: event.summary || 'Untitled Event',
          date: startDate,
          endDate: endDate,
          courseId: courseId,
          type: 'course-event',
          description: event.description,
          location: event.location,
        };
        
        events.push(parsedEvent);
      } catch (eventError) {
        console.warn(`Error parsing individual event in course ${courseId}:`, eventError);
        // Continue with other events even if one fails
      }
    }
    
    return events;
  } catch (error) {
    console.error(`Error parsing ICS content for course ${courseId}:`, error);
    return [];
  }
}

/**
 * Fetches and parses an ICS file from a URL
 */
export async function fetchAndParseICS(url: string, courseId: string): Promise<ICSFetchResult> {
  try {
    const icsContent = await fetchICSFile(url);
    const events = parseICSEvents(icsContent, courseId);
    
    return {
      events,
    };
  } catch (error) {
    return {
      events: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Fetches and parses multiple ICS files
 */
export async function fetchMultipleICSFiles(
  icsUrls: Array<{ url: string; courseId: string }>
): Promise<{ events: ParsedEvent[]; errors: string[] }> {
  const allEvents: ParsedEvent[] = [];
  const errors: string[] = [];
  
  // Process all ICS files in parallel
  const results = await Promise.allSettled(
    icsUrls.map(({ url, courseId }) => fetchAndParseICS(url, courseId))
  );
  
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const { courseId } = icsUrls[i];
    
    if (result.status === 'fulfilled') {
      const { events, error } = result.value;
      allEvents.push(...events);
      if (error) {
        errors.push(`Course ${courseId}: ${error}`);
      }
    } else {
      errors.push(`Course ${courseId}: ${result.reason}`);
    }
  }
  
  return {
    events: allEvents,
    errors,
  };
}
