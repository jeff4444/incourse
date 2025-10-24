"use client";

import { useState, useEffect } from "react";
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { BookOpen, ChevronLeft, Clock, Download, Play, Plus, ThumbsUp, Brain, FlaskConical, ClipboardList, StickyNote } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { ModuleList } from "@/components/module-list"
import { AssignmentList } from "@/components/assignment-list"
import { CourseSkeleton } from "@/components/course-skeleton"
import ProtectedRoute from "@/components/auth/ProtectedRoute"
import { useCourse } from "@/lib/hooks/useCourses"
import { useModules } from "@/lib/hooks/useModules"
import { useAllFiles } from "@/lib/hooks/useAllFiles"
import { useFlashcardDecks } from "@/lib/hooks/useFlashcards"
import { useQuizzes } from "@/lib/hooks/useQuizzes"
import { useAssignments } from "@/lib/hooks/useAssignments"
import { useNoteFolders, useNotes } from "@/lib/hooks/useNotes"
import { NoteList } from "@/components/note-list"
import { createClient } from "@/lib/utils/supabase/client"

function CoursePage({
  params,
}: {
  params: Promise<{ courseID: string }>
}) {
  const [courseID, setCourseID] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setCourseID(resolvedParams.courseID);
    };
    getParams();
  }, [params]);

  useEffect(() => {
    const getUserId = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUserId();
  }, []);

  const { data: course, isLoading: courseLoading, error: courseError } = useCourse(courseID);
  const { data: modules = [], isLoading: modulesLoading, error: modulesError } = useModules(courseID);
  const { data: allFiles = [], isLoading: allFilesLoading } = useAllFiles(courseID, true);
  const { data: flashcardDecks = [], isLoading: flashcardsLoading } = useFlashcardDecks(courseID, userId);
  const { data: quizzes = [], isLoading: quizzesLoading } = useQuizzes(courseID, userId);
  const { data: assignments = [], isLoading: assignmentsLoading } = useAssignments(courseID);
  const { data: noteFolders = [], isLoading: noteFoldersLoading } = useNoteFolders(courseID, userId);
  const { data: notes = [], isLoading: notesLoading } = useNotes(courseID, userId);

  // Create pseudo "All Files" module if files exist
  const allFilesModule = allFiles.length > 0 ? {
    id: "all-files",
    lmsId: "all-files",
    courseId: courseID,
    name: "All Files",
    description: "All course files",
    itemsCount: allFiles.length,
    moduleItems: allFiles.map((file, index) => ({
      id: file.id,
      lmsId: file.lmsId,
      lmsContentId: file.lmsId,
      name: file.displayName,
      moduleId: "all-files",
      courseId: courseID,
      type: "File",
      url: file.url,
      position: index + 1,
    })),
    prerequisites: null,
  } : null;

  const allModules = allFilesModule ? [...modules, allFilesModule] : modules;

  const loading = courseLoading || modulesLoading || allFilesLoading;
  const error = courseError || modulesError;

  if (loading) {
    return <CourseSkeleton />;
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-linear-to-br from-orange-50 to-pink-50">
        <Navbar />
        <div className="container mx-auto py-6 px-4 md:px-6">
          <div className="text-center text-red-500 mt-8">
            <h2 className="text-xl font-semibold mb-2">Failed to load course</h2>
            <p>The course you're looking for could not be found or there was an error loading it.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 to-pink-50">
      <Navbar />
      <div className="container mx-auto py-6 px-4 md:px-6">
        {/* Course Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Link href="/courses">
              <Button variant="ghost" size="sm" className="gap-1">
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <Badge className="bg-blue-500 text-white">{course.code}</Badge>
          </div>

          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{course.name}</h1>
              <p className="text-muted-foreground">
                {course.year} • {course.semester}
              </p>
            </div>
          </div>
        </div>

        {/* Course Content */}
        <div className="grid grid-cols-1 gap-6">
          <Tabs defaultValue="modules" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="modules">Modules</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
              <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
              <TabsTrigger value="assignments">Assignments</TabsTrigger>
            </TabsList>
            <TabsContent value="modules">
              <div className="grid grid-cols-1 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Course Materials</CardTitle>
                    <CardDescription>Access your course materials and resources</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ModuleList modules={allModules} courseID={courseID} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value="notes">
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <StickyNote className="h-5 w-5" />
                      Course Notes
                    </CardTitle>
                    <CardDescription>Take and organize your personal notes for this course</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {notesLoading || noteFoldersLoading ? (
                      <div className="text-center py-8 text-muted-foreground">Loading notes...</div>
                    ) : (
                      <NoteList 
                        notes={notes} 
                        folders={noteFolders} 
                        courseID={courseID} 
                        userId={userId} 
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value="quizzes">
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Quizzes</CardTitle>
                    <CardDescription>Test your knowledge with AI-generated quizzes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {quizzesLoading ? (
                      <div className="text-center py-8 text-muted-foreground">Loading quizzes...</div>
                    ) : quizzes.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No quizzes yet. Generate your first quiz to get started!</p>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {quizzes.map((quiz) => {
                          const formattedDate = new Date(quiz.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          });

                          return (
                            <div
                              key={quiz.id}
                              className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <div className="rounded-full p-2 bg-blue-100 text-blue-600">
                                  <Play className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="font-medium">{quiz.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {quiz.question_count} questions • {formattedDate}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <Link href={`/courses/${courseID}/quiz/${quiz.id}`}>
                                  <Button size="sm">Start Quiz</Button>
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="border-t">
                    <Link href={`/courses/${courseID}/generate-quiz`} className="w-full">
                      <Button className="w-full">
                        <FlaskConical className="mr-2 h-4 w-4" />
                        Generate New Quiz
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="flashcards">
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Flashcard Decks</CardTitle>
                    <CardDescription>Practice with spaced repetition flashcards</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {flashcardsLoading ? (
                      <div className="text-center py-8 text-muted-foreground">Loading flashcard decks...</div>
                    ) : flashcardDecks.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No flashcard decks yet. Create your first deck to get started!</p>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {flashcardDecks.map((deck) => {
                          const formattedDate = new Date(deck.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          });

                          return (
                            <div
                              key={deck.id}
                              className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <div className="rounded-full p-2 bg-purple-100 text-purple-600">
                                  <BookOpen className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="font-medium">{deck.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {deck.card_count} cards • Created {formattedDate}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Link href={`/courses/${courseID}/flashcards/${deck.id}`}>
                                  <Button size="sm">Practice</Button>
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="border-t">
                    <Link href={`/courses/${courseID}/create-flashcards`} className="w-full">
                      <Button className="w-full">
                        <Brain className="mr-2 h-4 w-4" />
                        Create New Deck
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="assignments">
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardList className="h-5 w-5" />
                      Course Assignments
                    </CardTitle>
                    <CardDescription>View and manage your course assignments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {assignmentsLoading ? (
                      <div className="text-center py-8 text-muted-foreground">Loading assignments...</div>
                    ) : (
                      <AssignmentList assignments={assignments} courseID={courseID} />
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default function WrappedCoursePage({
  params,
}: {
  params: Promise<{ courseID: string }>
}) {
  return (
    <ProtectedRoute>
      <CoursePage params={params} />
    </ProtectedRoute>
  );
}
