"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, FileSpreadsheet, AlertCircle, Download } from "lucide-react"
import { FileDetails } from "@/lib/types/course"
import PDFViewer from "./pdf-viewer"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export default function XLSXViewer({ fileDetails, courseId, showChat = true }: { fileDetails: FileDetails, courseId?: string, showChat?: boolean }) {
  const [isConverting, setIsConverting] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [convertedPdfUrl, setConvertedPdfUrl] = useState<string | null>(null)
  const [pdfFileDetails, setPdfFileDetails] = useState<FileDetails | null>(null)

  // Convert XLSX to PDF on mount
  useEffect(() => {
    const convertXLSX = async () => {
      try {
        setIsConverting(true)
        setError(null)

        // Determine file format
        const fileName = fileDetails.name.toLowerCase()
        const format = fileName.endsWith('.xls') ? 'xls' : 'xlsx'

        // Call backend conversion endpoint
        const response = await fetch(`${BACKEND_URL}/convert-office-to-pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: fileDetails.url,
            format: format
          })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
          throw new Error(errorData.detail || 'Failed to convert Excel file to PDF')
        }

        // Get the PDF blob
        const pdfBlob = await response.blob()
        
        // Create a URL for the PDF blob
        const pdfUrl = URL.createObjectURL(pdfBlob)
        setConvertedPdfUrl(pdfUrl)

        // Create FileDetails for the PDF viewer
        const pdfDetails: FileDetails = {
          ...fileDetails,
          name: fileDetails.name.replace(/\.xlsx?$/i, '.pdf'),
          url: pdfUrl,
          type: 'application/pdf'
        }
        setPdfFileDetails(pdfDetails)

      } catch (err) {
        console.error('Error converting Excel file:', err)
        setError(
          err instanceof Error 
            ? err.message 
            : 'Failed to convert Excel spreadsheet. Please ensure LibreOffice is installed on the server.'
        )
      } finally {
        setIsConverting(false)
      }
    }

    convertXLSX()

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

  // If PDF is ready, render the PDF viewer directly
  if (pdfFileDetails && !isConverting && !error) {
    return <PDFViewer fileDetails={pdfFileDetails} courseId={courseId} showChat={showChat} />
  }

  // Otherwise render the conversion UI (loading or error)
  return (
    <div className="max-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <Card className="my-2 flex-shrink-0 py-1">
        <CardContent className="flex items-center justify-between py-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Excel Spreadsheet</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        </CardContent>
      </Card>

      <Card className="flex-1 overflow-hidden py-0">
        <CardContent className="p-0 h-[85vh]">
          <div className="h-full overflow-y-auto bg-gray-100 flex flex-col items-center justify-center">
            {isConverting && (
              <div className="flex flex-col items-center gap-4 py-12">
                <Loader2 className="h-12 w-12 animate-spin text-green-500" />
                <div className="text-center">
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    Converting Excel to PDF...
                  </p>
                  <p className="text-sm text-gray-500">
                    This may take a few seconds
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center gap-4 py-12 max-w-md mx-auto px-4">
                <AlertCircle className="h-16 w-16 text-red-400" />
                <div className="text-center">
                  <p className="text-red-600 text-lg font-medium mb-2">
                    Conversion Failed
                  </p>
                  <p className="text-gray-600 text-sm mb-4">
                    {error}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleDownload} variant="outline" size="sm">
                    Download Original File
                  </Button>
                  <Button 
                    onClick={() => window.location.reload()} 
                    variant="default"
                    size="sm"
                  >
                    Try Again
                  </Button>
                </div>
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800">
                    <strong>Note:</strong> This feature requires LibreOffice to be installed on the server.
                  </p>
                </div>
              </div>
            )}

            {!isConverting && !error && !pdfFileDetails && (
              <div className="text-center py-12">
                <FileSpreadsheet className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Unable to load spreadsheet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

