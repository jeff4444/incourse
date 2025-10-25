import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Clock, X } from "lucide-react";

interface NudgeCardProps {
  nudge: {
    id: string;
    nudge_text: string;
    action: string;
    label: string;
    priority: "high" | "medium" | "low";
    status: "active" | "completed" | "dismissed" | "expired";
    course_id?: string;
    created_at: string;
    completed_at?: string;
    dismissed_at?: string;
    courses?: {
      id: string;
      name: string;
      code: string;
    };
  };
  onComplete?: (nudgeId: string) => void;
  onDismiss?: (nudgeId: string) => void;
}

export function NudgeCard({ nudge, onComplete, onDismiss }: NudgeCardProps) {
  const getPriorityIconStyles = () => {
    switch (nudge.priority) {
      case "high":
        return "bg-red-100 text-red-600";
      case "medium":
        return "bg-amber-100 text-amber-600";
      case "low":
        return "bg-blue-100 text-blue-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const handleAction = () => {
    if (onComplete) {
      onComplete(nudge.id);
    }
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss(nudge.id);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    const minutes = Math.floor(diffInSeconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="py-3 border-b border-gray-200 last:border-b-0">
      <div className="flex items-start gap-3">
        <div className={`rounded-full p-1 ${getPriorityIconStyles()} flex-shrink-0 mt-0.5`}>
          <Bell className="h-3 w-3" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 mb-2">{nudge.nudge_text}</p>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {formatTimeAgo(nudge.created_at)}
            </p>
            <div className="flex gap-2">
              {/* <Button 
                size="sm" 
                onClick={handleAction}
                className="bg-gray-800 hover:bg-gray-700 text-white text-xs px-3 py-1 h-6 rounded-md"
              >
                {nudge.label}
              </Button> */}
              {onDismiss && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={handleDismiss}
                  className="hover:bg-gray-100 h-6 w-6 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
