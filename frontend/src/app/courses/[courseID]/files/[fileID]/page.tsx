"use client";

import { useState, useEffect } from "react";
import PDFViewer from "@/components/pdf-viewer";
import PPTXViewer from "@/components/pptx-viewer";
import XLSXViewer from "@/components/xlsx-viewer";
import DOCXViewer from "@/components/docx-viewer";
import ImageViewer from "@/components/image-viewer";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { FileDetails } from "@/lib/types/course";
import { BackButtonClient } from "@/components/back-button-client";
import { authenticatedFetchJson } from "@/lib/utils/apiClient";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

function getViewer(fileDetails: FileDetails, courseID?: string) {
  // PDF files
  if (fileDetails.type === "application/pdf") {
    return <PDFViewer fileDetails={fileDetails} courseId={courseID} />;
  }
  
  // PowerPoint files
  if (fileDetails.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      fileDetails.type === "application/vnd.ms-powerpoint") {
    return <PPTXViewer fileDetails={fileDetails} courseId={courseID} />;
  }
  
  // Excel files
  if (fileDetails.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      fileDetails.type === "application/vnd.ms-excel") {
    return <XLSXViewer fileDetails={fileDetails} courseId={courseID} />;
  }
  
  // Word files
  if (fileDetails.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileDetails.type === "application/msword") {
    return <DOCXViewer fileDetails={fileDetails} courseId={courseID} />;
  }
  
  // Image files
  if (fileDetails.type.startsWith("image/")) {
    return <ImageViewer fileDetails={fileDetails} />;
  }
  
  // Unsupported file type
  return (
    <div className="text-center text-red-500 py-12">
      <div className="max-w-md mx-auto">
        <h2 className="text-xl font-semibold mb-2">Unsupported File Type</h2>
        <p className="text-gray-600 mb-4">
          The file type "{fileDetails.type}" is not currently supported for viewing.
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Supported formats: PDF, PowerPoint (PPTX/PPT), Excel (XLSX/XLS), Word (DOCX/DOC), Images (JPEG, PNG, GIF, WebP)
        </p>
        <Button 
          onClick={() => {
            const link = document.createElement("a");
            link.href = fileDetails.url;
            link.download = fileDetails.name;
            link.click();
          }}
          variant="outline"
        >
          Download File
        </Button>
      </div>
    </div>
  );
}


function FileViewPage({
  params,
}: {
  params: Promise<{ fileID: string, courseID: string }>;
}) {
  const [fileID, setFileID] = useState<string>("");
  const [courseID, setCourseID] = useState<string>("");
  const [fileDetails, setFileDetails] = useState<FileDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setFileID(resolvedParams.fileID);
      setCourseID(resolvedParams.courseID);
    };
    getParams();
  }, [params]);

  useEffect(() => {
    if (!fileID || !courseID) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await authenticatedFetchJson<FileDetails>(`/api/courses/${courseID}/files/${fileID}`);
        setFileDetails(data);
      } catch (error) {
        console.error('Error fetching file details:', error);
        setError('Failed to load file');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fileID, courseID]);

  if (loading) {
    return (
      <div className="min-h-screen px-5 pt-5 bg-gradient-to-br from-orange-50 to-pink-50">
        <div className="flex items-center gap-2 mb-6">
          <BackButtonClient />
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading file...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !fileDetails) {
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
      {getViewer(fileDetails, courseID)}
    </div>
  );
}

export default function WrappedFileViewPage({
  params,
}: {
  params: Promise<{ fileID: string, courseID: string }>;
}) {
  return (
    <ProtectedRoute>
      <FileViewPage params={params} />
    </ProtectedRoute>
  );
}
