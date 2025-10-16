"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, FileText, Eye, FileIcon } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface FeedbackTileProps {
  feedback: {
    id: string
    assignment_id: string
    feedback_preview: string
    solution_file_names: string[]
    created_at_formatted: string
  }
}

export function FeedbackTile({ feedback }: FeedbackTileProps) {
  const router = useRouter()

  const handleViewMore = () => {
    router.push(`/feedback/${feedback.id}`)
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-sm font-medium text-gray-900 mb-1">
              Assignment
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="h-3 w-3" />
              <span>{feedback.created_at_formatted}</span>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            <FileIcon className="h-3 w-3 mr-1" />
            {feedback.solution_file_names.length} file{feedback.solution_file_names.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-700 mb-1">Files:</p>
            <div className="flex flex-wrap gap-1">
              {feedback.solution_file_names.slice(0, 3).map((filename, index) => (
                <Badge key={index} variant="outline" className="text-xs px-2 py-0.5">
                  {filename}
                </Badge>
              ))}
              {feedback.solution_file_names.length > 3 && (
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  +{feedback.solution_file_names.length - 3} more
                </Badge>
              )}
            </div>
          </div>
          
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Preview:</p>
            <div className="text-sm text-gray-600 leading-relaxed line-clamp-3">
              <ReactMarkdown
                components={{
                  p: ({ children }: any) => <span>{children}</span>,
                  strong: ({ children }: any) => <strong className="font-semibold">{children}</strong>,
                  em: ({ children }: any) => <em className="italic">{children}</em>,
                  code: ({ children }: any) => <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{children}</code>,
                  // Remove block elements for preview
                  h1: ({ children }: any) => <span className="font-bold">{children}</span>,
                  h2: ({ children }: any) => <span className="font-semibold">{children}</span>,
                  h3: ({ children }: any) => <span className="font-medium">{children}</span>,
                  ul: ({ children }: any) => <span>{children}</span>,
                  ol: ({ children }: any) => <span>{children}</span>,
                  li: ({ children }: any) => <span>• {children} </span>,
                  blockquote: ({ children }: any) => <span className="italic">"{children}"</span>,
                  pre: ({ children }: any) => <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{children}</code>,
                }}
              >
                {feedback.feedback_preview}
              </ReactMarkdown>
            </div>
          </div>
          
          <Button 
            onClick={handleViewMore}
            size="sm"
            className="w-full"
            variant="outline"
          >
            <Eye className="h-4 w-4 mr-2" />
            View Full Feedback
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
