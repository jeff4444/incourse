"use client";

import { useState, useMemo } from "react";
import { Note, NoteFolder } from "@/lib/types/course";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, Search, Plus, Folder, FileText, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { NoteTile } from "./note-tile";
import { FolderDialog } from "./folder-dialog";
import { NoteFolderSelectionDialog } from "./note-folder-selection-dialog";
import { useCreateNote, useDeleteFolder } from "@/lib/hooks/useNotes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NoteListProps {
  notes: Note[];
  folders: NoteFolder[];
  courseID: string;
  userId: string;
}

export function NoteList({ notes, folders, courseID, userId }: NoteListProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [expandedAllNotes, setExpandedAllNotes] = useState(true); // Default to expanded
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showNoteFolderSelection, setShowNoteFolderSelection] = useState(false);
  const [editingFolder, setEditingFolder] = useState<NoteFolder | null>(null);
  
  const createNote = useCreateNote();
  const deleteFolder = useDeleteFolder();

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const toggleAllNotes = () => {
    setExpandedAllNotes(!expandedAllNotes);
  };

  // Filter notes and folders based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return { notes, folders };
    }
    
    const query = searchQuery.toLowerCase();
    
    const filteredNotes = notes.filter(note => 
      note.title.toLowerCase().includes(query) ||
      JSON.stringify(note.content).toLowerCase().includes(query)
    );
    
    const filteredFolders = folders.filter(folder =>
      folder.name.toLowerCase().includes(query)
    );
    
    return { notes: filteredNotes, folders: filteredFolders };
  }, [notes, folders, searchQuery]);

  // Group notes by folder
  const notesByFolder = useMemo(() => {
    const grouped: { [key: string]: Note[] } = {};
    
    // Add notes with folders
    filteredData.notes.forEach(note => {
      if (note.folder_id) {
        if (!grouped[note.folder_id]) {
          grouped[note.folder_id] = [];
        }
        grouped[note.folder_id].push(note);
      }
    });
    
    return grouped;
  }, [filteredData.notes]);

  // Get notes without folders
  const notesWithoutFolder = useMemo(() => {
    return filteredData.notes.filter(note => !note.folder_id);
  }, [filteredData.notes]);

  const handleCreateNote = async (folderId?: string) => {
    try {
      const newNote = await createNote.mutateAsync({
        courseId: courseID,
        title: "Untitled Note",
        folderId
      });
      
      // Navigate to the new note
      window.location.href = `/courses/${courseID}/notes/${newNote.id}`;
    } catch (error) {
      console.error("Error creating note:", error);
    }
  };

  const handleNewNoteClick = () => {
    setShowNoteFolderSelection(true);
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm("Are you sure you want to delete this folder? All notes in this folder will be moved to the main notes area.")) {
      return;
    }
    
    try {
      await deleteFolder.mutateAsync({
        courseId: courseID,
        folderId
      });
    } catch (error) {
      console.error("Error deleting folder:", error);
    }
  };

  const totalNotes = notes.length;
  const totalFolders = folders.length;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search notes and folders..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={handleNewNoteClick} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Note
        </Button>
        <Button 
          variant="outline" 
          onClick={() => setShowCreateFolder(true)}
          className="flex items-center gap-2"
        >
          <Folder className="h-4 w-4" />
          New Folder
        </Button>
      </div>

      {/* No notes state */}
      {totalNotes === 0 && totalFolders === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No notes yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first note to get started with taking notes for this course.
          </p>
          <Button onClick={handleNewNoteClick}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Note
          </Button>
        </div>
      )}

      {/* Search results empty state */}
      {searchQuery && filteredData.notes.length === 0 && filteredData.folders.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No notes or folders found matching "{searchQuery}"
        </div>
      )}

      {/* Folders */}
      {filteredData.folders.map((folder) => {
        const folderNotes = notesByFolder[folder.id] || [];
        const isExpanded = expandedFolders.has(folder.id);
        
        return (
          <Card key={folder.id} className="overflow-hidden p-0">
            <CardContent className="p-0">
              <div
                onClick={() => toggleFolder(folder.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform duration-500" />
                  )}
                  <div className="text-left">
                    <h3 className="font-medium">{folder.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {folderNotes.length} note{folderNotes.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                        className="h-8 w-8 p-0"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingFolder(folder);
                        }}
                        className="flex items-center"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(folder.id);
                        }}
                        className="text-red-600 focus:text-red-600 flex items-center"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              <div
                className={cn(
                  "border-t overflow-hidden transition-all duration-500 ease-in-out",
                  isExpanded 
                    ? "max-h-[500px] opacity-100" 
                    : "max-h-0 opacity-0"
                )}
              >
                <div className="p-4 space-y-4 max-h-[460px] overflow-y-auto">
                  {folderNotes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No notes in this folder yet.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCreateNote(folder.id)}
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Note
                      </Button>
                    </div>
                  ) : (
                    folderNotes.map((note) => (
                      <NoteTile
                        key={note.id}
                        note={note}
                        courseID={courseID}
                        folderName={folder.name}
                      />
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Notes without folder */}
      {notesWithoutFolder.length > 0 && (
        <Card className="overflow-hidden p-0">
          <CardContent className="p-0">
            <div
              onClick={toggleAllNotes}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                {expandedAllNotes ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-500" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform duration-500" />
                )}
                <div className="text-left">
                  <h3 className="font-medium">All Notes</h3>
                  <p className="text-sm text-muted-foreground">
                    {notesWithoutFolder.length} note{notesWithoutFolder.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCreateNote();
                }}
                className="h-8 w-8 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <div
              className={cn(
                "border-t overflow-hidden transition-all duration-500 ease-in-out",
                expandedAllNotes 
                  ? "max-h-[500px] opacity-100" 
                  : "max-h-0 opacity-0"
              )}
            >
              <div className="p-4 space-y-4 max-h-[460px] overflow-y-auto">
                {notesWithoutFolder.map((note) => (
                  <NoteTile
                    key={note.id}
                    note={note}
                    courseID={courseID}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <NoteFolderSelectionDialog
        open={showNoteFolderSelection}
        onOpenChange={setShowNoteFolderSelection}
        courseID={courseID}
        folders={folders}
      />
      
      <FolderDialog
        open={showCreateFolder}
        onOpenChange={setShowCreateFolder}
        courseID={courseID}
      />
      
      <FolderDialog
        open={!!editingFolder}
        onOpenChange={(open) => !open && setEditingFolder(null)}
        courseID={courseID}
        folder={editingFolder}
      />
    </div>
  );
}
