"use client";

import { useState, useEffect } from "react";
import PDFViewer from "@/components/pdf-viewer";
import PPTXViewer from "@/components/pptx-viewer";
import XLSXViewer from "@/components/xlsx-viewer";
import DOCXViewer from "@/components/docx-viewer";
import ImageViewer from "@/components/image-viewer";
import { ChatPanel } from "@/components/ai-chat-panel";
import { Button } from "@/components/ui/button";
import { FileDetails } from "@/lib/types/course";
import { BackButtonClient } from "@/components/back-button-client";
import { authenticatedFetchJson } from "@/lib/utils/apiClient";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useReadingTracker } from "@/lib/hooks/useActivities";
import { Play, Square, Clock, FileCheck, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { nanoid } from "@/lib/utils";

function getViewer(fileDetails: FileDetails, courseID?: string, onTogglePanelVisibility?: () => void, onShowPanel?: () => void, onAddToContext?: (text: string, pageNumber: number) => void, showContextOptions?: boolean) {
  // PDF files
  if (fileDetails.type === "application/pdf" || fileDetails.contentType === "application/pdf") {
    return <PDFViewer fileDetails={fileDetails} courseId={courseID} onTogglePanelVisibility={onTogglePanelVisibility} onShowPanel={onShowPanel} onAddToContext={onAddToContext} showContextOptions={showContextOptions} />;
  }
  
  // PowerPoint files
  if (fileDetails.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      fileDetails.contentType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      fileDetails.type === "application/vnd.ms-powerpoint" ||
      fileDetails.contentType === "application/vnd.ms-powerpoint") {
    return <PPTXViewer fileDetails={fileDetails} courseId={courseID} onTogglePanelVisibility={onTogglePanelVisibility} onShowPanel={onShowPanel} onAddToContext={onAddToContext} showContextOptions={showContextOptions} />;
  }
  
  // Excel files
  if (fileDetails.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      fileDetails.contentType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      fileDetails.type === "application/vnd.ms-excel" ||
      fileDetails.contentType === "application/vnd.ms-excel") {
    return <XLSXViewer fileDetails={fileDetails} courseId={courseID} onTogglePanelVisibility={onTogglePanelVisibility} onShowPanel={onShowPanel} onAddToContext={onAddToContext} showContextOptions={showContextOptions} />;
  }
  
  // Word files
  if (fileDetails.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileDetails.contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileDetails.type === "application/msword" ||
      fileDetails.contentType === "application/msword") {
    return <DOCXViewer fileDetails={fileDetails} courseId={courseID} onTogglePanelVisibility={onTogglePanelVisibility} onShowPanel={onShowPanel} onAddToContext={onAddToContext} showContextOptions={showContextOptions} />;
  }
  
  // Image files
  if (fileDetails.type.startsWith("image/") || fileDetails.contentType?.startsWith("image/")) {
    return <ImageViewer fileDetails={fileDetails} courseId={courseID} onTogglePanelVisibility={onTogglePanelVisibility} onShowPanel={onShowPanel} onAddToContext={onAddToContext} showContextOptions={showContextOptions} />;
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
  const [showChatPanel, setShowChatPanel] = useState(true);
  const [contextItems, setContextItems] = useState<{ id: string; text: string; source: string; pageNumber: number }[]>([]);
  const [selectedContextItem, setSelectedContextItem] = useState<{ id: string; text: string; source: string; pageNumber: number } | null>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "suggestions">("chat");
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [hasLoadedChatHistory, setHasLoadedChatHistory] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string; timestamp: Date; contextPreview?: string }[]>([
    {
      role: "assistant",
      content: "Hi there! I'm your AI learning assistant. How can I help you with this document?",
      timestamp: new Date(),
    },
  ]);
  const router = useRouter();

  // Check if filename contains "homework" or "assignment" (case insensitive)
  const shouldShowAutogradeButton = fileDetails?.name && 
    (fileDetails.name.toLowerCase().includes('homework') || 
     fileDetails.name.toLowerCase().includes('assignment') ||
     fileDetails.name.toLowerCase().includes('quiz') ||
     fileDetails.name.toLowerCase().includes('test') ||
     fileDetails.name.toLowerCase().includes('exam'));

  // Handle panel visibility toggle
  const handleTogglePanelVisibility = () => {
    setShowChatPanel(!showChatPanel);
  };

  // Handle showing panel (for context addition)
  const handleShowPanel = () => {
    setShowChatPanel(true);
  };

  // Handle adding text to context
  const handleAddToContext = (text: string, pageNumber: number) => {
    const newContextItem = {
      id: nanoid(),
      text,
      source: fileDetails?.name || 'document',
      pageNumber
    };
    setContextItems([...contextItems, newContextItem]);
    setSelectedContextItem(newContextItem);
    setShowChatPanel(true);
    setActiveTab('chat');
  };

  // Handle removing context item
  const handleRemoveContextItem = (id: string) => {
    setContextItems(contextItems.filter(item => item.id !== id));
    if (selectedContextItem?.id === id) {
      setSelectedContextItem(null);
    }
  };

  // Handle adding context item from chat messages
  const handleAddContextItem = (contextItem: { id: string; text: string; source: string; pageNumber: number }) => {
    setContextItems([...contextItems, contextItem]);
    setSelectedContextItem(contextItem);
  };

  // Load chat history from backend
  const loadChatHistory = async (sessionId: string) => {
    try {
      const data = await authenticatedFetchJson<{ messages: any[] }>(
        `/api/agents/chat/history?sessionId=${sessionId}`,
        {
          method: 'GET',
        }
      );
      
      if (data?.messages && data.messages.length > 0) {
        // Convert backend messages to frontend format
        const historyMessages = data.messages.map((msg: any) => ({
          role: msg.sender as "user" | "assistant",
          content: msg.content,
          timestamp: new Date(msg.created_at),
          contextPreview: undefined
        }));
        
        // Replace the default welcome message with actual history
        setChatMessages(historyMessages);
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
    }
  };

  // Handle updating chat messages
  const handleUpdateChatMessages = (messages: { role: "user" | "assistant"; content: string; timestamp: Date; contextPreview?: string }[]) => {
    setChatMessages(messages);
  };

  // Load chat session when file details are available
  useEffect(() => {
    if (fileDetails && courseID && !hasLoadedChatHistory) {
      setHasLoadedChatHistory(true);
      
      // Auto-detect existing session for this user-document pair
      const detectAndLoadExistingSession = async () => {
        try {
          const data = await authenticatedFetchJson<{ sessionId?: string }>(
            '/api/agents/chat/session',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                courseId: courseID,
                fileIds: [fileDetails.canvasId || fileDetails.id || ''],
              }),
            }
          );
          
          if (data?.sessionId) {
            setChatSessionId(data.sessionId);
            // Load chat history for this session
            loadChatHistory(data.sessionId);
          }
        } catch (error) {
          console.error("Error detecting existing session:", error);
        }
      };
      
      detectAndLoadExistingSession();
    }
  }, [fileDetails, courseID, hasLoadedChatHistory]);

  // Reading tracker - only enable when we have file details
  const { timeSpent, isTracking, startTracking, stopTracking, logActivity } = useReadingTracker(
    fileDetails?.id || fileDetails?.canvasId || '',
    fileDetails?.name || '',
    courseID,
    !!fileDetails
  );

  // Log activity on unmount
  useEffect(() => {
    return () => {
      logActivity();
    };
  }, [logActivity]);

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
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <BackButtonClient />
          <h1 className="text-xl font-semibold">{fileDetails.name}</h1>
        </div>
        
        {/* Reading Tracker Controls */}
        <div className="flex items-center gap-3">
          {!isTracking ? (
            <div className="relative group">
              <Button
                variant="outline"
                size="sm"
                onClick={startTracking}
                className="flex items-center gap-2 bg-blue-200 hover:bg-blue-300 overflow-hidden transition-all duration-700 ease-out w-8 group-hover:w-40"
              >
                <Play className="h-4 w-4" />
                <span className="whitespace-nowrap hidden group-hover:inline-block transition-all duration-500 ease-out delay-200">
                  Enter Zen Mode
                </span>
              </Button>
            </div>
          ) : (
            <div className="relative group">
              <Button
                variant="default"
                size="sm"
                onClick={stopTracking}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white overflow-hidden transition-all duration-700 ease-out w-8 group-hover:w-36"
              >
                <Square className="h-4 w-4 flex-shrink-0" />
                <span className="whitespace-nowrap hidden group-hover:inline-block transition-all duration-500 ease-out delay-200">
                  End Zen Mode
                </span>
              </Button>
            </div>
          )}
          
          {/* Chat Panel Toggle */}
          <div className="relative group">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTogglePanelVisibility}
              className={`flex items-center gap-2 overflow-hidden transition-all duration-700 ease-out w-8 group-hover:w-32 ${showChatPanel ? "bg-blue-100 hover:bg-blue-200 border-blue-200" : ""}`}
            >
              <MessageSquare className="h-4 w-4" />
              <span className="whitespace-nowrap hidden group-hover:inline-block transition-all duration-500 ease-out delay-200">
                {showChatPanel ? "Hide Chat" : "Show Chat"}
              </span>
            </Button>
          </div>
          
          {/* Autograde Button - only show for homework/assignment files */}
          {shouldShowAutogradeButton && (
            <div className="relative group">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/courses/${courseID}/autograder/${fileID}`)}
                className="flex items-center gap-2 overflow-hidden transition-all duration-700 ease-out w-8 group-hover:w-32 bg-green-100 hover:bg-green-200 border-green-200"
              >
                <FileCheck className="h-4 w-4" />
                <span className="whitespace-nowrap hidden group-hover:inline-block transition-all duration-500 ease-out delay-200">
                  Autograde
                </span>
              </Button>
            </div>
          )}
          
          {/* Time Display */}
          {timeSpent > 0 && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>{Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex">
        <div className="flex-1">
          {getViewer(fileDetails, courseID, handleTogglePanelVisibility, handleShowPanel, handleAddToContext, true)}
        </div>
        {showChatPanel && (
          <ChatPanel
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            contextItems={contextItems}
            selectedContextItem={selectedContextItem}
            onRemoveContextItem={handleRemoveContextItem}
            onAddContextItem={handleAddContextItem}
            courseId={courseID}
            fileIdList={[fileDetails.canvasId || fileDetails.id || '']}
            initialSessionId={chatSessionId || undefined}
            messages={chatMessages}
            onUpdateMessages={handleUpdateChatMessages}
          />
        )}
      </div>
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
