"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageSquare, Lightbulb, Send, X, Loader2 } from "lucide-react"
import ReactMarkdown from "react-markdown"
import type { ContextItem } from "./pdf-viewer"
import { authenticatedFetchJson, authenticatedFetch } from "@/lib/utils/apiClient"

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

interface ToolCall {
  name: string;
  displayName: string;
  status: "executing" | "complete";
  toolCallId?: string;
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
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState("")
  const [activeToolCalls, setActiveToolCalls] = useState<ToolCall[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
    }
  }, [inputValue])

  // Load chat history when sessionId is provided or auto-detect existing session
  useEffect(() => {
    // Prevent multiple load attempts
    if (hasAttemptedLoad) return
    
    if (initialSessionId && !sessionId) {
      setHasAttemptedLoad(true)
      loadChatHistory(initialSessionId)
    } else if (!initialSessionId && !sessionId && courseId && fileIdList.length > 0) {
      setHasAttemptedLoad(true)
      // Auto-detect existing session for this user-document pair
      detectAndLoadExistingSession()
    }
  }, [initialSessionId, sessionId, courseId, fileIdList, hasAttemptedLoad])

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


  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e)
    }
  }

  const handleSendMessage = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading || isLoadingHistory || isStreaming) return

    // Add user message
    const contextText = selectedContextItem?.text
    const contextPreview = contextText
      ? (selectedContextItem.text.length > 160
          ? `${selectedContextItem.text.slice(0, 160)}…`
          : selectedContextItem.text)
      : undefined

    const userMessage = inputValue
    const newMessages = [
      ...messages,
      {
        role: "user" as const,
        content: userMessage,
        timestamp: new Date(),
        contextPreview,
      },
    ]

    setMessages(newMessages)
    setInputValue("")
    setIsStreaming(true)
    setStreamingMessage("")
    setActiveToolCalls([])

    try {
      // Optimistically clear the tagged context from the UI BEFORE the network call
      if (selectedContextItem) {
        onRemoveContextItem(selectedContextItem.id)
      }

      // Make streaming request with authentication
      const response = await authenticatedFetch('/api/agents/chat/stream', {
        method: 'POST',
        body: JSON.stringify({
          courseId,
          fileIds: fileIdList,
          message: userMessage,
          context: contextText,
          sessionId: sessionId,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      let buffer = ''
      let fullResponse = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true })

        // Process complete SSE messages (ending with \n\n)
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || '' // Keep incomplete message in buffer

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue

          try {
            const jsonStr = line.replace('data: ', '')
            const event = JSON.parse(jsonStr)

            if (event.type === 'text_delta') {
              // Simply append the text content without any smart spacing logic
              fullResponse += event.content
              setStreamingMessage(fullResponse)
            } else if (event.type === 'tool_call') {
              console.log('Tool call received:', event)
              // Add tool call indicator
              setActiveToolCalls(prev => [
                ...prev,
                {
                  name: event.name || event.data?.name || 'unknown',
                  displayName: event.content || event.name || 'Processing',
                  status: 'executing',
                  toolCallId: event.data?.tool_call_id
                }
              ])
            } else if (event.type === 'tool_result') {
              console.log('Tool result received:', event)
              // Mark tool as complete - match by tool_call_id first, then by name
              const toolName = event.name || event.data?.name
              const toolCallId = event.data?.tool_call_id
              console.log('Marking tool complete - name:', toolName, 'id:', toolCallId)
              
              setActiveToolCalls(prev => {
                console.log('Current tool calls:', prev)
                const updated = prev.map(tool => {
                  // Match by tool_call_id if available, otherwise by name
                  const matches = toolCallId 
                    ? tool.toolCallId === toolCallId
                    : tool.name === toolName
                  
                  return matches
                    ? { ...tool, status: 'complete' as const }
                    : tool
                })
                console.log('Updated tool calls:', updated)
                return updated
              })
            } else if (event.type === 'done') {
              // Stream complete
              if (event.content && !fullResponse) {
                fullResponse = event.content
              }
            } else if (event.type === 'error') {
              console.error('Streaming error:', event.content)
              throw new Error(event.content || 'Streaming error')
            }
          } catch (parseError) {
            console.error('Error parsing SSE event:', line, parseError)
          }
        }
      }

      // Add final message to history
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: fullResponse || 'Sorry, I could not get a response.',
          timestamp: new Date(),
        },
      ])

      // Clear streaming state
      setStreamingMessage("")
      setActiveToolCalls([])
    } catch (err) {
      console.error('Streaming error:', err)
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: 'There was an error contacting the assistant.',
          timestamp: new Date(),
        },
      ])
      setStreamingMessage("")
      setActiveToolCalls([])
    } finally {
      setIsStreaming(false)
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
    <div className="w-full max-w-[40vw] max-h-[90vh] h-full bg-white border border-gray-200 flex flex-col m-5 rounded-2xl overflow-hidden shadow-lg">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "chat" | "suggestions")}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList className="grid w-full grid-cols-2 bg-gray-50 rounded-none border-b border-gray-200">
          <TabsTrigger value="chat" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-none">
            <MessageSquare className="h-4 w-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-none">
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
          <div className="flex-1 overflow-y-auto p-6">
            {messages.map((message, index) => (
              <div key={index} className={`mb-6 ${message.role === "user" ? "flex justify-end" : ""}`}>
                {message.role === "user" ? (
                  // User message - modern chat bubble
                  <div className="max-w-[80%]">
                    <div className="bg-blue-500 text-white px-4 py-3 rounded-2xl rounded-br-md shadow-sm">
                      {message.contextPreview && (
                        <div className="bg-blue-400/30 text-white border border-blue-300/50 rounded-lg px-3 py-2 text-xs mb-3">
                          {message.contextPreview}
                        </div>
                      )}
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2 text-right">
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                ) : (
                  // AI message - background/widget style (like Notion)
                  <div className="max-w-full">
                    {message.contextPreview && (
                      <div className="bg-blue-50 text-blue-700 border border-blue-200 rounded-lg px-3 py-2 text-xs mb-3">
                        {message.contextPreview}
                      </div>
                    )}
                    <div className="prose prose-sm max-w-none text-gray-800">
                      <ReactMarkdown
                        components={{
                          p: ({ children }: any) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                          ul: ({ children }: any) => <ul className="mb-3 list-disc list-inside space-y-1.5 pl-2">{children}</ul>,
                          ol: ({ children }: any) => <ol className="mb-3 list-decimal list-inside space-y-1.5 pl-2">{children}</ol>,
                          li: ({ children }: any) => <li className="text-sm leading-relaxed">{children}</li>,
                          h1: ({ children }: any) => <h1 className="text-lg font-semibold mb-3 text-gray-900 leading-tight">{children}</h1>,
                          h2: ({ children }: any) => <h2 className="text-base font-semibold mb-2 text-gray-900 leading-tight">{children}</h2>,
                          h3: ({ children }: any) => <h3 className="text-sm font-medium mb-2 text-gray-900 leading-tight">{children}</h3>,
                          code: ({ children }: any) => <code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
                          pre: ({ children }: any) => <pre className="bg-gray-50 border border-gray-200 p-3 rounded-lg text-xs overflow-x-auto mb-3 font-mono">{children}</pre>,
                          blockquote: ({ children }: any) => <blockquote className="border-l-4 border-blue-300 bg-blue-50 pl-4 py-2 mb-3 italic text-gray-700">{children}</blockquote>,
                          strong: ({ children }: any) => <strong className="font-semibold text-gray-900">{children}</strong>,
                          em: ({ children }: any) => <em className="italic text-gray-700">{children}</em>,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {/* Streaming message */}
            {isStreaming && (
              <div className="mb-6">
                {/* Tool call indicators */}
                {activeToolCalls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {activeToolCalls.map((tool, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                          tool.status === 'executing'
                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                            : 'bg-green-100 text-green-700 border border-green-200'
                        }`}
                      >
                        {tool.status === 'executing' ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <span className="text-green-600">✓</span>
                        )}
                        <span>{tool.displayName}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Streaming text - background/widget style */}
                <div className="prose prose-sm max-w-none text-gray-800">
                  {streamingMessage ? (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {streamingMessage}
                    </div>
                  ) : null}
                  {/* Blinking cursor - always visible when streaming */}
                  <span className="inline-block w-2 h-4 bg-blue-500 ml-0.5 animate-pulse" />
                </div>
              </div>
            )}
            
            {/* Thinking indicator (for non-streaming) */}
            {isLoading && !isStreaming && (
              <div className="mb-6">
                <div className="flex items-center gap-3 text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm font-medium">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Context item display */}
          {selectedContextItem && (
            <div className="px-6 pt-2">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 pr-10 relative">
                <div className="text-xs text-blue-600 font-medium mb-2">From page {selectedContextItem.pageNumber}</div>
                <p className="text-sm text-gray-700 line-clamp-2 leading-relaxed">{selectedContextItem.text}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 absolute top-2 right-2 hover:bg-blue-100"
                  onClick={() => onRemoveContextItem(selectedContextItem.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-6 border-t border-gray-200 bg-gray-50/50">
            <div className="flex items-start gap-3">
              <Textarea
                ref={textareaRef}
                placeholder="Ask a question..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl resize-none min-h-[44px] max-h-[120px] overflow-y-auto"
                disabled={isLoading || isStreaming}
                rows={1}
              />
              <Button 
                type="submit" 
                size="icon" 
                disabled={!inputValue.trim() || isLoading || isStreaming}
                className="rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 mt-1"
              >
                {isLoading || isStreaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="suggestions" className="flex-1 p-6 m-0 overflow-y-auto">
          <h3 className="text-sm font-medium text-gray-600 mb-4">Try asking about:</h3>
          <div className="grid gap-3">
            {suggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                className="justify-start h-auto py-4 px-4 text-left border-gray-200 hover:border-blue-300 hover:bg-blue-50 rounded-xl transition-colors"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <span className="text-sm leading-relaxed">{suggestion}</span>
              </Button>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
