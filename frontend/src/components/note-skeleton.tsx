"use client";

import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Menu } from "lucide-react";

export function NoteSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar Skeleton */}
        <div className="w-80 bg-white border-r border-gray-200 flex-shrink-0">
          <div className="h-full flex flex-col">
            {/* Sidebar Header Skeleton */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
            </div>
            
            {/* Notes List Skeleton */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {/* Folder skeletons */}
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-5 w-24 bg-gray-200 rounded animate-pulse"></div>
                    <div className="ml-4 space-y-2">
                      {[...Array(3)].map((_, j) => (
                        <div key={j} className="flex items-center gap-3 p-2 rounded">
                          <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {/* Individual note skeletons */}
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded">
                    <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-40 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Editor Area Skeleton */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Editor Header Skeleton */}
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Editor Content Skeleton */}
          <div className="flex-1 p-6">
            <div className="max-w-4xl mx-auto">
              {/* Title skeleton */}
              <div className="h-12 w-3/4 bg-gray-200 rounded animate-pulse mb-6"></div>
              
              {/* Content skeleton */}
              <div className="space-y-4">
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-4/5 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
