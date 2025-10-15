"""
Streaming handler for chat agent using direct model streaming APIs.

This module provides TRUE real-time streaming by using the model provider's
streaming API directly, while manually handling tool calls with pydantic-ai's tools.
"""

from typing import AsyncIterator, Dict, Any, List
from enum import Enum
from pydantic import BaseModel
from anthropic import AsyncAnthropic
import json
import os
import asyncio
from dotenv import load_dotenv
from pydantic_ai import Agent
from pydantic_ai.messages import (
    PartStartEvent,
    PartDeltaEvent,
    TextPartDelta,
    ToolCallPart,
    FunctionToolCallEvent,
    FunctionToolResultEvent,
)
load_dotenv()

class EventType(str, Enum):
    """Types of streaming events."""
    TEXT_DELTA = "text_delta"
    TOOL_CALL = "tool_call"
    TOOL_RESULT = "tool_result"
    DONE = "done"
    DEBUG = "debug"


class StreamEvent(BaseModel):
    """Structured event for streaming."""
    type: EventType
    content: str = ""
    data: Dict[str, Any] = {}

    def to_sse(self) -> str:
        """Convert to SSE (Server-Sent Events) format."""
        event_data = {
            "type": self.type.value,
            "content": self.content,
            **self.data
        }
        return f"data: {json.dumps(event_data)}\n\n"


async def execute_tool(tool_name: str, tool_args: Dict[str, Any], deps: Any) -> Any:
    """
    Execute a tool manually by calling the appropriate function.
    
    Args:
        tool_name: Name of the tool to execute
        tool_args: Arguments to pass to the tool
        deps: Dependencies context
        
    Returns:
        Tool execution result
    """
    from tools.pinecone_tools import search_file_with_query, search_file_with_chunk_index
    from tools.supabase_tools import get_course_and_file_info, get_chat_context
    from pydantic_ai import RunContext
    
    # Create a fake context for tool execution
    ctx = type('Context', (), {'deps': deps})()
    
    try:
        if tool_name == "search_file_with_query":
            result = await search_file_with_query(ctx, **tool_args)
        elif tool_name == "search_file_with_chunk_index":
            result = await search_file_with_chunk_index(ctx, **tool_args)
        elif tool_name == "get_course_and_file_info":
            result = await get_course_and_file_info(ctx)
        elif tool_name == "get_chat_context":
            result = await get_chat_context(ctx)
        else:
            result = f"Unknown tool: {tool_name}"
        
        return result
    except Exception as e:
        return f"Error executing {tool_name}: {str(e)}"


