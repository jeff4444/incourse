import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/utils/userCredentials";
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  let courseId, fileIds;
  
  try {
    const body = await request.json();
    ({ courseId, fileIds } = body as {
      courseId: string;
      fileIds: string[];
    });

    // Get user id from request
    const userData = await getUserFromRequest(request);
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized - No valid user token" }, { status: 401 });
    }

    if (!courseId || !fileIds || fileIds.length === 0) {
      return NextResponse.json({ error: "Course ID and file IDs are required" }, { status: 400 });
    }

    // Create Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the lms_content_id (first file ID)
    const lmsContentId = fileIds[0];

    // First, find the module_item by lms_content_id and course_id to get the actual document ID
    const { data: moduleItem, error: moduleItemError } = await supabase
      .from('module_items')
      .select('id')
      .eq('lms_content_id', lmsContentId)
      .eq('course_id', courseId)
      .single();

    if (moduleItemError) {
      // Enhanced error logging with request context
      const errorDetails = {
        endpoint: '/api/agents/chat/session',
        operation: 'find_module_item',
        error: moduleItemError,
        requestBody: {
          courseId,
          fileIds,
          lmsContentId,
        },
        timestamp: new Date().toISOString(),
      };
      
      console.error('Error finding module item:', errorDetails);
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const documentId = moduleItem.id;

    // Check if there's an existing chat session for this user-document pair
    const { data: existingSession, error } = await supabase
      .from('document_chats')
      .select('id')
      .eq('user_id', userData.userId)
      .eq('document_id', documentId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
      // Enhanced error logging with request context
      const errorDetails = {
        endpoint: '/api/agents/chat/session',
        operation: 'check_existing_session',
        error,
        requestBody: {
          courseId,
          fileIds,
          userId: userData.userId,
          documentId,
        },
        timestamp: new Date().toISOString(),
      };
      
      console.error('Supabase error:', errorDetails);
      return NextResponse.json({ error: "Failed to check for existing session" }, { status: 500 });
    }

    return NextResponse.json({ 
      sessionId: existingSession?.id || null,
      success: true 
    });
  } catch (error) {
    // Enhanced error logging with request context
    const errorDetails = {
      endpoint: '/api/agents/chat/session',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      requestBody: {
        courseId,
        fileIds,
      },
      timestamp: new Date().toISOString(),
    };
    
    console.error('Error in chat session API:', errorDetails);
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
