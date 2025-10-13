"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Navbar } from "@/components/navbar"
import { FileSelector } from "@/components/file-selector"
import { Brain, ChevronLeft, Loader2 } from "lucide-react"
import Link from "next/link"

export default function GenerateQuizPage({ params }: { params: Promise<{ courseID: string }> }) {
  const router = useRouter()
  const [courseID, setCourseID] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [title, setTitle] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [questionCount, setQuestionCount] = useState(5)
  const [difficulty, setDifficulty] = useState("medium")

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setCourseID(resolvedParams.courseID);
    };
    getParams();
  }, [params]);

  const handleGenerate = () => {
    setIsGenerating(true)

    // In a real app, this would call an API to generate a quiz
    // For now, simulate a delay and redirect to the quiz page
    setTimeout(() => {
      setIsGenerating(false)
      router.push(`/courses/${courseID}/quiz`)
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50">
      <Navbar />
      <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="mb-6">
          <Link href={`/courses/${courseID}`}>
            <Button variant="ghost" size="sm" className="gap-1">
              <ChevronLeft className="h-4 w-4" />
              Back to Course
            </Button>
          </Link>
        </div>

        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Generate Quiz</CardTitle>
            <CardDescription>Create an AI-generated quiz based on your course materials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Quiz Title</Label>
              <Input
                id="title"
                placeholder="e.g., Data Structures Midterm Review"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Select Files</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Choose which files to use for generating quiz questions.
              </p>
              <FileSelector
                courseId={courseID}
                selectedFileIds={selectedFiles}
                onSelectionChange={setSelectedFiles}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="question-count">Number of Questions: {questionCount}</Label>
              <Slider
                id="question-count"
                defaultValue={[5]}
                min={3}
                max={15}
                step={1}
                onValueChange={(value) => setQuestionCount(value[0])}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>3</span>
                <span>15</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty Level</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger id="difficulty">
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={handleGenerate} disabled={isGenerating || !title || selectedFiles.length === 0}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Quiz...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Generate Quiz
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
