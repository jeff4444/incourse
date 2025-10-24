"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  AlertTriangle,
} from "lucide-react";

interface CalendarSidebarProps {
  events: Array<{
    id: string;
    title: string;
    date: Date;
    endDate: Date;
    courseId: string;
    type: string;
    courseName?: string;
    courseCode?: string;
  }>;
}

export function CalendarSidebar({ events }: CalendarSidebarProps) {

  // Get upcoming events (next 3 events from today onwards)
  const now = new Date();
  const upcomingEvents = events
    .filter(event => event.date >= now)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 3);

  // Get today's events
  const today = new Date();
  const todayEvents = events.filter(event => 
    event.date.getDate() === today.getDate() &&
    event.date.getMonth() === today.getMonth() &&
    event.date.getFullYear() === today.getFullYear()
  ).sort((a, b) => a.date.getTime() - b.date.getTime());




  const formatTimeUntil = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    return `${days} days`;
  };

  return (
    <div className="space-y-6">

      {/* Upcoming Deadlines */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Upcoming Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcomingEvents.length > 0 ? (
            upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="p-3 rounded-lg border border-border/50 hover:bg-accent/30 transition-colors"
              >
                <div className="flex justify-between items-start mb-2 gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm wrap-break-words leading-tight">
                      {event.title}
                    </p>
                    <p className="text-xs text-muted-foreground wrap-break-words">
                      {event.courseCode || event.courseName || 'Course Event'}
                    </p>
                  </div>
                  <Badge
                    className="text-xs bg-blue-100 text-blue-700 border-blue-200 shrink-0"
                  >
                    {formatTimeUntil(event.date)}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground wrap-break-words">
                  {event.date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No upcoming events
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Events */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Today&apos;s Events
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {todayEvents.length > 0 ? (
            todayEvents.map((event) => (
              <div
                key={event.id}
                className="p-3 rounded-lg border border-border/50 hover:bg-accent/30 transition-colors"
              >
                <div className="flex justify-between items-start mb-1 gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm wrap-break-words leading-tight">
                      {event.title}
                    </p>
                    <p className="text-xs text-muted-foreground wrap-break-words">
                      {event.courseCode || event.courseName || 'Course Event'}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {event.type.replace('-', ' ')}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground wrap-break-words">
                  {event.date.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                  {event.endDate && event.endDate.getTime() !== event.date.getTime() && (
                    <> - {event.endDate.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}</>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No events scheduled for today
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
