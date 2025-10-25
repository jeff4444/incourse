import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/utils/supabase/server';
import { getUserFromRequest } from '@/lib/utils/userCredentials';

export async function GET(request: NextRequest) {
  try {
    const userData = await getUserFromRequest(request);
    if (!userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    
    // Get last nudge generation time
    const { data: lastNudge, error } = await supabase
      .from('nudges')
      .select('created_at')
      .eq('user_id', userData.userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching last generation:', error);
      return NextResponse.json({ error: 'Failed to fetch last generation' }, { status: 500 });
    }

    return NextResponse.json({
      last_generation: lastNudge?.created_at || null
    });

  } catch (error) {
    console.error('Error in nudges last-generation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
