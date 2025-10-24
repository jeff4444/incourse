"use client";

import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Menu, X } from "lucide-react";

export function NoteSkeleton() {
  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 to-pink-50">
      <Navbar />
      <div className="flex h-[calc(100vh-4rem)] p-4 gap-4">
        {/* Sidebar Skeleton */}
        <div className="w-80 bg-slate-50/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-sm shrink-0">
          <div className="h-full flex flex-col">
            {/* Sidebar Header Skeleton */}
            <div className="p-4 border-b border-slate-200/60 flex items-center justify-between">
              <div className="h-6 w-16 bg-slate-200 rounded animate-pulse"></div>
              <div className="h-8 w-8 bg-slate-200 rounded animate-pulse"></div>
            </div>
            
            {/* Notes List Skeleton */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {/* Folder skeletons */}
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-5 w-24 bg-slate-200 rounded animate-pulse"></div>
                    <div className="ml-4 space-y-2">
                      {[...Array(3)].map((_, j) => (
                        <div key={j} className="flex items-center gap-3 p-2 rounded">
                          <div className="h-4 w-4 bg-slate-200 rounded animate-pulse"></div>
                          <div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {/* Individual note skeletons */}
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded">
                    <div className="h-4 w-4 bg-slate-200 rounded animate-pulse"></div>
                    <div className="h-4 w-40 bg-slate-200 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Draggable Resize Handle Skeleton */}
        <div className="w-1 bg-slate-300/50 shrink-0 rounded-full"></div>

        {/* Main Editor Area Skeleton */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Floating Editor Container Skeleton */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full bg-white/90 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-lg shadow-slate-200/50">
              {/* Editor Header Skeleton */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm">
                {/* Left side - Back button and sidebar toggle */}
                <div className="flex items-center gap-2">
                  <div className="h-8 w-16 bg-slate-200 rounded animate-pulse"></div>
                  <div className="h-8 w-8 bg-slate-200 rounded animate-pulse"></div>
                </div>
                
                {/* Center - Note title skeleton */}
                <div className="flex-1 flex justify-center h-full items-center">
                  <div className="h-8 w-64 bg-slate-200 rounded animate-pulse"></div>
                </div>
                
                {/* Right side - Action buttons skeleton */}
                <div className="flex items-center gap-3">
                  <div className="h-6 w-20 bg-slate-200 rounded animate-pulse"></div>
                  <div className="h-8 w-8 bg-slate-200 rounded animate-pulse"></div>
                  <div className="h-8 w-8 bg-slate-200 rounded animate-pulse"></div>
                </div>
              </div>

              {/* Editor Content Skeleton */}
              <div className="flex-1 p-6">
                <div className="max-w-4xl mx-auto">
                  {/* Title skeleton */}
                  <div className="h-12 w-3/4 bg-slate-200 rounded animate-pulse mb-6"></div>
                  
                  {/* Content skeleton */}
                  <div className="space-y-4">
                    <div className="h-4 w-full bg-slate-200 rounded animate-pulse"></div>
                    <div className="h-4 w-full bg-slate-200 rounded animate-pulse"></div>
                    <div className="h-4 w-5/6 bg-slate-200 rounded animate-pulse"></div>
                    <div className="h-4 w-full bg-slate-200 rounded animate-pulse"></div>
                    <div className="h-4 w-4/5 bg-slate-200 rounded animate-pulse"></div>
                    <div className="h-4 w-full bg-slate-200 rounded animate-pulse"></div>
                    <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse"></div>
                    <div className="h-4 w-full bg-slate-200 rounded animate-pulse"></div>
                    <div className="h-4 w-5/6 bg-slate-200 rounded animate-pulse"></div>
                    <div className="h-4 w-full bg-slate-200 rounded animate-pulse"></div>
                    <div className="h-4 w-2/3 bg-slate-200 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
