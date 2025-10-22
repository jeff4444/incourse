"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Navbar } from "@/components/navbar";

export function CourseSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50">
      <Navbar />
      <div className="container mx-auto py-6 px-4 md:px-6">
        {/* Course Header Skeleton */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>

          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <Skeleton className="h-9 w-80 mb-2" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
        </div>

        {/* Course Content Skeleton */}
        <div className="grid grid-cols-1 gap-6">
          <Tabs defaultValue="notes" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="notes" disabled>
                Notes
              </TabsTrigger>
              <TabsTrigger value="quizzes" disabled>
                Quizzes
              </TabsTrigger>
              <TabsTrigger value="flashcards" disabled>
                Flashcards
              </TabsTrigger>
            </TabsList>

            <TabsContent value="notes">
              <div className="grid grid-cols-1 gap-6">
                {/* Course Overview Card Skeleton */}
                <Card className="pb-0 justify-between">
                  <CardContent>
                    <div className="space-y-4">
                      <Skeleton className="h-6 w-32" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                      <div className="space-y-2 mt-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-4/5" />
                      </div>
                      <div className="space-y-2 mt-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t bg-muted/50 p-3 [.border-t]:pt-3">
                    <div className="flex justify-between items-center w-full text-sm">
                      <div className="flex items-center">
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-20" />
                        <Skeleton className="h-8 w-20" />
                      </div>
                    </div>
                  </CardFooter>
                </Card>

                {/* Course Materials Card Skeleton */}
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-64" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-4 p-4 rounded-lg border"
                        >
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="flex-1">
                            <Skeleton className="h-5 w-48 mb-2" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                          <Skeleton className="h-8 w-16" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="border-t">
                    <Skeleton className="h-10 w-full" />
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="quizzes">
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-36" />
                    <Skeleton className="h-4 w-72" />
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-4 rounded-lg border"
                        >
                          <div className="flex items-center gap-4">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div>
                              <Skeleton className="h-5 w-32 mb-2" />
                              <Skeleton className="h-4 w-40" />
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Skeleton className="h-6 w-12" />
                            <Skeleton className="h-8 w-20" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="border-t">
                    <Skeleton className="h-10 w-full" />
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="flashcards">
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <Skeleton className="h-6 w-36" />
                    <Skeleton className="h-4 w-80" />
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-4 rounded-lg border"
                        >
                          <div className="flex items-center gap-4">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div>
                              <Skeleton className="h-5 w-40 mb-2" />
                              <Skeleton className="h-4 w-48" />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-8 w-20" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="border-t">
                    <Skeleton className="h-10 w-full" />
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
