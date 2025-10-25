"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { authenticatedFetchJson } from "@/lib/utils/apiClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Navbar } from "@/components/navbar"
import { FileSelector } from "@/components/file-selector"
import { NoteSelector } from "@/components/note-selector"
import { Brain, ChevronLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/utils/supabase/client"

export default function GenerateQuizPage({ params }: { params: Promise<{ courseID: string }> }) {
  const router = useRouter()
  const [courseID, setCourseID] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [title, setTitle] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [selectedNotes, setSelectedNotes] = useState<string[]>([])
  const [extraContext, setExtraContext] = useState("")
  const [questionCount, setQuestionCount] = useState(5)
  const [difficulty, setDifficulty] = useState("medium")
  const [userId, setUserId] = useState<string>("")

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

  const handleGenerate = async () => {
    // Validate that at least one source is selected
    if (selectedFiles.length === 0 && selectedNotes.length === 0) {
      alert('Please select at least one file or note to generate the quiz from.')
      return
    }

    setIsGenerating(true)

    try {
      const response = await authenticatedFetchJson<{ quiz_id: string; quiz: any }>(
        '/api/agents/quizzes',
        {
          method: 'POST',
          body: JSON.stringify({
            courseId: courseID,
            name: title,
            fileIds: selectedFiles,
            noteIds: selectedNotes,
            numQuestions: questionCount,
            difficulty,
            extraContext: extraContext || undefined,
          }),
        }
      )

      if (!response.quiz_id) {
        console.error('Failed to generate quiz: ' + JSON.stringify(response))
        alert('Failed to generate quiz. Please try again.')
        setIsGenerating(false)
        return
      }

      // Redirect to course page with success message
      router.push(`/courses/${courseID}?quiz=generating`)
    } catch (error) {
      console.error('Error generating quiz:', error)
      alert('Failed to generate quiz. Please try again.')
      setIsGenerating(false)
    }
  }

  const handleDismiss = () => {
    setIsGenerating(false)
    // Navigate back to course page
    router.push(`/courses/${courseID}`)
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
              <Label>Select Notes</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Choose which notes to use for generating quiz questions.
              </p>
              <NoteSelector
                courseId={courseID}
                userId={userId}
                selectedNoteIds={selectedNotes}
                onSelectionChange={setSelectedNotes}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="extra-context">Additional Instructions (optional)</Label>
              <Textarea
                id="extra-context"
                placeholder="Add any specific instructions (e.g., 'Focus on chapters 5-7', 'Include problem-solving questions', 'Avoid topics covered in the last exam')..."
                className="min-h-[100px]"
                value={extraContext}
                onChange={(e) => setExtraContext(e.target.value)}
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
            <Button className="w-full" onClick={handleGenerate} disabled={isGenerating || !title || (selectedFiles.length === 0 && selectedNotes.length === 0)}>
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
