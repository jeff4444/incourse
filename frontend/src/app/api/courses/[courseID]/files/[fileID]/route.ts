import { NextRequest, NextResponse } from "next/server";
import { createLMSProviderWithUserCredentials } from "@/lib/utils/apiHelpers";

export async function GET(request: NextRequest, { params }: { params: { courseID: string, fileID: string } }) {
    try {
        const courseID = (await params).courseID.split('-')[1];
        const lms = (await params).courseID.split('-')[0];
        const fileID = (await params).fileID;

        console.log(`courseID: ${courseID}, lms: ${lms}, fileID: ${fileID}`);

        // Create LMS provider with user credentials
        const result = await createLMSProviderWithUserCredentials(request, lms);
        if (result instanceof NextResponse) {
            return result; // Return error response
        }

        const { lmsProvider } = result;
        const fileDetails = await lmsProvider.getFileDetails(fileID, courseID);
        console.log(fileDetails);
        return NextResponse.json(fileDetails);
    } catch (error) {
        console.error('Error in file details API:', error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}