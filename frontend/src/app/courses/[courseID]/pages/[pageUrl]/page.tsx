import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Page } from "@/lib/types/course";
import { BackButtonClient } from "@/components/back-button-client";
import { serverAuthenticatedFetchJson } from "@/lib/utils/serverAuth";

// Utility function to transform Canvas file URLs to our file viewing URLs
function transformCanvasFileUrls(html: string, courseID: string): string {
  // Regex to match Canvas file URLs: https://{domain}/courses/{courseId}/files/{fileId}
  const canvasFileUrlRegex = /https:\/\/[^\/]+\/courses\/\d+\/files\/(\d+)/g;
  
  return html.replace(canvasFileUrlRegex, (match, fileId) => {
    return `/courses/${courseID}/files/${fileId}`;
  });
}

export default async function PageViewer({
  params,
}: {
  params: { pageUrl: string, courseID: string };
}) {
  const pageUrl = (await params).pageUrl;
  const courseID = (await params).courseID;

  let page: Page;
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/courses/${courseID}/pages/${pageUrl}`;
  
  try {
    page = await serverAuthenticatedFetchJson<Page>(url);
  } catch (error) {
    console.error('Error fetching page:', error);
    return (
      <div className="min-h-screen px-5 pt-5 bg-gradient-to-br from-orange-50 to-pink-50">
        <div className="flex items-center gap-2 mb-2">
          <BackButtonClient />
          <h1 className="text-xl font-semibold">Error</h1>
        </div>
        <div className="text-center text-red-500 mt-8">
          <h2 className="text-xl font-semibold mb-2">Failed to load page</h2>
          <p>The page you're looking for could not be found or there was an error loading it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-5 pt-5 bg-gradient-to-br from-orange-50 to-pink-50">
      <div className="flex items-center gap-2 mb-6">
        <BackButtonClient />
        <h1 className="text-xl font-semibold">{page.title}</h1>
      </div>
      
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">{page.title}</h2>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Created: {new Date(page.created_at).toLocaleDateString()}</span>
                <span>Updated: {new Date(page.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 mb-4">
              {page.last_edited_by && (
              <span className="text-sm text-muted-foreground">
                Last edited by: {page.last_edited_by.display_name }
              </span>
              )}
              {page.published && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  Published
                </span>
              )}
              {page.front_page && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  Front Page
                </span>
              )}
            </div>
          </div>
          
          <div className="prose prose-sm max-w-none">
            <div 
              dangerouslySetInnerHTML={{ __html: transformCanvasFileUrls(page.body, courseID) }}
              className="prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-ul:text-gray-700 prose-li:text-gray-700"
            />
          </div>
          
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-end">
              <Link href={page.html_url} target="_blank">
                <Button variant="outline" size="sm">
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
