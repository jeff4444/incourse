import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/utils/supabase/server';
import { getUserFromRequest } from '@/lib/utils/userCredentials';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ nudgeId: string }> }
) {
  try {
    const { nudgeId } = await params;
    const userData = await getUserFromRequest(request);
    if (!userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    
    // Parse request body
    const body = await request.json();
    const { status } = body;

    if (!status || !['completed', 'dismissed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Update nudge status
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    } else if (status === 'dismissed') {
      updateData.dismissed_at = new Date().toISOString();
    }

    const { data: nudge, error: updateError } = await supabase
      .from('nudges')
      .update(updateData)
      .eq('id', nudgeId)
      .eq('user_id', userData.userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating nudge:', updateError);
      return NextResponse.json({ error: 'Failed to update nudge' }, { status: 500 });
    }

    // Track interaction
    const { error: interactionError } = await supabase
      .from('nudge_interactions')
      .insert({
        nudge_id: nudgeId,
        user_id: userData.userId,
        interaction_type: status
      });

    if (interactionError) {
      console.error('Error tracking interaction:', interactionError);
      // Don't fail the request for interaction tracking errors
    }

    return NextResponse.json({
      success: true,
      nudge
    });

  } catch (error) {
    console.error('Error in nudge update:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
