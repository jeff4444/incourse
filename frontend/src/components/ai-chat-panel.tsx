"use client"

import type React from "react"

import { useState, useRef, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Folder, Search } from "lucide-react"
import { MessageSquare, Lightbulb, Send, X, Loader2, MessageCircle, Copy, FileText } from "lucide-react"
import ReactMarkdown from "react-markdown"
import type { ContextItem } from "./pdf-viewer"
import { authenticatedFetchJson, authenticatedFetch } from "@/lib/utils/apiClient"
import { useCreateNote, useCreateFolder, useNotes, useNoteFolders } from "@/lib/hooks/useNotes"

interface ChatPanelProps {
  activeTab: "chat" | "suggestions"
  setActiveTab: (tab: "chat" | "suggestions") => void
  contextItems: ContextItem[]
  selectedContextItem: ContextItem | null
  onRemoveContextItem: (id: string) => void
  onAddContextItem?: (contextItem: ContextItem) => void
  courseId: string
  fileIdList: string[]
  initialSessionId?: string
  messages?: { role: "user" | "assistant"; content: string; timestamp: Date; contextPreview?: string }[]
  onUpdateMessages?: (messages: { role: "user" | "assistant"; content: string; timestamp: Date; contextPreview?: string }[]) => void
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
  onAddContextItem,
  courseId,
  fileIdList,
  initialSessionId,
  messages: externalMessages,
  onUpdateMessages,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string; timestamp: Date; contextPreview?: string }[]>(
    externalMessages || [
      {
        role: "assistant",
        content: "Hi there! I'm your AI learning assistant. How can I help you with this document?",
        timestamp: new Date(),
      },
    ]
  )
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

  // Text selection state for messages
  const [messageSelection, setMessageSelection] = useState<{
    range: Range | null
    rect: DOMRect | null
    text: string | null
    messageIndex: number | null
  }>({ range: null, rect: null, text: null, messageIndex: null })
  const [showMessageSelectionPopup, setShowMessageSelectionPopup] = useState(false)

  // Hover state for AI messages
  const [hoveredMessageIndex, setHoveredMessageIndex] = useState<number | null>(null)
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null)

  // Add to notes dialog state
  const [showAddToNotesDialog, setShowAddToNotesDialog] = useState(false)
  const [selectedMessageForNotes, setSelectedMessageForNotes] = useState<{ content: string; index: number } | null>(null)
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreateNewNote, setShowCreateNewNote] = useState(false)
  const [newNoteTitle, setNewNoteTitle] = useState("")
  const [selectedFolderForNewNote, setSelectedFolderForNewNote] = useState<string>("")
  const [showCreateNewFolder, setShowCreateNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [isCreatingNote, setIsCreatingNote] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [createdNoteId, setCreatedNoteId] = useState<string | null>(null)

  // Note and folder hooks
  const createNote = useCreateNote()
  const createFolder = useCreateFolder()
  const { data: notes = [] } = useNotes(courseId, "dummy-user-id") // TODO: Get actual user ID
  const { data: folders = [] } = useNoteFolders(courseId, "dummy-user-id") // TODO: Get actual user ID

  // Filter notes based on search query
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const query = searchQuery.toLowerCase();
    return notes.filter((note) =>
      note.title.toLowerCase().includes(query) ||
      JSON.stringify(note.content).toLowerCase().includes(query)
    );
  }, [notes, searchQuery]);

  // Add folder names to notes for display
  const notesWithFolders = useMemo(() => {
    return filteredNotes.map((note) => ({
      ...note,
      folderName: note.folder_id ? folders.find(f => f.id === note.folder_id)?.name : null
    }));
  }, [filteredNotes, folders]);

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

  // Sync external messages when they change
  useEffect(() => {
    if (externalMessages) {
      setMessages(externalMessages)
    }
  }, [externalMessages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
    }
  }, [inputValue])

  // Load chat history when sessionId is provided
  useEffect(() => {
    // Only load if we have an initialSessionId and haven't attempted to load yet
    if (initialSessionId && !sessionId && !hasAttemptedLoad) {
      setHasAttemptedLoad(true)
      loadChatHistory(initialSessionId)
    }
  }, [initialSessionId, sessionId, hasAttemptedLoad])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
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
        onUpdateMessages?.(historyMessages)
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
    onUpdateMessages?.(newMessages)
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
      const finalMessages: { role: "user" | "assistant"; content: string; timestamp: Date; contextPreview?: string }[] = [
        ...newMessages,
        {
          role: "assistant" as const,
          content: fullResponse || 'Sorry, I could not get a response.',
          timestamp: new Date(),
        },
      ]
      setMessages(finalMessages)
      onUpdateMessages?.(finalMessages)

      // Clear streaming state
      setStreamingMessage("")
      setActiveToolCalls([])
    } catch (err) {
      console.error('Streaming error:', err)
      const errorMessages: { role: "user" | "assistant"; content: string; timestamp: Date; contextPreview?: string }[] = [
        ...newMessages,
        {
          role: "assistant" as const,
          content: 'There was an error contacting the assistant.',
          timestamp: new Date(),
        },
      ]
      setMessages(errorMessages)
      onUpdateMessages?.(errorMessages)
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

  // Handle text selection in messages
  const handleMessageTextSelection = (e: React.MouseEvent, messageIndex: number) => {
    const selection = window.getSelection()
    if (!selection || selection.toString().trim() === '') {
      setShowMessageSelectionPopup(false)
      return
    }

    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    const text = selection.toString().trim()

    if (text) {
      setMessageSelection({
        range,
        rect,
        text,
        messageIndex
      })
      setShowMessageSelectionPopup(true)
    }
  }

  // Handle adding selected text to context
  const handleAddMessageTextToContext = () => {
    if (messageSelection.text && messageSelection.messageIndex !== null) {
      const message = messages[messageSelection.messageIndex]
      const contextItem: ContextItem = {
        id: `message-${messageSelection.messageIndex}-${Date.now()}`,
        text: messageSelection.text,
        source: `Message from ${message.role === 'user' ? 'You' : 'AI'}`,
        pageNumber: 0 // Messages don't have page numbers
      }
      
      // Add to context by calling the parent's onAddContextItem function
      if (onAddContextItem) {
        onAddContextItem(contextItem)
      }
      
      // Clear selection
      window.getSelection()?.removeAllRanges()
      setShowMessageSelectionPopup(false)
      setMessageSelection({ range: null, rect: null, text: null, messageIndex: null })
    }
  }

  // Handle copying AI message content
  const handleCopyMessage = async (messageIndex: number) => {
    const message = messages[messageIndex]
    if (message) {
      try {
        await navigator.clipboard.writeText(message.content)
        setCopiedMessageIndex(messageIndex)
        setTimeout(() => setCopiedMessageIndex(null), 2000)
      } catch (error) {
        console.error('Failed to copy message:', error)
      }
    }
  }

  // Handle opening add to notes dialog
  const handleAddToNotes = (messageIndex: number) => {
    const message = messages[messageIndex]
    if (message) {
      setSelectedMessageForNotes({ content: message.content, index: messageIndex })
      setSelectedNoteIds([])
      setSearchQuery("")
      setShowCreateNewNote(false)
      setNewNoteTitle("")
      setSelectedFolderForNewNote("")
      setShowCreateNewFolder(false)
      setNewFolderName("")
      setShowAddToNotesDialog(true)
    }
  }

  // Unified function to add message to notes (both existing and new)
  const handleAddMessageToNotes = async (noteIds: string[], isNewNote: boolean = false) => {
    if (!selectedMessageForNotes) return

    setIsCreatingNote(true)
    
    try {
      // Get the last 5 messages for context
      const conversationContext = messages.slice(-5).map(msg => ({
        role: msg.role,
        content: msg.content
      }))
      
      // Add the chat message to the notes
      const response = await authenticatedFetchJson<{ success: boolean; updated_note_ids: string[]; message: string }>(
        '/api/agents/notes/add-chat-message',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            courseId: courseId,
            noteIds: noteIds,
            aiMessage: selectedMessageForNotes.content,
            conversationContext: conversationContext,
            fileId: String(fileIdList[0] || '')
          }),
        }
      )
      
      if (response.success) {
        console.log(`Successfully added message to ${response.updated_note_ids.length} note(s)`)
        
        // Show success message for both new and existing notes
        setCreatedNoteId(noteIds[0]) // Always set the first note ID to enable "View Note" button
        setShowSuccessMessage(true)
      }
      
    } catch (error) {
      console.error("Error adding message to notes:", error)
    } finally {
      setIsCreatingNote(false)
    }
  }

  // Handle creating note with AI message content
  const handleCreateNoteWithContent = async () => {
    if (!selectedMessageForNotes) return

    try {
      let folderId: string | undefined
      
      if (showCreateNewFolder && newFolderName.trim()) {
        // Create new folder first
        const newFolder = await createFolder.mutateAsync({
          courseId: courseId,
          name: newFolderName.trim()
        })
        folderId = newFolder.id
      } else if (selectedFolderForNewNote) {
        folderId = selectedFolderForNewNote
      }
      
      // Create the note with AI message content
      const newNote = await createNote.mutateAsync({
        courseId: courseId,
        title: newNoteTitle.trim() || "AI Chat Note",
        folderId
      })
      
      // Use the unified function to add the message to the newly created note
      await handleAddMessageToNotes([newNote.id], true)
      
    } catch (error) {
      console.error("Error creating note:", error)
      setIsCreatingNote(false)
    }
  }

  // Handle toggling note selection
  const handleToggleNote = (noteId: string) => {
    if (selectedNoteIds.includes(noteId)) {
      setSelectedNoteIds(selectedNoteIds.filter((id) => id !== noteId));
    } else {
      setSelectedNoteIds([...selectedNoteIds, noteId]);
    }
  };

  // Handle closing the dialog and resetting state
  const handleCloseDialog = () => {
    setShowAddToNotesDialog(false)
    setSelectedMessageForNotes(null)
    setSelectedNoteIds([])
    setSearchQuery("")
    setShowCreateNewNote(false)
    setNewNoteTitle("")
    setSelectedFolderForNewNote("")
    setShowCreateNewFolder(false)
    setNewFolderName("")
    setShowSuccessMessage(false)
    setCreatedNoteId(null)
  };

  // Handle viewing the created note
  const handleViewNote = () => {
    if (createdNoteId) {
      window.location.href = `/courses/${courseId}/notes/${createdNoteId}`
    }
  };

  // Handle adding content to existing notes
  const handleAddToExistingNotes = async () => {
    if (!selectedMessageForNotes || selectedNoteIds.length === 0) return
    
    // Use the unified function to add the message to existing notes
    await handleAddMessageToNotes(selectedNoteIds, false)
  }

  // Message selection popup component
  const MessageSelectionPopup = () => {
    if (!showMessageSelectionPopup || !messageSelection.rect) return null

    return (
      <div
        className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-2 flex items-center gap-2"
        style={{
          position: "absolute",
          top: messageSelection.rect.top - 50,
          left: messageSelection.rect.left + messageSelection.rect.width / 2 - 100,
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-purple-100"
          onClick={handleAddMessageTextToContext}
          title="Add to context"
        >
          <MessageCircle className="h-4 w-4 text-purple-600" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0 hover:bg-gray-100" 
          onClick={() => {
            setShowMessageSelectionPopup(false)
            window.getSelection()?.removeAllRanges()
          }}
          title="Close"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[40vw] h-[90vh] bg-white border border-gray-200 flex flex-col m-5 rounded-2xl overflow-hidden shadow-lg">
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
                      <div 
                        className="text-sm leading-relaxed whitespace-pre-wrap select-text"
                        onMouseUp={(e) => handleMessageTextSelection(e, index)}
                      >
                        {message.content}
                      </div>
                    </div>
                  </div>
                ) : (
                  // AI message - background/widget style (like Notion)
                  <div 
                    className="max-w-full relative group"
                    onMouseEnter={() => setHoveredMessageIndex(index)}
                    onMouseLeave={() => setHoveredMessageIndex(null)}
                  >
                    {message.contextPreview && (
                      <div className="bg-blue-50 text-blue-700 border border-blue-200 rounded-lg px-3 py-2 text-xs mb-3">
                        {message.contextPreview}
                      </div>
                    )}
                    <div 
                      className="prose prose-sm max-w-none text-gray-800 select-text"
                      onMouseUp={(e) => handleMessageTextSelection(e, index)}
                    >
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
                          a: ({ children, href }: any) => <a href={href} className="text-blue-600 underline hover:text-blue-800" target="_blank" rel="noopener noreferrer">{children}</a>,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                    
                    {/* Hover actions - inline with message */}
                    <div 
                      className={`flex gap-1 transition-all duration-200 ease-in-out ${
                        hoveredMessageIndex === index 
                          ? 'opacity-100 translate-y-0' 
                          : 'opacity-0 translate-y-2 pointer-events-none'
                      }`}
                    >
                      <button
                        className="p-1 rounded hover:bg-gray-100 transition-colors"
                        onClick={() => handleCopyMessage(index)}
                        title="Copy message"
                      >
                        {copiedMessageIndex === index ? (
                          <div className="h-4 w-4 text-green-600">✓</div>
                        ) : (
                          <Copy className="h-4 w-4 text-gray-500" />
                        )}
                      </button>
                      <button
                        className="p-1 rounded hover:bg-gray-100 transition-colors"
                        onClick={() => handleAddToNotes(index)}
                        title="Add to notes"
                      >
                        <FileText className="h-4 w-4 text-gray-500" />
                      </button>
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
                <div className="text-xs text-blue-600 font-medium mb-2">
                  {selectedContextItem.pageNumber === 0 ? 'From previous message' : `From page ${selectedContextItem.pageNumber}`}
                </div>
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
      
      {/* Message selection popup */}
      <MessageSelectionPopup />
      
      {/* Add to Notes Dialog */}
      <Dialog open={showAddToNotesDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add to Notes</DialogTitle>
            <DialogDescription>
              Choose where to save this AI message. You can add it to existing notes or create a new note.
            </DialogDescription>
          </DialogHeader>
          
          {showSuccessMessage ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-8">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-green-800">Message Added Successfully!</h3>
                <p className="text-sm text-muted-foreground">
                  {createdNoteId 
                    ? "Your AI message has been added to the new note."
                    : "Your AI message has been added to the selected note(s)."
                  }
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleCloseDialog}
                >
                  Close
                </Button>
                <Button
                  onClick={handleViewNote}
                >
                  View Note
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
            {/* Search Bar */}
            <div className="relative px-1 py-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notes by title or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Action Buttons and Count */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const allNoteIds = notesWithFolders.map((note) => note.id);
                    setSelectedNoteIds(allNoteIds);
                  }}
                  disabled={notesWithFolders.length === 0}
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedNoteIds([])}
                  disabled={selectedNoteIds.length === 0}
                >
                  Clear All
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedNoteIds.length} of {notesWithFolders.length} selected
              </p>
            </div>

            {/* Notes List */}
            <div className="border rounded-lg flex-1 overflow-y-auto">
              {notesWithFolders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No notes available.</p>
                  <p className="text-sm mt-1">Create notes to use them for saving AI messages.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notesWithFolders.map((note) => {
                    const isSelected = selectedNoteIds.includes(note.id);
                    
                    return (
                      <div
                        key={note.id}
                        className={`flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                          isSelected && "bg-muted/30"
                        }`}
                        onClick={() => handleToggleNote(note.id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleNote(note.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <p className="font-medium text-sm truncate">{note.title}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {note.folderName && (
                              <Badge variant="secondary" className="text-xs">
                                {note.folderName}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Create New Note Section */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium">Create New Note</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateNewNote(!showCreateNewNote)}
                >
                  {showCreateNewNote ? "Cancel" : "Create New Note"}
                </Button>
              </div>

              {showCreateNewNote && (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="new-note-title" className="text-sm font-medium">
                      Note Title
                    </Label>
                    <Input
                      id="new-note-title"
                      value={newNoteTitle}
                      onChange={(e) => setNewNoteTitle(e.target.value)}
                      placeholder="Enter note title..."
                      className="mt-1"
                    />
                  </div>

                  {/* Folder Selection */}
                  <div>
                    <Label className="text-sm font-medium">Folder (optional)</Label>
                    <div className="mt-1 space-y-2">
                      {folders.map((folder) => (
                        <div key={folder.id} className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id={`folder-${folder.id}`}
                            name="selectedFolder"
                            value={folder.id}
                            checked={selectedFolderForNewNote === folder.id}
                            onChange={(e) => setSelectedFolderForNewNote(e.target.value)}
                            className="h-4 w-4"
                          />
                          <Label htmlFor={`folder-${folder.id}`} className="flex items-center gap-2 cursor-pointer">
                            <Folder className="h-4 w-4" />
                            <span>{folder.name}</span>
                          </Label>
                        </div>
                      ))}
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="create-new-folder"
                          name="selectedFolder"
                          value="create-new"
                          checked={showCreateNewFolder}
                          onChange={(e) => setShowCreateNewFolder(e.target.checked)}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="create-new-folder" className="flex items-center gap-2 cursor-pointer">
                          <Folder className="h-4 w-4" />
                          <span>Create new folder</span>
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* New Folder Name Input */}
                  {showCreateNewFolder && (
                    <div>
                      <Label htmlFor="new-folder-name" className="text-sm font-medium">
                        Folder Name
                      </Label>
                      <Input
                        id="new-folder-name"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="Enter folder name..."
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          )}

          {!showSuccessMessage && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleCloseDialog}
              >
                Cancel
              </Button>
              {selectedNoteIds.length > 0 && (
              <Button
                onClick={handleAddToExistingNotes}
                disabled={isCreatingNote}
              >
                {isCreatingNote ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  `Add to ${selectedNoteIds.length} Note${selectedNoteIds.length > 1 ? 's' : ''}`
                )}
              </Button>
            )}
            {showCreateNewNote && (
              <Button
                onClick={handleCreateNoteWithContent}
                disabled={isCreatingNote || (!newNoteTitle.trim() && !selectedNoteIds.length)}
              >
                {isCreatingNote ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Note"
                )}
              </Button>
            )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
