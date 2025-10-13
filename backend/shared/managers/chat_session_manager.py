"""
Chat session management for handling conversations, message buffering, and context summaries.
"""

from typing import List, Dict, Any, Optional


class ChatSessionManager:
    """
    Manages chat sessions, message buffering, and context summaries.
    """
    
    def __init__(self, course_info: Dict[str, Any], file_info: Dict[str, Any]):
        self.message_buffer: List[Dict[str, Any]] = []
        self.buffer_limit = 5  # Batch save every 5 messages
        self.summary_interval = 10  # Create summary every 10 messages
        self.course_info = course_info
        self.file_info = file_info
    
    async def load_chat_context(self, user_id: str, document_id: str, session_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Load chat context including session, history, and latest summary.
        
        Args:
            user_id: User ID
            document_id: Document ID
            session_id: Optional existing session ID
            
        Returns:
            Dictionary with chat_id, history, and context_summary
        """
        # Import here to avoid circular imports
        from tools.supabase_tools import (
            get_or_create_chat_session,
            get_chat_messages,
            get_latest_context_snapshot
        )
        
        if session_id:
            # Use existing session
            chat_session = {"id": session_id}
            chat_id = session_id
        else:
            # Get or create new session
            chat_session = await get_or_create_chat_session(user_id=user_id, document_id=document_id)
            chat_id = chat_session["id"]
        
        # Load recent messages (last 20 to keep context manageable)
        chat_history = await get_chat_messages(chat_id=chat_id, limit=20)
        
        # Load latest context summary
        context_snapshot = await get_latest_context_snapshot(chat_id=chat_id)
        context_summary = context_snapshot["summary"] if context_snapshot else None
        
        return {
            "chat_id": chat_id,
            "chat_history": chat_history,
            "context_summary": context_summary
        }
    
    async def add_message_to_buffer(self, chat_id: str, sender: str, content: str, tokens: Optional[int] = None, metadata: Optional[Dict] = None):
        """
        Add a message to the buffer.
        
        Args:
            chat_id: Chat session ID
            sender: 'user' or 'assistant'
            content: Message content
            tokens: Optional token count
            metadata: Optional metadata
        """
        from tools.supabase_tools import batch_save_messages
        
        message = {
            "sender": sender,
            "content": content,
            "tokens": tokens,
            "metadata": metadata
        }
        
        self.message_buffer.append(message)
        
        # Check if we should batch save
        if len(self.message_buffer) >= self.buffer_limit:
            await self.flush_buffer(chat_id)
    
    async def flush_buffer(self, chat_id: str):
        """
        Save all buffered messages to the database.
        
        Args:
            chat_id: Chat session ID
        """
        if not self.message_buffer:
            return
        
        from tools.supabase_tools import batch_save_messages
        
        try:
            await batch_save_messages(chat_id=chat_id, messages=self.message_buffer)
            self.message_buffer.clear()
            print(f"Flushed {len(self.message_buffer)} messages to database")
        except Exception as e:
            print(f"Error flushing message buffer: {e}")
            # Keep messages in buffer for retry
    
    async def check_and_create_summary(self, chat_id: str, user_message: str, assistant_response: str):
        """
        Check if we should create a new context summary and do so if needed.
        
        Args:
            chat_id: Chat session ID
            user_message: Latest user message
            assistant_response: Latest assistant response
        """
        from tools.supabase_tools import get_chat_message_count
        
        try:
            # Get current message count
            message_count = await get_chat_message_count(chat_id=chat_id)
            
            # Check if we've reached a summary interval
            if message_count % self.summary_interval == 0 and message_count > 0:
                await self.create_context_summary(chat_id=chat_id, user_message=user_message, assistant_response=assistant_response)
        except Exception as e:
            print(f"Error checking summary creation: {e}")
    
    async def create_context_summary(self, chat_id: str, user_message: str, assistant_response: str):
        """
        Create a new context summary for the chat session using the summary_agent.
        
        Args:
            chat_id: Chat session ID
            user_message: Latest user message
            assistant_response: Latest assistant response
        """
        from tools.supabase_tools import (
            get_chat_messages,
            get_latest_context_snapshot,
            create_context_snapshot,
            get_chat_message_count
        )
        from agents.summary_agent.agent import summarize_conversation, summarize_conversation_incremental
        
        try:
            # Get recent messages for summarization
            recent_messages = await get_chat_messages(chat_id=chat_id, limit=20)
            
            # Add current conversation to messages
            messages_to_summarize = recent_messages + [
                {"sender": "user", "content": user_message},
                {"sender": "assistant", "content": assistant_response}
            ]
            
            # Get previous summary if it exists
            previous_snapshot = await get_latest_context_snapshot(chat_id=chat_id)
            previous_summary = previous_snapshot["summary"] if previous_snapshot else None
            
            # Get total message count
            message_count = await get_chat_message_count(chat_id=chat_id)
            
            # Create additional context from deps
            course_name = self.course_info.get("name", "Unknown Course") if self.course_info else "Unknown Course"
            file_name = self.file_info.get("title", "Unknown Document") if self.file_info else "Unknown Document"
            additional_context = f"Course: {course_name}, Document: {file_name}"
            
            # Use summary_agent to generate a structured summary
            if previous_summary:
                # Incremental summary building on previous context
                summary_result = await summarize_conversation_incremental(
                    new_messages=messages_to_summarize[-10:],  # Last 10 messages as "new"
                    previous_summary=previous_summary,
                    message_count=message_count,
                    additional_context=additional_context
                )
            else:
                # First summary for this session
                summary_result = await summarize_conversation(
                    messages=messages_to_summarize,
                    additional_context=additional_context
                )
            
            # Format the summary with structured information
            summary_text = summary_result.summary
            if summary_result.main_topics:
                summary_text += f"\n\nMain Topics: {', '.join(summary_result.main_topics)}"
            if summary_result.key_insights:
                summary_text += f"\n\nKey Insights:\n" + "\n".join(f"- {insight}" for insight in summary_result.key_insights)
            
            # Save the summary
            await create_context_snapshot(chat_id=chat_id, summary=summary_text, message_count=message_count)
            
            print(f"Created context summary for chat {chat_id} with {message_count} messages")
            print(f"Topics covered: {', '.join(summary_result.main_topics) if summary_result.main_topics else 'None identified'}")
            
        except Exception as e:
            print(f"Error creating context summary: {e}")
            import traceback
            traceback.print_exc()

