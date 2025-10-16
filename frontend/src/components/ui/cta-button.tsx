import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CTAButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "teal";
  className?: string;
  onClick?: () => void;
  showArrow?: boolean;
}

export function CTAButton({
  children,
  variant = "primary",
  className,
  onClick,
  showArrow = false,
}: CTAButtonProps) {
  const baseClasses =
    "px-6 py-3 rounded-full text-sm font-bold transition-colors font-playfair";

  const variantClasses = {
    primary: "bg-[#ffc857] hover:bg-[#ffc857]/90 text-black",
    secondary: "bg-gray-200 hover:bg-gray-300 text-black",
    teal: "bg-teal-600 hover:bg-teal-700 text-white",
  };

  return (
    <Button
      className={cn(baseClasses, variantClasses[variant], className)}
      onClick={onClick}
    >
      {children}
      {showArrow && <ArrowRight className="w-4 h-4 ml-2" />}
    </Button>
  );
}
