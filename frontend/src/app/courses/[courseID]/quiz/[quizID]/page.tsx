"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { QuizView } from "@/components/quiz-view"
import { Navbar } from "@/components/navbar"
import { useQuiz, useRecordQuizAttempt } from "@/lib/hooks/useQuizzes"

export default function QuizPage({ params }: { params: Promise<{ courseID: string; quizID: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [courseID, setCourseID] = useState<string>("")
  const [quizID, setQuizID] = useState<string>("")

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setCourseID(resolvedParams.courseID);
      setQuizID(resolvedParams.quizID);
    };
    getParams();
  }, [params]);

  // Fetch quiz from database
  const { data: quiz, isLoading, error } = useQuiz(quizID);
  const recordAttempt = useRecordQuizAttempt();

  useEffect(() => {
    // If quiz not found after loading, redirect back to course page
    if (!isLoading && !quiz && quizID && courseID) {
      const currentTab = searchParams.get('tab') || 'quizzes'
      router.push(`/courses/${courseID}?tab=${currentTab}`)
    }
  }, [quiz, isLoading, quizID, courseID, router, searchParams])

  const handleQuizComplete = async (score: number, selectedAnswers: Record<number, string>) => {
    if (!quiz) return;

    // Transform answers for storage
    const answers = quiz.questions.map((question) => ({
      question_id: question.id,
      selected_option_index: question.options.indexOf(selectedAnswers[parseInt(question.id)] || ""),
      correct: selectedAnswers[parseInt(question.id)] === question.options[question.correct_option_index],
    }));

    try {
      await recordAttempt.mutateAsync({
        quizId: quizID,
        score,
        answers,
      });
    } catch (error) {
      console.error('Error recording quiz attempt:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50">
        <Navbar />
        <div className="container mx-auto py-12 px-4">
          <div className="text-center">Loading quiz...</div>
        </div>
      </div>
    )
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50">
        <Navbar />
        <div className="container mx-auto py-12 px-4">
          <div className="text-center text-red-500">
            <h2 className="text-xl font-semibold mb-2">Error loading quiz</h2>
            <p>The quiz could not be found or there was an error loading it.</p>
          </div>
        </div>
      </div>
    )
  }

  // Transform database quiz to match QuizView component format
  const transformedQuestions = quiz.questions.map((question) => ({
    id: parseInt(question.id) || 0,
    question: question.question,
    options: question.options,
    correctAnswer: question.options[question.correct_option_index],
    explanation: question.explanation,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-pink-50">
      <Navbar />
      <div className="container mx-auto py-12 px-4">
        <QuizView 
          title={quiz.name} 
          questions={transformedQuestions} 
          onComplete={handleQuizComplete}
          courseID={courseID}
          returnTab={searchParams.get('tab') || 'quizzes'}
        />
      </div>
    </div>
  )
}
