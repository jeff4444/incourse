import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/utils/userCredentials";
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  let sessionId: string | null = null;
  
  try {
    const { searchParams } = new URL(request.url);
    sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    // Get user id from request
    const userData = await getUserFromRequest(request);
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized - No valid user token" }, { status: 401 });
    }

    // Create Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Supabase configuration missing" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch chat messages from Supabase
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      // Enhanced error logging with request context
      const errorDetails = {
        endpoint: '/api/agents/chat/history',
        operation: 'fetch_chat_history',
        error,
        requestBody: {
          sessionId,
          userId: userData.userId,
        },
        timestamp: new Date().toISOString(),
      };
      
      console.error('Supabase error:', errorDetails);
      return NextResponse.json({ error: "Failed to fetch chat history" }, { status: 500 });
    }

    return NextResponse.json({ 
      messages: messages || [],
      success: true 
    });
  } catch (error) {
    // Enhanced error logging with request context
    const errorDetails = {
      endpoint: '/api/agents/chat/history',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      requestBody: {
        sessionId,
      },
      timestamp: new Date().toISOString(),
    };
    
    console.error('Error in chat history API:', errorDetails);
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
