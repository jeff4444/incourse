import { NextRequest, NextResponse } from "next/server";
import { LMSFactory } from "@/lib/api";

export async function GET(request: NextRequest, { params }: { params: { courseID: string, pageUrl: string } }) {
    const courseID = (await params).courseID.split('-')[1];
    const lms = (await params).courseID.split('-')[0];
    const pageUrl = (await params).pageUrl;

    console.log(`courseID: ${courseID}, lms: ${lms}, pageUrl: ${pageUrl}`);

    const apiBaseUrl = process.env.CANVAS_API_BASE_URL ?? '';
    const apiKey = process.env.CANVAS_API_KEY ?? '';
    const lmsFactory = new LMSFactory(apiBaseUrl, apiKey);
    const lmsProvider = lmsFactory.createLMSProvider(lms);

    const page = await lmsProvider.getPage(pageUrl, courseID);
    console.log(page);
    return NextResponse.json(page);
}
