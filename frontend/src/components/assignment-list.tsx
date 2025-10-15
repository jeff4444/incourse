"use client";

import { Assignment } from "@/lib/types/course";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronRight, Clock, Lock, CheckCircle, FileText } from "lucide-react";
import { useState } from "react";
import { AssignmentTile } from "@/components/assignment-tile";
import { cn } from "@/lib/utils";

interface AssignmentListProps {
  assignments: Assignment[];
  courseID: string;
}

interface CategorizedAssignments {
  past: Assignment[];
  upcoming: Assignment[];
  locked: Assignment[];
}

export function AssignmentList({ assignments, courseID }: AssignmentListProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["upcoming"])); // Default to upcoming expanded

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  // Categorize assignments
  const categorized: CategorizedAssignments = {
    past: [],
    upcoming: [],
    locked: []
  };

  const now = new Date();

  assignments.forEach(assignment => {
    if (assignment.locked_for_user) {
      categorized.locked.push(assignment);
    } else {
      const dueDate = assignment.due_at ? new Date(assignment.due_at) : null;
      if (dueDate && dueDate < now) {
        categorized.past.push(assignment);
      } else {
        categorized.upcoming.push(assignment);
      }
    }
  });

  // Sort assignments within each category by due date
  const sortByDueDate = (a: Assignment, b: Assignment) => {
    const aDate = a.due_at ? new Date(a.due_at) : new Date(0);
    const bDate = b.due_at ? new Date(b.due_at) : new Date(0);
    return aDate.getTime() - bDate.getTime();
  };

  categorized.past.sort(sortByDueDate);
  categorized.upcoming.sort(sortByDueDate);
  categorized.locked.sort(sortByDueDate);

  const sections = [
    {
      id: "upcoming",
      title: "Upcoming Assignments",
      count: categorized.upcoming.length,
      assignments: categorized.upcoming
    },
    {
      id: "past",
      title: "Past Assignments", 
      count: categorized.past.length,
      assignments: categorized.past
    },
    {
      id: "locked",
      title: "Locked Assignments",
      count: categorized.locked.length,
      assignments: categorized.locked
    }
  ];

  if (assignments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No assignments found for this course.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <Card key={section.id} className="overflow-hidden p-0">
          <CardContent className="p-0">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                {expandedSections.has(section.id) ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-500" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform duration-500" />
                )}
                <div className="text-left">
                  <h3 className="font-medium">{section.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {section.count} assignment{section.count !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </button>
            
            <div
              className={cn(
                "border-t overflow-hidden transition-all duration-500 ease-in-out",
                expandedSections.has(section.id) 
                  ? "max-h-[500px] opacity-100" 
                  : "max-h-0 opacity-0"
              )}
            >
              <div className="p-4 space-y-4 max-h-[460px] overflow-y-auto">
                {section.assignments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No {section.id} assignments</p>
                  </div>
                ) : (
                  section.assignments.map((assignment) => (
                    <AssignmentTile
                      key={assignment.id}
                      assignment={assignment}
                      courseID={courseID}
                    />
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
