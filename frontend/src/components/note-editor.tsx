"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { InlineMath } from "@/lib/tiptap/inline-math";
import { BlockMath } from "@/lib/tiptap/block-math";
import { MathInputRules, MathPasteRules } from "@/lib/tiptap/math-input-rule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Menu,
  Sigma,
  ChevronDown,
  FileText,
  Search,
  X,
  HelpCircle,
  Brain
} from "lucide-react";
import { useUpdateNote } from "@/lib/hooks/useNotes";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useModules } from "@/lib/hooks/useModules";
import { useQuizzes } from "@/lib/hooks/useQuizzes";
import { useFlashcardDecks } from "@/lib/hooks/useFlashcards";
import { Module, ModuleItem } from "@/lib/types/course";
import { authenticatedFetch } from "@/lib/utils/apiClient";

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
  const [showSlashCommand, setShowSlashCommand] = useState(false);
  const [slashCommandPosition, setSlashCommandPosition] = useState({ x: 0, y: 0 });
  const [slashCommandQuery, setSlashCommandQuery] = useState("");
  const [selectedSlashCommandIndex, setSelectedSlashCommandIndex] = useState(0);
  const [showModuleSelector, setShowModuleSelector] = useState(false);
  const [moduleSearchQuery, setModuleSearchQuery] = useState("");
  const [showQuizSelector, setShowQuizSelector] = useState(false);
  const [quizSearchQuery, setQuizSearchQuery] = useState("");
  const [showFlashcardSelector, setShowFlashcardSelector] = useState(false);
  const [flashcardSearchQuery, setFlashcardSearchQuery] = useState("");
  const [showLinePlaceholder, setShowLinePlaceholder] = useState(false);
  const [linePlaceholderPosition, setLinePlaceholderPosition] = useState({ x: 0, y: 0 });
  const router = useRouter();
  const updateNote = useUpdateNote();
  const editorRef = useRef<HTMLDivElement>(null);
  const { data: modules = [] } = useModules(note.course_id);
  
  // Get user ID for quizzes and flashcards
  const [userId, setUserId] = useState<string>("");
  useEffect(() => {
    const getUserId = async () => {
      const { createClient } = await import("@/lib/utils/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUserId();
  }, []);
  
  const { data: quizzes = [] } = useQuizzes(note.course_id, userId);
  const { data: flashcardDecks = [] } = useFlashcardDecks(note.course_id, userId);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
          HTMLAttributes: {
            class: 'heading',
          },
        },
        bulletList: {
          HTMLAttributes: {
            class: 'bullet-list',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'ordered-list',
          },
        },
        listItem: {
          HTMLAttributes: {
            class: 'list-item',
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: 'blockquote',
          },
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'code-block',
          },
        },
        code: {
          HTMLAttributes: {
            class: 'inline-code',
          },
        },
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'doc') {
            return "Start writing your note... Type / for formatting options and to attach modules, quizzes, or flashcard decks";
          }
          return "Type / for formatting options and to attach modules, quizzes, or flashcard decks";
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline cursor-pointer hover:text-blue-700",
          target: "_self",
        },
      }),
      InlineMath,
      BlockMath,
      MathInputRules,
      MathPasteRules,
    ],
    content: note.content,
    immediatelyRender: false,
    autofocus: false,
    onUpdate: ({ editor }) => {
      // Mark that there are unsaved changes
      setHasUnsavedChanges(true);
      // Auto-save on content change (debounced)
      debouncedSave(editor.getJSON());
      
      // Check for slash command
      const { state } = editor;
      const { selection } = state;
      const { $from } = selection;
      
      // Get the text before the cursor
      const textBefore = $from.nodeBefore?.textContent || '';
      const textAfter = $from.nodeAfter?.textContent || '';
      const currentText = textBefore + textAfter;
      
      // Check if we just typed a slash at the beginning of a line or after whitespace
      const slashIndex = currentText.lastIndexOf('/');
      if (slashIndex !== -1) {
        const beforeSlash = currentText.substring(0, slashIndex);
        const afterSlash = currentText.substring(slashIndex + 1);
        
        // Check if slash is at start of line or after whitespace/newline
        const isAtLineStart = beforeSlash === '' || beforeSlash.endsWith('\n') || beforeSlash.endsWith(' ');
        
        if (isAtLineStart && !afterSlash.includes(' ')) {
          // Show slash command menu
          setShowSlashCommand(true);
          setSlashCommandQuery(afterSlash);
          setSelectedSlashCommandIndex(0);
          
          // Position the menu
          const editorRect = editorRef.current?.getBoundingClientRect();
          if (editorRect) {
            const coords = editor.view.coordsAtPos($from.pos);
            setSlashCommandPosition({
              x: coords.left - editorRect.left,
              y: coords.top - editorRect.top
            });
          }
        } else {
          setShowSlashCommand(false);
        }
      } else {
        setShowSlashCommand(false);
      }
      
      // Check if we're at the start of a new line (for line placeholder)
      const isAtLineStart = $from.parentOffset === 0;
      const isEmptyLine = $from.parent.textContent === '';
      
      if (isAtLineStart && isEmptyLine && !showSlashCommand) {
        // Show line placeholder
        setShowLinePlaceholder(true);
        
        // Position the placeholder
        const editorRect = editorRef.current?.getBoundingClientRect();
        if (editorRect) {
          const coords = editor.view.coordsAtPos($from.pos);
          setLinePlaceholderPosition({
            x: coords.left - editorRect.left,
            y: coords.top - editorRect.top
          });
        }
      } else {
        setShowLinePlaceholder(false);
      }
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
          
           // Handle horizontal boundaries with padding
           const padding = 70; // Extra padding from edges
           const clampedX = Math.max(
             toolbarWidth / 2 + padding, // Half toolbar width + padding from left edge
             Math.min(
               relativeX,
               editorRect.width - toolbarWidth / 2 - padding // Half toolbar width + padding from right edge
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
        class: "note-editor-prose prose prose-base sm:prose-lg lg:prose-xl xl:prose-2xl mx-auto focus:outline-none h-full p-8 font-math text-black",
        style: "font-family: 'Source Serif Pro', 'STIX Two Math', 'Asana Math', 'Cambria Math', 'Computer Modern', 'Latin Modern Math', Georgia, serif;",
        spellcheck: "true",
      },
      handleDOMEvents: {
        keydown: (view, event) => {
          // Let TipTap handle its own shortcuts
          return false;
        },
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
    if (!editor) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Save shortcut (Ctrl+S / Cmd+S) - works globally
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        handleManualSave();
        return;
      }
      
      // Handle slash command navigation
      if (showSlashCommand) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSelectedSlashCommandIndex(prev => 
            Math.min(prev + 1, getSlashCommandOptions().length - 1)
          );
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSelectedSlashCommandIndex(prev => Math.max(prev - 1, 0));
        } else if (event.key === 'Enter') {
          event.preventDefault();
          executeSlashCommand();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          setShowSlashCommand(false);
        }
      }
    };

    // Add listener to editor element instead of document
    const editorElement = editor.view.dom;
    editorElement.addEventListener('keydown', handleKeyDown);
    
    // Also add to document for save shortcut
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      editorElement.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
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

  const exportNote = async () => {
    try {
      const exportUrl = `/api/courses/${note.course_id}/notes/${note.id}/export`;
      const response = await authenticatedFetch(exportUrl);
      
      if (!response.ok) {
        throw new Error('Failed to export note');
      }
      
      // Get the filename from the Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `note_${note.id}.md`;
      
      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting note:', error);
      // You could add a toast notification here to show the error to the user
    }
  };

  // Get all available module items for reference
  const getAllModuleItems = (): (ModuleItem & { moduleName: string })[] => {
    const items: (ModuleItem & { moduleName: string })[] = [];
    modules.forEach(module => {
      module.moduleItems.forEach(item => {
        items.push({
          ...item,
          moduleName: module.name
        });
      });
    });
    return items;
  };

  // Get slash command options
  const getSlashCommandOptions = () => {
    const formattingOptions: Array<{
      id: string;
      label: string;
      icon: any;
      action: () => void;
      subtitle?: string;
    }> = [
      { id: 'h1', label: 'Heading 1', icon: Heading1, action: () => editor?.chain().focus().toggleHeading({ level: 1 }).run() },
      { id: 'h2', label: 'Heading 2', icon: Heading2, action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run() },
      { id: 'h3', label: 'Heading 3', icon: Heading3, action: () => editor?.chain().focus().toggleHeading({ level: 3 }).run() },
      { id: 'bold', label: 'Bold', icon: Bold, action: () => editor?.chain().focus().toggleBold().run() },
      { id: 'italic', label: 'Italic', icon: Italic, action: () => editor?.chain().focus().toggleItalic().run() },
      { id: 'underline', label: 'Underline', icon: UnderlineIcon, action: () => editor?.chain().focus().toggleUnderline().run() },
      { id: 'bullet', label: 'Bullet List', icon: List, action: () => editor?.chain().focus().toggleBulletList().run() },
      { id: 'numbered', label: 'Numbered List', icon: ListOrdered, action: () => editor?.chain().focus().toggleOrderedList().run() },
      { id: 'quote', label: 'Quote', icon: Quote, action: () => editor?.chain().focus().toggleBlockquote().run() },
      { id: 'code', label: 'Code Block', icon: Code, action: () => editor?.chain().focus().toggleCodeBlock().run() },
      { id: 'math', label: 'Math', icon: Sigma, action: () => {
        const selectedText = editor?.state.doc.textBetween(
          editor.state.selection.from,
          editor.state.selection.to
        );
        const latex = selectedText || 'x^2';
        editor?.chain().focus().insertContent({
          type: 'inlineMath',
          attrs: { latex }
        }).run();
      }},
    ];

    // Add attachment options
    const attachmentOptions = [];
    
    if (modules.length > 0) {
      attachmentOptions.push({
        id: 'attach-module',
        label: 'Attach Module Item',
        icon: FileText,
        action: () => {
          setShowModuleSelector(true);
          setShowSlashCommand(false);
        }
      });
    }
    
    if (quizzes.length > 0) {
      attachmentOptions.push({
        id: 'attach-quiz',
        label: 'Attach Quiz',
        icon: HelpCircle,
        action: () => {
          setShowQuizSelector(true);
          setShowSlashCommand(false);
        }
      });
    }
    
    if (flashcardDecks.length > 0) {
      attachmentOptions.push({
        id: 'attach-flashcard',
        label: 'Attach Flashcard Deck',
        icon: Brain,
        action: () => {
          setShowFlashcardSelector(true);
          setShowSlashCommand(false);
        }
      });
    }

    return [...formattingOptions, ...attachmentOptions];
  };

  // Get href for module item
  const getModuleItemHref = (item: ModuleItem) => {
    switch (item.type) {
      case 'File':
        return `/courses/${note.course_id}/files/${item.lmsContentId}`;
      case 'Page':
        return `/courses/${note.course_id}/pages/${item.lmsContentId}`;
      case 'Discussion':
        return `/courses/${note.course_id}/discussion_topics/${item.lmsContentId}`;
      default:
        return `/courses/${note.course_id}/files/${item.lmsContentId}`;
    }
  };

  // Get filtered module items for the popup
  const getFilteredModuleItems = () => {
    const allItems = getAllModuleItems();
    if (!moduleSearchQuery.trim()) return allItems;
    
    const query = moduleSearchQuery.toLowerCase();
    return allItems.filter(item => 
      item.name.toLowerCase().includes(query) ||
      item.moduleName.toLowerCase().includes(query)
    );
  };

  // Handle module item selection
  const handleModuleItemSelect = (item: ModuleItem & { moduleName: string }) => {
    const href = getModuleItemHref(item);
    editor?.chain().focus().insertContent({
      type: 'text',
      text: item.name,
      marks: [{
        type: 'link',
        attrs: { href }
      }]
    }).run();
    setShowModuleSelector(false);
    setModuleSearchQuery("");
    setTimeout(() => editor?.commands.focus(), 0);
  };

  // Handle quiz selection
  const handleQuizSelect = (quiz: any) => {
    const href = `/courses/${note.course_id}/quiz/${quiz.id}`;
    editor?.chain().focus().insertContent({
      type: 'text',
      text: quiz.name,
      marks: [{
        type: 'link',
        attrs: { href }
      }]
    }).run();
    setShowQuizSelector(false);
    setQuizSearchQuery("");
    setTimeout(() => editor?.commands.focus(), 0);
  };

  // Handle flashcard deck selection
  const handleFlashcardSelect = (deck: any) => {
    const href = `/courses/${note.course_id}/flashcards/${deck.id}`;
    editor?.chain().focus().insertContent({
      type: 'text',
      text: deck.name,
      marks: [{
        type: 'link',
        attrs: { href }
      }]
    }).run();
    setShowFlashcardSelector(false);
    setFlashcardSearchQuery("");
    setTimeout(() => editor?.commands.focus(), 0);
  };

  // Get filtered quizzes
  const getFilteredQuizzes = () => {
    if (!quizSearchQuery.trim()) return quizzes;
    const query = quizSearchQuery.toLowerCase();
    return quizzes.filter(quiz => 
      quiz.name.toLowerCase().includes(query) ||
      (quiz.description && quiz.description.toLowerCase().includes(query))
    );
  };

  // Get filtered flashcard decks
  const getFilteredFlashcardDecks = () => {
    if (!flashcardSearchQuery.trim()) return flashcardDecks;
    const query = flashcardSearchQuery.toLowerCase();
    return flashcardDecks.filter(deck => 
      deck.name.toLowerCase().includes(query) ||
      (deck.description && deck.description.toLowerCase().includes(query))
    );
  };

  // Execute selected slash command
  const executeSlashCommand = () => {
    const options = getSlashCommandOptions();
    const selectedOption = options[selectedSlashCommandIndex];
    if (selectedOption) {
      // Remove the slash and any text after it
      const { state } = editor!;
      const { selection } = state;
      const { $from } = selection;
      
      // Find the position of the slash
      const textBefore = $from.nodeBefore?.textContent || '';
      const textAfter = $from.nodeAfter?.textContent || '';
      const currentText = textBefore + textAfter;
      const slashIndex = currentText.lastIndexOf('/');
      
      if (slashIndex !== -1) {
        // Calculate the position to delete from (the slash position)
        const deleteFrom = $from.pos - (textAfter.length + 1); // +1 for the slash itself
        
        // Delete the slash and everything after it
        editor?.chain()
          .focus()
          .deleteRange({ from: deleteFrom, to: $from.pos })
          .run();
      }
      
      // Execute the selected action
      selectedOption.action();
      setShowSlashCommand(false);
      setTimeout(() => editor?.commands.focus(), 0);
    }
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
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title..."
            className="text-3xl font-bold border-none shadow-none focus-visible:ring-0 p-0 min-w-0 text-center max-w-lg bg-transparent placeholder:text-slate-400 outline-none"
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
      <div 
        className="flex-1 overflow-y-auto relative bg-slate-50/30" 
        ref={editorRef}
        onClick={() => editor?.commands.focus()}
      >
        <EditorContent 
          editor={editor} 
          className="min-h-full cursor-text"
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
              onClick={() => {
                editor.chain().focus().toggleBold().run();
                // Ensure focus remains on editor after button click
                setTimeout(() => editor.commands.focus(), 0);
              }}
              className={cn(
                "h-8 w-8 p-0 transition-all",
                editor.isActive('bold') 
                  ? "bg-blue-600 text-white hover:bg-blue-700" 
                  : "hover:bg-slate-100/80"
              )}
              title="Bold (Ctrl+B)"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant={editor.isActive('italic') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                editor.chain().focus().toggleItalic().run();
                // Ensure focus remains on editor after button click
                setTimeout(() => editor.commands.focus(), 0);
              }}
              className={cn(
                "h-8 w-8 p-0 transition-all",
                editor.isActive('italic') 
                  ? "bg-blue-600 text-white hover:bg-blue-700" 
                  : "hover:bg-slate-100/80"
              )}
              title="Italic (Ctrl+I)"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant={editor.isActive('underline') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                editor.chain().focus().toggleUnderline().run();
                // Ensure focus remains on editor after button click
                setTimeout(() => editor.commands.focus(), 0);
              }}
              className={cn(
                "h-8 w-8 p-0 transition-all",
                editor.isActive('underline') 
                  ? "bg-blue-600 text-white hover:bg-blue-700" 
                  : "hover:bg-slate-100/80"
              )}
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
              onClick={() => {
                editor.chain().focus().toggleHeading({ level: 1 }).run();
                setTimeout(() => editor.commands.focus(), 0);
              }}
              className={cn(
                "h-8 w-8 p-0 transition-all",
                editor.isActive('heading', { level: 1 }) 
                  ? "bg-blue-600 text-white hover:bg-blue-700" 
                  : "hover:bg-slate-100/80"
              )}
              title="Heading 1 (Ctrl+1)"
            >
              <Heading1 className="h-4 w-4" />
            </Button>
            <Button
              variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                editor.chain().focus().toggleHeading({ level: 2 }).run();
                setTimeout(() => editor.commands.focus(), 0);
              }}
              className={cn(
                "h-8 w-8 p-0 transition-all",
                editor.isActive('heading', { level: 2 }) 
                  ? "bg-blue-600 text-white hover:bg-blue-700" 
                  : "hover:bg-slate-100/80"
              )}
              title="Heading 2 (Ctrl+2)"
            >
              <Heading2 className="h-4 w-4" />
            </Button>
            <Button
              variant={editor.isActive('heading', { level: 3 }) ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                editor.chain().focus().toggleHeading({ level: 3 }).run();
                setTimeout(() => editor.commands.focus(), 0);
              }}
              className={cn(
                "h-8 w-8 p-0 transition-all",
                editor.isActive('heading', { level: 3 }) 
                  ? "bg-blue-600 text-white hover:bg-blue-700" 
                  : "hover:bg-slate-100/80"
              )}
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
              onClick={() => {
                editor.chain().focus().toggleBulletList().run();
                setTimeout(() => editor.commands.focus(), 0);
              }}
              className={cn(
                "h-8 w-8 p-0 transition-all",
                editor.isActive('bulletList') 
                  ? "bg-blue-600 text-white hover:bg-blue-700" 
                  : "hover:bg-slate-100/80"
              )}
              title="Bullet List (Ctrl+Shift+8)"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                editor.chain().focus().toggleOrderedList().run();
                setTimeout(() => editor.commands.focus(), 0);
              }}
              className={cn(
                "h-8 w-8 p-0 transition-all",
                editor.isActive('orderedList') 
                  ? "bg-blue-600 text-white hover:bg-blue-700" 
                  : "hover:bg-slate-100/80"
              )}
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
              onClick={() => {
                editor.chain().focus().toggleCode().run();
                setTimeout(() => editor.commands.focus(), 0);
              }}
              className={cn(
                "h-8 w-8 p-0 transition-all",
                editor.isActive('code') 
                  ? "bg-blue-600 text-white hover:bg-blue-700" 
                  : "hover:bg-slate-100/80"
              )}
              title="Inline Code (Ctrl+`)"
            >
              <Code className="h-4 w-4" />
            </Button>
            <Button
              variant={editor.isActive('blockquote') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                editor.chain().focus().toggleBlockquote().run();
                setTimeout(() => editor.commands.focus(), 0);
              }}
              className={cn(
                "h-8 w-8 p-0 transition-all",
                editor.isActive('blockquote') 
                  ? "bg-blue-600 text-white hover:bg-blue-700" 
                  : "hover:bg-slate-100/80"
              )}
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
                  setTimeout(() => editor.commands.focus(), 0);
                }
              }}
              className={cn(
                "h-8 w-8 p-0 transition-all",
                editor.isActive('link') 
                  ? "bg-blue-600 text-white hover:bg-blue-700" 
                  : "hover:bg-slate-100/80"
              )}
              title="Add Link"
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
            
            {/* Separator */}
            <div className="w-px h-6 bg-slate-300/60 mx-1" />
            
            {/* Math */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-1 hover:bg-slate-100/80 transition-colors"
                  title="Insert Math"
                >
                  <Sigma className="h-4 w-4" />
                  <ChevronDown className="h-3 w-3 ml-0.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={() => {
                    const selectedText = editor.state.doc.textBetween(
                      editor.state.selection.from,
                      editor.state.selection.to
                    );
                    const latex = selectedText || 'x^2';
                    editor.chain().focus().insertContent({
                      type: 'inlineMath',
                      attrs: { latex }
                    }).run();
                    setTimeout(() => editor.commands.focus(), 0);
                  }}
                >
                  <span className="mr-2">$</span>
                  Inline Math
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const selectedText = editor.state.doc.textBetween(
                      editor.state.selection.from,
                      editor.state.selection.to
                    );
                    const latex = selectedText || '\\frac{a}{b}';
                    editor.chain().focus().insertContent({
                      type: 'blockMath',
                      attrs: { latex }
                    }).run();
                    setTimeout(() => editor.commands.focus(), 0);
                  }}
                >
                  <span className="mr-2">$$</span>
                  Block Math
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        
        {/* Slash Command Dropdown */}
        {showSlashCommand && (
          <div
            className="absolute z-50 bg-white/95 backdrop-blur-sm border border-slate-200/60 rounded-xl shadow-lg shadow-slate-200/50 p-2 max-w-sm w-full max-h-80 overflow-y-auto"
            style={{
              left: `${slashCommandPosition.x}px`,
              top: `${slashCommandPosition.y + 20}px`,
            }}
          >
            <div className="space-y-1">
              {getSlashCommandOptions().map((option, index) => {
                const IconComponent = option.icon;
                return (
                  <button
                    key={option.id}
                    onClick={() => {
                      // Remove the slash and any text after it
                      const { state } = editor!;
                      const { selection } = state;
                      const { $from } = selection;
                      
                      // Find the position of the slash
                      const textBefore = $from.nodeBefore?.textContent || '';
                      const textAfter = $from.nodeAfter?.textContent || '';
                      const currentText = textBefore + textAfter;
                      const slashIndex = currentText.lastIndexOf('/');
                      
                      if (slashIndex !== -1) {
                        // Calculate the position to delete from (the slash position)
                        const deleteFrom = $from.pos - (textAfter.length + 1); // +1 for the slash itself
                        
                        // Delete the slash and everything after it
                        editor?.chain()
                          .focus()
                          .deleteRange({ from: deleteFrom, to: $from.pos })
                          .run();
                      }
                      
                      // Execute the selected action
                      option.action();
                      setShowSlashCommand(false);
                      setTimeout(() => editor?.commands.focus(), 0);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                      index === selectedSlashCommandIndex
                        ? "bg-blue-100 text-blue-900"
                        : "hover:bg-slate-100/80"
                    )}
                  >
                    <IconComponent className="h-4 w-4 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {option.label}
                      </div>
                      {'subtitle' in option && option.subtitle && (
                        <div className="text-xs text-slate-500 truncate">
                          {option.subtitle}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Line Placeholder */}
        {showLinePlaceholder && (
          <div
            className="absolute z-40 pointer-events-none"
            style={{
              left: `${linePlaceholderPosition.x}px`,
              top: `${linePlaceholderPosition.y}px`,
            }}
          >
            <div className="text-slate-400 text-sm italic">
              Type / for formatting options and to attach modules, quizzes, or flashcard decks
            </div>
          </div>
        )}
      </div>
      
      {/* Module Item Selector Dialog */}
      <Dialog open={showModuleSelector} onOpenChange={setShowModuleSelector}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Attach Module Item</DialogTitle>
          </DialogHeader>
          
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search module items..."
              value={moduleSearchQuery}
              onChange={(e) => setModuleSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Module Items List */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {getFilteredModuleItems().map((item) => (
              <button
                key={item.lmsContentId}
                onClick={() => handleModuleItemSelect(item)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-slate-50 transition-colors text-left"
              >
                <div className="flex-shrink-0">
                  <FileText className="h-5 w-5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {item.name}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {item.moduleName} • {item.type}
                  </div>
                </div>
              </button>
            ))}
            
            {getFilteredModuleItems().length === 0 && (
              <div className="text-center py-8 text-slate-500">
                {moduleSearchQuery ? 'No module items found matching your search.' : 'No module items available.'}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Quiz Selector Dialog */}
      <Dialog open={showQuizSelector} onOpenChange={setShowQuizSelector}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Attach Quiz</DialogTitle>
          </DialogHeader>
          
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search quizzes..."
              value={quizSearchQuery}
              onChange={(e) => setQuizSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Quizzes List */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {getFilteredQuizzes().map((quiz) => (
              <button
                key={quiz.id}
                onClick={() => handleQuizSelect(quiz)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-slate-50 transition-colors text-left"
              >
                <div className="flex-shrink-0">
                  <HelpCircle className="h-5 w-5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {quiz.name}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {quiz.question_count} questions • {quiz.difficulty}
                  </div>
                </div>
              </button>
            ))}
            
            {getFilteredQuizzes().length === 0 && (
              <div className="text-center py-8 text-slate-500">
                {quizSearchQuery ? 'No quizzes found matching your search.' : 'No quizzes available.'}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Flashcard Selector Dialog */}
      <Dialog open={showFlashcardSelector} onOpenChange={setShowFlashcardSelector}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Attach Flashcard Deck</DialogTitle>
          </DialogHeader>
          
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search flashcard decks..."
              value={flashcardSearchQuery}
              onChange={(e) => setFlashcardSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Flashcard Decks List */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {getFilteredFlashcardDecks().map((deck) => (
              <button
                key={deck.id}
                onClick={() => handleFlashcardSelect(deck)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-slate-50 transition-colors text-left"
              >
                <div className="flex-shrink-0">
                  <Brain className="h-5 w-5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {deck.name}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {deck.card_count} cards • {deck.card_type}
                  </div>
                </div>
              </button>
            ))}
            
            {getFilteredFlashcardDecks().length === 0 && (
              <div className="text-center py-8 text-slate-500">
                {flashcardSearchQuery ? 'No flashcard decks found matching your search.' : 'No flashcard decks available.'}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
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
