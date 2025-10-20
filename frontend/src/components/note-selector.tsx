'use client';

import { useState, useMemo } from "react";
import { useNotes, useNoteFolders } from "@/lib/hooks/useNotes";
import { Note, NoteFolder } from "@/lib/types/course";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface NoteSelectorProps {
  courseId: string;
  userId?: string;
  selectedNoteIds: string[];
  onSelectionChange: (noteIds: string[]) => void;
}

export function NoteSelector({ courseId, userId, selectedNoteIds, onSelectionChange }: NoteSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: notes = [], isLoading: notesLoading } = useNotes(courseId, userId || "");
  const { data: folders = [], isLoading: foldersLoading } = useNoteFolders(courseId, userId || "");

  const isLoading = notesLoading || foldersLoading;

  // Filter notes based on search query
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const query = searchQuery.toLowerCase();
    return notes.filter((note) =>
      note.title.toLowerCase().includes(query) ||
      JSON.stringify(note.content).toLowerCase().includes(query)
    );
  }, [notes, searchQuery]);

  // Add folder names to notes for display
  const notesWithFolders = useMemo(() => {
    return filteredNotes.map((note) => ({
      ...note,
      folderName: note.folder_id ? folders.find(f => f.id === note.folder_id)?.name : null
    }));
  }, [filteredNotes, folders]);

  const handleToggleNote = (noteId: string) => {
    if (selectedNoteIds.includes(noteId)) {
      onSelectionChange(selectedNoteIds.filter((id) => id !== noteId));
    } else {
      onSelectionChange([...selectedNoteIds, noteId]);
    }
  };


  const handleSelectAll = () => {
    const allNoteIds = notesWithFolders.map((note) => note.id);
    onSelectionChange(allNoteIds);
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading notes...</span>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No notes available in this course.</p>
        <p className="text-sm mt-1">Create notes to use them for generation.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search notes by title or content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Action Buttons and Count */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={filteredNotes.length === 0}
          >
            Select All
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            disabled={selectedNoteIds.length === 0}
          >
            Clear All
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {selectedNoteIds.length} of {notesWithFolders.length} selected
        </p>
      </div>

      {/* Notes List */}
      <div className="border rounded-lg max-h-[400px] overflow-y-auto">
        {notesWithFolders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No notes match your search.</p>
          </div>
        ) : (
          <div className="divide-y">
            {notesWithFolders.map((note) => {
              const isSelected = selectedNoteIds.includes(note.id);
              
              return (
                <div
                  key={note.id}
                  className={cn(
                    "flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer",
                    isSelected && "bg-muted/30"
                  )}
                  onClick={() => handleToggleNote(note.id)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggleNote(note.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <p className="font-medium text-sm truncate">{note.title}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {note.folderName && (
                        <Badge variant="secondary" className="text-xs">
                          {note.folderName}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
