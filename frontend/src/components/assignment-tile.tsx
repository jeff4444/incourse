"use client";

import { Assignment } from "@/lib/types/course";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, FileText, Lock, CheckCircle } from "lucide-react";
import Link from "next/link";

// Utility function to transform Canvas file URLs to our file viewing URLs
function transformCanvasFileUrls(html: string, courseID: string): string {
  if (!html) return html;
  
  // Regex to match Canvas file URLs: https://{domain}/courses/{courseId}/files/{fileId}
  const canvasFileUrlRegex = /https:\/\/[^\/]+\/courses\/\d+\/files\/(\d+)/g;
  
  return html.replace(canvasFileUrlRegex, (match, fileId) => {
    return `/courses/${courseID}/autograder/${fileId}`;
  });
}

function getStatusText() {
  return "Assignment";
}

function getButtonText(assignment: Assignment) {
  if (assignment.locked_for_user) {
    return "View Assignment";
  }
  if (assignment.has_submitted_submissions) {
    return "View Assignment";
  }
  return "View Assignment";
}

interface AssignmentTileProps {
  assignment: Assignment;
  courseID: string;
}

export function AssignmentTile({ assignment, courseID }: AssignmentTileProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No due date";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getAssignmentStatus = () => {
    if (assignment.locked_for_user) {
      return { text: "Locked", color: "text-orange-600" };
    }
    const now = new Date();
    const dueDate = assignment.due_at ? new Date(assignment.due_at) : null;
    
    if (dueDate && dueDate < now) {
      return { text: "Past Due", color: "text-red-600" };
    }
    
    return { text: "Open", color: "text-blue-600" };
  };

  const getSubmissionStatus = () => {
    return assignment.has_submitted_submissions 
      ? { text: "Submitted", color: "text-green-600" }
      : { text: "Not Submitted", color: "text-gray-600" };
  };

  const assignmentStatus = getAssignmentStatus();
  const submissionStatus = getSubmissionStatus();
  const pointsText = assignment.points_possible ? ` • ${assignment.points_possible} points` : "";

  return (
    <div
      className="flex flex-row gap-2 justify-between p-4 rounded-lg border hover:bg-accent transition-colors"
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center ">
          <div className="flex items-center gap-4">
            <div className="rounded-full p-2 bg-blue-100 text-blue-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">{assignment.name}</p>
              <p className="text-sm text-muted-foreground">
                {getStatusText()} • Due {formatDate(assignment.due_at)}{pointsText} • <span className={assignmentStatus.color}>{assignmentStatus.text}</span> • <span className={submissionStatus.color}>{submissionStatus.text}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 justify-end">
        <Link href={`/courses/${courseID}/assignments/${assignment.id}?returnTab=assignments`}>
          <Button size="sm">
            {getButtonText(assignment)}
          </Button>
        </Link>
      </div>
    </div>
  );
}
