"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TocAnchor {
  id: string;
  textContent: string;
  level: number;
  isActive: boolean;
  isScrolledOver: boolean;
  pos: number;
}

interface NoteTocSidebarProps {
  anchors: TocAnchor[];
  editor: any;
  isVisible: boolean;
  onToggle: () => void;
}

export function NoteTocSidebar({ anchors, editor, isVisible, onToggle }: NoteTocSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const scrollToHeading = (anchor: TocAnchor) => {
    if (!editor) return;
    
    // Find the heading node and scroll to it
    const { state } = editor;
    const { tr } = state;
    
    // Set selection to the heading position
    editor.commands.setTextSelection(anchor.pos);
    editor.commands.scrollIntoView();
  };

  const getIndentClass = (level: number) => {
    switch (level) {
      case 1: return "ml-0";
      case 2: return "ml-4";
      case 3: return "ml-8";
      case 4: return "ml-12";
      case 5: return "ml-16";
      case 6: return "ml-20";
      default: return "ml-0";
    }
  };

  const getHeadingSize = (level: number) => {
    switch (level) {
      case 1: return "text-sm font-semibold";
      case 2: return "text-sm font-medium";
      case 3: return "text-xs font-medium";
      default: return "text-xs";
    }
  };

  return (
    <div className={cn(
      "fixed right-0 top-0 h-full bg-white/95 backdrop-blur-sm border-l border-slate-200/60 shadow-lg z-40",
      "transition-all duration-500 ease-in-out transform",
      isVisible 
        ? "translate-x-0 opacity-100" 
        : "translate-x-full opacity-0",
      isCollapsed ? "w-12" : "w-80"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-200/60">
        <div className={cn(
          "transition-all duration-300 ease-in-out overflow-hidden",
          isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
        )}>
          <h3 className="text-sm font-semibold text-slate-700 whitespace-nowrap">Table of Contents</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-8 w-8 p-0 hover:bg-slate-100 transition-colors duration-200"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className={cn(
        "flex-1 overflow-y-auto transition-all duration-300 ease-in-out",
        isCollapsed ? "opacity-0 max-h-0 overflow-hidden" : "opacity-100 max-h-full"
      )}>
        <div className="p-3">
          {anchors.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-500 animate-fade-in">
                No headings found. Add headings to see them here.
              </p>
            </div>
          ) : (
            <nav className="space-y-1">
              {anchors.map((anchor, index) => (
                <button
                  key={anchor.id || index}
                  onClick={() => scrollToHeading(anchor)}
                  className={cn(
                    "block w-full text-left px-2 py-1.5 rounded-md transition-all duration-200 ease-in-out",
                    "hover:bg-slate-100/80 focus:bg-slate-100/80 focus:outline-none",
                    "hover:scale-[1.02] active:scale-[0.98]",
                    anchor.isActive 
                      ? "bg-blue-100 text-blue-700 border-l-2 border-blue-500 shadow-sm" 
                      : "text-slate-700 hover:text-slate-900",
                    getIndentClass(anchor.level),
                    getHeadingSize(anchor.level)
                  )}
                  style={{
                    animationDelay: `${index * 50}ms`,
                    animation: 'fadeInUp 0.3s ease-out forwards'
                  }}
                >
                  <span className="truncate block">
                    {anchor.textContent || `Heading ${anchor.level}`}
                  </span>
                </button>
              ))}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
