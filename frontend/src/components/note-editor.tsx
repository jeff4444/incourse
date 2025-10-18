"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  List, 
  ListOrdered, 
  Heading1, 
  Heading2, 
  Heading3,
  Code,
  Quote,
  Link as LinkIcon,
  Save,
  Download,
  ArrowLeft,
  Loader2,
  Menu
} from "lucide-react";
import { useUpdateNote } from "@/lib/hooks/useNotes";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface NoteEditorProps {
  note: {
    id: string;
    title: string;
    content: any;
    course_id: string;
  };
  onSave?: () => void;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export function NoteEditor({ note, onSave, sidebarOpen, onToggleSidebar }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState(note.content);
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [isSelecting, setIsSelecting] = useState(false);
  const router = useRouter();
  const updateNote = useUpdateNote();
  const editorRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Start writing your note...",
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline cursor-pointer",
        },
      }),
    ],
    content: note.content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      // Mark that there are unsaved changes
      setHasUnsavedChanges(true);
      // Auto-save on content change (debounced)
      debouncedSave(editor.getJSON());
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;
      
      if (hasSelection) {
        // Mark that we're in the process of selecting
        setIsSelecting(true);
        
        // Get selection coordinates for positioning
        const { view } = editor;
        const { state } = view;
        const { selection } = state;
        const { $from, $to } = selection;
        
        // Get the DOM coordinates of the selection bounds
        const fromCoords = view.coordsAtPos($from.pos);
        const toCoords = view.coordsAtPos($to.pos);
        const editorRect = editorRef.current?.getBoundingClientRect();
        
        if (editorRect) {
          // Calculate center position of the selection horizontally
          const centerX = (fromCoords.left + toCoords.right) / 2;
          const topY = Math.min(fromCoords.top, toCoords.top);
          
          // Convert to relative coordinates within the editor
          const relativeX = centerX - editorRect.left;
          const relativeY = topY - editorRect.top;
          
          // Toolbar dimensions for boundary calculations
          const toolbarWidth = 400; // Approximate toolbar width for all buttons
          const toolbarHeight = 40; // Approximate toolbar height
          
          // Handle horizontal boundaries
          const clampedX = Math.max(
            toolbarWidth / 2, // Half toolbar width from left edge
            Math.min(
              relativeX,
              editorRect.width - toolbarWidth / 2 // Half toolbar width from right edge
            )
          );
          
          // Handle vertical positioning - prefer above, but below if too close to top
          const spaceAbove = relativeY;
          const spaceBelow = editorRect.height - relativeY;
          
          let finalY;
          if (spaceAbove > toolbarHeight + 10) {
            // Position above the selection
            finalY = Math.max(10, relativeY - toolbarHeight - 10);
          } else {
            // Position below the selection if not enough space above
            finalY = relativeY + 20;
          }
          
          setToolbarPosition({
            x: clampedX,
            y: finalY
          });
        }
        
        // Don't show toolbar while actively selecting
        setShowFloatingToolbar(false);
      } else {
        setShowFloatingToolbar(false);
        setIsSelecting(false);
      }
    },
    editorProps: {
      attributes: {
        class: "prose prose-base sm:prose-lg lg:prose-xl xl:prose-2xl mx-auto focus:outline-none h-full p-8 font-math text-black",
        style: "font-family: 'Computer Modern', 'Latin Modern Math', 'STIX Two Math', 'Asana Math', 'Cambria Math', 'Times New Roman', serif;",
      },
    },
  });

  // Check if content has actually changed
  const hasContentChanged = useCallback((newContent: any) => {
    return JSON.stringify(newContent) !== JSON.stringify(lastSavedContent);
  }, [lastSavedContent]);

  // Debounced save function
  const debouncedSave = useCallback(
    debounce((content: any) => {
      if (updateNote.isPending || !hasContentChanged(content)) return;
      
      setIsSaving(true);
      updateNote.mutate(
        {
          courseId: note.course_id,
          noteId: note.id,
          updates: { content },
        },
        {
          onSuccess: () => {
            setLastSaved(new Date());
            setIsSaving(false);
            setHasUnsavedChanges(false);
            setLastSavedContent(content);
          },
          onError: () => {
            setIsSaving(false);
          },
        }
      );
    }, 3000), // Increased to 3 seconds
    [updateNote, note.course_id, note.id, hasContentChanged]
  );

  // Manual save function
  const handleManualSave = useCallback(() => {
    if (!editor) return;
    
    const currentContent = editor.getJSON();
    if (!hasContentChanged(currentContent) && title.trim() === note.title) {
      // No changes to save
      return;
    }
    
    setIsSaving(true);
    updateNote.mutate(
      {
        courseId: note.course_id,
        noteId: note.id,
        updates: { 
          title: title.trim(),
          content: currentContent 
        },
      },
      {
        onSuccess: () => {
          setLastSaved(new Date());
          setIsSaving(false);
          setHasUnsavedChanges(false);
          setLastSavedContent(currentContent);
          onSave?.();
        },
        onError: () => {
          setIsSaving(false);
        },
      }
    );
  }, [editor, title, note.title, updateNote, note.course_id, note.id, onSave, hasContentChanged]);

  // Handle selection completion and mouse events
  useEffect(() => {
    const handleMouseUp = () => {
      // Small delay to ensure selection is finalized
      setTimeout(() => {
        if (editor && isSelecting) {
          const { from, to } = editor.state.selection;
          const hasSelection = from !== to;
          
          if (hasSelection) {
            setShowFloatingToolbar(true);
          }
          setIsSelecting(false);
        }
      }, 50);
    };

    const handleMouseDown = () => {
      // Hide toolbar when starting a new selection
      setShowFloatingToolbar(false);
    };

    if (editor) {
      const editorElement = editor.view.dom;
      editorElement.addEventListener('mouseup', handleMouseUp);
      editorElement.addEventListener('mousedown', handleMouseDown);
      
      return () => {
        editorElement.removeEventListener('mouseup', handleMouseUp);
        editorElement.removeEventListener('mousedown', handleMouseDown);
      };
    }
  }, [editor, isSelecting]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!editor) return;
      
      // Save shortcut (Ctrl+S / Cmd+S)
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        handleManualSave();
        return;
      }
      
      // Bold shortcut (Ctrl+B / Cmd+B)
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        editor.chain().focus().toggleBold().run();
        return;
      }
      
      // Italic shortcut (Ctrl+I / Cmd+I)
      if ((event.ctrlKey || event.metaKey) && event.key === 'i') {
        event.preventDefault();
        editor.chain().focus().toggleItalic().run();
        return;
      }
      
      // Underline shortcut (Ctrl+U / Cmd+U)
      if ((event.ctrlKey || event.metaKey) && event.key === 'u') {
        event.preventDefault();
        editor.chain().focus().toggleUnderline().run();
        return;
      }
      
      // Heading shortcuts (Ctrl+1/2/3 / Cmd+1/2/3)
      if ((event.ctrlKey || event.metaKey) && event.key === '1') {
        event.preventDefault();
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key === '2') {
        event.preventDefault();
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key === '3') {
        event.preventDefault();
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        return;
      }
      
      // List shortcuts (Ctrl+Shift+8 for bullet, Ctrl+Shift+7 for numbered)
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === '8') {
        event.preventDefault();
        editor.chain().focus().toggleBulletList().run();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === '7') {
        event.preventDefault();
        editor.chain().focus().toggleOrderedList().run();
        return;
      }
      
      // Code shortcut (Ctrl+` / Cmd+`)
      if ((event.ctrlKey || event.metaKey) && event.key === '`') {
        event.preventDefault();
        editor.chain().focus().toggleCode().run();
        return;
      }
      
      // Quote shortcut (Ctrl+Shift+> / Cmd+Shift+>)
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === '>') {
        event.preventDefault();
        editor.chain().focus().toggleBlockquote().run();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleManualSave, editor]);

  // Update title when it changes
  useEffect(() => {
    if (title !== note.title) {
      setHasUnsavedChanges(true);
      // Debounce title changes too
      const timeoutId = setTimeout(() => {
        if (title.trim() !== note.title) {
          debouncedSave({ title: title.trim() });
        }
      }, 2000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [title, note.title, debouncedSave]);

  const exportNote = () => {
    const exportUrl = `/api/courses/${note.course_id}/notes/${note.id}/export`;
    window.open(exportUrl, '_blank');
  };

  if (!editor) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full bg-white/95 backdrop-blur-sm flex flex-col relative rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm">
        {/* Left side - Back button and sidebar toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2 hover:bg-slate-100/80 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          {!sidebarOpen && onToggleSidebar && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              className="hover:bg-slate-100/80 transition-colors"
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {/* Center - Note title with larger font */}
        <div className="flex-1 flex justify-center h-full items-center">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title..."
            className="text-3xl font-bold border-none shadow-none focus-visible:ring-0 p-0 min-w-0 text-center max-w-md bg-transparent placeholder:text-slate-400"
          />
        </div>
        
        {/* Right side - Save status and action buttons */}
        <div className="flex items-center gap-3">
          {isSaving && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </div>
          )}
          {lastSaved && !isSaving && (
            <div className="text-sm text-slate-500">
              Saved {lastSaved.toLocaleTimeString()}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualSave}
            disabled={isSaving || !hasUnsavedChanges}
            className="flex items-center gap-2 border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <Save className="h-4 w-4" />
            {hasUnsavedChanges ? "Save" : "Saved"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportNote}
            className="flex items-center gap-2 border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
      
      {/* Editor */}
      <div className="flex-1 overflow-hidden relative bg-slate-50/30" ref={editorRef}>
        <EditorContent 
          editor={editor} 
          className="h-full"
        />
        
        {/* Floating Toolbar */}
        {showFloatingToolbar && editor && (
          <div
            className="absolute z-50 bg-white/95 backdrop-blur-sm border border-slate-200/60 rounded-xl shadow-lg shadow-slate-200/50 p-2 flex items-center gap-1 transform -translate-x-1/2 max-w-[90vw] overflow-x-auto"
            style={{
              left: `${toolbarPosition.x}px`,
              top: `${toolbarPosition.y}px`,
            }}
          >
            {/* Text Formatting */}
            <Button
              variant={editor.isActive('bold') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className="h-8 w-8 p-0 hover:bg-slate-100/80 transition-colors"
              title="Bold (Ctrl+B)"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant={editor.isActive('italic') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className="h-8 w-8 p-0 hover:bg-slate-100/80 transition-colors"
              title="Italic (Ctrl+I)"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant={editor.isActive('underline') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className="h-8 w-8 p-0 hover:bg-slate-100/80 transition-colors"
              title="Underline (Ctrl+U)"
            >
              <UnderlineIcon className="h-4 w-4" />
            </Button>
            
            {/* Separator */}
            <div className="w-px h-6 bg-slate-300/60 mx-1" />
            
            {/* Headings */}
            <Button
              variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className="h-8 w-8 p-0"
              title="Heading 1 (Ctrl+1)"
            >
              <Heading1 className="h-4 w-4" />
            </Button>
            <Button
              variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className="h-8 w-8 p-0"
              title="Heading 2 (Ctrl+2)"
            >
              <Heading2 className="h-4 w-4" />
            </Button>
            <Button
              variant={editor.isActive('heading', { level: 3 }) ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className="h-8 w-8 p-0"
              title="Heading 3 (Ctrl+3)"
            >
              <Heading3 className="h-4 w-4" />
            </Button>
            
            {/* Separator */}
            <div className="w-px h-6 bg-slate-300/60 mx-1" />
            
            {/* Lists */}
            <Button
              variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className="h-8 w-8 p-0"
              title="Bullet List (Ctrl+Shift+8)"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className="h-8 w-8 p-0"
              title="Numbered List (Ctrl+Shift+7)"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            
            {/* Separator */}
            <div className="w-px h-6 bg-slate-300/60 mx-1" />
            
            {/* Code and Quote */}
            <Button
              variant={editor.isActive('code') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleCode().run()}
              className="h-8 w-8 p-0"
              title="Inline Code (Ctrl+`)"
            >
              <Code className="h-4 w-4" />
            </Button>
            <Button
              variant={editor.isActive('blockquote') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className="h-8 w-8 p-0"
              title="Quote (Ctrl+Shift+>)"
            >
              <Quote className="h-4 w-4" />
            </Button>
            
            {/* Separator */}
            <div className="w-px h-6 bg-slate-300/60 mx-1" />
            
            {/* Link */}
            <Button
              variant={editor.isActive('link') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                const url = window.prompt('Enter URL:');
                if (url) {
                  editor.chain().focus().setLink({ href: url }).run();
                }
              }}
              className="h-8 w-8 p-0"
              title="Add Link"
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
