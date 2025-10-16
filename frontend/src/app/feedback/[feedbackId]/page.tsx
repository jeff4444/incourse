"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, FileText, Calendar, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { authenticatedFetchJson } from '@/lib/utils/apiClient'
import ReactMarkdown from 'react-markdown'

interface FeedbackData {
  id: string
  assignment_id: string
  feedback_text: string
  solution_file_names: string[]
  created_at: string
  created_at_formatted: string
}

export default function FeedbackViewer() {
  const params = useParams()
  const router = useRouter()
  const [feedback, setFeedback] = useState<FeedbackData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        setLoading(true)
        const result = await authenticatedFetchJson<{
          success: boolean;
          feedback: FeedbackData;
        }>(`/api/autograder/feedback/${params.feedbackId}`)
        
        if (result.success) {
          setFeedback(result.feedback)
        } else {
          setError('Failed to load feedback')
        }
      } catch (err) {
        console.error('Error fetching feedback:', err)
        setError('Failed to load feedback')
      } finally {
        setLoading(false)
      }
    }

    if (params.feedbackId) {
      fetchFeedback()
    }
  }, [params.feedbackId])

  const handleDownload = () => {
    if (!feedback) return
    
    const blob = new Blob([feedback.feedback_text], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `feedback-${feedback.assignment_id}-${new Date(feedback.created_at).toISOString().split('T')[0]}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading feedback...</p>
        </div>
      </div>
    )
  }

  if (error || !feedback) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Feedback Not Found</h2>
              <p className="text-gray-600 mb-4">{error || 'The requested feedback could not be found.'}</p>
              <Button onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.back()}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">AI Feedback</h1>
                <p className="text-sm text-gray-600">Assignment: {feedback.assignment_id}</p>
              </div>
            </div>
            <Button onClick={handleDownload} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Metadata Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Feedback Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Created</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">{feedback.created_at_formatted}</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Assignment ID</p>
                <Badge variant="secondary">{feedback.assignment_id}</Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Files Submitted</p>
                <div className="flex flex-wrap gap-1">
                  {feedback.solution_file_names.map((filename, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {filename}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feedback Content */}
        <Card>
          <CardHeader>
            <CardTitle>Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-lg max-w-none">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <ReactMarkdown
                  components={{
                    p: ({ children }: any) => <p className="mb-4 last:mb-0 text-gray-800 leading-relaxed">{children}</p>,
                    ul: ({ children }: any) => <ul className="mb-4 list-disc list-inside space-y-2 text-gray-800">{children}</ul>,
                    ol: ({ children }: any) => <ol className="mb-4 list-decimal list-inside space-y-2 text-gray-800">{children}</ol>,
                    li: ({ children }: any) => <li className="text-gray-800">{children}</li>,
                    h1: ({ children }: any) => <h1 className="text-2xl font-bold mb-4 text-gray-900">{children}</h1>,
                    h2: ({ children }: any) => <h2 className="text-xl font-semibold mb-3 text-gray-900">{children}</h2>,
                    h3: ({ children }: any) => <h3 className="text-lg font-medium mb-2 text-gray-900">{children}</h3>,
                    h4: ({ children }: any) => <h4 className="text-base font-medium mb-2 text-gray-900">{children}</h4>,
                    h5: ({ children }: any) => <h5 className="text-sm font-medium mb-2 text-gray-900">{children}</h5>,
                    h6: ({ children }: any) => <h6 className="text-sm font-medium mb-2 text-gray-900">{children}</h6>,
                    code: ({ children }: any) => <code className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-sm font-mono">{children}</code>,
                    pre: ({ children }: any) => <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto mb-4 font-mono">{children}</pre>,
                    blockquote: ({ children }: any) => <blockquote className="border-l-4 border-blue-400 bg-blue-50 pl-4 py-3 mb-4 italic text-gray-700">{children}</blockquote>,
                    strong: ({ children }: any) => <strong className="font-semibold text-gray-900">{children}</strong>,
                    em: ({ children }: any) => <em className="italic text-gray-800">{children}</em>,
                    table: ({ children }: any) => <table className="w-full border-collapse border border-gray-300 mb-4">{children}</table>,
                    th: ({ children }: any) => <th className="border border-gray-300 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-900">{children}</th>,
                    td: ({ children }: any) => <td className="border border-gray-300 px-3 py-2 text-gray-800">{children}</td>,
                    hr: () => <hr className="my-6 border-gray-300" />,
                    a: ({ children, href }: any) => <a href={href} className="text-blue-600 underline hover:text-blue-800" target="_blank" rel="noopener noreferrer">{children}</a>,
                  }}
                >
                  {feedback.feedback_text}
                </ReactMarkdown>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
