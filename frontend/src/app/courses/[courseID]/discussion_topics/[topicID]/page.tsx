import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DiscussionTopic } from "@/lib/types/course";
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

export default async function DiscussionTopicPage({
  params,
}: {
  params: { topicID: string, courseID: string };
}) {
  const topicID = (await params).topicID;
  const courseID = (await params).courseID;

  let discussionTopic: DiscussionTopic;
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/courses/${courseID}/discussion_topics/${topicID}`;
  
  try {
    discussionTopic = await serverAuthenticatedFetchJson<DiscussionTopic>(url);
  } catch (error) {
    console.error('Error fetching discussion topic:', error);
    return (
      <div className="min-h-screen px-5 pt-5 bg-gradient-to-br from-orange-50 to-pink-50">
        <div className="flex items-center gap-2 mb-2">
          <BackButtonClient />
          <h1 className="text-xl font-semibold">Error</h1>
        </div>
        <div className="text-center text-red-500 mt-8">
          <h2 className="text-xl font-semibold mb-2">Failed to load discussion</h2>
          <p>The discussion you're looking for could not be found or there was an error loading it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-5 pt-5 bg-gradient-to-br from-orange-50 to-pink-50">
      <div className="flex items-center gap-2 mb-6">
        <BackButtonClient />
        <h1 className="text-xl font-semibold">{discussionTopic.title}</h1>
      </div>
      
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">{discussionTopic.title}</h2>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Created: {new Date(discussionTopic.created_at).toLocaleDateString()}</span>
                {discussionTopic.last_reply_at && (
                  <span>Last reply: {new Date(discussionTopic.last_reply_at).toLocaleDateString()}</span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-muted-foreground">
                {discussionTopic.discussion_subentry_count} replies
              </span>
              {discussionTopic.subscribed && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  Subscribed
                </span>
              )}
              {discussionTopic.read_state === "unread" && (
                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                  Unread
                </span>
              )}
            </div>
          </div>
          
          <div className="prose prose-sm max-w-none">
            <div 
              dangerouslySetInnerHTML={{ __html: transformCanvasFileUrls(discussionTopic.message, courseID) }}
              className="prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-ul:text-gray-700 prose-li:text-gray-700"
            />
          </div>
          
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {discussionTopic.permissions.reply && (
                  <Button size="sm">
                    Reply
                  </Button>
                )}
                {discussionTopic.permissions.attach && (
                  <Button variant="outline" size="sm">
                    Attach File
                  </Button>
                )}
              </div>
              <Link href={discussionTopic.html_url} target="_blank">
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
