"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"

export function CourseSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50">
      <Navbar />
      <div className="container mx-auto py-6 px-4 md:px-6">
        {/* Course Header Skeleton */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-9 w-16 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
          </div>

          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <div className="h-9 w-80 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Course Content Skeleton */}
        <div className="grid grid-cols-1 gap-6">
          <Tabs defaultValue="notes" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="notes" disabled>Notes</TabsTrigger>
              <TabsTrigger value="quizzes" disabled>Quizzes</TabsTrigger>
              <TabsTrigger value="flashcards" disabled>Flashcards</TabsTrigger>
            </TabsList>
            
            <TabsContent value="notes">
              <div className="grid grid-cols-1 gap-6">
                {/* Course Overview Card Skeleton */}
                <Card className="pb-0 justify-between">
                  <CardContent>
                    <div className="space-y-4">
                      <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
                      <div className="space-y-2">
                        <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                      <div className="space-y-2 mt-4">
                        <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-4 w-4/5 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                      <div className="space-y-2 mt-4">
                        <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t bg-muted/50 p-3 [.border-t]:pt-3">
                    <div className="flex justify-between items-center w-full text-sm">
                      <div className="flex items-center">
                        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </div>
                  </CardFooter>
                </Card>

                {/* Course Materials Card Skeleton */}
                <Card>
                  <CardHeader>
                    <div className="h-6 w-40 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
                          <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                          <div className="flex-1">
                            <div className="h-5 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
                            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                          <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="border-t">
                    <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="quizzes">
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <div className="h-6 w-36 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-72 bg-gray-200 rounded animate-pulse"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                            <div>
                              <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
                              <div className="h-4 w-40 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="h-6 w-12 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="border-t">
                    <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="flashcards">
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <div className="h-6 w-36 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-80 bg-gray-200 rounded animate-pulse"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                            <div>
                              <div className="h-5 w-40 bg-gray-200 rounded animate-pulse mb-2"></div>
                              <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="border-t">
                    <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
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
