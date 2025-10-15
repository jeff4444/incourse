# Streaming Chat Implementation

## Overview

Successfully implemented full streaming support for the chat agent using pydantic-ai's native streaming capabilities. The implementation provides token-by-token text generation and real-time tool call visibility.

## What Was Implemented

### Backend Changes

1. **Created `backend/agents/chat_agent/streaming_handler.py`**
   - Uses pydantic-ai's `agent.iter()` and `node.stream()` for native streaming
   - Implements event parsing for different event types:
     - `PartStartEvent` and `PartDeltaEvent` for text generation
     - `FunctionToolCallEvent` for tool execution start
     - `FunctionToolResultEvent` for tool execution completion
   - Maps internal tool names to user-friendly display names
   - Yields structured `StreamEvent` objects in SSE format

2. **Added `/chat/stream` endpoint to `backend/main.py`**
   - New POST endpoint that returns Server-Sent Events (SSE)
   - Handles streaming while maintaining session management
   - Buffers full response for database storage
   - Keeps existing `/chat` endpoint for backward compatibility

### Frontend Changes

1. **Created `frontend/src/app/api/agents/chat/stream/route.ts`**
   - New Next.js API route that forwards streaming requests to Python backend
   - Pipes SSE stream directly to client
   - Maintains authentication flow

2. **Updated `frontend/src/components/ai-chat-panel.tsx`**
   - Added streaming state management:
     - `isStreaming`: tracks streaming status
     - `streamingMessage`: accumulates text tokens
     - `activeToolCalls`: tracks tool execution
   - Implemented SSE parsing with ReadableStream reader
   - Added real-time UI updates for:
     - Token-by-token text display with blinking cursor
     - Tool call badges showing execution status
     - Smooth transition from streaming to message history
   - Disabled input during streaming

## Features

### Text Streaming
- **Token-by-token generation**: See AI response appear progressively
- **Markdown rendering**: Real-time markdown formatting as text arrives
- **Blinking cursor**: Visual indicator of active streaming
- **Smooth UX**: No jarring updates or flashing

### Tool Call Visibility
- **Real-time indicators**: See when tools are being executed
- **User-friendly names**: Technical tool names mapped to readable descriptions:
  - `get_course_and_file_info` → "Getting course info"
  - `get_chat_context` → "Loading chat history"
  - `search_file_with_query` → "Searching document"
  - `search_file_with_chunk_index` → "Getting context"
- **Status badges**: Visual indicators with loading spinner and checkmark
- **Color-coded**: Blue for executing, green for complete

### Session Management
- **Automatic saving**: Full response saved to database after streaming completes
- **Chat history**: Maintains conversation context
- **Session persistence**: Works with existing session system

## Event Format

The streaming endpoint sends Server-Sent Events (SSE) with the following format:

```
data: {"type": "text_delta", "content": "Hello"}

data: {"type": "tool_call", "name": "search_file_with_query", "content": "Searching document", "data": {"name": "search_file_with_query", "args": {...}}}

data: {"type": "tool_result", "name": "search_file_with_query", "content": "complete", "data": {"name": "search_file_with_query"}}

data: {"type": "text_delta", "content": " based on the document..."}

data: {"type": "done", "content": "Full response text", "data": {"result": "..."}}
```

## Testing

### Test Cases

1. **Simple Greeting (No Tools)**
   - Type: "Hi" or "Hello"
   - Expected: Stream text only, no tool indicators
   - Verifies: Basic streaming works

2. **Document Question (Single Tool)**
   - Type: "What is photosynthesis?"
   - Expected: "Searching document" badge, then streamed answer
   - Verifies: Tool call visibility and text streaming

3. **Complex Question (Multiple Tools)**
   - Type: "Can you explain the last thing we discussed about this topic?"
   - Expected: "Loading chat history" and "Searching document" badges, then answer
   - Verifies: Multiple tool calls handled correctly

4. **Follow-up Question**
   - First ask a question, then ask "explain that more"
   - Expected: "Loading chat history" badge, then streamed answer
   - Verifies: Context management works with streaming

### How to Test

1. **Start Backend**:
   ```bash
   cd backend
   python main.py
   ```

2. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Navigate to a course file** and open the chat panel

4. **Try the test cases above** and observe:
   - Text appearing token-by-token
   - Tool call badges appearing and updating
   - Smooth cursor animation
   - Message appearing in history after completion

## Technical Details

### Pydantic-AI Integration

Uses pydantic-ai's built-in streaming:
- `async with agent.iter(user_prompt, deps=deps) as run:` - Iterate through execution nodes
- `Agent.is_model_request_node(node)` - Identify text generation nodes
- `Agent.is_call_tools_node(node)` - Identify tool execution nodes
- `async with node.stream(run.ctx) as stream:` - Stream events from each node

### Advantages

1. **Native Integration**: Uses pydantic-ai's official streaming API
2. **Model Agnostic**: Works with all supported models (Anthropic, OpenAI, Bedrock, Gemini)
3. **Automatic Tool Execution**: pydantic-ai handles tool calling
4. **Maintainable**: Stays within pydantic-ai ecosystem
5. **No Breaking Changes**: Existing `/chat` endpoint still works

### Browser Compatibility

- Uses standard `fetch` API with `ReadableStream`
- Compatible with all modern browsers
- SSE parsing handles chunked responses correctly

## Future Enhancements

Potential improvements:
- Add ability to stop/cancel streaming mid-response
- Show partial tool results (not just status)
- Add typing sound effects (optional)
- Implement retry logic for failed streams
- Add streaming analytics (tokens per second, etc.)
- Support streaming for other agents (flashcard, quiz generation)

## Files Modified/Created

### Created:
- `backend/agents/chat_agent/streaming_handler.py` - Streaming logic
- `frontend/src/app/api/agents/chat/stream/route.ts` - Frontend API route

### Modified:
- `backend/main.py` - Added `/chat/stream` endpoint
- `frontend/src/components/ai-chat-panel.tsx` - Added streaming UI

## References

- [Pydantic AI Streaming Guide](https://datastud.dev/posts/pydantic-ai-streaming)
- [Server-Sent Events (SSE) Specification](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

