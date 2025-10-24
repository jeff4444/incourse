"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackButtonClient } from "@/components/back-button-client";
import { ExternalLink, FileText, Calendar } from "lucide-react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { usePage } from "@/lib/hooks/usePages";
import { authenticatedFetchJson } from "@/lib/utils/apiClient";
import { DiscussionTopic, File, Page } from "@/lib/types/course";

// Utility function to transform Canvas file URLs to our file viewing URLs
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
      return `/courses/${courseID}/files/${databaseId}`;
    }
    // Fallback to original URL if we couldn't find the database ID
    return match;
  });
  
  // Remove target="_blank" from all links to make them open in current tab
  transformedHtml = transformedHtml.replace(/target=\"_blank\"/gi, '');
  
  return transformedHtml;
}

function PageViewer({
  params,
}: {
  params: Promise<{ pageId: string, courseID: string }>;
}) {
  const [pageId, setPageId] = useState<string>("");
  const [courseID, setCourseID] = useState<string>("");
  const [page, setPage] = useState<Page | null>(null);
  const [transformedBody, setTransformedBody] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setPageId(resolvedParams.pageId);
      setCourseID(resolvedParams.courseID);
    };
    getParams();
  }, [params]);

  useEffect(() => {
    if (page?.body && courseID) {
      transformCanvasFileUrls(page.body, courseID)
        .then(setTransformedBody)
        .catch(error => {
          console.error('Error transforming page body:', error);
          setTransformedBody(page.body || "");
        });
    }
  }, [page, courseID]);

  useEffect(() => {
    if (!pageId || !courseID) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await authenticatedFetchJson<Page>(`/api/courses/${courseID}/pages/${pageId}`);
        setPage(data);
      } catch (error) {
        console.error('Error fetching page:', error);
        setError('Failed to load page');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pageId, courseID]);

  if (error || !page) {
    return (
      <div className="min-h-screen bg-linear-to-br from-orange-50 to-pink-50">
        <div className="container mx-auto py-6 px-4 md:px-6">
          <BackButtonClient />
          <div className="text-center text-red-500 mt-8">
            <h2 className="text-xl font-semibold mb-2">Failed to load page</h2>
            <p>{error || "The page you're looking for could not be found."}</p>
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
    <div className="min-h-screen bg-linear-to-br from-orange-50 to-pink-50">
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
                    <span>Updated {formatDate(page.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Created</div>
                  <div className="font-medium">{formatDate(page.createdAt || '')}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Last Updated</div>
                  <div className="font-medium">{formatDate(page.updatedAt)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div className="font-medium">Published</div>
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
                    __html: transformedBody
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
            <Link href={page.htmlUrl || ''} target="_blank">
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
  params: Promise<{ pageId: string, courseID: string }>;
}) {
  return (
    <ProtectedRoute>
      <PageViewer params={params} />
    </ProtectedRoute>
  );
}
