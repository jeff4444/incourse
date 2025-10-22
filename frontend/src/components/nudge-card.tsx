import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Clock, X } from "lucide-react";

interface NudgeCardProps {
  nudge: {
    id: number;
    course: string;
    message: string;
    dueDate: string;
    priority: "high" | "medium" | "low";
  };
}

export function NudgeCard({ nudge }: NudgeCardProps) {
  const getPriorityStyles = () => {
    switch (nudge.priority) {
      case "high":
        return "bg-red-50 border-red-200";
      case "medium":
        return "bg-amber-50 border-amber-200";
      case "low":
        return "bg-blue-50 border-blue-200";
      default:
        return "bg-muted border-border";
    }
  };

  return (
    <Card className={`border ${getPriorityStyles()} h-20`}>
      <CardContent className="p-4 h-full">
        <div className="flex items-center gap-4 h-full">
          <div
            className={`rounded-full p-2 flex-shrink-0 ${
              nudge.priority === "high"
                ? "bg-red-100 text-red-600"
                : nudge.priority === "medium"
                ? "bg-amber-100 text-amber-600"
                : "bg-blue-100 text-blue-600"
            }`}
          >
            <Bell className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center h-full">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{nudge.message}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {nudge.course} • {nudge.dueDate}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0 ml-2">
                <Button size="sm" className="text-xs px-2 py-1 h-7">
                  Review Now
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
