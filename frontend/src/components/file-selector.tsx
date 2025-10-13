'use client';

import { useState, useMemo } from "react";
import { useModules } from "@/lib/hooks/useModules";
import { ModuleItem } from "@/lib/types/course";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Search, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileSelectorProps {
  courseId: string;
  selectedFileIds: string[];
  onSelectionChange: (fileIds: string[]) => void;
}

interface FileItemWithModule extends ModuleItem {
  moduleName: string;
}

export function FileSelector({ courseId, selectedFileIds, onSelectionChange }: FileSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: modules = [], isLoading } = useModules(courseId);

  // Flatten all File-type module items with their module names
  const fileItems = useMemo(() => {
    const items: FileItemWithModule[] = [];
    modules.forEach((module) => {
      module.moduleItems
        .filter((item) => item.type === 'File')
        .forEach((item) => {
          items.push({
            ...item,
            moduleName: module.name,
          });
        });
    });
    return items;
  }, [modules]);

  // Filter files based on search query
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return fileItems;
    const query = searchQuery.toLowerCase();
    return fileItems.filter((file) =>
      file.name.toLowerCase().includes(query) ||
      file.moduleName.toLowerCase().includes(query)
    );
  }, [fileItems, searchQuery]);

  const handleToggleFile = (fileId: string) => {
    if (selectedFileIds.includes(fileId)) {
      onSelectionChange(selectedFileIds.filter((id) => id !== fileId));
    } else {
      onSelectionChange([...selectedFileIds, fileId]);
    }
  };

  const handleSelectAll = () => {
    const allFileIds = filteredFiles.map((file) => file.lmsContentId).filter((id): id is string => id !== null);
    onSelectionChange(allFileIds);
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading files...</span>
      </div>
    );
  }

  if (fileItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No files available in this course.</p>
        <p className="text-sm mt-1">Files must be added to course modules to use for generation.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search files by name or module..."
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
            disabled={filteredFiles.length === 0}
          >
            Select All
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            disabled={selectedFileIds.length === 0}
          >
            Clear All
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {selectedFileIds.length} of {fileItems.length} selected
        </p>
      </div>

      {/* File List */}
      <div className="border rounded-lg max-h-[400px] overflow-y-auto">
        {filteredFiles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No files match your search.</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredFiles.map((file) => {
              const fileId = file.lmsContentId;
              const isSelected = fileId ? selectedFileIds.includes(fileId) : false;
              
              return (
                <div
                  key={file.lmsId || file.id}
                  className={cn(
                    "flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer",
                    isSelected && "bg-muted/30"
                  )}
                  onClick={() => fileId && handleToggleFile(fileId)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => fileId && handleToggleFile(fileId)}
                    onClick={(e) => e.stopPropagation()}
                    disabled={!fileId}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <p className="font-medium text-sm truncate">{file.name}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {file.moduleName}
                      </Badge>
                      {file.contentType && (
                        <span className="text-xs text-muted-foreground">
                          {file.contentType}
                        </span>
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

