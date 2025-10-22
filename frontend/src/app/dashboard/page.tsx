"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Clock } from "lucide-react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { NudgeCard } from "@/components/nudge-card";
import { useAuth } from "@/hooks/useAuth";
import { useAllActivitiesByType } from "@/lib/hooks/useActivities";
import { getActivityIcon, getActivityColor } from "@/lib/utils/activityUtils";
import { useMemo } from "react";

// Simple time ago formatter
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60)
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? "day" : "days"} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ${months === 1 ? "month" : "months"} ago`;
  const years = Math.floor(days / 365);
  return `${years} ${years === 1 ? "year" : "years"} ago`;
}

function DashboardPage() {
  const { user } = useAuth();
  const [activityFilter, setActivityFilter] = useState<string>("all");

  // Fetch all activity types once and cache them
  const {
    quizzes,
    flashcards,
    summaries,
    isLoading: activitiesLoading,
    refetchAll,
  } = useAllActivitiesByType(5);

  // Filter activities based on selected tab (client-side)
  const activities = useMemo(() => {
    let filtered: typeof quizzes = [];

    switch (activityFilter) {
      case "quizzes":
        filtered = quizzes;
        break;
      case "flashcards":
        filtered = flashcards;
        break;
      case "summaries":
        filtered = summaries;
        break;
      case "all":
      default:
        // Merge all activities and sort by created_at
        filtered = [...quizzes, ...flashcards, ...summaries]
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
          .slice(0, 5); // Take top 5 most recent
        break;
    }

    return filtered;
  }, [activityFilter, quizzes, flashcards, summaries]);

  // Get user's display name
  const getUserName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name.split(" ")[0]; // Get first name
    }
    if (user?.email) {
      return user.email.split("@")[0];
    }
    return "there";
  };

  // Sample nudges
  const nudges = [
    {
      id: 1,
      course: "CS 101",
      message: "Time to review Arrays and Linked Lists",
      dueDate: "Quiz in 2 days",
      priority: "high" as const,
    },
    {
      id: 2,
      course: "ECON 201",
      message: "New lecture summary available",
      dueDate: "Posted yesterday",
      priority: "medium" as const,
    },
    {
      id: 3,
      course: "MATH 220",
      message: "Problem Set 8 is now available",
      dueDate: "Due in 5 days",
      priority: "medium" as const,
    },
  ];

  return (
    <SidebarLayout>
      {/* Header Section */}
      <div className="container mx-auto px-4 md:px-6 h-full flex flex-col -mt-2">
        <div className="mb-4 flex-shrink-0">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Good morning, {getUserName()}!
          </h1>
          <p className="text-lg text-muted-foreground">
            Here&apos;s what&apos;s happening with your classes today
          </p>
        </div>

        {/* Main Content - Side by Side Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-screen-3xl mx-auto flex-1 min-h-0">
          {/* Recent Activity */}
          <div className="w-full h-full">
            <Card className="shadow-sm border-border/50 pb-0 h-full flex flex-col !bg-[#F0F0F0]">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Recent Activity</h2>
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                </div>
                <div className="flex items-center gap-3 text-sm mt-4">
                  <button
                    onClick={() => setActivityFilter("all")}
                    className={`px-2 py-1 rounded transition-colors ${
                      activityFilter === "all"
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    All
                  </button>
                  <Separator orientation="vertical" className="h-5" />
                  <button
                    onClick={() => setActivityFilter("quizzes")}
                    className={`px-2 py-1 rounded transition-colors ${
                      activityFilter === "quizzes"
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Quizzes
                  </button>
                  <Separator orientation="vertical" className="h-5" />
                  <button
                    onClick={() => setActivityFilter("summaries")}
                    className={`px-2 py-1 rounded transition-colors ${
                      activityFilter === "summaries"
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Summaries
                  </button>
                  <Separator orientation="vertical" className="h-5" />
                  <button
                    onClick={() => setActivityFilter("flashcards")}
                    className={`px-2 py-1 rounded transition-colors ${
                      activityFilter === "flashcards"
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Flashcards
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 flex flex-col">
                <div className="divide-y flex-1 overflow-y-auto">
                  {activitiesLoading ? (
                    <div className="p-4 text-center text-muted-foreground">
                      Loading activities...
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <BookOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-sm">No activities yet.</p>
                      <p className="text-xs mt-1">
                        Start studying to see your activity here!
                      </p>
                    </div>
                  ) : (
                    activities.map((activity) => {
                      const Icon = getActivityIcon(
                        activity.activity_type as
                          | "quiz_completion"
                          | "quiz_generation"
                          | "flashcard_generation"
                          | "flashcard_study"
                          | "reading"
                      );
                      const colors = getActivityColor(activity.feedback);

                      return (
                        <div
                          key={activity.id}
                          className="flex items-start p-4 hover:bg-accent/50 transition-colors"
                        >
                          <div
                            className={`rounded-full p-2 mr-4 ${colors.bg} ${colors.text}`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-sm md:text-base">
                                  {activity.activity_summary}
                                </p>
                                <p className="text-xs md:text-sm text-muted-foreground">
                                  {activity.courses?.name || "Unknown Course"} •{" "}
                                  {formatTimeAgo(new Date(activity.created_at))}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
              <CardFooter className="border-t bg-muted/50 p-3 [.border-t]:pt-3">
                <div className="flex justify-between items-center w-full text-xs md:text-sm">
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {activities.length > 0
                        ? `Last updated ${formatTimeAgo(
                            new Date(activities[0].created_at)
                          )}`
                        : "No activities"}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refetchAll()}
                    disabled={activitiesLoading}
                  >
                    Refresh
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </div>

          {/* Smart Nudges */}
          <div className="w-full h-full">
            <Card className="shadow-sm border-border/50 h-full flex flex-col !bg-[#F0F0F0]">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Smart Nudges</h2>
                  <Button variant="ghost" size="sm">
                    Mark All Read
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Your personalized learning recommendations
                </p>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col">
                <div className="flex-1">
                  {nudges.length > 0 ? (
                    nudges.map((nudge) => (
                      <NudgeCard key={nudge.id} nudge={nudge} />
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <BookOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-sm">No nudges at this time.</p>
                      <p className="text-xs mt-1">
                        Keep learning to get personalized recommendations!
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

export default function WrappedDashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  );
}
