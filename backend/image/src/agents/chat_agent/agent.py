from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from pydantic_ai import Agent, Tool
from prompts.chat_agent_prompt import CHAT_AGENT_PROMPT
from tools.pinecone_tools import search_file_with_query, search_file_with_chunk_index
from tools.supabase_tools import get_course_and_file_info, get_chat_context
from tools.generation_tools import generate_quiz_from_chat, generate_flashcard_from_chat
from shared.model import get_model
from shared.managers import ChatSessionManager


class ChatAnswer(BaseModel):
    """
    Model for a single chat answer.
    """
    answer: str = Field(..., description="Assistant's reply text")


@dataclass
class Deps:
    user_id: str
    course_id: str  # Internal course ID (not LMS ID)
    file_id: str  # The file/module_item ID
    session_id: Optional[str] = None  # Existing chat session ID
    
    # Lazy-loaded fields (fetched by agent tools when needed)
    lms_api_key: Optional[str] = None
    lms_base_url: Optional[str] = None
    course_info: Optional[Dict[str, Any]] = None
    file_info: Optional[Dict[str, Any]] = None
    is_file_from_lms: Optional[bool] = None
    chat_id: Optional[str] = None
    chat_history: Optional[List[Dict[str, Any]]] = None
    context_summary: Optional[str] = None
    
    async def preload_context(self):
        """
        Preload the last 10 messages and context summary before the agent runs.
        This ensures the agent always has access to recent conversation history.
        """
        from tools.supabase_tools import (
            get_or_create_chat_session, 
            get_chat_messages, 
            get_latest_context_snapshot,
            get_module_items_by_course_id
        )
        
        # 1. Get or create chat session
        if not self.chat_id:
            # Determine document_id for session lookup
            if self.file_info:
                # File info is loaded, check if it's from LMS
                if self.is_file_from_lms:
                    document_id = self.file_id
                else:
                    document_id = self.file_info.get("id", self.file_id)
            else:
                # File info not loaded yet, try to determine from DB first
                try:
                    file_info = await get_module_items_by_course_id(
                        course_id=self.course_id,
                        lms_id=self.file_id
                    )
                    document_id = file_info["id"]
                    self.file_info = file_info
                    self.is_file_from_lms = False
                except Exception:
                    # Not in our DB, so it's from LMS
                    document_id = self.file_id
                    self.is_file_from_lms = True
            
            if self.session_id:
                self.chat_id = self.session_id
            else:
                chat_session = await get_or_create_chat_session(
                    user_id=self.user_id,
                    document_id=document_id
                )
                self.chat_id = chat_session["id"]
        
        # 2. Load last 10 messages
        if self.chat_history is None:
            self.chat_history = await get_chat_messages(chat_id=self.chat_id, limit=10)
        
        # 3. Load context summary
        if self.context_summary is None:
            snapshot = await get_latest_context_snapshot(chat_id=self.chat_id)
            self.context_summary = snapshot["summary"] if snapshot else None

SYSTEM_PROMPT = CHAT_AGENT_PROMPT


def build_system_prompt_with_context(deps: Deps) -> str:
    """
    Build a dynamic system prompt that includes the preloaded chat history and summary.
    This ensures the agent has immediate access to conversation context.
    """
    base_prompt = CHAT_AGENT_PROMPT
    
    # Add context section if we have history or summary
    context_sections = []
    
    if deps.context_summary:
        context_sections.append(f"📋 CONVERSATION SUMMARY:\n{deps.context_summary}\n")
    
    if deps.chat_history and len(deps.chat_history) > 0:
        context_sections.append("💬 RECENT CONVERSATION HISTORY:")
        for msg in deps.chat_history:
            role = "User" if msg["sender"] == "user" else "Assistant"
            context_sections.append(f"- {role}: {msg['content']}")
        context_sections.append("")  # Add spacing
    
    if context_sections:
        context_text = "\n".join(context_sections)
        # Insert context after the main prompt but before the rules
        enhanced_prompt = f"{base_prompt}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📚 CURRENT CONVERSATION CONTEXT:\n{context_text}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        return enhanced_prompt
    
    return base_prompt


def get_chat_agent(**kwargs) -> Agent[Deps, ChatAnswer]:
    """
    Create a chat agent for file Q&A with history and context support.
    The agent can intelligently fetch context only when needed.
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
            Tool(get_course_and_file_info, takes_ctx=True),
            Tool(get_chat_context, takes_ctx=True),
            Tool(search_file_with_query, takes_ctx=True),
            Tool(search_file_with_chunk_index, takes_ctx=True),
            Tool(generate_quiz_from_chat, takes_ctx=True),
            Tool(generate_flashcard_from_chat, takes_ctx=True),
        ],
        retries=3,
        output_retries=3,
    )


def get_chat_agent_with_context(deps: Deps, **kwargs) -> Agent[Deps, ChatAnswer]:
    """
    Create a chat agent with preloaded context included in the system prompt.
    This provides immediate access to conversation history and summary.
    """
    model = get_model()
    system_prompt = build_system_prompt_with_context(deps)

    return Agent[
        Deps,
        ChatAnswer,
    ](
        model,
        output_type=ChatAnswer,
        system_prompt=system_prompt,
        tools=[
            Tool(get_course_and_file_info, takes_ctx=True),
            Tool(get_chat_context, takes_ctx=True),
            Tool(search_file_with_query, takes_ctx=True),
            Tool(search_file_with_chunk_index, takes_ctx=True),
            Tool(generate_quiz_from_chat, takes_ctx=True),
            Tool(generate_flashcard_from_chat, takes_ctx=True),
        ],
        retries=3,
        output_retries=3,
    )

