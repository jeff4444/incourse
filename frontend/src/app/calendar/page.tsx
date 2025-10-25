"use client";

import { useState } from "react";
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
import { CalendarEvent as CalendarEventComponent } from "@/components/calendar-event";
import { CalendarSidebar } from "@/components/calendar-sidebar";
import { EventPopup } from "@/components/event-popup";
import { CalendarGridSkeleton } from "@/components/calendar-grid-skeleton";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { getCourseColor } from "@/lib/utils/courseColors";
import { useCalendarEvents, CalendarEvent } from "@/lib/hooks/useCalendar";
import { useCourses } from "@/lib/hooks/useCourses";

const CalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Fetch courses and events data using TanStack Query hooks
  const { data: courses = [], isLoading: coursesLoading, error: coursesError } = useCourses();
  const { data: events = [], isLoading: eventsLoading, error: eventsError } = useCalendarEvents();
  
  const loading = coursesLoading || eventsLoading;
  const error = coursesError || eventsError;

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

  // Remove the early return for loading - we'll render the full structure with conditional skeletons

  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-orange-50 to-pink-50">
        <Navbar />
        <main className="container mx-auto py-6 px-4 md:px-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-red-600 mb-2">Error Loading Calendar</h2>
              <p className="text-muted-foreground">{error instanceof Error ? error.message : 'Failed to load calendar data'}</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 to-pink-50">
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
            <Card className="shadow-md border-border/50">
              <CardHeader>
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
                {loading ? (
                  <CalendarGridSkeleton view={view} />
                ) : (
                  <>
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
                  </>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Sidebar */}
          {showSidebar && (
            <div className="w-full lg:w-80">
              <CalendarSidebar events={events} loading={loading} />
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
