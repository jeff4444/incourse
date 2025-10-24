"use client";

import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  FileText,
  Layers,
  Sparkles,
  Users,
  Clock,
  Calendar,
  MapPin,
  ExternalLink,
  Edit,
  Trash2,
  Copy,
} from "lucide-react";

interface EventPopupProps {
  event: {
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
  };
  getCourseColor: (courseId: string) => string;
  position: { x: number; y: number };
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function EventPopup({
  event,
  getCourseColor,
  position,
  onClose,
  onEdit,
  onDelete,
}: EventPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const getEventIcon = () => {
    switch (event.type) {
      case "lecture":
        return <BookOpen className="h-4 w-4" />;
      case "quiz":
        return <Layers className="h-4 w-4" />;
      case "assignment":
        return <FileText className="h-4 w-4" />;
      case "ai-suggestion":
        return <Sparkles className="h-4 w-4" />;
      case "study":
        return <Users className="h-4 w-4" />;
      case "reading":
        return <BookOpen className="h-4 w-4" />;
      case "course-event":
        return <Calendar className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getEventTypeName = () => {
    switch (event.type) {
      case "lecture":
        return "Lecture";
      case "quiz":
        return "Quiz";
      case "assignment":
        return "Assignment";
      case "study":
        return "Study Session";
      case "ai-suggestion":
        return "AI Suggestion";
      case "reading":
        return "Reading";
      case "course-event":
        return "Course Event";
      default:
        return "Event";
    }
  };

  const formatDuration = () => {
    const duration = event.endDate.getTime() - event.date.getTime();
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return "Quick";
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div
      ref={popupRef}
      className="fixed z-50 shadow-2xl min-w-80 max-w-96 overflow-visible"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translate(-50%, -100%)",
      }}
    >
      {/* Main popup body */}
      <div className="bg-black/80 backdrop-blur-sm border border-white/20 rounded-xl">

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div
            className={`rounded-full p-2.5 ${getCourseColor(
              event.courseId
            )} text-white shadow-sm`}
          >
            {getEventIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white text-lg leading-tight mb-1">
              {event.title}
            </h3>
            <div className="flex items-center gap-2 mb-2">
              <Badge
                variant="secondary"
                className="bg-white/20 text-white border-white/30"
              >
                {getEventTypeName()}
              </Badge>
              <span className="text-xs text-white/70 bg-white/10 px-2 py-1 rounded-full">
                {formatDuration()}
              </span>
            </div>
            {event.courseName && (
              <p className="text-sm text-white/80">
                {event.courseCode && `${event.courseCode}: `}
                {event.courseName}
              </p>
            )}
          </div>
        </div>

        {/* Event Details */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-3 text-sm text-white/90">
            <Calendar className="h-4 w-4 text-white/70" />
            <div>
              <p className="font-medium">{formatDate(event.date)}</p>
              <p className="text-white/70">
                {formatTime(event.date)} - {formatTime(event.endDate)}
              </p>
            </div>
          </div>

          {event.location && (
            <div className="flex items-center gap-3 text-sm text-white/90">
              <MapPin className="h-4 w-4 text-white/70" />
              <span>{event.location}</span>
            </div>
          )}

          {event.description && (
            <div className="bg-white/10 rounded-lg p-3 border border-white/20">
              <div className="flex items-start gap-2">
                <div className="w-1 h-1 bg-white/60 rounded-full mt-2 shrink-0"></div>
                <div className="text-sm text-white/90 leading-relaxed">
                  {event.description}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="border-t border-white/20 pt-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 h-8 px-3"
              onClick={() => {
                navigator.clipboard.writeText(
                  `${event.title} - ${formatDate(event.date)} ${formatTime(event.date)}`
                );
              }}
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </Button>
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 h-8 px-3"
                onClick={onEdit}
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 h-8 px-3"
                onClick={onDelete}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 h-8 px-3 ml-auto"
              onClick={() => {
                // Open in external calendar app
                const startDate = event.date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                const endDate = event.endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startDate}/${endDate}`;
                window.open(calendarUrl, '_blank');
              }}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Open
            </Button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
