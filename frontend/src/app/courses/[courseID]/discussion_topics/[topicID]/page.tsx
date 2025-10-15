"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DiscussionTopic } from "@/lib/types/course";
import { BackButtonClient } from "@/components/back-button-client";
import { authenticatedFetchJson } from "@/lib/utils/apiClient";
import { ExternalLink, MessageSquare, Calendar, Users, Bell, Eye } from "lucide-react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

// Utility function to transform Canvas file URLs to our file viewing URLs
function transformCanvasFileUrls(html: string, courseID: string): string {
  // Regex to match Canvas file URLs: https://{domain}/courses/{courseId}/files/{fileId}
  const canvasFileUrlRegex = /https:\/\/[^\/]+\/courses\/\d+\/files\/(\d+)/g;
  
  return html.replace(canvasFileUrlRegex, (match, fileId) => {
    return `/courses/${courseID}/files/${fileId}`;
  });
}

function DiscussionTopicPage({
  params,
}: {
  params: Promise<{ topicID: string, courseID: string }>;
}) {
  const [topicID, setTopicID] = useState<string>("");
  const [courseID, setCourseID] = useState<string>("");
  const [discussionTopic, setDiscussionTopic] = useState<DiscussionTopic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setTopicID(resolvedParams.topicID);
      setCourseID(resolvedParams.courseID);
    };
    getParams();
  }, [params]);

  useEffect(() => {
    if (!topicID || !courseID) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await authenticatedFetchJson<DiscussionTopic>(`/api/courses/${courseID}/discussion_topics/${topicID}`);
        setDiscussionTopic(data);
      } catch (error) {
        console.error('Error fetching discussion topic:', error);
        setError('Failed to load discussion');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [topicID, courseID]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50">
        <div className="container mx-auto py-6 px-4 md:px-6">
          <BackButtonClient />
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading discussion...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !discussionTopic) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50">
        <div className="container mx-auto py-6 px-4 md:px-6">
          <BackButtonClient />
          <div className="text-center text-red-500 mt-8">
            <h2 className="text-xl font-semibold mb-2">Failed to load discussion</h2>
            <p>{error || "The discussion you're looking for could not be found."}</p>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50">
      <div className="container mx-auto py-6 px-4 md:px-6">
        <BackButtonClient />
        
        <div className="max-w-4xl mx-auto">
          {/* Discussion Header */}
          <div className="mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold tracking-tight mb-2">{discussionTopic.title}</h1>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Created {formatDate(discussionTopic.created_at)}</span>
                  </div>
                  {discussionTopic.last_reply_at && (
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      <span>Last reply {formatDate(discussionTopic.last_reply_at)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {discussionTopic.subscribed && (
                  <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1">
                    <Bell className="w-4 h-4" />
                    Subscribed
                  </Badge>
                )}
                {discussionTopic.read_state === "unread" && (
                  <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    Unread
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="">
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Replies</div>
                  <div className="font-medium">{discussionTopic.discussion_subentry_count}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Created</div>
                  <div className="font-medium">{formatDate(discussionTopic.created_at)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div className="font-medium">{discussionTopic.read_state === "unread" ? "Unread" : "Read"}</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Discussion Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Discussion Message
              </CardTitle>
            </CardHeader>
            <CardContent>
              {discussionTopic.message ? (
                <div 
                  className="prose prose-gray max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-a:text-blue-600 prose-a:underline hover:prose-a:text-blue-800 prose-ul:text-foreground prose-ol:text-foreground prose-li:text-foreground"
                  dangerouslySetInnerHTML={{ 
                    __html: transformCanvasFileUrls(discussionTopic.message, courseID) 
                  }}
                />
              ) : (
                <p className="text-muted-foreground italic">No message content available for this discussion.</p>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {discussionTopic.permissions.reply && (
                <Button>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Reply
                </Button>
              )}
              {discussionTopic.permissions.attach && (
                <Button variant="outline">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Attach File
                </Button>
              )}
            </div>
            <div className="flex items-center gap-4">
              <Link href={`/courses/${courseID}`}>
                <Button variant="outline">
                  Back to Course
                </Button>
              </Link>
              <Link href={discussionTopic.html_url} target="_blank">
                <Button>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in Canvas
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WrappedDiscussionTopicPage({
  params,
}: {
  params: Promise<{ topicID: string, courseID: string }>;
}) {
  return (
    <ProtectedRoute>
      <DiscussionTopicPage params={params} />
    </ProtectedRoute>
  );
}
