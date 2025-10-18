"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface BackButtonClientProps {
  fallbackHref?: string;
  className?: string;
}

export function BackButtonClient({ fallbackHref = "/dashboard", className }: BackButtonClientProps) {
  const router = useRouter();

  const handleBack = () => {
    // Check if we're in a file viewer context and can go back to course
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      
      // If we're in a file viewer, try to navigate to the course page
      const fileViewerMatch = currentPath.match(/^\/courses\/([^\/]+)\/files\/[^\/]+$/);
      if (fileViewerMatch) {
        const courseID = fileViewerMatch[1];
        router.push(`/courses/${courseID}`);
        return;
      }
      
      // If we're in an autograder file viewer, try to navigate to the course page
      const autograderMatch = currentPath.match(/^\/courses\/([^\/]+)\/autograder\/[^\/]+$/);
      if (autograderMatch) {
        const courseID = autograderMatch[1];
        router.push(`/courses/${courseID}`);
        return;
      }
      
      // Check if there's history to go back to
      if (window.history.length > 1) {
        router.back();
      } else {
        // Fallback to dashboard if no history
        router.push(fallbackHref);
      }
    }
  };

  return (
    <Button variant="ghost" size="sm" className={`gap-1 ${className}`} onClick={handleBack}>
      <ChevronLeft className="h-4 w-4" />
      Back
    </Button>
  );
}
