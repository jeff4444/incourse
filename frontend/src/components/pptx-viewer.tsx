"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, FileSliders, AlertCircle } from "lucide-react"
import { FileDetails } from "@/lib/types/course"
import PDFViewer from "./pdf-viewer"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export default function PPTXViewer({ fileDetails, courseId }: { fileDetails: FileDetails, courseId?: string }) {
  const [isConverting, setIsConverting] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [convertedPdfUrl, setConvertedPdfUrl] = useState<string | null>(null)
  const [pdfFileDetails, setPdfFileDetails] = useState<FileDetails | null>(null)

  // Convert PPTX to PDF on mount
  useEffect(() => {
    const convertPPTX = async () => {
      try {
        setIsConverting(true)
        setError(null)

        // Call backend conversion endpoint
        const response = await fetch(`${BACKEND_URL}/convert-pptx-to-pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: fileDetails.url
          })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
          throw new Error(errorData.detail || 'Failed to convert PPTX to PDF')
        }

        // Get the PDF blob
        const pdfBlob = await response.blob()
        
        // Create a URL for the PDF blob
        const pdfUrl = URL.createObjectURL(pdfBlob)
        setConvertedPdfUrl(pdfUrl)

        // Create FileDetails for the PDF viewer
        const pdfDetails: FileDetails = {
          ...fileDetails,
          name: fileDetails.name.replace(/\.pptx?$/i, '.pdf'),
          url: pdfUrl,
          type: 'application/pdf'
        }
        setPdfFileDetails(pdfDetails)

      } catch (err) {
        console.error('Error converting PPTX:', err)
        setError(
          err instanceof Error 
            ? err.message 
            : 'Failed to convert PowerPoint presentation. Please ensure LibreOffice is installed on the server.'
        )
      } finally {
        setIsConverting(false)
      }
    }

    convertPPTX()

    // Cleanup: revoke object URL when component unmounts
    return () => {
      if (convertedPdfUrl) {
        URL.revokeObjectURL(convertedPdfUrl)
      }
    }
  }, [fileDetails.url])

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = fileDetails.url
    link.download = fileDetails.name
    link.click()
  }

  // Show loading state while converting
  if (isConverting) {
    return (
      <div className="max-h-screen bg-gradient-to-br from-orange-50 to-pink-50">
        <Card className="my-2">
          <CardContent className="py-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
              <div>
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Converting PowerPoint to PDF...
                </p>
                <p className="text-sm text-gray-500">
                  This may take a few moments
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show error state if conversion failed
  if (error) {
    return (
      <div className="max-h-screen bg-gradient-to-br from-orange-50 to-pink-50">
        <Card className="my-2">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <p className="text-red-600 text-lg font-medium mb-2">
              Conversion Failed
            </p>
            <p className="text-gray-600 text-sm mb-4 max-w-md mx-auto">
              {error}
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={handleDownload} variant="outline">
                Download Original File
              </Button>
              <Button 
                onClick={() => window.location.reload()} 
                variant="default"
              >
                Try Again
              </Button>
            </div>
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-md mx-auto">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This feature requires LibreOffice to be installed on the server.
                Please contact your administrator if this issue persists.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show PDF viewer once conversion is complete
  if (pdfFileDetails) {
    return <PDFViewer fileDetails={pdfFileDetails} courseId={courseId} />
  }

  // Fallback (should not normally reach here)
  return (
    <div className="max-h-screen bg-gradient-to-br from-orange-50 to-pink-50">
      <Card className="my-2">
        <CardContent className="py-12 text-center">
          <FileSliders className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Unable to load presentation</p>
        </CardContent>
      </Card>
    </div>
  )
}