"use client";

import { useState, useEffect, useCallback, useRef, startTransition } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { Youtube } from "@tiptap/extension-youtube";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { Dropcursor } from "@tiptap/extension-dropcursor";
import { createLowlight } from "lowlight";
import languages from "highlight.js/lib/languages/*";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import java from "highlight.js/lib/languages/java";
import cpp from "highlight.js/lib/languages/cpp";
import c from "highlight.js/lib/languages/c";
import csharp from "highlight.js/lib/languages/csharp";
import php from "highlight.js/lib/languages/php";
import ruby from "highlight.js/lib/languages/ruby";
import go from "highlight.js/lib/languages/go";
import rust from "highlight.js/lib/languages/rust";
import swift from "highlight.js/lib/languages/swift";
import kotlin from "highlight.js/lib/languages/kotlin";
import scala from "highlight.js/lib/languages/scala";
import r from "highlight.js/lib/languages/r";
import sql from "highlight.js/lib/languages/sql";
import html from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import scss from "highlight.js/lib/languages/scss";
import json from "highlight.js/lib/languages/json";
import yaml from "highlight.js/lib/languages/yaml";
import markdown from "highlight.js/lib/languages/markdown";
import bash from "highlight.js/lib/languages/bash";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import nginx from "highlight.js/lib/languages/nginx";
import apache from "highlight.js/lib/languages/apache";
import diff from "highlight.js/lib/languages/diff";
import { InlineMath } from "@/lib/tiptap/inline-math";

// Create lowlight instance and register languages
const lowlight = createLowlight();

// Register all the languages we support
lowlight.register('javascript', javascript);
lowlight.register('typescript', typescript);
lowlight.register('python', python);
lowlight.register('java', java);
lowlight.register('cpp', cpp);
lowlight.register('c', c);
lowlight.register('csharp', csharp);
lowlight.register('php', php);
lowlight.register('ruby', ruby);
lowlight.register('go', go);
lowlight.register('rust', rust);
lowlight.register('swift', swift);
lowlight.register('kotlin', kotlin);
lowlight.register('scala', scala);
lowlight.register('r', r);
lowlight.register('sql', sql);
lowlight.register('html', html);
lowlight.register('css', css);
lowlight.register('scss', scss);
lowlight.register('json', json);
lowlight.register('yaml', yaml);
lowlight.register('markdown', markdown);
lowlight.register('bash', bash);
lowlight.register('shell', bash); // Use bash for shell
lowlight.register('powershell', bash); // Use bash for powershell
lowlight.register('dockerfile', dockerfile);
lowlight.register('nginx', nginx);
lowlight.register('apache', apache);
lowlight.register('diff', diff);

