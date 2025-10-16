import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CTAButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "teal";
  className?: string;
  onClick?: () => void;
}

export function CTAButton({
  children,
  variant = "primary",
  className,
  onClick,
}: CTAButtonProps) {
  const baseClasses =
    "px-8 py-6 rounded-xl text-base font-bold transition-colors font-playfair";

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
    </Button>
  );
}
