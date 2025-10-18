import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";
import { getUserFromRequest } from "@/lib/utils/userCredentials";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseID: string; noteId: string }> }
) {
  try {
    const { courseID, noteId } = await params;
    const userData = await getUserFromRequest(request);
    
    if (!userData) {
      return NextResponse.json(
        { error: "Unauthorized - No valid user token" },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    const { data: note, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .eq('user_id', userData.userId)
      .eq('course_id', courseID)
      .single();

    if (error) {
      console.error('Error fetching note for export:', error);
      return NextResponse.json(
        { error: "Failed to fetch note" },
        { status: 500 }
      );
    }

    if (!note) {
      return NextResponse.json(
        { error: "Note not found" },
        { status: 404 }
      );
    }

    // Convert Tiptap JSON to markdown
    const markdown = convertTiptapToMarkdown(note.content);
    
    // Create filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${note.title.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.md`;

    // Return as downloadable file
    return new NextResponse(markdown, {
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/courses/[courseID]/notes/[noteId]/export:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to convert Tiptap JSON to Markdown
function convertTiptapToMarkdown(content: any): string {
  if (!content || !content.content) {
    return '';
  }

  let markdown = '';
  
  for (const node of content.content) {
    markdown += convertNodeToMarkdown(node);
  }
  
  return markdown;
}

function convertNodeToMarkdown(node: any): string {
  if (!node) return '';
  
  let result = '';
  
  switch (node.type) {
    case 'paragraph':
      if (node.content) {
        result = node.content.map(convertNodeToMarkdown).join('') + '\n\n';
      } else {
        result = '\n';
      }
      break;
      
    case 'heading':
      const level = node.attrs?.level || 1;
      const headingText = node.content ? node.content.map(convertNodeToMarkdown).join('') : '';
      result = '#'.repeat(level) + ' ' + headingText + '\n\n';
      break;
      
    case 'bulletList':
      if (node.content) {
        result = node.content.map((item: any) => '- ' + convertNodeToMarkdown(item)).join('\n') + '\n\n';
      }
      break;
      
    case 'orderedList':
      if (node.content) {
        result = node.content.map((item: any, index: number) => `${index + 1}. ` + convertNodeToMarkdown(item)).join('\n') + '\n\n';
      }
      break;
      
    case 'listItem':
      if (node.content) {
        result = node.content.map(convertNodeToMarkdown).join('');
      }
      break;
      
    case 'text':
      let text = node.text || '';
      if (node.marks) {
        for (const mark of node.marks) {
          switch (mark.type) {
            case 'bold':
              text = `**${text}**`;
              break;
            case 'italic':
              text = `*${text}*`;
              break;
            case 'underline':
              text = `<u>${text}</u>`;
              break;
            case 'code':
              text = `\`${text}\``;
              break;
            case 'link':
              text = `[${text}](${mark.attrs?.href || ''})`;
              break;
          }
        }
      }
      result = text;
      break;
      
    case 'codeBlock':
      const code = node.content ? node.content.map(convertNodeToMarkdown).join('') : '';
      result = '```\n' + code + '\n```\n\n';
      break;
      
    case 'blockquote':
      if (node.content) {
        const quoteText = node.content.map(convertNodeToMarkdown).join('');
        result = '> ' + quoteText.replace(/\n/g, '\n> ') + '\n\n';
      }
      break;
      
    case 'horizontalRule':
      result = '---\n\n';
      break;
      
    default:
      if (node.content) {
        result = node.content.map(convertNodeToMarkdown).join('');
      }
      break;
  }
  
  return result;
}
