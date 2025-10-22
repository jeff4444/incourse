"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Note, NoteFolder } from "@/lib/types/course";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronDown,
  ChevronRight,
  Search,
  Plus,
  Folder,
  FileText,
  MoreHorizontal,
  Edit,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FolderDialog } from "./folder-dialog";
import { NoteFolderSelectionDialog } from "./note-folder-selection-dialog";
import { useCreateNote, useDeleteFolder } from "@/lib/hooks/useNotes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NoteSidebarProps {
  notes: Note[];
  folders: NoteFolder[];
  courseID: string;
  userId: string;
}

export function NoteSidebar({
  notes,
  folders,
  courseID,
  userId,
}: NoteSidebarProps) {
  const router = useRouter();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
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

    const filteredNotes = notes.filter(
      (note) =>
        note.title.toLowerCase().includes(query) ||
        JSON.stringify(note.content).toLowerCase().includes(query)
    );

    const filteredFolders = folders.filter((folder) =>
      folder.name.toLowerCase().includes(query)
    );

    return { notes: filteredNotes, folders: filteredFolders };
  }, [notes, folders, searchQuery]);

  // Group notes by folder
  const notesByFolder = useMemo(() => {
    const grouped: { [key: string]: Note[] } = {};

    // Add notes with folders
    filteredData.notes.forEach((note) => {
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
    return filteredData.notes.filter((note) => !note.folder_id);
  }, [filteredData.notes]);

  const handleCreateNote = async (folderId?: string) => {
    try {
      const newNote = await createNote.mutateAsync({
        courseId: courseID,
        title: "Untitled Note",
        folderId,
      });

      // Navigate to the new note
      router.push(`/courses/${courseID}/notes/${newNote.id}`);
    } catch (error) {
      console.error("Error creating note:", error);
    }
  };

  const handleNewNoteClick = () => {
    setShowNoteFolderSelection(true);
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this folder? All notes in this folder will be moved to the main notes area."
      )
    ) {
      return;
    }

    try {
      await deleteFolder.mutateAsync({
        courseId: courseID,
        folderId,
      });
    } catch (error) {
      console.error("Error deleting folder:", error);
    }
  };

  const totalNotes = notes.length;
  const totalFolders = folders.length;

  return (
    <div className="h-full flex flex-col bg-transparent">
      {/* Search Bar */}
      <div className="p-4 border-b border-border/60">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            type="text"
            placeholder="Search notes and folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white/80 border-border/60 focus:border-border transition-colors"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-b border-border/60 flex gap-2">
        <Button
          onClick={handleNewNoteClick}
          className="flex items-center gap-2 bg-slate-600 hover:bg-slate-700 transition-colors"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          New Note
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowCreateFolder(true)}
          className="flex items-center gap-2 border-border hover:bg-slate-50 transition-colors"
          size="sm"
        >
          <Folder className="h-4 w-4" />
          New Folder
        </Button>
      </div>

      {/* No notes state */}
      {totalNotes === 0 && totalFolders === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No notes yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first note to get started with taking notes for this
              course.
            </p>
            <Button onClick={handleNewNoteClick}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Note
            </Button>
          </div>
        </div>
      )}

      {/* Search results empty state */}
      {searchQuery &&
        filteredData.notes.length === 0 &&
        filteredData.folders.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-8 text-muted-foreground">
              No notes or folders found matching "{searchQuery}"
            </div>
          </div>
        )}

      {/* Folders */}
      <div className="flex-1 overflow-y-auto">
        {filteredData.folders.map((folder) => {
          const folderNotes = notesByFolder[folder.id] || [];
          const isExpanded = expandedFolders.has(folder.id);

          return (
            <div key={folder.id} className="border-b border-border/40">
              <div
                onClick={() => toggleFolder(folder.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-100/60 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-slate-500 transition-transform duration-200" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-500 transition-transform duration-200" />
                  )}
                  <Folder className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-800">
                    {folder.name}
                  </span>
                  <span className="text-xs text-slate-500 ml-1">
                    ({folderNotes.length})
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateNote(folder.id);
                    }}
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-3 w-3" />
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
                  "overflow-hidden transition-all duration-200 ease-in-out",
                  isExpanded ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
                )}
              >
                <div className="pl-6 space-y-1 max-h-[380px] overflow-y-auto">
                  {folderNotes.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-slate-500">
                      No notes in this folder yet.
                    </div>
                  ) : (
                    folderNotes.map((note) => (
                      <div
                        key={note.id}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-slate-100/60 cursor-pointer group transition-colors"
                        onClick={() =>
                          router.push(`/courses/${courseID}/notes/${note.id}`)
                        }
                      >
                        <FileText className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-700 truncate">
                          {note.title}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Notes without folder */}
        {notesWithoutFolder.length > 0 && (
          <div className="border-b border-border/40">
            <div
              onClick={toggleAllNotes}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-100/60 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                {expandedAllNotes ? (
                  <ChevronDown className="h-4 w-4 text-slate-500 transition-transform duration-200" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-500 transition-transform duration-200" />
                )}
                <FileText className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-800">
                  All Notes
                </span>
                <span className="text-xs text-slate-500 ml-1">
                  ({notesWithoutFolder.length})
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCreateNote();
                }}
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            <div
              className={cn(
                "overflow-hidden transition-all duration-200 ease-in-out",
                expandedAllNotes
                  ? "max-h-[400px] opacity-100"
                  : "max-h-0 opacity-0"
              )}
            >
              <div className="pl-6 space-y-1 max-h-[380px] overflow-y-auto">
                {notesWithoutFolder.map((note) => (
                  <div
                    key={note.id}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-slate-100/60 cursor-pointer group transition-colors"
                    onClick={() =>
                      router.push(`/courses/${courseID}/notes/${note.id}`)
                    }
                  >
                    <FileText className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-700 truncate">
                      {note.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

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