def parse_event(event: Any) -> StreamEvent:
    """
    Parse a pydantic-ai AgentStreamEvent into our StreamEvent format.
    
    Args:
        event: The event from pydantic-ai's streaming
        
    Returns:
        StreamEvent with appropriate type and content
    """
    # Text content we want to display
    if isinstance(event, PartStartEvent):
        if hasattr(event.part, 'content') and event.part.content:
            return StreamEvent(
                type=EventType.TEXT_DELTA,
                content=event.part.content
            )
    
    elif isinstance(event, PartDeltaEvent):
        if isinstance(event.delta, TextPartDelta):
            return StreamEvent(
                type=EventType.TEXT_DELTA,
                content=event.delta.content_delta
            )
    
    # Tool calls - show what tools are being used
    if isinstance(event, FunctionToolCallEvent):
        # Get tool name from the part attribute
        tool_name = 'unknown'
        tool_args = {}
        tool_call_id = event.tool_call_id if hasattr(event, 'tool_call_id') else None
        
        if hasattr(event, 'part') and event.part:
            # The part should be a ToolCallPart with the tool name
            if isinstance(event.part, ToolCallPart):
                tool_name = event.part.tool_name if hasattr(event.part, 'tool_name') else 'unknown'
                tool_args = event.part.args if hasattr(event.part, 'args') else {}
        
        # Map internal tool names to user-friendly names
        friendly_names = {
            "get_course_and_file_info": "Getting course info",
            "get_chat_context": "Loading chat history",
            "search_file_with_query": "Searching document",
            "search_file_with_chunk_index": "Getting context",
        }
        display_name = friendly_names.get(tool_name, tool_name)
        
        # Add query details for search_file_with_query
        if tool_name == "search_file_with_query" and tool_args:
            print(f"Search file with query args: {tool_args}")
            print(f"Tool args type: {type(tool_args)}")
            
            # Parse tool_args if it's a string
            if isinstance(tool_args, str):
                try:
                    parsed_args = json.loads(tool_args)
                except json.JSONDecodeError:
                    parsed_args = {}
            else:
                parsed_args = tool_args
            
            if "query" in parsed_args:
                query = parsed_args["query"]
                display_name = f"Searching document for '{query}'"
        elif tool_name == "search_file_with_chunk_index" and tool_args:
            # Parse tool_args if it's a string
            if isinstance(tool_args, str):
                try:
                    parsed_args = json.loads(tool_args)
                except json.JSONDecodeError:
                    parsed_args = {}
            else:
                parsed_args = tool_args
            
            if "chunk_index" in parsed_args:
                chunk_idx = parsed_args["chunk_index"]
                display_name = f"Getting context around chunk {chunk_idx}"
        
        return StreamEvent(
            type=EventType.TOOL_CALL,
            content=display_name,
            data={
                "name": tool_name,
                "args": tool_args,
                "tool_call_id": tool_call_id
            }
        )
    
    # Tool results - indicate completion
    elif isinstance(event, FunctionToolResultEvent):
        # FunctionToolResultEvent has: content, result, tool_call_id
        # Extract tool name from the result field
        tool_name = 'unknown'
        
        if hasattr(event, 'result') and event.result and hasattr(event.result, 'tool_name'):
            tool_name = event.result.tool_name
        
        return StreamEvent(
            type=EventType.TOOL_RESULT,
            content="complete",
            data={
                "name": tool_name,
                "tool_call_id": event.tool_call_id if hasattr(event, 'tool_call_id') else None
            }
        )
    
    # Debug/other events
    return StreamEvent(
        type=EventType.DEBUG,
        content=f"{type(event).__name__}",
        data={"event": str(event)}
    )


