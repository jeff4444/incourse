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

    // Get active nudges for user
    const { data: nudges, error } = await supabase
      .from('nudges')
      .select(`
        id, nudge_text, action, label, priority, status, 
        created_at, completed_at, dismissed_at, course_id,
        courses(id, name, code)
      `)
      .eq('user_id', userData.userId)
      .eq('status', 'active')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching nudges:', error);
      return NextResponse.json({ error: 'Failed to fetch nudges' }, { status: 500 });
    }

    console.log("nudges", nudges);

    return NextResponse.json(nudges || []);

  } catch (error) {
    console.error('Error in nudges GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
