import { NextRequest, NextResponse } from "next/server";
import { LMSFactory } from "@/lib/api";

export async function GET(request: NextRequest, { params }: { params: { courseID: string, topicID: string } }) {
    const courseID = (await params).courseID.split('-')[1];
    const lms = (await params).courseID.split('-')[0];
    const topicID = (await params).topicID;

    console.log(`courseID: ${courseID}, lms: ${lms}, topicID: ${topicID}`);

    const apiBaseUrl = process.env.CANVAS_API_BASE_URL ?? '';
    const apiKey = process.env.CANVAS_API_KEY ?? '';
    const lmsFactory = new LMSFactory(apiBaseUrl, apiKey);
    const lmsProvider = lmsFactory.createLMSProvider(lms);

    const discussionTopic = await lmsProvider.getDiscussionTopic(topicID, courseID);
    console.log(discussionTopic);
    return NextResponse.json(discussionTopic);
}
