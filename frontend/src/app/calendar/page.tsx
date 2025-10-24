"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { CalendarHeader } from "@/components/calendar-header";
import { CalendarMonth } from "@/components/calendar-month";
import { CalendarWeek } from "@/components/calendar-week";
import { CalendarDay } from "@/components/calendar-day";
import { CalendarEvent } from "@/components/calendar-event";
import { CalendarSidebar } from "@/components/calendar-sidebar";
import { EventPopup } from "@/components/event-popup";
import { CalendarSkeleton } from "@/components/calendar-skeleton";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Course } from "@/lib/types/course";
import { getCourseColor } from "@/lib/utils/courseColors";
import { authenticatedFetchJson } from "@/lib/utils/apiClient";

interface CalendarEvent {
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

const CalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [showSidebar, setShowSidebar] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Fetch courses and events data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch courses
        const coursesData: Course[] = await authenticatedFetchJson<Course[]>('/api/courses');
        setCourses(coursesData);

        // Fetch events
        const eventsData = await authenticatedFetchJson<{ events: any[]; errors?: string[] }>('/api/calendar/events');
        
        // Transform events to include proper Date objects
        const transformedEvents: CalendarEvent[] = eventsData.events.map((event: any) => ({
          ...event,
          date: new Date(event.date),
          endDate: new Date(event.endDate),
        }));
        
        setEvents(transformedEvents);
      } catch (err) {
        console.error('Error fetching calendar data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load calendar data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    if (view === "month") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (view === "week") {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (view === "month") {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (view === "week") {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const getCourseColorForEvent = (courseId: string) => {
    return getCourseColor(courseId);
  };

  const handleEventClick = (event: CalendarEvent, clickEvent: React.MouseEvent) => {
    const rect = clickEvent.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top;
    
    setSelectedEvent(event);
    setPopupPosition({ x, y });
  };

  const handleClosePopup = () => {
    setSelectedEvent(null);
  };

  if (loading) {
    return <CalendarSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50">
        <Navbar />
        <main className="container mx-auto py-6 px-4 md:px-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-red-600 mb-2">Error Loading Calendar</h2>
              <p className="text-muted-foreground">{error}</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50">
      <Navbar />

      <main className="container mx-auto py-6 px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Calendar
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your schedule and study sessions
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSidebar(!showSidebar)}
              className="hover:bg-accent transition-colors"
            >
              {showSidebar ? "Hide Sidebar" : "Show Sidebar"}
            </Button>
            <Button
              size="sm"
              className="shadow-sm hover:shadow-md transition-shadow"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Event
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Calendar */}
          <div className="flex-1">
            <Card className="mb-8 shadow-md border-border/50">
              <CardHeader className="pb-4">
                <CalendarHeader
                  currentDate={currentDate}
                  view={view}
                  onViewChange={setView}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                  onToday={handleToday}
                />
              </CardHeader>
              <CardContent className="p-0">
                {view === "month" && (
                  <CalendarMonth
                    currentDate={currentDate}
                    events={events}
                    getCourseColor={getCourseColorForEvent}
                    onEventClick={handleEventClick}
                  />
                )}
                {view === "week" && (
                  <CalendarWeek
                    currentDate={currentDate}
                    events={events}
                    getCourseColor={getCourseColorForEvent}
                    onEventClick={handleEventClick}
                  />
                )}
                {view === "day" && (
                  <CalendarDay
                    currentDate={currentDate}
                    events={events}
                    getCourseColor={getCourseColorForEvent}
                    onEventClick={handleEventClick}
                  />
                )}
              </CardContent>
            </Card>

          </div>

          {/* Sidebar */}
          {showSidebar && (
            <div className="w-full lg:w-80">
              <CalendarSidebar events={events} />
            </div>
          )}
        </div>
      </main>

      {/* Event Popup */}
      {selectedEvent && (
        <EventPopup
          event={selectedEvent}
          getCourseColor={getCourseColorForEvent}
          position={popupPosition}
          onClose={handleClosePopup}
        />
      )}
    </div>
  );
};

export default function WrappedCalendarPage() {
  return (
    <ProtectedRoute>
      <CalendarPage />
    </ProtectedRoute>
  );
}
