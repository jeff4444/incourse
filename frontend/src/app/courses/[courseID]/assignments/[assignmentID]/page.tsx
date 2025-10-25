"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BackButtonClient } from "@/components/back-button-client";
import { Calendar, ExternalLink, FileText, Lock, CheckCircle, Clock } from "lucide-react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { authenticatedFetchJson } from "@/lib/utils/apiClient";
import { Assignment, File } from "@/lib/types/course";

// Utility function to transform Canvas file URLs to our autograder URLs
async function transformCanvasFileUrls(html: string, courseID: string): Promise<string> {
  if (!html) return html;
  
  // Regex to match Canvas file URLs: https://{domain}/courses/{courseId}/files/{fileId}
  const canvasFileUrlRegex = /https:\/\/[^\/]+\/courses\/\d+\/files\/(\d+)/g;
  
  // Find all file IDs in the HTML
  const fileIds = Array.from(html.matchAll(canvasFileUrlRegex)).map(match => match[1]);
  
  // Create a map of lmsId -> databaseId
  const fileIdMap = new Map<string, string>();
  
  // Fetch file data for each lmsId
  for (const lmsId of fileIds) {
    try {
      const response = await authenticatedFetchJson<File>(`/api/courses/${courseID}/files/by-lms-id/${lmsId}`);
      fileIdMap.set(lmsId, response.id || '');
    } catch (error) {
      console.error(`Failed to fetch file data for lmsId ${lmsId}:`, error);
    }
  }
  
  let transformedHtml = html.replace(canvasFileUrlRegex, (match, lmsId) => {
    const databaseId = fileIdMap.get(lmsId);
    if (databaseId) {
      return `/courses/${courseID}/autograder/${databaseId}`;
    }
    // Fallback to original URL if we couldn't find the database ID
    return match;
  });
  
  // Remove target="_blank" from all links to make them open in current tab
  transformedHtml = transformedHtml.replace(/target=\"_blank\"/gi, '');
  
  return transformedHtml;
}

function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ assignmentID: string, courseID: string }>;
}) {
  const searchParams = useSearchParams();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseID, setCourseID] = useState<string>("");
  const [assignmentID, setAssignmentID] = useState<string>("");
  const [transformedDescription, setTransformedDescription] = useState<string>("");

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setCourseID(resolvedParams.courseID);
      setAssignmentID(resolvedParams.assignmentID);
    };
    getParams();
  }, [params]);

  useEffect(() => {
    if (assignment?.description && courseID) {
      transformCanvasFileUrls(assignment.description, courseID)
        .then(setTransformedDescription)
        .catch(error => {
          console.error('Error transforming assignment description:', error);
          setTransformedDescription(assignment.description || "");
        });
    }
  }, [assignment, courseID]);

  useEffect(() => {
    if (!courseID || !assignmentID) return;

    const fetchAssignment = async () => {
      try {
        setLoading(true);
        const assignments = await authenticatedFetchJson<Assignment[]>(
          `/api/courses/${courseID}/assignments`
        );
        
        const foundAssignment = assignments.find(a => a.id === assignmentID);
        if (foundAssignment) {
          setAssignment(foundAssignment);
        } else {
          setError("Assignment not found");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load assignment");
      } finally {
        setLoading(false);
      }
    };

    fetchAssignment();
  }, [courseID, assignmentID]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No due date";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAssignmentStatus = () => {
    if (assignment?.locked_for_user) {
      return { text: "Locked", color: "bg-orange-100 text-orange-800", icon: <Lock className="w-4 h-4" /> };
    }
    const now = new Date();
    const dueDate = assignment?.due_at ? new Date(assignment.due_at) : null;
    
    if (dueDate && dueDate < now) {
      return { text: "Past Due", color: "bg-red-100 text-red-800", icon: <Clock className="w-4 h-4" /> };
    }
    
    return { text: "Open", color: "bg-blue-100 text-blue-800", icon: <CheckCircle className="w-4 h-4" /> };
  };

  const getSubmissionStatus = () => {
    return assignment?.has_submitted_submissions 
      ? { text: "Submitted", color: "bg-green-100 text-green-800", icon: <CheckCircle className="w-4 h-4" /> }
      : { text: "Not Submitted", color: "bg-gray-100 text-gray-800", icon: <Clock className="w-4 h-4" /> };
  };

  const getSubmissionTypeText = () => {
    if (!assignment || assignment.submission_types.length === 0) return "No submission required";
    if (assignment.submission_types.includes('online_upload')) return "File upload";
    if (assignment.submission_types.includes('online_text_entry')) return "Text entry";
    if (assignment.submission_types.includes('online_url')) return "URL submission";
    return assignment.submission_types.join(", ");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-orange-50 to-pink-50">
        <div className="container mx-auto py-6 px-4 md:px-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading assignment...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="min-h-screen bg-linear-to-br from-orange-50 to-pink-50">
        <div className="container mx-auto py-6 px-4 md:px-6">
          <BackButtonClient />
          <div className="text-center text-red-500 mt-8">
            <h2 className="text-xl font-semibold mb-2">Failed to load assignment</h2>
            <p>{error || "The assignment you're looking for could not be found."}</p>
          </div>
        </div>
      </div>
    );
  }

  const assignmentStatus = getAssignmentStatus();
  const submissionStatus = getSubmissionStatus();

  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 to-pink-50">
      <div className="container mx-auto py-6 px-4 md:px-6">
        <BackButtonClient />
        
        <div className="max-w-4xl mx-auto">
          {/* Assignment Header */}
          <div className="mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold tracking-tight mb-2">{assignment.name}</h1>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Due {formatDate(assignment.due_at)}</span>
                  </div>
                  {assignment.points_possible && (
                    <Badge variant="outline">
                      {assignment.points_possible} points
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`${assignmentStatus.color} flex items-center gap-1`}>
                  {assignmentStatus.icon}
                  {assignmentStatus.text}
                </Badge>
                <Badge className={`${submissionStatus.color} flex items-center gap-1`}>
                  {submissionStatus.icon}
                  {submissionStatus.text}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Submission Type</div>
                  <div className="font-medium">{getSubmissionTypeText()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Assignment Status</div>
                  <div className="font-medium">{assignmentStatus.text}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Your Status</div>
                  <div className="font-medium">{submissionStatus.text}</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Assignment Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Assignment Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assignment.description ? (
                <div 
                  className="prose prose-gray max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-ul:text-foreground prose-ol:text-foreground prose-li:text-foreground [&_a]:text-blue-600 [&_a]:underline hover:[&_a]:text-blue-800"
                  dangerouslySetInnerHTML={{ 
                    __html: transformedDescription || assignment.description
                  }}
                />
              ) : (
                <p className="text-muted-foreground italic">No description provided for this assignment.</p>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="mt-6 flex items-center justify-end gap-4">
            <Link href={`/courses/${courseID}${searchParams.get('returnTab') ? `?tab=${searchParams.get('returnTab')}` : ''}`}>
              <Button variant="outline">
                Back to Course
              </Button>
            </Link>
            <Link href={assignment.html_url} target="_blank">
              <Button>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in Canvas
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WrappedAssignmentDetailPage({
  params,
}: {
  params: Promise<{ assignmentID: string, courseID: string }>;
}) {
  return (
    <ProtectedRoute>
      <AssignmentDetailPage params={params} />
    </ProtectedRoute>
  );
}
