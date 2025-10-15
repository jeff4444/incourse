"""
Simple test script to verify streaming functionality works correctly.

This script tests the streaming handler directly without the full API stack.
Useful for debugging and verifying the streaming logic.

Usage:
    python test_streaming.py
"""

import asyncio
from agents.chat_agent.agent import get_chat_agent, Deps as ChatDeps
from agents.chat_agent.streaming_handler import stream_chat_agent


async def test_streaming():
    """Test basic streaming functionality."""
    print("=" * 80)
    print("Testing Chat Agent Streaming")
    print("=" * 80)
    print()
    
    # Create minimal dependencies for testing
    # Note: These would normally come from actual database queries
    deps = ChatDeps(
        user_id="test_user",
        course_id="test_course",
        file_id="test_file",
        session_id=None
    )
    
    # Test prompts
    test_prompts = [
        "Hello!",  # Simple greeting - no tools
        "What is this course about?",  # Should trigger get_course_and_file_info
    ]
    
    for prompt in test_prompts:
        print(f"\n{'=' * 80}")
        print(f"Prompt: {prompt}")
        print(f"{'=' * 80}\n")
        
        agent = get_chat_agent()
        
        try:
            print("Streaming response:")
            print("-" * 80)
            
            async for event in stream_chat_agent(agent, prompt, deps):
                if event.type.value == "text_delta":
                    # Print text as it arrives (without newline)
                    print(event.content, end='', flush=True)
                elif event.type.value == "tool_call":
                    print(f"\n[🔧 Tool: {event.content}]", end='', flush=True)
                elif event.type.value == "tool_result":
                    print(f" ✓", end='', flush=True)
                elif event.type.value == "done":
                    print("\n")
                    print("-" * 80)
                    print(f"Stream complete. Full response length: {len(event.content)} chars")
        
        except Exception as e:
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()
    
    print("\n" + "=" * 80)
    print("Testing complete!")
    print("=" * 80)


async def test_sse_format():
    """Test that events convert to proper SSE format."""
    print("\n" + "=" * 80)
    print("Testing SSE Format")
    print("=" * 80)
    print()
    
    from agents.chat_agent.streaming_handler import StreamEvent, EventType
    
    # Test different event types
    events = [
        StreamEvent(type=EventType.TEXT_DELTA, content="Hello"),
        StreamEvent(type=EventType.TOOL_CALL, content="Searching", data={"name": "search"}),
        StreamEvent(type=EventType.TOOL_RESULT, content="complete", data={"name": "search"}),
        StreamEvent(type=EventType.DONE, content="Full response", data={"result": "done"}),
    ]
    
    for event in events:
        sse_output = event.to_sse()
        print(f"Event: {event.type.value}")
        print(f"SSE Output: {repr(sse_output)}")
        print()
    
    print("SSE format test complete!")


if __name__ == "__main__":
    print("🚀 Starting Streaming Tests\n")
    
    # Run SSE format test first (synchronous)
    asyncio.run(test_sse_format())
    
    # Then run actual streaming test
    print("\n⚠️  Note: The streaming test requires valid credentials and database access.")
    print("It may fail if environment variables are not set correctly.\n")
    
    try:
        asyncio.run(test_streaming())
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()

