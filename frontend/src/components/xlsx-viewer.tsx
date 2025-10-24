"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, FileSpreadsheet, AlertCircle, Download, Maximize2, Minimize2 } from "lucide-react"
import { File } from "@/lib/types/course"
import PDFViewer from "./pdf-viewer"
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer"
import { authenticatedFetch } from '@/lib/utils/apiClient'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export default function XLSXViewer({ fileDetails, courseId, onTogglePanelVisibility, onShowPanel, onAddToContext, showContextOptions }: { fileDetails: File, courseId?: string, onTogglePanelVisibility?: () => void, onShowPanel?: () => void, onAddToContext?: (text: string, pageNumber: number) => void, showContextOptions?: boolean }) {
  const [isConverting, setIsConverting] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [convertedPdfUrl, setConvertedPdfUrl] = useState<string | null>(null)
  const [pdfFileDetails, setPdfFileDetails] = useState<File | null>(null)
  const [showFallback, setShowFallback] = useState(false)
  const [zenMode, setZenMode] = useState(false)

  // Convert XLSX to PDF on mount
  useEffect(() => {
    let isMounted = true
    let currentPdfUrl: string | null = null
    
    const convertXLSX = async () => {
      try {
        if (!isMounted) return
        setIsConverting(true)
        setError(null)

        // Determine file format
        const fileName = fileDetails.displayName.toLowerCase()
        const format = fileName.endsWith('.xls') ? 'xls' : 'xlsx'

        // Call backend conversion endpoint
        const response = await authenticatedFetch(`${BACKEND_URL}/convert-office-to-pdf`, {
          method: 'POST',
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
        currentPdfUrl = pdfUrl
        
        if (!isMounted) {
          URL.revokeObjectURL(pdfUrl)
          return
        }
        
        setConvertedPdfUrl(pdfUrl)

        // Create FileDetails for the PDF viewer
        const pdfDetails: File = {
          ...fileDetails,
          displayName: fileDetails.displayName.replace(/\.xlsx?$/i, '.pdf'),
          url: pdfUrl,
          contentType: 'application/pdf'
        }
        setPdfFileDetails(pdfDetails)

      } catch (err) {
        if (!isMounted) return
        console.error('Error converting Excel file:', err)
        setError(
          err instanceof Error 
            ? err.message 
            : 'Failed to convert Excel spreadsheet. Please ensure LibreOffice is installed on the server.'
        )
        // Show fallback viewer when conversion fails
        setShowFallback(true)
      } finally {
        if (isMounted) {
          setIsConverting(false)
        }
      }
    }

    convertXLSX()

    // Cleanup: revoke object URL when component unmounts or dependencies change
    return () => {
      isMounted = false
      if (currentPdfUrl) {
        URL.revokeObjectURL(currentPdfUrl)
      }
      if (convertedPdfUrl) {
        URL.revokeObjectURL(convertedPdfUrl)
      }
    }
  }, [fileDetails.url])

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = fileDetails.url || ''
    link.download = fileDetails.displayName
    link.click()
  }

  const toggleZenMode = () => {
    if (!zenMode) {
      // Entering zen mode - hide panel
      onTogglePanelVisibility?.()
    } else {
      // Exiting zen mode - let page decide whether to show panel
      onTogglePanelVisibility?.()
    }
    setZenMode(!zenMode)
  }

  // If PDF is ready, render the PDF viewer directly
  if (pdfFileDetails && !isConverting && !error) {
    return <PDFViewer fileDetails={pdfFileDetails} courseId={courseId} onTogglePanelVisibility={onTogglePanelVisibility} onShowPanel={onShowPanel} onAddToContext={onAddToContext} showContextOptions={showContextOptions} />
  }

  // If conversion failed, show fallback viewer
  if (showFallback && !isConverting) {
    return (
      <div className={`max-h-screen transition-all duration-300 ${zenMode ? "bg-gray-900" : "bg-linear-to-br from-green-50 to-blue-50"}`}>
        <div className={`flex ${zenMode ? "h-screen" : ""}`}>
          <div className={`transition-all duration-300 ${zenMode ? "w-full h-full" : "max-w-6xl mx-auto flex-1"}`}>
            <Card className={`${zenMode ? "bg-gray-800 border-gray-700" : "my-2"} shrink-0 py-1`}>
              <CardContent className="flex items-center justify-between py-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${zenMode ? "text-gray-300" : "text-gray-600"}`}>Excel Spreadsheet (Fallback Viewer)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className={`flex items-center gap-2 ${zenMode ? "border-gray-600 text-gray-300 hover:bg-gray-700" : ""}`}
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleZenMode}
                    className={`h-8 w-8 p-0 ${zenMode ? "text-gray-300 hover:bg-gray-700" : ""}`}
                  >
                    {zenMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className={`flex-1 overflow-hidden py-0 ${zenMode ? "bg-gray-800 border-gray-700 h-[calc(100vh-64px)]" : ""}`}>
              <CardContent className="p-0 h-[85vh]">
                <div className={`h-full w-full ${zenMode ? "bg-gray-900" : ""}`}>
                  <style jsx>{`
                    :global(#msdoc-renderer) {
                      height: 100% !important;
                    }
                    :global(#proxy-renderer) {
                      height: 100% !important;
                    }
                    :global(.doc-viewer-container) {
                      height: 100% !important;
                    }
                  `}</style>
                  <DocViewer
                    key={`xlsx-fallback-${fileDetails.url}`}
                    documents={[{
                      uri: fileDetails.url || '',
                      fileName: fileDetails.displayName,
                      fileType: fileDetails.displayName.split('.').pop()?.toLowerCase() || 'xlsx'
                    }]}
                    pluginRenderers={DocViewerRenderers}
                    config={{
                      header: {
                        disableHeader: false,
                        disableFileName: false,
                        retainURLParams: false
                      },
                      loadingRenderer: {
                        overrideComponent: () => null
                      },
                      noRenderer: {
                        overrideComponent: () => null
                      }
                    }}
                    style={{ 
                      height: `${window.innerHeight * 0.85}px`,
                      width: '100%'
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Otherwise render the conversion UI (loading or error)
  return (
    <div className="max-h-screen bg-linear-to-br from-green-50 to-blue-50">
      <Card className="my-2 shrink-0 py-1">
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

            {error && !showFallback && (
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
                    onClick={() => setShowFallback(true)} 
                    variant="default"
                    size="sm"
                  >
                    Use Fallback Viewer
                  </Button>
                  <Button 
                    onClick={() => {
                      setError(null)
                      setIsConverting(true)
                      setShowFallback(false)
                      // Trigger re-conversion by updating a dependency
                      window.location.reload()
                    }} 
                    variant="outline"
                    size="sm"
                  >
                    Try Again
                  </Button>
                </div>
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800">
                    <strong>Note:</strong> This feature requires LibreOffice to be installed on the server. You can use the fallback viewer to view the document directly.
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

