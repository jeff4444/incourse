"use client";

import { Note } from "@/lib/types/course";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Calendar, 
  MoreHorizontal, 
  Edit, 
  Trash2,
  Folder
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useDeleteNote } from "@/lib/hooks/useNotes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NoteTileProps {
  note: Note;
  courseID: string;
  folderName?: string;
  onDelete?: () => void;
}

export function NoteTile({ note, courseID, folderName, onDelete }: NoteTileProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteNote = useDeleteNote();

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    
    setIsDeleting(true);
    deleteNote.mutate(
      { courseId: courseID, noteId: note.id },
      {
        onSuccess: () => {
          onDelete?.();
        },
        onError: () => {
          setIsDeleting(false);
        },
      }
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit' 
      });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit'
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  // Extract text content from Tiptap JSON for preview
  const getTextPreview = (content: any): string => {
    if (!content || !content.content) return "Empty note";
    
    const extractText = (node: any): string => {
      if (node.type === 'text') {
        return node.text || '';
      }
      if (node.content) {
        return node.content.map(extractText).join('');
      }
      return '';
    };
    
    const text = content.content.map(extractText).join(' ').trim();
    return text.length > 100 ? text.substring(0, 100) + '...' : text;
  };

  return (
    <div
      className="flex flex-row gap-2 justify-between p-4 rounded-lg border hover:bg-accent transition-colors"
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center">
          <div className="flex items-center gap-4">
            <div className="rounded-full p-2 bg-green-100 text-green-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">{note.title}</p>
              <p className="text-sm text-muted-foreground">
                Note • {folderName ? `${folderName} • ` : ''}Updated {formatDate(note.updated_at)}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/courses/${courseID}/notes/${note.id}`} className="flex items-center">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? "Deleting..." : "Delete"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Link href={`/courses/${courseID}/notes/${note.id}`}>
          <Button size="sm">
            Open
          </Button>
        </Link>
      </div>
    </div>
  );
}
