import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/utils/supabase/server';
import { getUserFromRequest } from '@/lib/utils/userCredentials';

export async function POST(request: NextRequest) {
  try {
    const userData = await getUserFromRequest(request);
    if (!userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    
    // Check last generation time
    const { data: lastNudge, error: lastNudgeError } = await supabase
      .from('nudges')
      .select('created_at')
      .eq('user_id', userData.userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lastNudgeError && lastNudgeError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking last generation:', lastNudgeError);
      return NextResponse.json({ error: 'Failed to check last generation' }, { status: 500 });
    }

    // If nudges exist, check if it's been 5+ hours
    if (lastNudge) {
      const lastGeneration = new Date(lastNudge.created_at);
      const now = new Date();
      const hoursSinceGeneration = (now.getTime() - lastGeneration.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceGeneration < 5) {
        return NextResponse.json({ 
          message: 'Nudges generated recently, skipping generation',
          hours_until_next: 5 - hoursSinceGeneration 
        });
      }
    }

    // Call backend to generate nudges
    const backendUrl = process.env.NEXT_PUBLIC_AGENTS_BACKEND_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/generate-nudges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userData.userId,
        prompt: 'Generate personalized nudges based on user activity and deadlines'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error:', errorText);
      return NextResponse.json({ error: 'Failed to generate nudges' }, { status: 500 });
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      message: 'Nudges generation triggered successfully'
    });

  } catch (error) {
    console.error('Error in nudges generate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