// Common programming languages for code blocks
const PROGRAMMING_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'csharp', label: 'C#' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'scala', label: 'Scala' },
  { value: 'r', label: 'R' },
  { value: 'matlab', label: 'MATLAB' },
  { value: 'sql', label: 'SQL' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'scss', label: 'SCSS' },
  { value: 'sass', label: 'Sass' },
  { value: 'less', label: 'Less' },
  { value: 'json', label: 'JSON' },
  { value: 'xml', label: 'XML' },
  { value: 'yaml', label: 'YAML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'bash', label: 'Bash' },
  { value: 'shell', label: 'Shell' },
  { value: 'powershell', label: 'PowerShell' },
  { value: 'dockerfile', label: 'Dockerfile' },
  { value: 'nginx', label: 'Nginx' },
  { value: 'apache', label: 'Apache' },
  { value: 'diff', label: 'Diff' },
  { value: 'plaintext', label: 'Plain Text' },
];
import { BlockMath } from "@/lib/tiptap/block-math";
import { MathInputRules, MathPasteRules } from "@/lib/tiptap/math-input-rule";
import { NoteTocSidebar } from "@/components/note-toc-sidebar";
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
  Brain,
  ImageIcon,
  Minus,
  Table as TableIcon,
  Strikethrough,
  Youtube as YoutubeIcon,
  ChevronRight,
  Palette,
  Type,
  Plus,
  Trash2,
  Columns,
  Rows,
  Merge,
  Split
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
  const [showAtCommand, setShowAtCommand] = useState(false);
  const [atCommandPosition, setAtCommandPosition] = useState({ x: 0, y: 0 });
  const [atCommandQuery, setAtCommandQuery] = useState("");
  const [selectedAtCommandIndex, setSelectedAtCommandIndex] = useState(0);
  const [showModuleSelector, setShowModuleSelector] = useState(false);
  const [moduleSearchQuery, setModuleSearchQuery] = useState("");
  const [showQuizSelector, setShowQuizSelector] = useState(false);
  const [quizSearchQuery, setQuizSearchQuery] = useState("");
  const [showFlashcardSelector, setShowFlashcardSelector] = useState(false);
  const [flashcardSearchQuery, setFlashcardSearchQuery] = useState("");
  const [showLinePlaceholder, setShowLinePlaceholder] = useState(false);
  const [linePlaceholderPosition, setLinePlaceholderPosition] = useState({ x: 0, y: 0 });
  const [tocAnchors, setTocAnchors] = useState<any[]>([]);
  const [showToc, setShowToc] = useState(false);
  const [showYoutubeDialog, setShowYoutubeDialog] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [languageSearchQuery, setLanguageSearchQuery] = useState("");
  const [showTableToolbar, setShowTableToolbar] = useState(false);
  const [tableToolbarPosition, setTableToolbarPosition] = useState({ x: 0, y: 0 });
  const router = useRouter();
  const updateNote = useUpdateNote();
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
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
            return "Start writing your note... Type / for formatting options or @ to embed content";
          }
          return "Type / for formatting options or @ to embed content";
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
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          width: 600,
          height: 'auto',
        },
      }).extend({
        addNodeView() {
          return ({ node, updateAttributes, getPos, editor }: any) => {
            const container = document.createElement('div');
            container.className = 'relative inline-block';
            
            const img = document.createElement('img');
            img.src = node.attrs.src;
            img.alt = node.attrs.alt || '';
            img.className = 'note-image rounded-xl border-2 border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 block';
            img.style.width = `${node.attrs.width || 600}px`;
            img.style.height = node.attrs.height === 'auto' ? 'auto' : `${node.attrs.height}px`;
            img.style.maxWidth = '800px';
            img.style.marginLeft = 'auto';
            img.style.marginRight = 'auto';
            
            container.appendChild(img);
            
            // Add resize handles when selected
            const updateSelection = () => {
              const { from, to } = editor.state.selection;
              const pos = getPos();
              const isSelected = pos !== undefined && from <= pos && pos <= to;
              
              // Remove existing handles
              const existingHandles = container.querySelectorAll('.resize-handle');
              existingHandles.forEach(handle => handle.remove());
              
              if (isSelected) {
                const resizeHandles = [
                  { id: 'top-left', className: 'top-0 left-0 cursor-nw-resize' },
                  { id: 'top-right', className: 'top-0 right-0 cursor-ne-resize' },
                  { id: 'bottom-left', className: 'bottom-0 left-0 cursor-sw-resize' },
                  { id: 'bottom-right', className: 'bottom-0 right-0 cursor-se-resize' },
                  { id: 'top', className: 'top-0 left-1/2 transform -translate-x-1/2 cursor-n-resize' },
                  { id: 'bottom', className: 'bottom-0 left-1/2 transform -translate-x-1/2 cursor-s-resize' },
                  { id: 'left', className: 'left-0 top-1/2 transform -translate-y-1/2 cursor-w-resize' },
                  { id: 'right', className: 'right-0 top-1/2 transform -translate-y-1/2 cursor-e-resize' },
                ];
                
                resizeHandles.forEach((handle) => {
                  const handleEl = document.createElement('div');
                  handleEl.className = `absolute w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-lg resize-handle ${handle.className}`;
                  handleEl.style.pointerEvents = 'auto';
                  handleEl.style.zIndex = '10';
                  
                  let isResizing = false;
                  let startPos = { x: 0, y: 0 };
                  let startSize = { width: 0, height: 0 };
                  
                  const handleMouseDown = (e: MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    isResizing = true;
                    startPos = { x: e.clientX, y: e.clientY };
                    
                    // Use the current style dimensions of the image, which reflect the actual displayed size
                    const currentWidth = parseInt(img.style.width) || (node.attrs.width || 600);
                    const currentHeight = parseInt(img.style.height) || (node.attrs.height === 'auto' ? img.getBoundingClientRect().height : (node.attrs.height || 400));
                    
                    startSize = { 
                      width: currentWidth, 
                      height: currentHeight
                    };
                    
                    const handleMouseMove = (e: MouseEvent) => {
                      if (!isResizing) return;
                      
                      const deltaX = e.clientX - startPos.x;
                      const deltaY = e.clientY - startPos.y;
                      
                      let newWidth = startSize.width;
                      let newHeight = startSize.height;
                      
                      if (handle.id.includes('right')) {
                        newWidth = Math.max(100, startSize.width + deltaX);
                      }
                      if (handle.id.includes('left')) {
                        newWidth = Math.max(100, startSize.width - deltaX);
                      }
                      if (handle.id.includes('bottom')) {
                        newHeight = Math.max(50, startSize.height + deltaY);
                      }
                      if (handle.id.includes('top')) {
                        newHeight = Math.max(50, startSize.height - deltaY);
                      }
                      
                      // Only update the visual appearance during mouse move to avoid flushSync issues
                      img.style.width = `${newWidth}px`;
                      img.style.height = typeof newHeight === 'string' ? newHeight : `${newHeight}px`;
                    };
                    
                    const handleMouseUp = () => {
                      isResizing = false;
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                      
                      // Update the editor state with the final dimensions after resize is complete
                      // Use startTransition and setTimeout to avoid flushSync issues by deferring the editor update
                      startTransition(() => {
                        setTimeout(() => {
                          const pos = getPos();
                          if (pos !== undefined) {
                            const finalWidth = parseInt(img.style.width) || startSize.width;
                            const finalHeight = parseInt(img.style.height) || startSize.height;
                            
                            const newAttrs = {
                              ...node.attrs,
                              width: finalWidth,
                              height: finalHeight
                            };
                            
                            const tr = editor.state.tr.setNodeMarkup(pos, null, newAttrs);
                            editor.view.dispatch(tr);
                          }
                        }, 0);
                      });
                    };
                    
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  };
                  
                  handleEl.addEventListener('mousedown', handleMouseDown);
                  container.appendChild(handleEl);
                });
              }
            };
            
            // Listen for selection changes
            editor.on('selectionUpdate', updateSelection);
            updateSelection(); // Initial check
            
            return {
              dom: container,
              contentDOM: null,
              update: (updatedNode) => {
                if (updatedNode.type.name !== 'image') return false;
                img.src = updatedNode.attrs.src;
                img.alt = updatedNode.attrs.alt || '';
                img.style.width = `${updatedNode.attrs.width || 600}px`;
                img.style.height = updatedNode.attrs.height === 'auto' ? 'auto' : `${updatedNode.attrs.height}px`;
                updateSelection();
                return true;
              },
              destroy() {
                editor.off('selectionUpdate', updateSelection);
              },
            };
          };
        },
        addAttributes() {
          return {
            ...this.parent?.(),
            width: {
              default: 600,
              parseHTML: element => {
                const width = element.getAttribute('width');
                return width ? parseInt(width, 10) : 600;
              },
              renderHTML: attributes => {
                return {
                  width: attributes.width,
                };
              },
            },
            height: {
              default: 'auto',
              parseHTML: element => {
                const height = element.getAttribute('height');
                return height === 'auto' ? 'auto' : (height ? parseInt(height, 10) : 'auto');
              },
              renderHTML: attributes => {
                return {
                  height: attributes.height,
                };
              },
            },
          };
        },
      }),
      HorizontalRule,
      // Table extensions
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      // Color and styling
      TextStyle.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            fontSize: {
              default: null,
              parseHTML: element => element.style.fontSize || null,
              renderHTML: attributes => {
                if (!attributes.fontSize) {
                  return {};
                }
                return {
                  style: `font-size: ${attributes.fontSize}`,
                };
              },
            },
          };
        },
      }),
      Color,
      // YouTube
      Youtube.configure({
        controls: false,
      }),
      // Code block with syntax highlighting
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'javascript',
      }),
      // Drop cursor for drag and drop
      Dropcursor,
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
      
      // Extract headings for TOC
      extractHeadings();
      
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
          setShowAtCommand(false); // Hide @ command menu
          
          // Position the menu - defer DOM measurements to avoid flushSync issues
          startTransition(() => {
            setTimeout(() => {
              const editorRect = editorRef.current?.getBoundingClientRect();
              if (editorRect) {
                const coords = editor.view.coordsAtPos($from.pos);
                setSlashCommandPosition({
                  x: coords.left - editorRect.left,
                  y: coords.top - editorRect.top
                });
              }
            }, 0);
          });
        } else {
          setShowSlashCommand(false);
        }
      } else {
        setShowSlashCommand(false);
      }
      
      // Check for @ command
      const atIndex = currentText.lastIndexOf('@');
      if (atIndex !== -1) {
        const beforeAt = currentText.substring(0, atIndex);
        const afterAt = currentText.substring(atIndex + 1);
        
        // Check if @ is at start of line or after whitespace/newline
        const isAtLineStart = beforeAt === '' || beforeAt.endsWith('\n') || beforeAt.endsWith(' ');
        
        if (isAtLineStart && !afterAt.includes(' ')) {
          // Show @ command menu
          setShowAtCommand(true);
          setAtCommandQuery(afterAt);
          setSelectedAtCommandIndex(0);
          setShowSlashCommand(false); // Hide slash command menu
          
          // Position the menu - defer DOM measurements to avoid flushSync issues
          startTransition(() => {
            setTimeout(() => {
              const editorRect = editorRef.current?.getBoundingClientRect();
              if (editorRect) {
                const coords = editor.view.coordsAtPos($from.pos);
                setAtCommandPosition({
                  x: coords.left - editorRect.left,
                  y: coords.top - editorRect.top
                });
              }
            }, 0);
          });
        } else {
          setShowAtCommand(false);
        }
      } else {
        setShowAtCommand(false);
      }
      
      // Check if we're at the start of a new line (for line placeholder)
      const isAtLineStart = $from.parentOffset === 0;
      const isEmptyLine = $from.parent.textContent === '';
      
      if (isAtLineStart && isEmptyLine && !showSlashCommand && !showAtCommand) {
        // Show line placeholder
        setShowLinePlaceholder(true);
        
        // Position the placeholder - defer DOM measurements to avoid flushSync issues
        startTransition(() => {
          setTimeout(() => {
            const editorRect = editorRef.current?.getBoundingClientRect();
            if (editorRect) {
              const coords = editor.view.coordsAtPos($from.pos);
              setLinePlaceholderPosition({
                x: coords.left - editorRect.left,
                y: coords.top - editorRect.top
              });
            }
          }, 0);
        });
      } else {
        setShowLinePlaceholder(false);
      }
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;
      
      // Check if cursor is in a table
      const isInTable = editor.isActive('table');
      
      if (isInTable) {
        // Show table toolbar when in table
        setShowTableToolbar(true);
        
        // Position table toolbar - defer DOM measurements to avoid flushSync issues
        startTransition(() => {
          setTimeout(() => {
            const { view } = editor;
            const { state } = view;
            const { selection } = state;
            const { $from } = selection;
            
            // Get the DOM coordinates of the cursor
            const coords = view.coordsAtPos($from.pos);
            const editorRect = editorRef.current?.getBoundingClientRect();
            
            if (editorRect) {
              // Convert to relative coordinates within the editor
              const relativeX = coords.left - editorRect.left;
              const relativeY = coords.top - editorRect.top;
              
              // Position table toolbar above the cursor
              setTableToolbarPosition({
                x: Math.max(200, Math.min(relativeX, editorRect.width - 200)), // Center horizontally with bounds
                y: Math.max(10, relativeY - 50) // Position above cursor
              });
            }
          }, 0);
        });
      } else {
        setShowTableToolbar(false);
      }
      
      if (hasSelection) {
        // Mark that we're in the process of selecting
        setIsSelecting(true);
        
        // Get selection coordinates for positioning - defer DOM measurements to avoid flushSync issues
        startTransition(() => {
          setTimeout(() => {
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
              
              // Convert to relative coordinates within the editor container
              // Since the toolbar is positioned absolutely within the editor container,
              // we need coordinates relative to the editor container, accounting for scroll
              const relativeX = centerX - editorRect.left;
              const relativeY = topY - editorRect.top + (editorRef.current?.scrollTop || 0);
              
              // Toolbar dimensions for boundary calculations
              const toolbarWidth = 400; // Approximate toolbar width for all buttons
              const toolbarHeight = 40; // Approximate toolbar height
              
               // Handle horizontal boundaries with padding
               const padding = 190; // Extra padding from edges
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
          }, 0);
        });
        
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

  // Function to extract headings from editor content
  const extractHeadings = useCallback(() => {
    if (!editor) return;
    
    const headings: any[] = [];
    const { state } = editor;
    const { doc } = state;
    
    doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        const level = node.attrs.level;
        const textContent = node.textContent;
        const id = `heading-${pos}-${level}`;
        
        headings.push({
          id,
          textContent,
          level,
          isActive: false,
          isScrolledOver: false,
          pos
        });
      }
    });
    
    setTocAnchors(headings);
    
    // Add data attributes to heading elements in the DOM
    setTimeout(() => {
      const editorElement = editor.view.dom;
      const headingElements = editorElement.querySelectorAll('h1, h2, h3');
      headingElements.forEach((element, index) => {
        if (headings[index]) {
          element.setAttribute('data-heading-id', headings[index].id);
        }
      });
    }, 100);
  }, [editor]);

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
      
      // Handle @ command navigation
      if (showAtCommand) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSelectedAtCommandIndex(prev => 
            Math.min(prev + 1, getAtCommandOptions().length - 1)
          );
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSelectedAtCommandIndex(prev => Math.max(prev - 1, 0));
        } else if (event.key === 'Enter') {
          event.preventDefault();
          executeAtCommand();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          setShowAtCommand(false);
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

  // Handle paste events for images
  useEffect(() => {
    if (!editor) return;
    
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          event.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;
          
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64 = e.target?.result as string;
            editor.chain().focus().setImage({ src: base64 }).run();
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    };
    
    const editorElement = editor.view.dom;
    editorElement.addEventListener('paste', handlePaste);
    
    return () => {
      editorElement.removeEventListener('paste', handlePaste);
    };
  }, [editor]);

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

  // Extract headings when editor is ready
  useEffect(() => {
    if (editor) {
      extractHeadings();
    }
  }, [editor, extractHeadings]);


  // Track scroll position to highlight active heading in TOC
  useEffect(() => {
    if (!editor || tocAnchors.length === 0) return;

    const handleScroll = () => {
      const editorElement = editor.view.dom;
      const scrollTop = editorElement.scrollTop;
      const editorHeight = editorElement.clientHeight;
      
      // Find the heading that's currently in view
      let activeHeading = null;
      let minDistance = Infinity;
      
      for (let i = 0; i < tocAnchors.length; i++) {
        const anchor = tocAnchors[i];
        const headingElement = editorElement.querySelector(`[data-heading-id="${anchor.id}"]`);
        
        if (headingElement) {
          const rect = headingElement.getBoundingClientRect();
          const editorRect = editorElement.getBoundingClientRect();
          const relativeTop = rect.top - editorRect.top;
          
          // If heading is visible and closer to the top, it's more likely to be active
          if (relativeTop <= editorHeight && relativeTop >= -100) {
            const distance = Math.abs(relativeTop);
            if (distance < minDistance) {
              minDistance = distance;
              activeHeading = anchor.id;
            }
          }
        }
      }
      
      // Update active state
      setTocAnchors(prevAnchors => 
        prevAnchors.map(anchor => ({
          ...anchor,
          isActive: anchor.id === activeHeading
        }))
      );
    };

    const editorElement = editor.view.dom;
    editorElement.addEventListener('scroll', handleScroll);
    
    // Initial check with a small delay to ensure DOM is ready
    setTimeout(handleScroll, 200);
    
    return () => {
      editorElement.removeEventListener('scroll', handleScroll);
    };
  }, [editor, tocAnchors]);

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
      { id: 'strike', label: 'Strikethrough', icon: Strikethrough, action: () => editor?.chain().focus().toggleStrike().run() },
      { id: 'bullet', label: 'Bullet List', icon: List, action: () => editor?.chain().focus().toggleBulletList().run() },
      { id: 'numbered', label: 'Numbered List', icon: ListOrdered, action: () => editor?.chain().focus().toggleOrderedList().run() },
      { id: 'quote', label: 'Quote', icon: Quote, action: () => editor?.chain().focus().toggleBlockquote().run() },
      { id: 'code', label: 'Code Block', icon: Code, action: () => {
        showLanguageSelectorPopup();
      }},
      { id: 'table', label: 'Table', icon: TableIcon, action: () => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
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
      { 
        id: 'divider', 
        label: 'Divider', 
        icon: Minus, 
        action: () => editor?.chain().focus().setHorizontalRule().run(),
      },
    ];

    return formattingOptions;
  };

  // Get @ command options
  const getAtCommandOptions = () => {
    const contentOptions: Array<{
      id: string;
      label: string;
      icon: any;
      action: () => void;
      subtitle?: string;
    }> = [
      {
        id: 'image',
        label: 'Image',
        icon: ImageIcon,
        action: handleImageButtonClick,
        subtitle: 'Insert an image'
      },
      {
        id: 'youtube',
        label: 'YouTube Video',
        icon: YoutubeIcon,
        action: () => {
          setShowYoutubeDialog(true);
          setShowAtCommand(false);
        },
        subtitle: 'Embed a YouTube video'
      }
    ];

    // Add module options
    if (modules.length > 0) {
      contentOptions.push({
        id: 'attach-module',
        label: 'Attach Module Item',
        icon: FileText,
        action: () => {
          setShowModuleSelector(true);
          setShowAtCommand(false);
        },
        subtitle: 'Link to course modules'
      });
    }
    
    // Add quiz options
    if (quizzes.length > 0) {
      contentOptions.push({
        id: 'attach-quiz',
        label: 'Attach Quiz',
        icon: HelpCircle,
        action: () => {
          setShowQuizSelector(true);
          setShowAtCommand(false);
        },
        subtitle: 'Link to quizzes'
      });
    }
    
    // Add flashcard options
    if (flashcardDecks.length > 0) {
      contentOptions.push({
        id: 'attach-flashcard',
        label: 'Attach Flashcard Deck',
        icon: Brain,
        action: () => {
          setShowFlashcardSelector(true);
          setShowAtCommand(false);
        },
        subtitle: 'Link to flashcard decks'
      });
    }

    return contentOptions;
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

  // Handle image file selection
  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    
    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }
    
    // Convert to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      editor?.chain().focus().setImage({ src: base64 }).run();
    };
    reader.readAsDataURL(file);
    
    // Reset input
    event.target.value = '';
  }, [editor]);

  // Handle image button click
  const handleImageButtonClick = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  // Handle language selection for code blocks
  const handleLanguageSelection = useCallback((language: string) => {
    setShowLanguageSelector(false);
    setLanguageSearchQuery("");
    // Use startTransition and setTimeout to avoid flushSync issues by deferring the editor operations
    startTransition(() => {
      setTimeout(() => {
        editor?.chain().focus().toggleCodeBlock({ language }).run();
      }, 0);
    });
  }, [editor]);

  // Show language selector popup
  const showLanguageSelectorPopup = useCallback(() => {
    setShowLanguageSelector(true);
  }, []);

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

  // Get filtered programming languages
  const getFilteredLanguages = () => {
    if (!languageSearchQuery.trim()) return PROGRAMMING_LANGUAGES;
    const query = languageSearchQuery.toLowerCase();
    return PROGRAMMING_LANGUAGES.filter(lang => 
      lang.label.toLowerCase().includes(query) ||
      lang.value.toLowerCase().includes(query)
    );
  };

  // Get current font size from editor
  const getCurrentFontSize = () => {
    if (!editor) return '16px';
    const fontSize = editor.getAttributes('textStyle').fontSize;
    return fontSize || '16px';
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

  // Execute selected @ command
  const executeAtCommand = () => {
    const options = getAtCommandOptions();
    const selectedOption = options[selectedAtCommandIndex];
    if (selectedOption) {
      // Remove the @ and any text after it
      const { state } = editor!;
      const { selection } = state;
      const { $from } = selection;
      
      // Find the position of the @
      const textBefore = $from.nodeBefore?.textContent || '';
      const textAfter = $from.nodeAfter?.textContent || '';
      const currentText = textBefore + textAfter;
      const atIndex = currentText.lastIndexOf('@');
      
      if (atIndex !== -1) {
        // Calculate the position to delete from (the @ position)
        const deleteFrom = $from.pos - (textAfter.length + 1); // +1 for the @ itself
        
        // Delete the @ and everything after it
        editor?.chain()
          .focus()
          .deleteRange({ from: deleteFrom, to: $from.pos })
          .run();
      }
      
      // Execute the selected action
      selectedOption.action();
      setShowAtCommand(false);
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
            onClick={() => router.push(`/courses/${note.course_id}`)}
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
            onClick={() => setShowToc(!showToc)}
            className="flex items-center gap-2 border-slate-200 hover:bg-slate-50 transition-colors"
            title="Toggle Table of Contents"
          >
            <Menu className="h-4 w-4" />
            TOC
          </Button>
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
          {/* <Button
            variant="outline"
            size="sm"
            onClick={exportNote}
            className="flex items-center gap-2 border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export
          </Button> */}
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
        
        {/* Table of Contents Sidebar */}
        <NoteTocSidebar 
          anchors={tocAnchors}
          editor={editor}
          isVisible={showToc}
          onToggle={() => setShowToc(!showToc)}
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
            <Button
              variant={editor.isActive('strike') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                editor.chain().focus().toggleStrike().run();
                // Ensure focus remains on editor after button click
                setTimeout(() => editor.commands.focus(), 0);
              }}
              className={cn(
                "h-8 w-8 p-0 transition-all",
                editor.isActive('strike') 
                  ? "bg-blue-600 text-white hover:bg-blue-700" 
                  : "hover:bg-slate-100/80"
              )}
              title="Strikethrough"
            >
              <Strikethrough className="h-4 w-4" />
            </Button>
            
            {/* Font Size Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 hover:bg-slate-100/80 transition-colors"
                  title="Font Size"
                >
                  <span className="text-xs font-medium min-w-[2rem] text-center">
                    {getCurrentFontSize()}
                  </span>
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {[
                  { size: '10px', label: '10px' },
                  { size: '12px', label: '12px' },
                  { size: '14px', label: '14px' },
                  { size: '16px', label: '16px' },
                  { size: '18px', label: '18px' },
                  { size: '20px', label: '20px' },
                  { size: '24px', label: '24px' },
                  { size: '32px', label: '32px' },
                ].map((option) => (
                  <DropdownMenuItem
                    key={option.size}
                    onClick={() => {
                      editor.chain().focus().setMark('textStyle', { fontSize: option.size }).run();
                      setTimeout(() => editor.commands.focus(), 0);
                    }}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Background Color Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 hover:bg-slate-100/80 transition-colors"
                  title="Background Color"
                >
                  <Palette className="h-4 w-4" />
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <div className="grid grid-cols-4 gap-1 p-2">
                  {[
                    { color: '#ffffff', label: 'White' },
                    { color: '#fef3c7', label: 'Yellow' },
                    { color: '#fde68a', label: 'Light Yellow' },
                    { color: '#fecaca', label: 'Red' },
                    { color: '#fed7aa', label: 'Orange' },
                    { color: '#bbf7d0', label: 'Green' },
                    { color: '#bfdbfe', label: 'Blue' },
                    { color: '#e9d5ff', label: 'Purple' },
                    { color: '#f3e8ff', label: 'Light Purple' },
                    { color: '#fce7f3', label: 'Pink' },
                    { color: '#f1f5f9', label: 'Gray' },
                    { color: '#000000', label: 'Black' },
                  ].map((option) => (
                    <button
                      key={option.color}
                      className="w-8 h-8 rounded border border-slate-200 hover:scale-110 transition-transform"
                      style={{ backgroundColor: option.color }}
                      onClick={() => {
                        editor.chain().focus().setMark('textStyle', { color: option.color }).run();
                        setTimeout(() => editor.commands.focus(), 0);
                      }}
                      title={option.label}
                    />
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Separator */}
            <div className="w-px h-6 bg-slate-300/60 mx-1" />
            
            {/* Text Dropdown (Headings) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 hover:bg-slate-100/80 transition-colors"
                  title="Text Formatting"
                >
                  <Type className="h-4 w-4" />
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={() => {
                    editor.chain().focus().toggleHeading({ level: 1 }).run();
                    setTimeout(() => editor.commands.focus(), 0);
                  }}
                  className={cn(
                    editor.isActive('heading', { level: 1 }) && "bg-blue-100 text-blue-900"
                  )}
                >
                  <Heading1 className="h-4 w-4 mr-2" />
                  Heading 1
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    editor.chain().focus().toggleHeading({ level: 2 }).run();
                    setTimeout(() => editor.commands.focus(), 0);
                  }}
                  className={cn(
                    editor.isActive('heading', { level: 2 }) && "bg-blue-100 text-blue-900"
                  )}
                >
                  <Heading2 className="h-4 w-4 mr-2" />
                  Heading 2
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    editor.chain().focus().toggleHeading({ level: 3 }).run();
                    setTimeout(() => editor.commands.focus(), 0);
                  }}
                  className={cn(
                    editor.isActive('heading', { level: 3 }) && "bg-blue-100 text-blue-900"
                  )}
                >
                  <Heading3 className="h-4 w-4 mr-2" />
                  Heading 3
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Separator */}
            <div className="w-px h-6 bg-slate-300/60 mx-1" />
            
            {/* Blocks Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 hover:bg-slate-100/80 transition-colors"
                  title="Block Formatting"
                >
                  <FileText className="h-4 w-4" />
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={() => {
                    editor.chain().focus().toggleBulletList().run();
                    setTimeout(() => editor.commands.focus(), 0);
                  }}
                  className={cn(
                    editor.isActive('bulletList') && "bg-blue-100 text-blue-900"
                  )}
                >
                  <List className="h-4 w-4 mr-2" />
                  Bullet List
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    editor.chain().focus().toggleOrderedList().run();
                    setTimeout(() => editor.commands.focus(), 0);
                  }}
                  className={cn(
                    editor.isActive('orderedList') && "bg-blue-100 text-blue-900"
                  )}
                >
                  <ListOrdered className="h-4 w-4 mr-2" />
                  Numbered List
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    editor.chain().focus().toggleBlockquote().run();
                    setTimeout(() => editor.commands.focus(), 0);
                  }}
                  className={cn(
                    editor.isActive('blockquote') && "bg-blue-100 text-blue-900"
                  )}
                >
                  <Quote className="h-4 w-4 mr-2" />
                  Quote
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    showLanguageSelectorPopup();
                    setTimeout(() => editor.commands.focus(), 0);
                  }}
                  className={cn(
                    editor.isActive('codeBlock') && "bg-blue-100 text-blue-900"
                  )}
                >
                  <Code className="h-4 w-4 mr-2" />
                  Code Block
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                    setTimeout(() => editor.commands.focus(), 0);
                  }}
                >
                  <TableIcon className="h-4 w-4 mr-2" />
                  Table
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Inline Code */}
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
            
            {/* Insert Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 hover:bg-slate-100/80 transition-colors"
                  title="Insert Content"
                >
                  <Plus className="h-4 w-4" />
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={handleImageButtonClick}
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Image
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    editor.chain().focus().setHorizontalRule().run();
                    setTimeout(() => editor.commands.focus(), 0);
                  }}
                >
                  <Minus className="h-4 w-4 mr-2" />
                  Divider
                </DropdownMenuItem>
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
                  <Sigma className="h-4 w-4 mr-2" />
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
                  <Sigma className="h-4 w-4 mr-2" />
                  Block Math
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Table Controls - Show when cursor is in table */}
            {editor?.isActive('table') && (
              <>
                {/* Separator */}
                <div className="w-px h-6 bg-slate-300/60 mx-1" />
                
                {/* Table Controls */}
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-slate-600 mr-1">Table:</span>
                  
                  {/* Add Column Before */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      editor.chain().focus().addColumnBefore().run();
                      setTimeout(() => editor.commands.focus(), 0);
                    }}
                    className="h-8 w-8 p-0 hover:bg-slate-100/80 transition-colors"
                    title="Add Column Before"
                  >
                    <Columns className="h-4 w-4" />
                  </Button>
                  
                  {/* Add Column After */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      editor.chain().focus().addColumnAfter().run();
                      setTimeout(() => editor.commands.focus(), 0);
                    }}
                    className="h-8 w-8 p-0 hover:bg-slate-100/80 transition-colors"
                    title="Add Column After"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  
                  {/* Add Row Before */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      editor.chain().focus().addRowBefore().run();
                      setTimeout(() => editor.commands.focus(), 0);
                    }}
                    className="h-8 w-8 p-0 hover:bg-slate-100/80 transition-colors"
                    title="Add Row Before"
                  >
                    <Rows className="h-4 w-4" />
                  </Button>
                  
                  {/* Add Row After */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      editor.chain().focus().addRowAfter().run();
                      setTimeout(() => editor.commands.focus(), 0);
                    }}
                    className="h-8 w-8 p-0 hover:bg-slate-100/80 transition-colors"
                    title="Add Row After"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  
                  {/* Delete Column */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      editor.chain().focus().deleteColumn().run();
                      setTimeout(() => editor.commands.focus(), 0);
                    }}
                    className="h-8 w-8 p-0 hover:bg-red-100/80 hover:text-red-600 transition-colors"
                    title="Delete Column"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  
                  {/* Delete Row */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      editor.chain().focus().deleteRow().run();
                      setTimeout(() => editor.commands.focus(), 0);
                    }}
                    className="h-8 w-8 p-0 hover:bg-red-100/80 hover:text-red-600 transition-colors"
                    title="Delete Row"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  
                  {/* Delete Table */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      editor.chain().focus().deleteTable().run();
                      setTimeout(() => editor.commands.focus(), 0);
                    }}
                    className="h-8 w-8 p-0 hover:bg-red-100/80 hover:text-red-600 transition-colors"
                    title="Delete Table"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
        
        {/* Table Toolbar - Show when cursor is in table */}
        {showTableToolbar && editor && (
          <div
            className="absolute z-50 bg-white/95 backdrop-blur-sm border border-slate-200/60 rounded-xl shadow-lg shadow-slate-200/50 p-2 flex items-center gap-1 transform -translate-x-1/2"
            style={{
              left: `${tableToolbarPosition.x}px`,
              top: `${tableToolbarPosition.y}px`,
            }}
          >
            {/* Column Controls - Left Group */}
            <div className="flex items-center gap-1">
              {/* Add Column Before */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  editor.chain().focus().addColumnBefore().run();
                  setTimeout(() => editor.commands.focus(), 0);
                }}
                className="h-7 w-7 p-0 hover:bg-slate-100/80 transition-colors"
                title="Add Column Before"
              >
                <Columns className="h-3 w-3" />
              </Button>
              
              {/* Add Column After */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  editor.chain().focus().addColumnAfter().run();
                  setTimeout(() => editor.commands.focus(), 0);
                }}
                className="h-7 w-7 p-0 hover:bg-slate-100/80 transition-colors"
                title="Add Column After"
              >
                <Plus className="h-3 w-3" />
              </Button>
              
              {/* Delete Column */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  editor.chain().focus().deleteColumn().run();
                  setTimeout(() => editor.commands.focus(), 0);
                }}
                className="h-7 w-7 p-0 hover:bg-red-100/80 hover:text-red-600 transition-colors"
                title="Delete Column"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            
            {/* Vertical Separator */}
            <div className="w-px h-6 bg-slate-300/60 mx-2" />
            
            {/* Row Controls - Middle Group */}
            <div className="flex items-center gap-1">
              {/* Add Row Before */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  editor.chain().focus().addRowBefore().run();
                  setTimeout(() => editor.commands.focus(), 0);
                }}
                className="h-7 w-7 p-0 hover:bg-slate-100/80 transition-colors"
                title="Add Row Before"
              >
                <Rows className="h-3 w-3" />
              </Button>
              
              {/* Add Row After */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  editor.chain().focus().addRowAfter().run();
                  setTimeout(() => editor.commands.focus(), 0);
                }}
                className="h-7 w-7 p-0 hover:bg-slate-100/80 transition-colors"
                title="Add Row After"
              >
                <Plus className="h-3 w-3" />
              </Button>
              
              {/* Delete Row */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  editor.chain().focus().deleteRow().run();
                  setTimeout(() => editor.commands.focus(), 0);
                }}
                className="h-7 w-7 p-0 hover:bg-red-100/80 hover:text-red-600 transition-colors"
                title="Delete Row"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            
            {/* Vertical Separator */}
            <div className="w-px h-6 bg-slate-300/60 mx-2" />
            
            {/* Delete Table - Right Group */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                editor.chain().focus().deleteTable().run();
                setTimeout(() => editor.commands.focus(), 0);
              }}
              className="h-7 w-7 p-0 hover:bg-red-100/80 hover:text-red-600 transition-colors"
              title="Delete Table"
            >
              <X className="h-3 w-3" />
            </Button>
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
        
        {/* @ Command Dropdown */}
        {showAtCommand && (
          <div
            className="absolute z-50 bg-white/95 backdrop-blur-sm border border-slate-200/60 rounded-xl shadow-lg shadow-slate-200/50 p-2 max-w-sm w-full max-h-80 overflow-y-auto"
            style={{
              left: `${atCommandPosition.x}px`,
              top: `${atCommandPosition.y + 20}px`,
            }}
          >
            <div className="space-y-1">
              {getAtCommandOptions().map((option, index) => {
                const IconComponent = option.icon;
                return (
                  <button
                    key={option.id}
                    onClick={() => {
                      // Remove the @ and any text after it
                      const { state } = editor!;
                      const { selection } = state;
                      const { $from } = selection;
                      
                      // Find the position of the @
                      const textBefore = $from.nodeBefore?.textContent || '';
                      const textAfter = $from.nodeAfter?.textContent || '';
                      const currentText = textBefore + textAfter;
                      const atIndex = currentText.lastIndexOf('@');
                      
                      if (atIndex !== -1) {
                        // Calculate the position to delete from (the @ position)
                        const deleteFrom = $from.pos - (textAfter.length + 1); // +1 for the @ itself
                        
                        // Delete the @ and everything after it
                        editor?.chain()
                          .focus()
                          .deleteRange({ from: deleteFrom, to: $from.pos })
                          .run();
                      }
                      
                      // Execute the selected action
                      option.action();
                      setShowAtCommand(false);
                      setTimeout(() => editor?.commands.focus(), 0);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                      index === selectedAtCommandIndex
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
              Type / for formatting options or @ to embed content
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
      
      {/* YouTube Video Dialog */}
      <Dialog open={showYoutubeDialog} onOpenChange={setShowYoutubeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Insert YouTube Video</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="youtube-url" className="block text-sm font-medium text-slate-700 mb-2">
                YouTube URL
              </label>
              <Input
                id="youtube-url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowYoutubeDialog(false);
                  setYoutubeUrl("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (youtubeUrl.trim()) {
                    editor?.chain().focus().setYoutubeVideo({ src: youtubeUrl.trim() }).run();
                    setShowYoutubeDialog(false);
                    setYoutubeUrl("");
                    setTimeout(() => editor?.commands.focus(), 0);
                  }
                }}
                disabled={!youtubeUrl.trim()}
              >
                Insert Video
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Language Selector Dialog */}
      <Dialog open={showLanguageSelector} onOpenChange={setShowLanguageSelector}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Programming Language</DialogTitle>
          </DialogHeader>
          
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search programming languages..."
              value={languageSearchQuery}
              onChange={(e) => setLanguageSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Languages List */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {getFilteredLanguages().map((lang) => (
              <button
                key={lang.value}
                onClick={() => handleLanguageSelection(lang.value)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-slate-50 transition-colors text-left"
              >
                <div className="flex-shrink-0">
                  <Code className="h-5 w-5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {lang.label}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {lang.value}
                  </div>
                </div>
              </button>
            ))}
            
            {getFilteredLanguages().length === 0 && (
              <div className="text-center py-8 text-slate-500">
                {languageSearchQuery ? 'No programming languages found matching your search.' : 'No programming languages available.'}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Hidden file input for image upload */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
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
