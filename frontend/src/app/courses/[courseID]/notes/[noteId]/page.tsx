"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { NoteEditor } from "@/components/note-editor";
import { NoteSidebar } from "@/components/note-sidebar";
import { Navbar } from "@/components/navbar";
import { NoteSkeleton } from "@/components/note-skeleton";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useNote, useNotes, useNoteFolders } from "@/lib/hooks/useNotes";
import { createClient } from "@/lib/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

function NoteEditorPage() {
  const params = useParams();
  const router = useRouter();
  const [userId, setUserId] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(320); // Default width in pixels
  const [isResizing, setIsResizing] = useState(false);
  
  const courseID = params.courseID as string;
  const noteId = params.noteId as string;

  useEffect(() => {
    const getUserId = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUserId();
  }, []);

  // Handle responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true); // Always show on large screens
      } else {
        setSidebarOpen(false); // Hide on mobile by default
      }
    };

    handleResize(); // Set initial state
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar on mobile when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (sidebarOpen && !target.closest('.sidebar') && window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sidebarOpen]);

  // Handle sidebar resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = e.clientX;
      const minWidth = 200;
      const maxWidth = window.innerWidth * 0.6;
      
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const { data: note, isLoading, error } = useNote(noteId, courseID);
  const { data: notes = [] } = useNotes(courseID, userId);
  const { data: folders = [] } = useNoteFolders(courseID, userId);

  if (isLoading) {
    return <NoteSkeleton />;
  }

  if (error || !note) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="text-center text-red-500">
          <h2 className="text-xl font-semibold mb-2">Failed to load note</h2>
          <p>The note you're looking for could not be found or there was an error loading it.</p>
          <button 
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <div 
          className={cn(
            "sidebar bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex-shrink-0",
            sidebarOpen ? "" : "w-0 overflow-hidden"
          )}
          style={{ 
            width: sidebarOpen ? `${sidebarWidth}px` : '0px',
            minWidth: sidebarOpen ? '200px' : '0px',
            maxWidth: sidebarOpen ? '60vw' : '0px'
          }}
        >
          <div className="h-full flex flex-col">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Notes List */}
            <div className="flex-1 overflow-y-auto">
              <NoteSidebar 
                notes={notes} 
                folders={folders} 
                courseID={courseID} 
                userId={userId}
              />
            </div>
          </div>
        </div>

        {/* Draggable Resize Handle */}
        {sidebarOpen && (
          <div
            className="w-1 bg-gray-200 hover:bg-gray-300 cursor-col-resize flex-shrink-0 transition-colors"
            onMouseDown={() => setIsResizing(true)}
          />
        )}

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Editor */}
          <div className="flex-1 overflow-hidden">
            <NoteEditor 
              note={note} 
              onSave={() => {
                // Optional: show success message or redirect
              }}
              sidebarOpen={sidebarOpen}
              onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WrappedNoteEditorPage() {
  return (
    <ProtectedRoute>
      <NoteEditorPage />
    </ProtectedRoute>
  );
}
