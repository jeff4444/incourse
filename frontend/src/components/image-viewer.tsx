"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ZoomIn, ZoomOut, Download, Image as ImageIcon, Loader2, Maximize2, Minimize2, RotateCw, Move, MessageSquare } from "lucide-react"
import { ChatPanel } from "./ai-chat-panel"
import { FileDetails } from "@/lib/types/course"
import { useReadingTracker } from "@/lib/hooks/useActivities"

const maxZoom = 5
const minZoom = 0.1
const zoomStep = 0.2

export default function ImageViewer({ fileDetails, courseId }: { fileDetails: FileDetails, courseId?: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)
  const [zenMode, setZenMode] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [showChat, setShowChat] = useState(true)
  const [activeTab, setActiveTab] = useState<"chat" | "suggestions">("chat")
  type ContextItem = { id: string; text: string; source: string; pageNumber: number }
  const [contextItems, setContextItems] = useState<ContextItem[]>([])
  const [selectedContextItem, setSelectedContextItem] = useState<ContextItem | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  // Track reading time
  const { logActivity } = useReadingTracker(
    fileDetails.id || fileDetails.canvasId || '',
    fileDetails.name,
    courseId || '',
    !!courseId
  );

  // Log activity on unmount
  useEffect(() => {
    return () => {
      logActivity();
    };
  }, [logActivity]);

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = fileDetails.url
    link.download = fileDetails.name
    link.click()
  }

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + zoomStep, maxZoom))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - zoomStep, minZoom))
  }

  const resetZoom = () => {
    setZoom(1)
    setPosition({ x: 0, y: 0 })
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

  const rotateImage = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const togglePanMode = () => {
    setIsPanning(!isPanning)
  }

  // Handle mouse events for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isPanning && zoom > 1) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
      e.preventDefault()
    }
  }, [isPanning, zoom, position])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && isPanning && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
      e.preventDefault()
    }
  }, [isDragging, isPanning, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Handle wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -zoomStep : zoomStep
      setZoom((prev) => Math.max(minZoom, Math.min(maxZoom, prev + delta)))
    }
  }, [])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (zenMode) {
          setZenMode(false)
        } else if (isPanning) {
          setIsPanning(false)
        }
      } else if (e.key === "+" || e.key === "=") {
        handleZoomIn()
      } else if (e.key === "-") {
        handleZoomOut()
      } else if (e.key === "0") {
        resetZoom()
      } else if (e.key === "r" || e.key === "R") {
        rotateImage()
      } else if (e.key === "p" || e.key === "P") {
        togglePanMode()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [zenMode, isPanning])

  // Load image
  useEffect(() => {
    const loadImage = async () => {
      try {
        setIsLoading(true)
        setError(null)
        setImageUrl(fileDetails.url)
      } catch (err) {
        console.error('Error loading image:', err)
        setError('Failed to load image. Please check the file format.')
      } finally {
        setIsLoading(false)
      }
    }

    loadImage()
  }, [fileDetails.url])

  // Reset position when zoom changes to 1
  useEffect(() => {
    if (zoom === 1) {
      setPosition({ x: 0, y: 0 })
    }
  }, [zoom])

  return (
    <div
      className={`max-h-screen transition-all duration-300 ${zenMode ? "bg-gray-900" : "bg-gradient-to-br from-orange-50 to-pink-50"}`}
    >
      <div className={`flex ${zenMode ? "h-screen" : ""}`}>
        {/* Image Viewer */}
        <div className={`transition-all duration-300 ${zenMode ? "w-full h-full" : "max-w-6xl mx-auto flex-1"}`}>
          {/* Header */}
          <Card className={`${zenMode ? "bg-gray-800 border-gray-700" : "my-2"} flex-shrink-0 py-1`}>
            <CardContent className="flex items-center justify-between py-0">
              {/* Controls */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Zoom Controls */}
                <div
                  className={`flex items-center gap-1 ${zenMode ? "bg-gray-700 border-gray-600" : "bg-white border"} rounded-lg p-1`}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleZoomOut}
                    disabled={zoom <= minZoom}
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
                    disabled={zoom >= maxZoom}
                    className={`h-8 w-8 p-0 ${zenMode ? "hover:bg-gray-600 text-gray-300" : ""}`}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>

                {/* Image Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    variant={isPanning ? "default" : "ghost"}
                    size="sm"
                    onClick={togglePanMode}
                    className={`h-8 w-8 p-0 ${zenMode ? "hover:bg-gray-600 text-gray-300" : ""}`}
                    title="Toggle pan mode (P)"
                  >
                    <Move className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={rotateImage}
                    className={`h-8 w-8 p-0 ${zenMode ? "hover:bg-gray-600 text-gray-300" : ""}`}
                    title="Rotate image (R)"
                  >
                    <RotateCw className="h-4 w-4" />
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

          {/* Image Display */}
          <Card
            className={`flex-1 overflow-hidden py-0 ${zenMode ? "bg-gray-800 border-gray-700 h-[calc(100vh-64px)]" : ""}`}
          >
            <CardContent className="p-0 h-[85vh]">
              <div
                ref={containerRef}
                className={`h-full overflow-hidden ${zenMode ? "bg-gray-900" : "bg-gray-100"} flex items-center justify-center relative`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                style={{ cursor: isPanning && zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
              >
                {isLoading && (
                  <div className="flex items-center gap-2 text-gray-600 py-8">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading image...
                  </div>
                )}

                {error && (
                  <div className="text-center py-12">
                    <ImageIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-red-500 text-lg mb-2">Error Loading Image</p>
                    <p className="text-gray-500 text-sm mb-4">{error}</p>
                    <Button onClick={handleDownload} variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Download File
                    </Button>
                  </div>
                )}

                {imageUrl && !isLoading && !error && (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      ref={imageRef}
                      src={imageUrl}
                      alt={fileDetails.name}
                      className="max-w-full max-h-full object-contain select-none"
                      style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                        transformOrigin: 'center',
                        transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                      }}
                      draggable={false}
                      onError={() => setError('Failed to load image. Please check the file format.')}
                    />
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
            courseId=""
            fileIdList={[fileDetails.canvasId || fileDetails.id || '']}
            initialSessionId={undefined}
          />
        )}
      </div>

      {/* Instructions overlay */}
      {zenMode && (
        <div className="fixed bottom-4 left-4 bg-black bg-opacity-75 text-white p-3 rounded-lg text-sm">
          <div className="space-y-1">
            <div><kbd className="bg-gray-700 px-1 rounded">+/-</kbd> Zoom in/out</div>
            <div><kbd className="bg-gray-700 px-1 rounded">0</kbd> Reset zoom</div>
            <div><kbd className="bg-gray-700 px-1 rounded">R</kbd> Rotate</div>
            <div><kbd className="bg-gray-700 px-1 rounded">P</kbd> Pan mode</div>
            <div><kbd className="bg-gray-700 px-1 rounded">Esc</kbd> Exit zen mode</div>
          </div>
        </div>
      )}

      {/* Pan mode indicator */}
      {isPanning && (
        <div className="fixed top-20 left-4 bg-blue-600 text-white p-2 rounded-lg text-sm">
          Pan mode active - Click and drag to move image
        </div>
      )}
    </div>
  )
}
