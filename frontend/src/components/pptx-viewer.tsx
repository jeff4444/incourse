"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useResizeObserver } from "@wojtekmaj/react-hooks"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ZoomIn, ZoomOut, Download, FileSliders, Loader2, Maximize2, Minimize2, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react"
import { ChatPanel } from "./ai-chat-panel"
import { FileDetails } from "@/lib/types/course"
import JSZip from 'jszip'

const resizeObserverOptions = {}
const maxWidth = 800

interface PPTXSlide {
  id: number
  content: string
  notes?: string
  layout?: string
}

export default function PPTXViewer({ fileDetails }: { fileDetails: FileDetails }) {
  const [slides, setSlides] = useState<PPTXSlide[]>([])
  const [currentSlide, setCurrentSlide] = useState(1)
  const [slideInput, setSlideInput] = useState("1")
  const [zoom, setZoom] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [zenMode, setZenMode] = useState(false)
  const [showChat, setShowChat] = useState(true)
  const [activeTab, setActiveTab] = useState<"chat" | "suggestions">("chat")
  type ContextItem = { id: string; text: string; source: string; pageNumber: number }
  const [contextItems, setContextItems] = useState<ContextItem[]>([])
  const [selectedContextItem, setSelectedContextItem] = useState<ContextItem | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState<number>()

  const onResize = useCallback<ResizeObserverCallback>((entries) => {
    const [entry] = entries
    if (entry) {
      setContainerWidth(entry.contentRect.width)
    }
  }, [])

  useResizeObserver(containerRef.current, resizeObserverOptions, onResize)

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.2, 3))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.2, 0.3))
  }

  const resetZoom = () => {
    setZoom(1)
  }

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = fileDetails.url
    link.download = fileDetails.name
    link.click()
  }

  const toggleZenMode = () => {
    setZenMode(!zenMode)
  }

  const toggleChat = () => {
    setShowChat(!showChat)
  }

  const removeContextItem = (id: string) => {
    setContextItems(contextItems.filter((item) => item.id !== id))
    if (selectedContextItem?.id === id) {
      setSelectedContextItem(null)
    }
  }

  const handleSlideInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSlideInput(value)
  }

  const handleSlideInputSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const slideNum = Number.parseInt(slideInput)
    if (slideNum >= 1 && slideNum <= slides.length) {
      setCurrentSlide(slideNum)
    } else {
      setSlideInput(currentSlide.toString())
    }
  }

  const navigateToSlide = (slideNum: number) => {
    if (slideNum >= 1 && slideNum <= slides.length) {
      setCurrentSlide(slideNum)
      setSlideInput(slideNum.toString())
    }
  }

  const goToPreviousSlide = () => {
    if (currentSlide > 1) {
      navigateToSlide(currentSlide - 1)
    }
  }

  const goToNextSlide = () => {
    if (currentSlide < slides.length) {
      navigateToSlide(currentSlide + 1)
    }
  }

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && zenMode) {
        setZenMode(false)
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault()
        goToPreviousSlide()
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault()
        goToNextSlide()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [zenMode, currentSlide, slides.length])

  // Parse PPTX file
  useEffect(() => {
    const parsePPTX = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(fileDetails.url)
        if (!response.ok) {
          throw new Error('Failed to fetch PPTX file')
        }

        const arrayBuffer = await response.arrayBuffer()
        
        // Convert ArrayBuffer to Uint8Array
        const uint8Array = new Uint8Array(arrayBuffer)
        
        // For now, we'll create a simplified parser that extracts basic slide information
        // In a production environment, you'd want to use a more robust PPTX parsing library
        const parsedSlides = await parsePPTXBasic(uint8Array)
        
        setSlides(parsedSlides)
      } catch (err) {
        console.error('Error parsing PPTX:', err)
        setError('Failed to parse PowerPoint presentation. The file may be corrupted or in an unsupported format.')
      } finally {
        setIsLoading(false)
      }
    }

    parsePPTX()
  }, [fileDetails.url])

  // PPTX parsing function using JSZip
  const parsePPTXBasic = async (data: Uint8Array): Promise<PPTXSlide[]> => {
    try {
      // Check if it's a valid PPTX file (ZIP signature)
      if (data.length < 4 || data[0] !== 0x50 || data[1] !== 0x4B) {
        throw new Error('Invalid PPTX file format')
      }

      // Load the ZIP file
      const zip = new JSZip()
      await zip.loadAsync(data)
      
      // Extract slide information from the ZIP structure
      const slides: PPTXSlide[] = []
      
      // Get list of slide files
      const slideFiles = Object.keys(zip.files).filter(file => 
        file.startsWith('ppt/slides/slide') && file.endsWith('.xml')
      )
      
      if (slideFiles.length > 0) {
        // Parse each slide
        for (let i = 0; i < slideFiles.length; i++) {
          const slideFile = slideFiles[i]
          const slideIndex = i + 1
          
          try {
            // Get slide XML content
            const slideXml = await zip.file(slideFile)?.async('text')
            if (!slideXml) continue
            
            // Parse XML to extract text content
            const parser = new DOMParser()
            const xmlDoc = parser.parseFromString(slideXml, 'text/xml')
            
            // Extract text from all text elements
            const textElements = xmlDoc.querySelectorAll('a\\:t, a\\:r > a\\:t, a\\:p > a\\:r > a\\:t')
            const slideTexts: string[] = []
            
            textElements.forEach(element => {
              if (element.textContent && element.textContent.trim()) {
                slideTexts.push(element.textContent.trim())
              }
            })
            
            // Create slide content
            let slideContent = '<div style="padding: 40px;">'
            
            if (slideTexts.length > 0) {
              // Group texts into logical sections (titles, content, etc.)
              slideTexts.forEach((text, index) => {
                if (index === 0 && text.length < 100) {
                  // First short text is likely a title
                  slideContent += `<h2 style="color: #2563eb; font-size: 1.8em; margin-bottom: 20px; font-weight: bold;">${text}</h2>`
                } else {
                  // Regular content
                  slideContent += `<p style="margin-bottom: 15px; line-height: 1.6; color: #374151; font-size: 16px;">${text}</p>`
                }
              })
            } else {
              // No text found - might be image-only slide
              slideContent += `
                <h2 style="color: #2563eb; margin-bottom: 20px;">Slide ${slideIndex}</h2>
                <p style="color: #6b7280;">This slide contains images, charts, or other visual content.</p>
                <div style="margin-top: 20px; padding: 20px; background: #f9fafb; border-radius: 8px; border: 2px dashed #d1d5db;">
                  <p style="color: #6b7280; text-align: center; margin: 0;">Visual content not displayed</p>
                </div>
              `
            }
            
            slideContent += '</div>'
            
            slides.push({
              id: slideIndex,
              content: slideContent,
              notes: `Slide ${slideIndex} notes`,
              layout: 'content'
            })
            
          } catch (slideError) {
            console.error(`Error parsing slide ${slideIndex}:`, slideError)
            // Add error slide
            slides.push({
              id: slideIndex,
              content: `<div style="padding: 40px; text-align: center;">
                <h2 style="color: #2563eb; margin-bottom: 20px;">Slide ${slideIndex}</h2>
                <p style="color: #6b7280;">Unable to parse this slide content</p>
              </div>`,
              notes: `Error parsing slide ${slideIndex}`,
              layout: 'error'
            })
          }
        }
      } else {
        // No slides found - create a basic slide
        slides.push({
          id: 1,
          content: `<div style="padding: 40px; text-align: center;">
            <h1 style="font-size: 2.5em; color: #2563eb; margin-bottom: 20px;">${fileDetails.name.replace('.pptx', '').replace('.ppt', '')}</h1>
            <p style="font-size: 1.2em; color: #6b7280;">PowerPoint Presentation</p>
            <div style="margin-top: 40px; padding: 20px; background: #f3f4f6; border-radius: 8px;">
              <p style="color: #374151;">No slides found in the presentation</p>
            </div>
          </div>`,
          notes: "No slides found in the presentation"
        })
      }

      return slides
      
    } catch (err) {
      console.error('Error parsing PPTX:', err)
      
      // Fallback to placeholder slides if parsing fails
      const fallbackSlides: PPTXSlide[] = [
        {
          id: 1,
          content: `<div style="padding: 40px; text-align: center;">
            <h1 style="font-size: 2.5em; color: #2563eb; margin-bottom: 20px;">${fileDetails.name.replace('.pptx', '').replace('.ppt', '')}</h1>
            <p style="font-size: 1.2em; color: #6b7280;">PowerPoint Presentation</p>
            <div style="margin-top: 40px; padding: 20px; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px;">
              <p style="color: #92400e; font-weight: 500;">Unable to parse slide content</p>
              <p style="color: #92400e; font-size: 0.9em; margin-top: 10px;">
                The file may be corrupted or in an unsupported format. Please download the file to view in PowerPoint.
              </p>
            </div>
          </div>`,
          notes: "Parsing error - unable to extract slide content"
        }
      ]
      
      return fallbackSlides
    }
  }

  // Render slide content
  const renderSlide = (slide: PPTXSlide) => {
    if (!slide) return null

    return (
      <div className="w-full h-full bg-white">
        <div 
          dangerouslySetInnerHTML={{ __html: slide.content }}
          className="w-full h-full overflow-auto"
        />
      </div>
    )
  }

  return (
    <div
      className={`max-h-screen transition-all duration-300 ${zenMode ? "bg-gray-900" : "bg-gradient-to-br from-orange-50 to-pink-50"}`}
    >
      <div className={`flex ${zenMode ? "h-screen" : ""}`}>
        {/* PPTX Viewer */}
        <div className={`transition-all duration-300 ${zenMode ? "w-full h-full" : "max-w-6xl mx-auto flex-1"}`}>
          {/* Header */}
          <Card className={`${zenMode ? "bg-gray-800 border-gray-700" : "my-2"} flex-shrink-0 py-1`}>
            <CardContent className="flex items-center justify-between py-0">
              {/* Controls */}
              {slides.length > 0 && (
                <div className="flex flex-wrap items-center gap-4">
                  {/* Slide Navigation */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={goToPreviousSlide}
                      disabled={currentSlide <= 1}
                      className={`h-8 w-8 p-0 ${zenMode ? "hover:bg-gray-600 text-gray-300" : ""}`}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <form
                      onSubmit={handleSlideInputSubmit}
                      className={`flex items-center gap-2 ${zenMode ? "bg-gray-700 border-gray-600" : "bg-white border"} rounded-lg p-2`}
                    >
                      <span className={`text-sm ${zenMode ? "text-gray-300" : "text-gray-600"}`}>Slide</span>
                      <Input
                        type="number"
                        min="1"
                        max={slides.length}
                        value={slideInput}
                        onChange={handleSlideInputChange}
                        className={`w-16 h-8 text-center text-sm ${zenMode ? "bg-gray-700 border-gray-600 text-white" : ""}`}
                      />
                      <span className={`text-sm ${zenMode ? "text-gray-300" : "text-gray-600"}`}>of {slides.length}</span>
                    </form>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={goToNextSlide}
                      disabled={currentSlide >= slides.length}
                      className={`h-8 w-8 p-0 ${zenMode ? "hover:bg-gray-600 text-gray-300" : ""}`}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Zoom Controls */}
                  <div
                    className={`flex items-center gap-1 ${zenMode ? "bg-gray-700 border-gray-600" : "bg-white border"} rounded-lg p-1`}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleZoomOut}
                      disabled={zoom <= 0.3}
                      className={`h-8 w-8 p-0 ${zenMode ? "hover:bg-gray-600 text-gray-300" : ""}`}
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <button
                      onClick={resetZoom}
                      className={`px-3 py-1 text-sm font-medium min-w-[60px] ${zenMode ? "hover:bg-gray-600 text-gray-300" : "hover:bg-gray-100"} rounded transition-colors`}
                    >
                      {Math.round(zoom * 100)}%
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleZoomIn}
                      disabled={zoom >= 3}
                      className={`h-8 w-8 p-0 ${zenMode ? "hover:bg-gray-600 text-gray-300" : ""}`}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Download */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className={`flex items-center gap-2 ${zenMode ? "border-gray-600 text-gray-300 hover:bg-gray-700" : ""}`}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Right side controls */}
              <div className="flex items-center gap-2">
                {!zenMode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleChat}
                    className={`h-8 w-8 p-0 ${showChat ? "bg-blue-100 text-blue-600" : ""}`}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                )}
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

          {/* PPTX Document */}
          <Card
            className={`flex-1 overflow-hidden py-0 ${zenMode ? "bg-gray-800 border-gray-700 h-[calc(100vh-64px)]" : ""}`}
          >
            <CardContent className="p-0 h-[85vh]">
              <div
                ref={containerRef}
                className={`h-full overflow-y-auto ${zenMode ? "bg-gray-900" : "bg-gray-100"} flex flex-col items-center justify-center`}
              >
                {isLoading && (
                  <div className="flex items-center gap-2 text-gray-600 py-8">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading PowerPoint presentation...
                  </div>
                )}

                {error && (
                  <div className="text-center py-12">
                    <FileSliders className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-red-500 text-lg mb-2">Error Loading Presentation</p>
                    <p className="text-gray-500 text-sm mb-4">{error}</p>
                    <Button onClick={handleDownload} variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Download File
                    </Button>
                  </div>
                )}

                {!isLoading && !error && slides.length > 0 && (
                  <div 
                    className="w-full h-full flex items-center justify-center p-4"
                    style={{
                      transform: `scale(${zoom})`,
                      transformOrigin: 'center'
                    }}
                  >
                    <div 
                      className="bg-white shadow-lg rounded-lg overflow-hidden"
                      style={{
                        width: Math.min(containerWidth ? containerWidth - 64 : maxWidth, maxWidth),
                        height: (containerWidth ? Math.min(containerWidth - 64, maxWidth) : maxWidth) * 0.75,
                        maxWidth: maxWidth,
                        maxHeight: maxWidth * 0.75
                      }}
                    >
                      {renderSlide(slides[currentSlide - 1])}
                    </div>
                  </div>
                )}

                {!isLoading && !error && slides.length === 0 && (
                  <div className="text-center py-12">
                    <FileSliders className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg mb-2">No slides found</p>
                    <p className="text-gray-400 text-sm">The presentation appears to be empty</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {!zenMode && showChat && (
          <ChatPanel
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            contextItems={contextItems}
            selectedContextItem={selectedContextItem}
            onRemoveContextItem={removeContextItem}
          />
        )}
      </div>
    </div>
  )
}