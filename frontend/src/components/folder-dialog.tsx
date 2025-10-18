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
import { useCreateFolder, useUpdateFolder } from "@/lib/hooks/useNotes";

interface FolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseID: string;
  folder?: {
    id: string;
    name: string;
  } | null;
}

export function FolderDialog({ open, onOpenChange, courseID, folder }: FolderDialogProps) {
  const [name, setName] = useState(folder?.name || "");
  const [isLoading, setIsLoading] = useState(false);
  
  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();

  const isEditing = !!folder;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;
    
    setIsLoading(true);
    
    try {
      if (isEditing) {
        await updateFolder.mutateAsync({
          courseId: courseID,
          folderId: folder.id,
          updates: { name: name.trim() }
        });
      } else {
        await createFolder.mutateAsync({
          courseId: courseID,
          name: name.trim()
        });
      }
      
      onOpenChange(false);
      setName("");
    } catch (error) {
      console.error("Error saving folder:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setName(folder?.name || "");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Rename Folder" : "Create New Folder"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Enter a new name for this folder."
              : "Create a new folder to organize your notes."
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                placeholder="Folder name"
                autoFocus
                required
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? "Saving..." : (isEditing ? "Rename" : "Create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
