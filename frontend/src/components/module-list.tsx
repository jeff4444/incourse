'use client';

import { Module } from "@/lib/types/course";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ReadingTile } from "@/components/reading-tile";

interface ModuleListProps {
  modules: Module[];
  courseID: string;
}

export function ModuleList({ modules, courseID }: ModuleListProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const toggleModule = (moduleId: string | null) => {
    if (!moduleId) return;
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };
  
  // Filter modules and items based on search query
  const filteredModules = useMemo(() => {
    if (!searchQuery.trim()) return modules;
    
    const query = searchQuery.toLowerCase();
    
    return modules.map(module => {
      const moduleNameMatches = module.name.toLowerCase().includes(query);
      
      // Filter items that match the search query
      const filteredItems = module.moduleItems.filter(item => 
        item.name?.toLowerCase().includes(query) || 
        item.type?.toLowerCase().includes(query)
      );
      
      // Include module if its name matches OR it has matching items
      if (moduleNameMatches || filteredItems.length > 0) {
        return {
          ...module,
          moduleItems: moduleNameMatches ? module.moduleItems : filteredItems
        };
      }
      
      return null;
    }).filter((module): module is Module => module !== null);
  }, [modules, searchQuery]);
  

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search modules and items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      
      {filteredModules.length === 0 && searchQuery && (
        <div className="text-center py-8 text-muted-foreground">
          No modules or items found matching &quot;{searchQuery}&quot;
        </div>
      )}
      
      {filteredModules.map((module) => (
        <Card key={module.lmsId || module.id} className="overflow-hidden p-0">
          <CardContent className="p-0">
            <button
              onClick={() => toggleModule(module.lmsId)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                {expandedModules.has(module.lmsId || '') ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-500" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform duration-500" />
                )}
                <div className="text-left">
                  <h3 className="font-medium">{module.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {module.moduleItems.length} items
                  </p>
                </div>
              </div>
            </button>
            
            <div
              className={cn(
                "border-t overflow-hidden transition-all duration-500 ease-in-out",
                expandedModules.has(module.lmsId || '') 
                  ? "max-h-[500px] opacity-100" 
                  : "max-h-0 opacity-0"
              )}
            >
              <div className="p-4 space-y-4 max-h-[460px] overflow-y-auto">
                {module.moduleItems.map((item) => (
                  <ReadingTile 
                    key={item.lmsId || item.id}
                    reading={item}
                    courseID={courseID}
                    module={module}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 