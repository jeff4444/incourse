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

export default function CreateFlashcardsPage({ params }: { params: Promise<{ courseID: string }> }) {
  const router = useRouter()
  const [courseID, setCourseID] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [title, setTitle] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [selectedNotes, setSelectedNotes] = useState<string[]>([])
  const [extraContext, setExtraContext] = useState("")
  const [cardCount, setCardCount] = useState(10)
  const [cardType, setCardType] = useState("term-definition")
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
      alert('Please select at least one file or note to generate flashcards from.')
      return
    }

    setIsGenerating(true)

    try {
      const response = await authenticatedFetchJson<{ deck_id: string; deck: any }>(
        '/api/agents/flashcards',
        {
          method: 'POST',
          body: JSON.stringify({
            courseId: courseID,
            name: title,
            fileIds: selectedFiles,
            noteIds: selectedNotes,
            numFlashcards: cardCount,
            cardType,
            extraContext: extraContext || undefined,
          }),
        }
      )

      if (!response.deck_id) {
        console.error('Failed to generate flashcards: ' + JSON.stringify(response))
        alert('Failed to generate flashcards. Please try again.')
        setIsGenerating(false)
        return
      }

      // Navigate to the newly created flashcard deck
      router.push(`/courses/${courseID}/flashcards/${response.deck_id}`)
    } catch (error) {
      console.error('Error generating flashcards:', error)
      alert('Failed to generate flashcards. Please try again.')
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 to-pink-50">
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
            <CardTitle className="text-2xl">Create Flashcard Deck</CardTitle>
            <CardDescription>Generate AI-powered flashcards to help you study effectively</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Deck Title</Label>
              <Input
                id="title"
                placeholder="e.g., Key Terminology for Midterm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Select Files</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Choose which files to use for generating flashcards.
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
                Choose which notes to use for generating flashcards.
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
                placeholder="Add any specific instructions (e.g., 'Focus on key definitions', 'Include code examples', 'Avoid topics from chapter 1')..."
                className="min-h-[100px]"
                value={extraContext}
                onChange={(e) => setExtraContext(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="card-count">Number of Cards: {cardCount}</Label>
              <Slider
                id="card-count"
                defaultValue={[10]}
                min={5}
                max={30}
                step={1}
                onValueChange={(value) => setCardCount(value[0])}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>5</span>
                <span>30</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="card-type">Card Type</Label>
              <Select value={cardType} onValueChange={setCardType}>
                <SelectTrigger id="card-type">
                  <SelectValue placeholder="Select card type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="term-definition">Term & Definition</SelectItem>
                  <SelectItem value="question-answer">Question & Answer</SelectItem>
                  <SelectItem value="concept-example">Concept & Example</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={handleGenerate} disabled={isGenerating || !title || (selectedFiles.length === 0 && selectedNotes.length === 0)}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Flashcards...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Create Flashcard Deck
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
