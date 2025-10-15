"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BackButtonClient } from "@/components/back-button-client";
import { ExternalLink, FileText, Calendar, User, Eye } from "lucide-react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { usePage } from "@/lib/hooks/usePages";

// Utility function to transform Canvas file URLs to our file viewing URLs
function transformCanvasFileUrls(html: string, courseID: string): string {
  if (!html) return html;
  
  // Regex to match Canvas file URLs: https://{domain}/courses/{courseId}/files/{fileId}
  const canvasFileUrlRegex = /https:\/\/[^\/]+\/courses\/\d+\/files\/(\d+)/g;
  
  let transformedHtml = html.replace(canvasFileUrlRegex, (match, fileId) => {
    return `/courses/${courseID}/files/${fileId}`;
  });
  
  // Remove target="_blank" from all links to make them open in current tab
  transformedHtml = transformedHtml.replace(/target=\"_blank\"/gi, '');
  
  return transformedHtml;
}

function PageViewer({
  params,
}: {
  params: Promise<{ pageUrl: string, courseID: string }>;
}) {
  const [pageUrl, setPageUrl] = useState<string>("");
  const [courseID, setCourseID] = useState<string>("");

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setPageUrl(resolvedParams.pageUrl);
      setCourseID(resolvedParams.courseID);
    };
    getParams();
  }, [params]);

  const { data: page, isLoading: loading, error } = usePage(courseID, pageUrl);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50">
        <div className="container mx-auto py-6 px-4 md:px-6">
          <BackButtonClient />
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading page...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50">
        <div className="container mx-auto py-6 px-4 md:px-6">
          <BackButtonClient />
          <div className="text-center text-red-500 mt-8">
            <h2 className="text-xl font-semibold mb-2">Failed to load page</h2>
            <p>{error instanceof Error ? error.message : "The page you're looking for could not be found."}</p>
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
          {/* Page Header */}
          <div className="mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold tracking-tight mb-2">{page.title}</h1>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Updated {formatDate(page.updated_at)}</span>
                  </div>
                  {page.last_edited_by && (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>by {page.last_edited_by.display_name}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {page.published && (
                  <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    Published
                  </Badge>
                )}
                {page.front_page && (
                  <Badge className="bg-blue-100 text-blue-800">
                    Front Page
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Created</div>
                  <div className="font-medium">{formatDate(page.created_at)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Last Updated</div>
                  <div className="font-medium">{formatDate(page.updated_at)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div className="font-medium">{page.published ? "Published" : "Draft"}</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Page Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Page Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              {page.body ? (
                <div 
                  className="prose prose-gray max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-ul:text-foreground prose-ol:text-foreground prose-li:text-foreground [&_a]:text-blue-600 [&_a]:underline hover:[&_a]:text-blue-800"
                  dangerouslySetInnerHTML={{ 
                    __html: transformCanvasFileUrls(page.body, courseID) 
                  }}
                />
              ) : (
                <p className="text-muted-foreground italic">No content available for this page.</p>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="mt-6 flex items-center justify-end gap-4">
            <Link href={`/courses/${courseID}`}>
              <Button variant="outline">
                Back to Course
              </Button>
            </Link>
            <Link href={page.html_url} target="_blank">
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

export default function WrappedPageViewer({
  params,
}: {
  params: Promise<{ pageUrl: string, courseID: string }>;
}) {
  return (
    <ProtectedRoute>
      <PageViewer params={params} />
    </ProtectedRoute>
  );
}
