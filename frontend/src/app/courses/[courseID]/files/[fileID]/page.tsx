import Viewer from "@/components/pdf-viewer";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { FileDetails } from "@/lib/types/course";
import { BackButtonClient } from "@/components/back-button-client";

function getViewer(fileDetails: FileDetails) {
  if (fileDetails.type === "application/pdf") {
    return <Viewer fileDetails={fileDetails} />;
  } else {
    return (
      <div className="text-center text-red-500">
        Unsupported file type: {fileDetails.type}. Please upload a PDF file.
      </div>
    );
  }
}


export default async function FileViewPage({
  params,
}: {
  params: { fileID: string, courseID: string };
}) {
  const fileID = (await params).fileID;
  const courseID = (await params).courseID;

  let fileDetails: FileDetails;
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/courses/${courseID}/files/${fileID}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file details: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    fileDetails = data as FileDetails;
  } catch (error) {
    console.error('Error fetching file details:', error);
    return (
      <div className="min-h-screen px-5 pt-5 bg-gradient-to-br from-orange-50 to-pink-50">
        <div className="flex items-center gap-2 mb-2">
          <BackButtonClient />
          <h1 className="text-xl font-semibold">Error</h1>
        </div>
        <div className="text-center text-red-500 mt-8">
          <h2 className="text-xl font-semibold mb-2">Failed to load file</h2>
          <p>The file you're looking for could not be found or there was an error loading it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-5 pt-5 bg-gradient-to-br from-orange-50 to-pink-50">
      <div className="flex items-center gap-2 mb-2">
        <BackButtonClient />
        <h1 className="text-xl font-semibold">{fileDetails.name}</h1>
      </div>
      {getViewer(fileDetails)}
    </div>
  );
}
