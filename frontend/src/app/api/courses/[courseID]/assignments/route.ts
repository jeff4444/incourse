import { NextRequest, NextResponse } from "next/server";
import { LMSFactory } from "@/lib/api";
import { getUserFromRequest } from "@/lib/utils/userCredentials";
import { createClient } from "@/lib/utils/supabase/server";
import { Assignment } from "@/lib/types/course";

export async function GET(request: NextRequest, { params }: { params: Promise<{ courseID: string }> }) {
  try {
    // Get user from request
    const userData = await getUserFromRequest(request);
    if (!userData) {
      return NextResponse.json(
        { error: "Unauthorized - No valid user token" },
        { status: 401 }
      );
    }

    const { courseID } = await params;

    // Get course info from database to get lmsId and lmsProvider
    const supabase = await createClient();
    const { data: courseInfo, error: courseError } = await supabase
      .from('courses')
      .select('lms_id, lms_provider')
      .eq('id', courseID)
      .single();

    if (courseError || !courseInfo) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    // TODO: Need to implement credential retrieval or pass credentials differently
    return NextResponse.json(
      { error: "User credentials functionality needs to be implemented" },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json(
      { error: "Failed to fetch assignments", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
