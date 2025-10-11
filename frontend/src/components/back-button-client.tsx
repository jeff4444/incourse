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
    // Check if there's history to go back to
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      // Fallback to dashboard if no history
      router.push(fallbackHref);
    }
  };

  return (
    <Button variant="ghost" size="sm" className={`gap-1 ${className}`} onClick={handleBack}>
      <ChevronLeft className="h-4 w-4" />
      Back
    </Button>
  );
}
