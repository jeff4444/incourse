"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, FileCheck, FileText, X, Loader2, CheckCircle, RefreshCw } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { authenticatedFetchJson } from "@/lib/utils/apiClient"
import { FeedbackTile } from "@/components/feedback-tile"

interface AutograderPanelProps {
  courseId: string
  fileId: string
  assignmentName?: string
}

interface UploadedFile {
  id: string
  file: File
  preview: string
  size: string
}

interface FeedbackItem {
  id: string
  assignment_id: string
  feedback_preview: string
  full_feedback: string
  solution_file_names: string[]
  created_at: string
  created_at_formatted: string
}

export function AutograderPanel({
  courseId,
  fileId,
  assignmentName
}: AutograderPanelProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "feedback">("upload")
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isGrading, setIsGrading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [existingFeedback, setExistingFeedback] = useState<string | null>(null)
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false)
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([])
  const [isLoadingFeedbackList, setIsLoadingFeedbackList] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load feedback list when component mounts
  useEffect(() => {
    const loadFeedbackList = async () => {
      if (!courseId) return
      
      setIsLoadingFeedbackList(true)
      try {
        const result = await authenticatedFetchJson<{
          success: boolean;
          feedback: FeedbackItem[];
          message: string;
        }>(`/api/autograder/feedback/all?course_id=${courseId}&assignment_id=${fileId}`)
        
        if (result.success) {
          setFeedbackList(result.feedback)
          // If there's existing feedback, show the feedback tab by default
          if (result.feedback.length > 0) {
            setActiveTab("feedback")
          }
        }
      } catch (error) {
        console.error('Error loading feedback list:', error)
        // Don't show error to user - just silently fail
      } finally {
        setIsLoadingFeedbackList(false)
      }
    }

    loadFeedbackList()
  }, [courseId, fileId])

  const refreshFeedbackList = async () => {
    if (!courseId) return
    
    setIsLoadingFeedbackList(true)
    try {
      const result = await authenticatedFetchJson<{
        success: boolean;
        feedback: FeedbackItem[];
        message: string;
      }>(`/api/autograder/feedback/all?course_id=${courseId}&assignment_id=${fileId}`)
      
      if (result.success) {
        setFeedbackList(result.feedback)
      }
    } catch (error) {
      console.error('Error refreshing feedback list:', error)
    } finally {
      setIsLoadingFeedbackList(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    setIsUploading(true)
    
    // Process each file
    Array.from(files).forEach((file) => {
      const id = Math.random().toString(36).substr(2, 9)
      const preview = file.name
      const size = formatFileSize(file.size)
      
      const uploadedFile: UploadedFile = {
        id,
        file,
        preview,
        size
      }
      
      setUploadedFiles(prev => [...prev, uploadedFile])
    })
    
    setIsUploading(false)
    
    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleRemoveFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== id))
  }

  const handleGetFeedback = async () => {
    if (uploadedFiles.length === 0) return
    
    setIsGrading(true)
    setFeedback(null)
    
    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append('course_id', courseId)
      formData.append('assignment_id', fileId)
      
      // Add all uploaded files
      uploadedFiles.forEach((uploadedFile) => {
        formData.append('files', uploadedFile.file)
      })
      
      // Send to Next.js API route (which handles authentication and calls Python backend)
      const result = await authenticatedFetchJson<{
        success: boolean;
        feedback: string;
        message: string;
      }>('/api/autograder', {
        method: 'POST',
        body: formData,
      })
      
      if (result.success) {
        setFeedback(result.feedback)
        setActiveTab("feedback")
        // Refresh the feedback list to show the new feedback
        await refreshFeedbackList()
      } else {
        throw new Error(result.message || 'Failed to get feedback')
      }
    } catch (error) {
      console.error('Error getting feedback:', error)
      setFeedback(`Error: ${error instanceof Error ? error.message : 'Failed to get feedback'}`)
      setActiveTab("feedback")
    } finally {
      setIsGrading(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="w-[30vw] h-[85vh] bg-white border border-gray-200 flex flex-col m-10 rounded-xl overflow-hidden shadow-sm">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "upload" | "feedback")}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList className="grid w-full grid-cols-2 bg-gray-100 rounded-none border-b">
          <TabsTrigger value="upload" className="flex items-center gap-2 data-[state=active]:bg-white">
            <Upload className="h-4 w-4" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="feedback" className="flex items-center gap-2 data-[state=active]:bg-white">
            <FileCheck className="h-4 w-4" />
            Feedback
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="flex-1 flex flex-col p-4 m-0 overflow-hidden">
          <div className="flex-1 flex flex-col">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Upload Submission</h3>
              <p className="text-sm text-gray-600 mb-4">
                Upload your homework files to get AI feedback before submitting to Canvas.
              </p>
            </div>

            {/* File Upload Area */}
            <div className="flex-1 flex flex-col">
              <Card className="border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors">
                <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                  <Upload className="h-12 w-12 text-gray-400 mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Drop files here or click to upload</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Supports PDF, DOCX, PPTX, XLSX, and image files
                  </p>
                  <Button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="mb-2"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Choose Files
                      </>
                    )}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.docx,.pptx,.xlsx,.doc,.ppt,.xls,.jpg,.jpeg,.png,.gif,.webp"
                  />
                </CardContent>
              </Card>

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Uploaded Files ({uploadedFiles.length})</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {uploadedFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{file.preview}</p>
                            <p className="text-xs text-gray-500">{file.size}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFile(file.id)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Get Feedback Button */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Button
                onClick={handleGetFeedback}
                disabled={uploadedFiles.length === 0 || isGrading}
                className="w-full"
                size="lg"
              >
                {isGrading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Getting AI Feedback...
                  </>
                ) : (
                  <>
                    <FileCheck className="h-4 w-4 mr-2" />
                    Get AI Feedback
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="feedback" className="flex-1 flex flex-col p-4 m-0 overflow-hidden">
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">AI Feedback</h3>
                <p className="text-sm text-gray-600">
                  Review AI feedback on your submissions to improve before submitting to Canvas.
                </p>
              </div>
              <Button
                onClick={refreshFeedbackList}
                disabled={isLoadingFeedbackList}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingFeedbackList ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* Feedback List */}
            <div className="flex-1 min-h-0 my-5">
              {isLoadingFeedbackList ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-sm">Loading feedback...</p>
                  </div>
                </div>
              ) : feedbackList.length > 0 ? (
                <div className="space-y-4 max-h-150 overflow-y-auto">
                  {feedbackList.map((feedbackItem) => (
                    <FeedbackTile key={feedbackItem.id} feedback={feedbackItem} />
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <FileCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-sm">No feedback available yet</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Upload files and click "Get AI Feedback" to see results
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
