from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from pydantic_ai import Agent, Tool
from shared.prompts.chat_agent_prompt import CHAT_AGENT_PROMPT
from shared.agents.pinecone_tools import search_file_with_query
from shared.agents.supabase_tools import (
    get_or_create_chat_session,
    get_chat_messages,
    batch_save_messages,
    get_latest_context_snapshot,
    create_context_snapshot,
    get_chat_message_count
)
from shared.agents.model import get_model


class ChatAnswer(BaseModel):
    """
    Model for a single chat answer.
    """
    answer: str = Field(..., description="Assistant's reply text")


@dataclass
class Deps:
    user_id: str
    lms_api_key: str
    lms_base_url: str
    course_info: Dict[str, Any]
    file_info: Dict[str, Any]
    is_file_from_lms: bool
    chat_id: Optional[str] = None
    chat_history: List[Dict[str, Any]] = field(default_factory=list)
    context_summary: Optional[str] = None

SYSTEM_PROMPT = CHAT_AGENT_PROMPT


def get_chat_agent(**kwargs) -> Agent[Deps, ChatAnswer]:
    """
    Create a chat agent for file Q&A with history and context support.
    """
    model = get_model()

    return Agent[
        Deps,
        ChatAnswer,
    ](
        model,
        output_type=ChatAnswer,
        system_prompt=SYSTEM_PROMPT,
        tools=[
            Tool(search_file_with_query, takes_ctx=True),
        ],
        retries=3,
        output_retries=3,
    )


class ChatSessionManager:
    """
    Manages chat sessions, message buffering, and context summaries.
    """
    
    def __init__(self):
        self.message_buffer: List[Dict[str, Any]] = []
        self.buffer_limit = 5  # Batch save every 5 messages
        self.summary_interval = 10  # Create summary every 10 messages
    
    async def load_chat_context(self, ctx, user_id: str, document_id: str, session_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Load chat context including session, history, and latest summary.
        
        Args:
            ctx: RunContext
            user_id: User ID
            document_id: Document ID
            session_id: Optional existing session ID
            
        Returns:
            Dictionary with chat_id, history, and context_summary
        """
        if session_id:
            # Use existing session
            chat_session = {"id": session_id}
            chat_id = session_id
        else:
            # Get or create new session
            chat_session = await get_or_create_chat_session(ctx, user_id, document_id)
            chat_id = chat_session["id"]
        
        # Load recent messages (last 20 to keep context manageable)
        chat_history = await get_chat_messages(ctx, chat_id, limit=20)
        
        # Load latest context summary
        context_snapshot = await get_latest_context_snapshot(ctx, chat_id)
        context_summary = context_snapshot["summary"] if context_snapshot else None
        
        return {
            "chat_id": chat_id,
            "chat_history": chat_history,
            "context_summary": context_summary
        }
    
    async def add_message_to_buffer(self, ctx, chat_id: str, sender: str, content: str, tokens: Optional[int] = None, metadata: Optional[Dict] = None):
        """
        Add a message to the buffer.
        
        Args:
            ctx: RunContext
            chat_id: Chat session ID
            sender: 'user' or 'assistant'
            content: Message content
            tokens: Optional token count
            metadata: Optional metadata
        """
        message = {
            "sender": sender,
            "content": content,
            "tokens": tokens,
            "metadata": metadata
        }
        
        self.message_buffer.append(message)
        
        # Check if we should batch save
        if len(self.message_buffer) >= self.buffer_limit:
            await self.flush_buffer(ctx, chat_id)
    
    async def flush_buffer(self, ctx, chat_id: str):
        """
        Save all buffered messages to the database.
        
        Args:
            ctx: RunContext
            chat_id: Chat session ID
        """
        if not self.message_buffer:
            return
        
        try:
            await batch_save_messages(ctx, chat_id, self.message_buffer)
            self.message_buffer.clear()
            print(f"Flushed {len(self.message_buffer)} messages to database")
        except Exception as e:
            print(f"Error flushing message buffer: {e}")
            # Keep messages in buffer for retry
    
    async def check_and_create_summary(self, ctx, chat_id: str, user_message: str, assistant_response: str):
        """
        Check if we should create a new context summary and do so if needed.
        
        Args:
            ctx: RunContext
            chat_id: Chat session ID
            user_message: Latest user message
            assistant_response: Latest assistant response
        """
        try:
            # Get current message count
            message_count = await get_chat_message_count(ctx, chat_id)
            
            # Check if we've reached a summary interval
            if message_count % self.summary_interval == 0 and message_count > 0:
                await self.create_context_summary(ctx, chat_id, user_message, assistant_response)
        except Exception as e:
            print(f"Error checking summary creation: {e}")
    
    async def create_context_summary(self, ctx, chat_id: str, user_message: str, assistant_response: str):
        """
        Create a new context summary for the chat session.
        
        Args:
            ctx: RunContext
            chat_id: Chat session ID
            user_message: Latest user message
            assistant_response: Latest assistant response
        """
        try:
            # Get recent messages for summarization
            recent_messages = await get_chat_messages(ctx, chat_id, limit=20)
            
            # Create summary prompt
            conversation_text = ""
            for msg in recent_messages:
                role = "User" if msg["sender"] == "user" else "Assistant"
                conversation_text += f"{role}: {msg['content']}\n"
            
            # Add current conversation
            conversation_text += f"User: {user_message}\n"
            conversation_text += f"Assistant: {assistant_response}\n"
            
            summary_prompt = f"""
            Please provide a concise summary of this conversation about the document. 
            Focus on the key topics discussed, questions asked, and insights provided.
            Keep the summary under 200 words and maintain context for future conversations.
            
            Conversation:
            {conversation_text}
            
            Summary:
            """
            
            # Generate summary using the AI model
            model = get_model()
            summary_response = await model.run_sync(summary_prompt)
            summary_text = summary_response.content if hasattr(summary_response, 'content') else str(summary_response)
            
            # Save the summary
            message_count = await get_chat_message_count(ctx, chat_id)
            await create_context_snapshot(ctx, chat_id, summary_text, message_count)
            
            print(f"Created context summary for chat {chat_id} with {message_count} messages")
            
        except Exception as e:
            print(f"Error creating context summary: {e}")


