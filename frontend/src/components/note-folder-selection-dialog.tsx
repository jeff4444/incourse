"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { NoteFolder } from "@/lib/types/course";
import { useCreateNote, useCreateFolder } from "@/lib/hooks/useNotes";
import { Folder, Plus, FileText } from "lucide-react";

interface NoteFolderSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseID: string;
  folders: NoteFolder[];
}

export function NoteFolderSelectionDialog({ 
  open, 
  onOpenChange, 
  courseID, 
  folders 
}: NoteFolderSelectionDialogProps) {
  const [selectedOption, setSelectedOption] = useState<string>("all-notes");
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  
  const createNote = useCreateNote();
  const createFolder = useCreateFolder();

  const handleCreateNote = async () => {
    setIsCreatingNote(true);
    
    try {
      let folderId: string | undefined;
      
      if (selectedOption === "new-folder") {
        if (!newFolderName.trim()) {
          return;
        }
        
        // Create new folder first
        const newFolder = await createFolder.mutateAsync({
          courseId: courseID,
          name: newFolderName.trim()
        });
        folderId = newFolder.id;
      } else if (selectedOption !== "all-notes") {
        folderId = selectedOption;
      }
      
      // Create the note
      const newNote = await createNote.mutateAsync({
        courseId: courseID,
        title: "Untitled Note",
        folderId
      });
      
      // Navigate to the new note
      window.location.href = `/courses/${courseID}/notes/${newNote.id}`;
    } catch (error) {
      console.error("Error creating note:", error);
    } finally {
      setIsCreatingNote(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedOption("all-notes");
      setNewFolderName("");
      setIsCreatingFolder(false);
    }
    onOpenChange(open);
  };

  const hasFolders = folders.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Note</DialogTitle>
          <DialogDescription>
            Choose where to place your new note. You can add it to an existing folder, create a new folder, or add it to all notes.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
            {/* All Notes Option */}
            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
              <RadioGroupItem value="all-notes" id="all-notes" />
              <Label htmlFor="all-notes" className="flex items-center gap-2 cursor-pointer flex-1">
                <FileText className="h-4 w-4" />
                <span>All Notes (no folder)</span>
              </Label>
            </div>

            {/* Existing Folders */}
            {hasFolders && (
              <>
                {folders.map((folder) => (
                  <div key={folder.id} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value={folder.id} id={folder.id} />
                    <Label htmlFor={folder.id} className="flex items-center gap-2 cursor-pointer flex-1">
                      <Folder className="h-4 w-4" />
                      <span>{folder.name}</span>
                    </Label>
                  </div>
                ))}
              </>
            )}

            {/* Create New Folder Option */}
            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
              <RadioGroupItem value="new-folder" id="new-folder" />
              <Label htmlFor="new-folder" className="flex items-center gap-2 cursor-pointer flex-1">
                <Plus className="h-4 w-4" />
                <span>Create new folder</span>
              </Label>
            </div>
          </RadioGroup>

          {/* New Folder Name Input */}
          {selectedOption === "new-folder" && (
            <div className="mt-4 p-4 bg-muted/30 rounded-lg">
              <Label htmlFor="folder-name" className="text-sm font-medium">
                Folder Name
              </Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
                className="mt-2"
                autoFocus
              />
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreatingNote}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateNote}
            disabled={isCreatingNote || (selectedOption === "new-folder" && !newFolderName.trim())}
          >
            {isCreatingNote ? "Creating..." : "Create Note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
