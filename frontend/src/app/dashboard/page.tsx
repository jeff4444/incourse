"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BookOpen, Clock, RefreshCw } from "lucide-react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { NudgeCard } from "@/components/nudge-card";
import { useAuth } from "@/hooks/useAuth";
import { useAllActivitiesByType } from "@/lib/hooks/useActivities";
import { getActivityIcon, getActivityColor } from "@/lib/utils/activityUtils";

function DashboardPage() {
  const { user } = useAuth();
  const [activityFilter, setActivityFilter] = useState<string>("all");

  // Fetch all activity types once and cache them
  const { isLoading: activitiesLoading, refetchAll } =
    useAllActivitiesByType(5);

  // Note: Currently using dummyActivities for display
  // Real activity filtering logic is ready but commented out until data integration

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

  // Dummy accordion activities
  const dummyActivities = [
    {
      id: 1,
      title: "Completed Data Structures Quiz",
      course: "CS 101",
      timestamp: "2 hours ago",
      type: "quiz_completion",
      content: {
        score: "85%",
        totalQuestions: 20,
        correctAnswers: 17,
        timeSpent: "12 minutes",
        topics: ["Arrays", "Linked Lists", "Stacks", "Queues"],
        feedback: "Great job! Focus on queue operations for improvement.",
      },
    },
    {
      id: 2,
      title: "Flashcard Study Session",
      course: "BIOL 201",
      timestamp: "4 hours ago",
      type: "flashcard_study",
      content: {
        cardsStudied: 45,
        correctRate: "78%",
        timeSpent: "18 minutes",
        difficulty: "Medium",
        topics: ["Cell Biology", "Genetics", "Evolution"],
        notes: "Need to review mitosis phases more thoroughly.",
      },
    },
    {
      id: 3,
      title: "Generated Lecture Summary",
      course: "HIST 150",
      timestamp: "1 day ago",
      type: "summary_generation",
      content: {
        lectureTitle: "World War II: Causes and Consequences",
        keyPoints: [
          "Treaty of Versailles impact on Germany",
          "Rise of fascism in Europe",
          "Pearl Harbor and US entry",
          "Holocaust and its aftermath",
        ],
        summaryLength: "2,400 words",
        confidence: "High",
      },
    },
    {
      id: 4,
      title: "Reading Activity",
      course: "ENG 101",
      timestamp: "2 days ago",
      type: "reading",
      content: {
        pagesRead: 15,
        highlights: 8,
        notes: 12,
        readingTime: "45 minutes",
        comprehension: "Good",
        keyInsights: [
          "Author's use of symbolism",
          "Character development patterns",
          "Thematic connections to modern society",
        ],
      },
    },
    {
      id: 5,
      title: "Note-Taking Session",
      course: "CHEM 201",
      timestamp: "3 days ago",
      type: "note_taking",
      content: {
        notesCreated: 23,
        formulas: 8,
        diagrams: 3,
        sessionLength: "35 minutes",
        topics: ["Organic Chemistry", "Reaction Mechanisms", "Stereochemistry"],
        reviewStatus: "Needs review",
      },
    },
  ];

  return (
    <SidebarLayout breadcrumbs={[{ label: "Home" }]}>
      {/* Header Section */}
      <div className="container mx-auto px-4 md:px-6 flex flex-col -mt-2 min-h-0 flex-1">
        <div className="mb-4 shrink-0">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Good morning, {getUserName()}!
          </h1>
          <p className="text-lg text-muted-foreground">
            Here&apos;s what&apos;s happening with your classes today
          </p>
        </div>

        {/* Main Content - Side by Side Layout */}
        <div className="flex flex-col md:flex-row gap-0 flex-1 min-h-0">
          {/* Recent Activity */}
          <div className="w-full md:flex-1 md:min-h-0 flex flex-col">
            <div className="flex flex-col h-full">
              {/* Header with underline */}
              <div className="shrink-0">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Recent Activity</h2>
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                </div>
                <div className="flex items-center gap-3 text-sm">
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
                <Separator
                  orientation="horizontal"
                  className="w-full mt-2 bg-gray-200"
                />
              </div>

              {/* Content */}
              <div className="flex-1 flex flex-col mt-4">
                <div className="flex-1 overflow-y-auto">
                  {activitiesLoading ? (
                    <div className="p-4 text-center text-muted-foreground">
                      Loading activities...
                    </div>
                  ) : dummyActivities.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <BookOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-sm">No activities yet.</p>
                      <p className="text-xs mt-1">
                        Start studying to see your activity here!
                      </p>
                    </div>
                  ) : (
                    <Accordion type="single" collapsible className="w-full">
                      {dummyActivities.map((activity) => {
                        const Icon = getActivityIcon(
                          activity.type as
                            | "quiz_completion"
                            | "quiz_generation"
                            | "flashcard_generation"
                            | "flashcard_study"
                            | "reading"
                        );
                        const colors = getActivityColor("good");

                        return (
                          <AccordionItem
                            key={activity.id}
                            value={`item-${activity.id}`}
                            className="border-b border-gray-200"
                          >
                            <AccordionTrigger className="hover:bg-accent/50 transition-colors py-3">
                              <div className="flex items-center gap-3 text-left">
                                <div
                                  className={`rounded-full p-2 ${colors.bg} ${colors.text}`}
                                >
                                  <Icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-sm md:text-base">
                                    {activity.title}
                                  </p>
                                  <p className="text-xs md:text-sm text-muted-foreground">
                                    {activity.course} • {activity.timestamp}
                                  </p>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-4 pl-12">
                              <div className="space-y-3 text-sm">
                                {activity.type === "quiz_completion" && (
                                  <>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <span className="font-medium">
                                          Score:
                                        </span>{" "}
                                        {activity.content.score}
                                      </div>
                                      <div>
                                        <span className="font-medium">
                                          Questions:
                                        </span>{" "}
                                        {activity.content.totalQuestions}
                                      </div>
                                      <div>
                                        <span className="font-medium">
                                          Correct:
                                        </span>{" "}
                                        {activity.content.correctAnswers}
                                      </div>
                                      <div>
                                        <span className="font-medium">
                                          Time:
                                        </span>{" "}
                                        {activity.content.timeSpent}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="font-medium">
                                        Topics:
                                      </span>{" "}
                                      {activity.content.topics?.join(", ") ||
                                        "N/A"}
                                    </div>
                                    <div className="text-muted-foreground">
                                      <span className="font-medium">
                                        Feedback:
                                      </span>{" "}
                                      {activity.content.feedback}
                                    </div>
                                  </>
                                )}
                                {activity.type === "flashcard_study" && (
                                  <>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <span className="font-medium">
                                          Cards Studied:
                                        </span>{" "}
                                        {activity.content.cardsStudied}
                                      </div>
                                      <div>
                                        <span className="font-medium">
                                          Correct Rate:
                                        </span>{" "}
                                        {activity.content.correctRate}
                                      </div>
                                      <div>
                                        <span className="font-medium">
                                          Time:
                                        </span>{" "}
                                        {activity.content.timeSpent}
                                      </div>
                                      <div>
                                        <span className="font-medium">
                                          Difficulty:
                                        </span>{" "}
                                        {activity.content.difficulty}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="font-medium">
                                        Topics:
                                      </span>{" "}
                                      {activity.content.topics?.join(", ") ||
                                        "N/A"}
                                    </div>
                                    <div className="text-muted-foreground">
                                      <span className="font-medium">
                                        Notes:
                                      </span>{" "}
                                      {activity.content.notes}
                                    </div>
                                  </>
                                )}
                                {activity.type === "summary_generation" && (
                                  <>
                                    <div>
                                      <span className="font-medium">
                                        Lecture:
                                      </span>{" "}
                                      {activity.content.lectureTitle}
                                    </div>
                                    <div>
                                      <span className="font-medium">
                                        Length:
                                      </span>{" "}
                                      {activity.content.summaryLength}
                                    </div>
                                    <div>
                                      <span className="font-medium">
                                        Confidence:
                                      </span>{" "}
                                      {activity.content.confidence}
                                    </div>
                                    <div>
                                      <span className="font-medium">
                                        Key Points:
                                      </span>
                                      <ul className="list-disc list-inside mt-1 space-y-1">
                                        {activity.content.keyPoints?.map(
                                          (point, index) => (
                                            <li
                                              key={index}
                                              className="text-muted-foreground"
                                            >
                                              {point}
                                            </li>
                                          )
                                        )}
                                      </ul>
                                    </div>
                                  </>
                                )}
                                {activity.type === "reading" && (
                                  <>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <span className="font-medium">
                                          Pages:
                                        </span>{" "}
                                        {activity.content.pagesRead}
                                      </div>
                                      <div>
                                        <span className="font-medium">
                                          Highlights:
                                        </span>{" "}
                                        {activity.content.highlights}
                                      </div>
                                      <div>
                                        <span className="font-medium">
                                          Notes:
                                        </span>{" "}
                                        {activity.content.notes}
                                      </div>
                                      <div>
                                        <span className="font-medium">
                                          Time:
                                        </span>{" "}
                                        {activity.content.readingTime}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="font-medium">
                                        Comprehension:
                                      </span>{" "}
                                      {activity.content.comprehension}
                                    </div>
                                    <div>
                                      <span className="font-medium">
                                        Key Insights:
                                      </span>
                                      <ul className="list-disc list-inside mt-1 space-y-1">
                                        {activity.content.keyInsights?.map(
                                          (insight, index) => (
                                            <li
                                              key={index}
                                              className="text-muted-foreground"
                                            >
                                              {insight}
                                            </li>
                                          )
                                        )}
                                      </ul>
                                    </div>
                                  </>
                                )}
                                {activity.type === "note_taking" && (
                                  <>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <span className="font-medium">
                                          Notes Created:
                                        </span>{" "}
                                        {activity.content.notesCreated}
                                      </div>
                                      <div>
                                        <span className="font-medium">
                                          Formulas:
                                        </span>{" "}
                                        {activity.content.formulas}
                                      </div>
                                      <div>
                                        <span className="font-medium">
                                          Diagrams:
                                        </span>{" "}
                                        {activity.content.diagrams}
                                      </div>
                                      <div>
                                        <span className="font-medium">
                                          Duration:
                                        </span>{" "}
                                        {activity.content.sessionLength}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="font-medium">
                                        Topics:
                                      </span>{" "}
                                      {activity.content.topics?.join(", ") ||
                                        "N/A"}
                                    </div>
                                    <div className="text-muted-foreground">
                                      <span className="font-medium">
                                        Review Status:
                                      </span>{" "}
                                      {activity.content.reviewStatus}
                                    </div>
                                  </>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 pt-3 mt-4 shrink-0">
                <div className="flex justify-between items-center w-full text-xs md:text-sm">
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {dummyActivities.length > 0
                        ? `Last updated ${dummyActivities[0].timestamp}`
                        : "No activities"}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => refetchAll()}
                    disabled={activitiesLoading}
                    className="h-8 w-8"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        activitiesLoading ? "animate-spin" : ""
                      }`}
                    />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Separator - Only on desktop */}
          <Separator
            orientation="vertical"
            className="hidden md:block mx-4 h-auto bg-gray-200"
          />

          {/* Smart Nudges */}
          <div className="w-full md:flex-1 flex flex-col mt-8 md:mt-0">
            <div className="flex flex-col h-full">
              {/* Header with underline */}
              <div className="pb-3 shrink-0">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-xl font-semibold mb-4">Smart Nudges</h2>
                  <Button variant="ghost" size="sm">
                    Mark All Read
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your personalized learning recommendations
                </p>
                <Separator
                  orientation="horizontal"
                  className="w-full mt-3 bg-gray-200"
                />
              </div>

              {/* Content */}
              <div className="flex-1 flex flex-col mt-4">
                <div className="flex-1 overflow-y-auto">
                  {nudges.length > 0 ? (
                    <div className="space-y-3 p-4">
                      {nudges.map((nudge) => (
                        <NudgeCard key={nudge.id} nudge={nudge} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8 px-4">
                      <BookOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-sm">No nudges at this time.</p>
                      <p className="text-xs mt-1">
                        Keep learning to get personalized recommendations!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
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
