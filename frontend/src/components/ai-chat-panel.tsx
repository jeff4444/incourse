"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageSquare, Lightbulb, Send, X, Loader2 } from "lucide-react"
import ReactMarkdown from "react-markdown"
import type { ReactNode } from "react"
import type { ContextItem } from "./pdf-viewer"
import { authenticatedFetchJson } from "@/lib/utils/apiClient"

interface ChatPanelProps {
  activeTab: "chat" | "suggestions"
  setActiveTab: (tab: "chat" | "suggestions") => void
  contextItems: ContextItem[]
  selectedContextItem: ContextItem | null
  onRemoveContextItem: (id: string) => void
  courseId: string
  fileIdList: string[]
  initialSessionId?: string
}

export function ChatPanel({
  activeTab,
  setActiveTab,
  contextItems,
  selectedContextItem,
  onRemoveContextItem,
  courseId,
  fileIdList,
  initialSessionId,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string; timestamp: Date; contextPreview?: string }[]>([
    {
      role: "assistant",
      content: "Hi there! I'm your AI learning assistant. How can I help you with this document?",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const suggestions = [
    "Summarize this document for me",
    "What are the key points in this document?",
    "Explain the concepts in simpler terms",
    "What are the main arguments presented?",
    "Find contradictions in this text",
    "How does this relate to [topic]?",
    "Generate questions about this content",
    "Compare this with standard practices",
  ]

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load chat history when sessionId is provided or auto-detect existing session
  useEffect(() => {
    if (initialSessionId && !sessionId) {
      loadChatHistory(initialSessionId)
    } else if (!initialSessionId && !sessionId && courseId && fileIdList.length > 0) {
      // Auto-detect existing session for this user-document pair
      detectAndLoadExistingSession()
    }
  }, [initialSessionId, sessionId, courseId, fileIdList])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const detectAndLoadExistingSession = async () => {
    setIsLoadingHistory(true)
    try {
      // Check if there's an existing session for this user-document pair
      const data = await authenticatedFetchJson<{ sessionId?: string }>(
        '/api/agents/chat/session',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId,
            fileIds: fileIdList,
          }),
        }
      )
      
      if (data?.sessionId) {
        // We found an existing session, load its history
        await loadChatHistory(data.sessionId)
      }
    } catch (error) {
      console.error("Error detecting existing session:", error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const loadChatHistory = async (sessionId: string) => {
    setIsLoadingHistory(true)
    try {
      // Load chat history from the backend
      const data = await authenticatedFetchJson<{ messages: any[] }>(
        `/api/agents/chat/history?sessionId=${sessionId}`,
        {
          method: 'GET',
        }
      )
      
      if (data?.messages && data.messages.length > 0) {
        // Convert backend messages to frontend format
        const historyMessages = data.messages.map((msg: any) => ({
          role: msg.sender as "user" | "assistant",
          content: msg.content,
          timestamp: new Date(msg.created_at),
          contextPreview: undefined
        }))
        
        // Replace the default welcome message with actual history
        setMessages(historyMessages)
      }
      
      setSessionId(sessionId)
      console.log("Loaded session with", data?.messages?.length || 0, "messages")
    } catch (error) {
      console.error("Error loading chat history:", error)
      // Still set the sessionId even if history loading fails
      setSessionId(sessionId)
    } finally {
      setIsLoadingHistory(false)
    }
  }


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading || isLoadingHistory) return

    // Add user message
    const contextText = selectedContextItem?.text
    const contextPreview = contextText
      ? (selectedContextItem.text.length > 160
          ? `${selectedContextItem.text.slice(0, 160)}…`
          : selectedContextItem.text)
      : undefined

    const newMessages = [
      ...messages,
      {
        role: "user" as const,
        content: inputValue,
        timestamp: new Date(),
        contextPreview,
      },
    ]

    setMessages(newMessages)
    setInputValue("")
    setIsLoading(true)

    try {
      // Optimistically clear the tagged context from the UI BEFORE the network call
      if (selectedContextItem) {
        onRemoveContextItem(selectedContextItem.id)
      }

      const data = await authenticatedFetchJson<{ answer?: string; session_id?: string }>(
        '/api/agents/chat',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId,
            fileIds: fileIdList,
            message: inputValue,
            context: contextText,
            sessionId: sessionId,
          }),
        }
      )
      const answer = data?.answer ?? 'Sorry, I could not get a response.'
      
      // Store sessionId if provided (for new sessions)
      if (data?.session_id) {
        setSessionId(data.session_id)
      }
      
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: answer,
          timestamp: new Date(),
        },
      ])
    } catch (err) {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: 'There was an error contacting the assistant.',
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion)
    setActiveTab("chat")
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="w-[30vw] h-[85vh] bg-white border border-gray-200 flex flex-col m-10 rounded-xl overflow-hidden shadow-sm">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "chat" | "suggestions")}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList className="grid w-full grid-cols-2 bg-gray-100 rounded-none border-b">
          <TabsTrigger value="chat" className="flex items-center gap-2 data-[state=active]:bg-white">
            <MessageSquare className="h-4 w-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="flex items-center gap-2 data-[state=active]:bg-white">
            <Lightbulb className="h-4 w-4" />
            Suggestions
          </TabsTrigger>
        </TabsList>
        

        <TabsContent value="chat" className="flex-1 flex flex-col p-0 m-0 overflow-hidden">
          {/* Loading indicator */}
          {isLoadingHistory && (
            <div className="p-4 text-center text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
              Loading chat history...
            </div>
          )}
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div key={index} className={`mb-4 ${message.role === "assistant" ? "pr-8" : "pl-8"}`}>
                <div
                  className={`p-3 rounded-lg ${
                    message.role === "assistant"
                      ? "bg-gray-100 rounded-tr-none"
                      : "bg-blue-500 text-white rounded-tl-none ml-auto"
                  }`}
                >
                  {message.contextPreview && (
                    <div className={`${message.role === "assistant" ? "bg-blue-50 text-blue-700" : "bg-blue-400/40 text-white"} border border-blue-200 rounded px-2 py-1 text-xs mb-2`}>
                      {message.contextPreview}
                    </div>
                  )}
                  {message.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown
                        components={{
                          p: ({ children }: any) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }: any) => <ul className="mb-2 list-disc list-inside space-y-1">{children}</ul>,
                          ol: ({ children }: any) => <ol className="mb-2 list-decimal list-inside space-y-1">{children}</ol>,
                          li: ({ children }: any) => <li className="text-sm">{children}</li>,
                          h1: ({ children }: any) => <h1 className="text-lg font-bold mb-2 text-gray-900">{children}</h1>,
                          h2: ({ children }: any) => <h2 className="text-base font-semibold mb-2 text-gray-900">{children}</h2>,
                          h3: ({ children }: any) => <h3 className="text-sm font-medium mb-1 text-gray-900">{children}</h3>,
                          code: ({ children }: any) => <code className="bg-blue-50 text-blue-600 px-1 py-0.5 rounded text-xs">{children}</code>,
                          pre: ({ children }: any) => <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto mb-2">{children}</pre>,
                          blockquote: ({ children }: any) => <blockquote className="border-l-4 border-blue-400 bg-blue-50 pl-4 py-2 mb-2 italic">{children}</blockquote>,
                          strong: ({ children }: any) => <strong className="font-semibold text-gray-900">{children}</strong>,
                          em: ({ children }: any) => <em className="italic">{children}</em>,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    message.content
                  )}
                </div>
                <div className={`text-xs text-gray-500 mt-1 ${message.role === "assistant" ? "" : "text-right"}`}>
                  {formatTime(message.timestamp)}
                </div>
              </div>
            ))}
            
            {/* Thinking indicator */}
            {isLoading && (
              <div className="mb-4 pr-8">
                <div className="p-3 rounded-lg bg-gray-100 rounded-tr-none">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Context item display */}
          {selectedContextItem && (
            <div className="px-4 pt-2">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 pr-8 relative">
                <div className="text-xs text-blue-600 font-medium mb-1">From page {selectedContextItem.pageNumber}</div>
                <p className="text-sm text-gray-700 line-clamp-2">{selectedContextItem.text}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 absolute top-1 right-1"
                  onClick={() => onRemoveContextItem(selectedContextItem.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Ask a question..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1"
                disabled={isLoading}
              />
              <Button type="submit" size="icon" disabled={!inputValue.trim() || isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="suggestions" className="flex-1 p-4 m-0 overflow-y-auto">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Try asking about:</h3>
          <div className="grid gap-2">
            {suggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                className="justify-start h-auto py-3 px-4 text-left"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