async def stream_chat_agent(
    agent: Agent,
    user_prompt: str,
    deps: Any
) -> AsyncIterator[StreamEvent]:
    """
    Stream chat agent responses using pydantic-ai's native streaming.
    
    This function uses agent.iter() to iterate through execution nodes and
    node.stream() to get streaming events from each node. It automatically
    handles tool execution and text generation.
    
    Includes retry logic with exponential backoff for rate limiting errors.
    
    Args:
        agent: The pydantic-ai Agent instance
        user_prompt: The user's message
        deps: Dependencies for the agent (ChatDeps)
        
    Yields:
        StreamEvent objects for each streaming event
    """
    debug_messages = []
    content_streamed = False
    full_response = ""
    max_retries = 3
    retry_count = 0
    
    # Safety: Limit maximum nodes and tool calls to prevent infinite loops
    max_nodes = 20  # Reduced from 50 for faster termination
    node_count = 0
    max_tool_calls = 10
    tool_call_count = 0
    should_stop = False  # Flag to exit all loops
    
    while retry_count <= max_retries and not should_stop:
        try:
            print(f"Starting agent iteration (attempt {retry_count + 1}/{max_retries + 1})")
            async with agent.iter(user_prompt, deps=deps) as run:
                print("Agent iteration started successfully")
                async for node in run:
                    if should_stop:
                        print("Should stop flag is True, breaking from node loop")
                        break
                        
                    node_count += 1
                    print(f"Processing node {node_count}: {type(node).__name__}")
                    
                    # Safety check: prevent infinite loops
                    if node_count > max_nodes:
                        debug_messages.append(f"SAFETY: Max nodes ({max_nodes}) reached, stopping")
                        yield StreamEvent(
                            type=EventType.DONE,
                            content=full_response or "Response terminated due to excessive processing.",
                            data={"error": "Maximum processing limit reached"}
                        )
                        should_stop = True
                        break
                    # User prompt node - just log
                    if Agent.is_user_prompt_node(node):
                        debug_messages.append(f"UserPromptNode: {node.user_prompt}")
                    
                    # Model request node - stream text deltas
                    elif Agent.is_model_request_node(node):
                        debug_messages.append("ModelRequestNode: streaming response")
                        async with node.stream(run.ctx) as request_stream:
                            async for event in request_stream:
                                parsed = parse_event(event)
                                
                                # Only yield display events (text deltas)
                                if parsed.type == EventType.TEXT_DELTA:
                                    content_streamed = True
                                    full_response += parsed.content
                                    yield parsed
                                elif parsed.type == EventType.DEBUG:
                                    debug_messages.append(parsed.content)
                    
                    # Tool call node - stream tool execution events
                    elif Agent.is_call_tools_node(node):
                        tool_call_count += 1
                        
                        # Safety check: prevent infinite tool calling loops
                        if tool_call_count > max_tool_calls:
                            debug_messages.append(f"SAFETY: Max tool calls ({max_tool_calls}) reached, stopping")
                            yield StreamEvent(
                                type=EventType.DONE,
                                content=full_response or "Response terminated due to excessive tool calls.",
                                data={"error": "Maximum tool call limit reached"}
                            )
                            should_stop = True
                            break
                        
                        debug_messages.append(f"CallToolsNode: executing tools (call {tool_call_count}/{max_tool_calls})")
                        async with node.stream(run.ctx) as tool_stream:
                            async for event in tool_stream:
                                parsed = parse_event(event)
                                
                                # Yield tool call and result events
                                if parsed.type in [EventType.TOOL_CALL, EventType.TOOL_RESULT]:
                                    yield parsed
                                elif parsed.type == EventType.DEBUG:
                                    debug_messages.append(parsed.content)
                    
                    # End node - send completion
                    elif Agent.is_end_node(node):
                        print("EndNode reached - processing final result")
                        # Extract actual answer text from ChatAnswer object
                        final_result = run.result.output
                        
                        if hasattr(final_result, 'answer'):
                            # ChatAnswer object - extract the answer field
                            final_answer = final_result.answer
                        else:
                            # Fallback to string conversion
                            final_answer = str(final_result)
                        
                        if content_streamed:
                            debug_messages.append(f"EndNode: streaming complete")
                            yield StreamEvent(
                                type=EventType.DONE,
                                content=full_response,
                                data={"result": final_answer}
                            )
                        else:
                            # If no content was streamed, send the final result
                            yield StreamEvent(
                                type=EventType.TEXT_DELTA,
                                content=final_answer
                            )
                            yield StreamEvent(
                                type=EventType.DONE,
                                content=final_answer,
                                data={"result": final_answer}
                            )
                    
                    else:
                        debug_messages.append(f"Unknown node: {type(node).__name__}")
            
            # Log debug info (can be removed in production)
            if debug_messages and os.getenv("DEBUG") == "true":
                print("\n=== Streaming Debug Log ===")
                print("\n".join(debug_messages))
                print("===========================\n")
            
            # Success - break out of retry loop
            break
            
        except Exception as e:
            error_message = str(e)
            print(f"Exception in streaming handler: {type(e).__name__}: {error_message}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            
            # Check if it's a throttling error
            if "ThrottlingException" in error_message or "Too many requests" in error_message:
                retry_count += 1
                
                if retry_count <= max_retries:
                    # Exponential backoff: 2^retry_count seconds
                    wait_time = 2 ** retry_count
                    print(f"Rate limit hit. Retrying in {wait_time} seconds... (attempt {retry_count}/{max_retries})")
                    await asyncio.sleep(wait_time)
                    continue  # Retry
                else:
                    # Max retries reached
                    print(f"Max retries reached for throttling error")
                    yield StreamEvent(
                        type=EventType.DONE,
                        content="",
                        data={"error": "Rate limit exceeded. Please try again in a moment."}
                    )
                    break
            else:
                # Non-throttling error - don't retry
                print(f"Error in streaming: {e}")
                import traceback
                traceback.print_exc()
                yield StreamEvent(
                    type=EventType.DONE,
                    content="",
                    data={"error": str(e)}
                )
                break

